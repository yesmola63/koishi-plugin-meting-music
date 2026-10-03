import type { Song } from './types';
/** 平台标识 -> 展示名 */
export declare const SERVER_LABELS: Record<string, string>;
export declare function serverLabel(server: string): string;
/** `歌名 - 歌手`，没有歌手时只返回歌名 */
export declare function songTitle(song: Song): string;
/** 秒数 -> `m:ss` */
export declare function formatDuration(seconds?: number): string;
/** 去掉时间标签与制作人员信息，得到可以直接阅读的歌词 */
export declare function cleanLyric(lyric: string): string;
/**
 * 从 LRC 里挑出用于预览的歌词行。
 *
 * 只保留带时间标签的行，因此没有时间标签的标题行会被自然过滤掉；
 * 带时间标签的「作词 / 作曲」一类元信息行再单独排除。
 */
export declare function lyricPreview(lyric: string, lines: number): string;
