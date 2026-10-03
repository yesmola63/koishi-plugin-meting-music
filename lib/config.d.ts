import { Schema } from 'koishi';
/** Meting 支持的平台（`server` 参数） */
export declare const SERVERS: readonly ["netease", "tencent", "kuwo", "kugou", "migu", "baidu", "xiami"];
/** 平台标识的字面量联合，用于让配置里的下拉框有准确类型 */
export type ServerKey = (typeof SERVERS)[number];
export interface Config {
    /** Meting API 地址 */
    endpoint: string;
    /** 默认音乐平台 */
    defaultServer: ServerKey;
    /** 搜索方式 */
    searchMode: 'auto' | 'api' | 'builtin';
    /** 默认返回的搜索结果数量 */
    searchLimit: number;
    /** 关键词最大长度 */
    maxKeywordLength: number;
    /** 等待用户选择结果的秒数 */
    selectTimeout: number;
    /** 只有一条结果时直接播放 */
    autoPlaySingle: boolean;
    /** 点歌时结果列表最多展示多少条 */
    listLimit: number;
    /** 发送方式 */
    sendMode: 'audio' | 'link';
    /** 封面接口类型，auto 表示自动探测 */
    pictureType: 'auto' | 'pic' | 'cover';
    /** 是否附带封面 */
    showCover: boolean;
    /** 点播前校验播放地址是否真的取得到 */
    validateAudio: boolean;
    /** 是否展示平台名 */
    showPlatform: boolean;
    /** 点歌后附带歌词的方式 */
    lyricMode: 'off' | 'preview' | 'full';
    /** preview 模式下展示的歌词行数 */
    lyricPreviewLines: number;
    /** 单次 HTTP 请求超时（毫秒） */
    requestTimeout: number;
    /** 歌曲信息 / 歌词缓存时间（毫秒），0 表示不缓存 */
    cacheTTL: number;
}
export declare const Config: Schema<Config>;
