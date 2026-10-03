"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetingClient = exports.MetingAPIError = void 0;
exports.normalizeEndpoint = normalizeEndpoint;
exports.readError = readError;
exports.parseArray = parseArray;
/** API 返回 `{"error": "..."}` 时抛出 */
class MetingAPIError extends Error {
    constructor(code, message) {
        super(message ?? code);
        this.code = code;
        this.name = 'MetingAPIError';
    }
}
exports.MetingAPIError = MetingAPIError;
/** 规范化用户填写的 API 地址：补协议、去空格，保留其自带的查询参数 */
function normalizeEndpoint(input) {
    let value = (input || '').trim();
    if (!value)
        throw new Error('Meting API 地址不能为空');
    if (!/^https?:\/\//i.test(value))
        value = `https://${value}`;
    return value;
}
/** 判断一段响应体是不是 API 的错误对象，是则返回错误码 */
function readError(text) {
    const trimmed = text.trim();
    if (!trimmed.startsWith('{'))
        return;
    try {
        const data = JSON.parse(trimmed);
        if (data && typeof data === 'object' && typeof data.error === 'string')
            return data.error;
    }
    catch {
        // 不是合法 JSON，当作普通文本
    }
}
/** 解析 API 返回的 JSON 数组，失败返回 undefined */
function parseArray(text) {
    const trimmed = text.trim();
    if (!trimmed.startsWith('['))
        return;
    try {
        const data = JSON.parse(trimmed);
        return Array.isArray(data) ? data : undefined;
    }
    catch {
        return undefined;
    }
}
/**
 * Meting API 的裸客户端：只负责拼地址、发请求、把错误体转成异常。
 * 上层的业务语义（搜索、补全信息、缓存等）在 {@link MetingService} 中。
 */
class MetingClient {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
        this.endpoint = normalizeEndpoint(config.endpoint);
        this.logger = ctx.logger('meting-music');
    }
    /** 拼接一次 API 请求地址 */
    url(params) {
        const url = new URL(this.endpoint);
        url.searchParams.set('type', params.type);
        url.searchParams.set('id', params.id);
        if (params.server)
            url.searchParams.set('server', params.server);
        return url.toString();
    }
    /**
     * 请求并返回原始文本。
     *
     * 注意：`type=url` / `type=pic` / `type=cover` 这类接口会 302 到真实资源，
     * 必须直接用 {@link url} 拿地址，不要走这里（否则会把二进制当成文本读回来）。
     */
    async request(params) {
        const url = this.url(params);
        const raw = await this.ctx.http.get(url, {
            responseType: 'text',
            timeout: this.config.requestTimeout,
        });
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        this.logger.debug('GET %s -> %s', url, text.slice(0, 200));
        const error = readError(text);
        if (error)
            throw new MetingAPIError(error, `Meting API 返回错误：${error}`);
        return text;
    }
    /**
     * 探测一次请求的状态码与 Location，用于判断某个 type 是否可用。
     *
     * 默认会带上 `Range: bytes=0-0`：这样遇到「直接回源音频流」的 API 实现时
     * 最多只会下载 1 个字节，而不是整首歌。
     */
    async probe(params, options = {}) {
        const url = this.url(params);
        const headers = {};
        if (options.range !== false)
            headers.range = 'bytes=0-0';
        const response = await this.ctx.http(url, {
            method: 'GET',
            redirect: 'manual',
            responseType: 'text',
            headers,
            timeout: this.config.requestTimeout,
        });
        return {
            status: response.status,
            location: response.headers.get('location') ?? undefined,
            body: typeof response.data === 'string' ? response.data : '',
        };
    }
}
exports.MetingClient = MetingClient;
//# sourceMappingURL=client.js.map