import { Context } from 'koishi';
import type { Config } from './config';
import type { MetingType, ServerName } from './types';
/** 一次 Meting API 请求的参数 */
export interface MetingParams {
    type: MetingType | string;
    id: string;
    server?: ServerName;
}
/** API 返回 `{"error": "..."}` 时抛出 */
export declare class MetingAPIError extends Error {
    readonly code: string;
    constructor(code: string, message?: string);
}
/** 规范化用户填写的 API 地址：补协议、去空格，保留其自带的查询参数 */
export declare function normalizeEndpoint(input: string): string;
/** 判断一段响应体是不是 API 的错误对象，是则返回错误码 */
export declare function readError(text: string): string | undefined;
/** 解析 API 返回的 JSON 数组，失败返回 undefined */
export declare function parseArray(text: string): any[] | undefined;
/**
 * Meting API 的裸客户端：只负责拼地址、发请求、把错误体转成异常。
 * 上层的业务语义（搜索、补全信息、缓存等）在 {@link MetingService} 中。
 */
export declare class MetingClient {
    private ctx;
    private config;
    readonly endpoint: string;
    private logger;
    constructor(ctx: Context, config: Config);
    /** 拼接一次 API 请求地址 */
    url(params: MetingParams): string;
    /**
     * 请求并返回原始文本。
     *
     * 注意：`type=url` / `type=pic` / `type=cover` 这类接口会 302 到真实资源，
     * 必须直接用 {@link url} 拿地址，不要走这里（否则会把二进制当成文本读回来）。
     */
    request(params: MetingParams): Promise<string>;
    /**
     * 探测一次请求的状态码与 Location，用于判断某个 type 是否可用。
     *
     * 默认会带上 `Range: bytes=0-0`：这样遇到「直接回源音频流」的 API 实现时
     * 最多只会下载 1 个字节，而不是整首歌。
     */
    probe(params: MetingParams, options?: {
        range?: boolean;
    }): Promise<ProbeResult>;
}
/** {@link MetingClient.probe} 的返回值 */
export interface ProbeResult {
    status: number;
    location?: string;
    body: string;
}
