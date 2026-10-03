import { Schema } from 'koishi'

/** Meting 支持的平台（`server` 参数） */
export const SERVERS = ['netease', 'tencent', 'kuwo', 'kugou', 'migu', 'baidu', 'xiami'] as const

/** 平台标识的字面量联合，用于让配置里的下拉框有准确类型 */
export type ServerKey = (typeof SERVERS)[number]

export interface Config {
  /** Meting API 地址 */
  endpoint: string
  /** 默认音乐平台 */
  defaultServer: ServerKey
  /** 搜索方式 */
  searchMode: 'auto' | 'api' | 'builtin'
  /** 默认返回的搜索结果数量 */
  searchLimit: number
  /** 关键词最大长度 */
  maxKeywordLength: number
  /** 等待用户选择结果的秒数 */
  selectTimeout: number
  /** 只有一条结果时直接播放 */
  autoPlaySingle: boolean
  /** 点歌时结果列表最多展示多少条 */
  listLimit: number
  /** 发送方式 */
  sendMode: 'audio' | 'link'
  /** 封面接口类型，auto 表示自动探测 */
  pictureType: 'auto' | 'pic' | 'cover'
  /** 是否附带封面 */
  showCover: boolean
  /** 点播前校验播放地址是否真的取得到 */
  validateAudio: boolean
  /** 是否展示平台名 */
  showPlatform: boolean
  /** 点歌后附带歌词的方式 */
  lyricMode: 'off' | 'preview' | 'full'
  /** preview 模式下展示的歌词行数 */
  lyricPreviewLines: number
  /** 单次 HTTP 请求超时（毫秒） */
  requestTimeout: number
  /** 歌曲信息 / 歌词缓存时间（毫秒），0 表示不缓存 */
  cacheTTL: number
}

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    endpoint: Schema.string()
      .default('https://api.moeyao.cn/meting/?')
      .description('Meting API 地址。可以以 `?`、`/` 或 `?xxx=yyy` 结尾，插件会自动拼接参数。'),
    defaultServer: Schema.union([...SERVERS])
      .default('netease')
      .description('默认使用的音乐平台，也可以在点歌时用 `-s` 临时指定。'),
    requestTimeout: Schema.natural()
      .default(15000)
      .description('单次请求的超时时间（毫秒）。'),
    cacheTTL: Schema.natural()
      .default(600000)
      .description('歌曲信息与歌词的缓存时间（毫秒），填 0 关闭缓存。'),
  }).description('基础设置'),

  Schema.object({
    searchMode: Schema.union(['auto', 'api', 'builtin'])
      .default('auto')
      .description([
        '搜索方式。',
        '- `auto`：先试 API 的 `type=search`，不行再退回内置搜索',
        '- `api`：只用 Meting API 的 `type=search`',
        '- `builtin`：只用插件内置的平台搜索接口',
      ].join('\n')),
    searchLimit: Schema.natural()
      .min(1).max(50)
      .default(5)
      .description('默认返回的搜索结果数量。'),
    listLimit: Schema.natural()
      .min(1).max(50)
      .default(10)
      .description('点歌时结果列表最多展示多少条。'),
    maxKeywordLength: Schema.natural()
      .min(1).max(200)
      .default(50)
      .description('关键词的最大长度，超出会被截断。'),
    selectTimeout: Schema.natural()
      .min(5).max(300)
      .default(30)
      .description('等待用户回复序号的秒数。'),
    autoPlaySingle: Schema.boolean()
      .default(true)
      .description('搜索结果只有一条时直接播放，不再询问。'),
  }).description('搜索设置'),

  Schema.object({
    sendMode: Schema.union(['audio', 'link'])
      .default('audio')
      .description('发送方式：`audio` 发送语音 / 音频元素，`link` 只发送播放链接。'),
    pictureType: Schema.union(['auto', 'pic', 'cover'])
      .default('auto')
      .description('封面接口类型。不同 Meting API 实现分别使用 `pic` 或 `cover`，`auto` 会自动探测。'),
    showCover: Schema.boolean()
      .default(true)
      .description('播放时附带封面图片。'),
    validateAudio: Schema.boolean()
      .default(true)
      .description([
        '点播前先确认接口真的能取到播放地址。',
        '部分 Meting API 遇到 VIP / 版权曲目会返回空响应，开着这项可以避免发出一条坏音频。',
      ].join('\n')),
    showPlatform: Schema.boolean()
      .default(true)
      .description('在歌曲信息中展示所属平台。'),
    lyricMode: Schema.union(['off', 'preview', 'full'])
      .default('off')
      .description('点歌后附带歌词的方式。'),
    lyricPreviewLines: Schema.natural()
      .min(1).max(100)
      .default(8)
      .description('`preview` 模式下展示的歌词行数。'),
  }).description('播放设置'),
])
