import { Context, h, Session } from 'koishi'
import { MetingAPIError } from './client'
import { SERVERS, type Config } from './config'
import { cleanLyric, formatDuration, lyricPreview, serverLabel, songTitle } from './format'
import { SearchUnsupportedError } from './search'
import type { MetingService } from './service'
import type { Song } from './types'

/** 用户通过指令选项传入的参数 */
interface PlayOptions {
  server?: string
  limit?: number
  page?: number
  direct?: boolean
  lyric?: boolean
}

const USAGE = [
  '🎵 音乐点播',
  '',
  '点歌 <关键词> —— 搜索并选择播放',
  '搜索 <关键词> —— 只搜索，不播放',
  '按id点歌 <id> —— 已知歌曲 ID 时直接点播',
  '歌词 <id> —— 查看歌词',
  '点歌单 <id> —— 从歌单里挑一首播放',
  '音乐平台 —— 查看可用平台',
  '',
  '通用选项：-s <平台> 指定平台，-n <数量> 指定结果数量，-p <页码> 翻页，-d 直接播放第一条，-l 附带完整歌词',
  '（选项写在关键词前面或后面都可以，例如 `.点歌 晴天 -s tencent`）',
].join('\n')

function toInt(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined
}

function normalizeOptions(options: any): PlayOptions {
  // 未提供的选项留成 undefined，这样 rescueOptions 捞到的值才不会被默认值盖掉
  return {
    server: typeof options?.server === 'string' && options.server ? options.server : undefined,
    limit: toInt(options?.limit),
    page: toInt(options?.page),
    direct: options?.direct ? true : undefined,
    lyric: options?.lyric ? true : undefined,
  }
}

const OPTION_ALIASES: Record<string, keyof PlayOptions> = {
  '-s': 'server', '--server': 'server',
  '-n': 'limit', '--limit': 'limit',
  '-p': 'page', '--page': 'page',
  '-d': 'direct', '--direct': 'direct',
  '-l': 'lyric', '--lyric': 'lyric',
}

const VALUED_OPTIONS = new Set<keyof PlayOptions>(['server', 'limit', 'page'])

/**
 * 把落在关键词里的选项捞回来。
 *
 * 关键词声明为 `text` 类型，Koishi 会把后面的内容整段吃掉，
 * 于是 `.点歌 晴天 -d` 里的 `-d` 会变成关键词的一部分。
 * 这里做个兜底，让选项写在关键词前面或后面都管用。
 * 已经被 Koishi 正确解析的选项优先，不会被这里覆盖。
 */
function rescueOptions(parsed: PlayOptions, keyword: string): { options: PlayOptions, keyword: string } {
  const tokens = keyword.split(/\s+/).filter(Boolean)
  const kept: string[] = []
  const found: PlayOptions = {}

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const eq = token.indexOf('=')
    const name = OPTION_ALIASES[eq > 0 ? token.slice(0, eq) : token]
    if (!name) {
      kept.push(token)
      continue
    }

    if (!VALUED_OPTIONS.has(name)) {
      ;(found as Record<string, unknown>)[name] = true
      continue
    }

    const inline = eq > 0 ? token.slice(eq + 1) : undefined
    const value = inline ?? tokens[i + 1]
    if (value === undefined) {
      // 选项后面没跟值，当普通关键词处理
      kept.push(token)
      continue
    }
    if (inline === undefined) i++
    if (name === 'server') found.server = value
    else if (name === 'limit') found.limit = toInt(value)
    else if (name === 'page') found.page = toInt(value)
  }

  // 已经被 Koishi 正确解析的选项优先
  const merged: Record<string, unknown> = { ...found }
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) merged[key] = value
  }

  return { options: merged as PlayOptions, keyword: kept.join(' ') }
}

export function applyCommands(ctx: Context, config: Config, meting: MetingService) {
  const logger = ctx.logger('meting-music')

  /** 动态文本一律转义后再拼进字符串片段，避免用户名里的尖括号被解析成消息元素 */
  const esc = (text: unknown) => h.escape(String(text ?? ''))

  function renderError(error: unknown): string {
    if (error instanceof SearchUnsupportedError) {
      return [
        '❌ 没能完成搜索。',
        esc(error.detail),
        '',
        '可以把配置里的「搜索方式」改成 `builtin`（用插件内置的平台搜索接口），',
        '或者换成实现了 `type=search` 的 Meting API。',
      ].join('\n')
    }
    if (error instanceof MetingAPIError) {
      return `❌ 音乐接口返回错误：${esc(error.code)}`
    }
    logger.warn(error)
    return `❌ 操作失败：${esc(error instanceof Error ? error.message : error)}`
  }

  function renderList(header: string, songs: Song[], withPrompt = true): string {
    const lines = [header]
    songs.forEach((song, index) => {
      const duration = formatDuration(song.duration)
      lines.push(`${index + 1}. ${esc(songTitle(song))}${duration ? ` (${duration})` : ''}`)
    })
    if (withPrompt) lines.push(`回复序号选择（${config.selectTimeout} 秒内有效），回复 0 取消。`)
    return lines.join('\n')
  }

  /** 等待用户回复序号；支持取消与重试 */
  async function choose(session: Session, songs: Song[]): Promise<Song | undefined> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const answer = await session.prompt(config.selectTimeout * 1000)
      if (!answer) {
        await session.send('⌛ 等待超时，已取消点歌。')
        return
      }
      const text = answer.trim()
      if (/^(0|取消|cancel|q|quit)$/i.test(text)) {
        await session.send('已取消点歌。')
        return
      }
      const index = Number(text)
      if (Number.isInteger(index) && index >= 1 && index <= songs.length) {
        return songs[index - 1]
      }
      await session.send(`请输入 1 ~ ${songs.length} 之间的序号，回复 0 取消。`)
    }
    await session.send('多次输入无效，已取消点歌。')
  }

  /** 发送一首歌 */
  async function play(session: Session, song: Song, wantLyric = false) {
    let audio: string
    try {
      audio = await meting.audioUrl(song)
    } catch (error) {
      if (error instanceof MetingAPIError) {
        await session.send(`⚠️ ${esc(error.message)}`)
        return
      }
      throw error
    }

    let cover = ''
    if (config.showCover) {
      try {
        cover = await meting.cover(song)
      } catch (error) {
        logger.debug('获取封面失败：%s', error)
      }
    }

    const duration = formatDuration(song.duration)
    const header = [`🎵 ${esc(songTitle(song))}${duration ? ` (${duration})` : ''}`]
    if (config.showPlatform) header.push(`平台：${esc(serverLabel(song.server))}`)

    const message: (string | h)[] = [header.join('\n')]
    if (cover) message.push(h.image(cover))
    if (config.sendMode === 'audio') {
      message.push(h('audio', {
        src: audio,
        title: songTitle(song),
        ...(cover ? { poster: cover } : {}),
      }))
    } else {
      message.push(h.text(audio))
    }
    await session.send(message)

    if (!wantLyric && config.lyricMode === 'off') return
    const lyric = await meting.lyric(song)
    if (!lyric) {
      await session.send('这首歌暂时没有歌词。')
      return
    }
    const full = wantLyric || config.lyricMode === 'full'
    await session.send(esc(full ? cleanLyric(lyric) : lyricPreview(lyric, config.lyricPreviewLines)))
  }

  /** 搜索 + 选择 + 播放 的完整流程 */
  async function requestByKeyword(session: Session, rawKeyword: string, rawOptions: PlayOptions, autoplay: boolean) {
    const rescued = rescueOptions(rawOptions, (rawKeyword ?? '').trim())
    const options = rescued.options
    const keyword = rescued.keyword.slice(0, config.maxKeywordLength)
    // USAGE 里有 `<>`，必须转义后再作为消息发出去
    if (!keyword) return esc(USAGE)

    let songs: Song[]
    try {
      songs = await meting.search(keyword, {
        server: options.server,
        page: options.page,
        limit: options.limit ?? (autoplay ? Math.max(config.searchLimit, config.listLimit) : config.searchLimit),
      })
    } catch (error) {
      return renderError(error)
    }

    if (!songs.length) return `😢 没有找到与「${esc(keyword)}」相关的歌曲。`

    const list = songs.slice(0, config.listLimit)
    const header = `🔍 找到 ${list.length} 首与「${esc(keyword)}」相关的歌曲：`

    if (!autoplay) return renderList(header, list, false)

    if (options.direct || (list.length === 1 && config.autoPlaySingle)) {
      await play(session, list[0], options.lyric)
      return
    }

    await session.send(renderList(header, list))
    const picked = await choose(session, list)
    if (!picked) return
    await play(session, picked, options.lyric)
  }

  const serverOption = '-s <server:string> 指定平台，例如 netease / tencent'
  const limitOption = '-n <limit:number> 返回的结果数量'
  const pageOption = '-p <page:number> 结果页码'
  const directOption = '-d, --direct 直接播放第一条结果'
  const lyricOption = '-l, --lyric 附带完整歌词'

  ctx.command('music [keyword:text]', '点歌 / 音乐点播')
    .alias('点歌')
    .alias('播放')
    .option('server', serverOption)
    .option('limit', limitOption)
    .option('page', pageOption)
    .option('direct', directOption)
    .option('lyric', lyricOption)
    .usage('搜索关键词，列出结果后回复序号即可播放。常用平台：netease（网易云）、tencent（QQ 音乐）。')
    .example('点歌 晴天')
    .example('点歌 晴天 -s tencent -n 10')
    .action(async ({ session, options }, keyword) => {
      if (!session) return
      return requestByKeyword(session, keyword, normalizeOptions(options), true)
    })

  ctx.command('music.search <keyword:text>', '搜索歌曲')
    .alias('搜索')
    .alias('搜歌')
    .option('server', serverOption)
    .option('limit', limitOption)
    .option('page', pageOption)
    .usage('只列出搜索结果，不播放。')
    .example('搜索 起风了 -n 10')
    .action(async ({ session, options }, keyword) => {
      if (!session) return
      return requestByKeyword(session, keyword, normalizeOptions(options), false)
    })

  ctx.command('music.id <id:string>', '按歌曲 ID 点歌')
    .alias('按id点歌')
    .option('server', serverOption)
    .option('lyric', lyricOption)
    .usage('已经知道歌曲 ID 时可以直接点播。')
    .example('按id点歌 186016')
    .action(async ({ session, options }, id) => {
      if (!session) return '请提供歌曲 ID。'
      const opts = normalizeOptions(options)
      try {
        const song = await meting.resolve(id.trim(), opts.server)
        await play(session, song, opts.lyric)
      } catch (error) {
        return renderError(error)
      }
    })

  ctx.command('music.lyric <id:string>', '查看歌词')
    .alias('歌词')
    .option('server', serverOption)
    .usage('根据歌曲 ID 获取完整歌词。')
    .example('歌词 186016')
    .action(async ({ session, options }, id) => {
      if (!session) return '请提供歌曲 ID。'
      const server = normalizeOptions(options).server ?? config.defaultServer
      try {
        const song = await meting.resolve(id.trim(), server)
        const lyric = await meting.lyric(song)
        if (!lyric) return `😢 没有找到「${esc(songTitle(song))}」的歌词。`
        return `🎵 ${esc(songTitle(song))}\n\n${esc(cleanLyric(lyric))}`
      } catch (error) {
        return renderError(error)
      }
    })

  ctx.command('music.playlist <id:string>', '点歌单')
    .alias('点歌单')
    .alias('歌单')
    .option('server', serverOption)
    .option('limit', limitOption)
    .option('lyric', lyricOption)
    .usage('列出歌单里的歌曲，回复序号播放。')
    .example('点歌单 2619366284')
    .action(async ({ session, options }, id) => {
      if (!session) return '请提供歌单 ID。'
      const opts = normalizeOptions(options)
      const limit = Math.min(Math.max(opts.limit ?? config.listLimit, 1), 50)
      try {
        const songs = await meting.playlist(id.trim(), opts.server, limit)
        if (!songs.length) return '😢 这个歌单是空的。'
        await session.send(renderList(`💿 歌单 ${esc(id)} 共 ${songs.length} 首：`, songs))
        const picked = await choose(session, songs)
        if (!picked) return
        await play(session, picked, opts.lyric)
      } catch (error) {
        return renderError(error)
      }
    })

  ctx.command('music.servers', '查看可用平台')
    .alias('音乐平台')
    .action(() => [
      '🎧 可用平台：',
      ...SERVERS.map((key) => `- ${key}（${serverLabel(key)}）`),
      '',
      `默认平台：${config.defaultServer}`,
      '用法：点歌 晴天 -s tencent',
    ].join('\n'))
}
