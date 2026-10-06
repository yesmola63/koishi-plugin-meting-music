/**
 * 本插件对外暴露的数据结构。
 */
/** 音乐平台标识，对应 Meting API 的 `server` 参数 */
export type ServerName = string;
/** 一首歌的元信息 */
export interface Song {
    /** 歌曲在所属平台的 ID */
    id: string;
    /** 所属平台 */
    server: ServerName;
    /** 歌名 */
    name: string;
    /** 歌手，多个歌手以 `/` 分隔；可能为空字符串 */
    artist: string;
    /** 时长（秒），部分平台 / 接口不返回 */
    duration?: number;
}
/** 只需要定位一首歌时使用的最小信息 */
export type SongRef = Pick<Song, 'id' | 'server'>;
/** Meting API 的 `type` 参数 */
export type MetingType = 'name' | 'artist' | 'url' | 'pic' | 'cover' | 'lrc' | 'playlist' | 'search' | 'song';
/**
 * Meting API 返回的歌曲对象。
 *
 * 不同实现的字段名并不统一，实测至少两套：
 * - `{ name, artist, url, cover, lrc }` —— APlayer / MetingJS 风格
 * - `{ title, author, url, pic, lrc }` —— meting-api 二改版（如 meting.mikus.ink）
 * 解析时全部兼容，见 `normalizeSong`。
 */
export interface MetingSongItem {
    name?: string;
    title?: string;
    songName?: string;
    artist?: string;
    author?: string;
    singer?: string;
    url?: string;
    cover?: string;
    pic?: string;
    lrc?: string;
}
