import { Context } from 'koishi'
import { MetingAPIError, MetingClient, parseArray } from './client'
import type { Config } from './config'
import type { MetingSongItem, Song } from './types'

/** 当前 API 与平台都不支持搜索时抛出，便于上层给出针对性提示 */
export class SearchUnsupportedError extends Error {
  constructor(public readonly detail: string) {
    super(detail)
    this.name = 'SearchUnsupportedError'
  }
}

export interface SearchArgs {
  ctx: Context
  client: MetingClient
  config: Config
  keyword: string
  server: string
  limit: number
  page: number
}

export type SearchStrategy = (args: SearchArgs) => Promise<Song[]>

/** 从 APlayer 风格的 URL 里反解出 server 与 id，例如 `?server=netease&type=url&id=123` */
export function extractRef(link?: string): { server?: string; id?: string } {
  if (!link) return {}
  try {
    const url = new URL(link.startsWith('//') ? `https:${link}` : link, 'https://localhost')
    return {
      server: url.searchParams.get('server') ?? undefined,
      id: url.searchParams.get('id') ?? undefined,
    }
  } catch {
    return {}
  }
}

/** 依次取第一个非空字符串 */
function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

/**
 * 把 API 返回的歌曲对象转成本插件的 {@link Song}。
 *
 * 字段名兼容两套实现：
 * - `name` / `artist` / `cover` —— APlayer、MetingJS
 * - `title` / `author` / `pic` —— meting-api 二改版（实测 meting.mikus.ink 走这套）
 */
export function normalizeSong(item: MetingSongItem, fallbackServer: string): Song | undefined {
  if (!item || typeof item !== 'object') return
  const ref = extractRef(item.url) ?? extractRef(item.lrc) ?? extractRef(item.cover ?? item.pic)
  if (!ref.id) return
  return {
    id: ref.id,
    server: ref.server || fallbackServer,
    name: pickString(item.name, item.title, item.songName) || '未知歌曲',
    artist: pickString(item.artist, item.author, item.singer),
  }
}

/**
 * 走 Meting API 的 `type=search`。
 *
 * 注意：上游 injahow/meting-api 并没有实现 search，会返回 `{"error":"unknown type"}`；
 * 只有二改版 / metowolf/Meting-API 才支持。这里把这种情况识别为「不支持」而非真错误。
 */
export const searchViaMetingAPI: SearchStrategy = async ({ client, keyword, server, limit, page }) => {
  // 官方 search 接口不支持分页
  if (page > 1) return []

  let raw: string
  try {
    raw = await client.request({ type: 'search', id: keyword, server })
  } catch (error) {
    if (error instanceof MetingAPIError) {
      throw new SearchUnsupportedError(`Meting API 不支持 type=search（${error.code}）`)
    }
    throw error
  }

  const list = parseArray(raw)
  if (!list) throw new SearchUnsupportedError('Meting API 的 type=search 没有返回歌曲列表')

  return list
    .map((item) => normalizeSong(item as MetingSongItem, server))
    .filter((song): song is Song => !!song)
    .slice(0, limit)
}

const NETEASE_HEADERS = {
  referer: 'https://music.163.com/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
}

/** 内置搜索：直接调用平台自己的公开接口，不依赖 Meting API 是否实现了 search */
export type BuiltinProvider = (args: SearchArgs) => Promise<Song[]>

export const builtinProviders: Record<string, BuiltinProvider> = {
  async netease({ ctx, config, keyword, limit, page }) {
    const raw = await ctx.http.get<string>('https://music.163.com/api/search/get/web', {
      params: { s: keyword, type: 1, limit, offset: (page - 1) * limit },
      headers: NETEASE_HEADERS,
      responseType: 'text',
      timeout: config.requestTimeout,
    })
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw)

    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('网易云搜索接口返回了无法解析的内容')
    }

    const songs: any[] = data?.result?.songs ?? []
    return songs.map((item: any): Song => {
      // 旧接口用 duration(毫秒)，新版 cloudsearch 用 dt(毫秒)
      const ms = item.duration ?? item.dt
      return {
        id: String(item.id),
        server: 'netease',
        name: pickString(item.name, item.title) || '未知歌曲',
        artist: (item.artists ?? item.ar ?? [])
          .map((artist: any) => artist?.name ?? artist)
          .filter(Boolean)
          .join('/'),
        duration: ms ? Math.round(ms / 1000) : undefined,
      }
    })
  },
}

export const searchViaBuiltin: SearchStrategy = async (args) => {
  const provider = builtinProviders[args.server]
  if (!provider) {
    throw new SearchUnsupportedError(`平台 ${args.server} 暂无内置搜索，请改用支持 type=search 的 Meting API`)
  }
  return provider(args)
}
