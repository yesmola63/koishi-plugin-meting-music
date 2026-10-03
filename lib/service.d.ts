import { Context, Service } from 'koishi';
import { MetingClient } from './client';
import type { Config } from './config';
import type { Song, SongRef } from './types';
declare module 'koishi' {
    interface Context {
        meting: MetingService;
    }
}
export interface SearchOptions {
    /** 平台，默认取配置里的 defaultServer */
    server?: string;
    /** 返回条数 */
    limit?: number;
    /** 页码，从 1 开始 */
    page?: number;
}
/**
 * 音乐服务：对外暴露搜索、取信息、取播放地址 / 封面 / 歌词 / 歌单等能力。
 *
 * 注册为 `ctx.meting`，后续别的插件可以直接注入使用。
 */
export declare class MetingService extends Service<Config> {
    readonly client: MetingClient;
    private cache;
    private listCache;
    private pictureType?;
    constructor(ctx: Context, config: Config);
    /**
     * 搜索歌曲。
     *
     * `auto` 模式下会按顺序尝试 API 的 `type=search` 与内置搜索，
     * 两者都不支持时抛 {@link SearchUnsupportedError}，上层可以据此给出准确提示。
     */
    search(keyword: string, options?: SearchOptions): Promise<Song[]>;
    /** 取歌名（Meting 的 `type=name`）；方法名避开 Service 自带的 name 属性 */
    songName(ref: SongRef): Promise<string>;
    /** 取歌手名；部分 API 的 `type=artist` 返回的是歌曲列表，这里两种语义都兼容 */
    artist(ref: SongRef): Promise<string>;
    /** 只拿到一个 ID 时，补全成完整的歌曲信息 */
    resolve(id: string, server?: string): Promise<Song>;
    /** API 的播放跳转地址（不做可用性校验） */
    url(ref: SongRef): string;
    /**
     * 真正拿来播放的地址。
     *
     * 部分 Meting API 取不到链时（VIP / 版权曲目、未配置 Cookie）会返回一个空的
     * 200 响应，直接播就会发出一条坏音频，所以这里先探测一次。
     * 校验结果会短期缓存，避免同一首歌反复探测。
     */
    audioUrl(ref: SongRef): Promise<string>;
    /** 封面地址；`pictureType` 为 auto 时会自动探测该 API 支持 pic 还是 cover */
    cover(ref: SongRef): Promise<string>;
    /** 歌词原文（若 API 配置了中文歌词，会以内联形式附带翻译） */
    lyric(ref: SongRef): Promise<string>;
    /** 批量取歌单 / 专辑的歌曲列表 */
    playlist(id: string, server?: string, limit?: number): Promise<Song[]>;
    /** 探测当前 API 的封面接口是 `pic` 还是 `cover`，结果会被记住 */
    resolvePictureType(ref: SongRef): Promise<'pic' | 'cover'>;
}
