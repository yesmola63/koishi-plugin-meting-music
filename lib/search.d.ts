import { Context } from 'koishi';
import { MetingClient } from './client';
import type { Config } from './config';
import type { MetingSongItem, Song } from './types';
/** 当前 API 与平台都不支持搜索时抛出，便于上层给出针对性提示 */
export declare class SearchUnsupportedError extends Error {
    readonly detail: string;
    constructor(detail: string);
}
export interface SearchArgs {
    ctx: Context;
    client: MetingClient;
    config: Config;
    keyword: string;
    server: string;
    limit: number;
    page: number;
}
export type SearchStrategy = (args: SearchArgs) => Promise<Song[]>;
/** 从 APlayer 风格的 URL 里反解出 server 与 id，例如 `?server=netease&type=url&id=123` */
export declare function extractRef(link?: string): {
    server?: string;
    id?: string;
};
/** 把 APlayer 风格的歌曲对象转成本插件的 {@link Song} */
export declare function normalizeSong(item: MetingSongItem, fallbackServer: string): Song | undefined;
/**
 * 走 Meting API 的 `type=search`。
 *
 * 注意：上游 injahow/meting-api 并没有实现 search，会返回 `{"error":"unknown type"}`；
 * 只有二改版 / metowolf/Meting-API 才支持。这里把这种情况识别为「不支持」而非真错误。
 */
export declare const searchViaMetingAPI: SearchStrategy;
/** 内置搜索：直接调用平台自己的公开接口，不依赖 Meting API 是否实现了 search */
export type BuiltinProvider = (args: SearchArgs) => Promise<Song[]>;
export declare const builtinProviders: Record<string, BuiltinProvider>;
export declare const searchViaBuiltin: SearchStrategy;
