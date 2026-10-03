"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchViaBuiltin = exports.builtinProviders = exports.searchViaMetingAPI = exports.SearchUnsupportedError = void 0;
exports.extractRef = extractRef;
exports.normalizeSong = normalizeSong;
const client_1 = require("./client");
/** 当前 API 与平台都不支持搜索时抛出，便于上层给出针对性提示 */
class SearchUnsupportedError extends Error {
    constructor(detail) {
        super(detail);
        this.detail = detail;
        this.name = 'SearchUnsupportedError';
    }
}
exports.SearchUnsupportedError = SearchUnsupportedError;
/** 从 APlayer 风格的 URL 里反解出 server 与 id，例如 `?server=netease&type=url&id=123` */
function extractRef(link) {
    if (!link)
        return {};
    try {
        const url = new URL(link.startsWith('//') ? `https:${link}` : link, 'https://localhost');
        return {
            server: url.searchParams.get('server') ?? undefined,
            id: url.searchParams.get('id') ?? undefined,
        };
    }
    catch {
        return {};
    }
}
/** 把 APlayer 风格的歌曲对象转成本插件的 {@link Song} */
function normalizeSong(item, fallbackServer) {
    if (!item || typeof item !== 'object')
        return;
    const ref = extractRef(item.url) ?? extractRef(item.lrc) ?? extractRef(item.cover ?? item.pic);
    if (!ref.id)
        return;
    return {
        id: ref.id,
        server: ref.server || fallbackServer,
        name: String(item.name ?? '').trim() || '未知歌曲',
        artist: String(item.artist ?? item.author ?? '').trim(),
    };
}
/**
 * 走 Meting API 的 `type=search`。
 *
 * 注意：上游 injahow/meting-api 并没有实现 search，会返回 `{"error":"unknown type"}`；
 * 只有二改版 / metowolf/Meting-API 才支持。这里把这种情况识别为「不支持」而非真错误。
 */
const searchViaMetingAPI = async ({ client, keyword, server, limit, page }) => {
    // 官方 search 接口不支持分页
    if (page > 1)
        return [];
    let raw;
    try {
        raw = await client.request({ type: 'search', id: keyword, server });
    }
    catch (error) {
        if (error instanceof client_1.MetingAPIError) {
            throw new SearchUnsupportedError(`Meting API 不支持 type=search（${error.code}）`);
        }
        throw error;
    }
    const list = (0, client_1.parseArray)(raw);
    if (!list)
        throw new SearchUnsupportedError('Meting API 的 type=search 没有返回歌曲列表');
    return list
        .map((item) => normalizeSong(item, server))
        .filter((song) => !!song)
        .slice(0, limit);
};
exports.searchViaMetingAPI = searchViaMetingAPI;
const NETEASE_HEADERS = {
    referer: 'https://music.163.com/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};
exports.builtinProviders = {
    async netease({ ctx, config, keyword, limit, page }) {
        const raw = await ctx.http.get('https://music.163.com/api/search/get/web', {
            params: { s: keyword, type: 1, limit, offset: (page - 1) * limit },
            headers: NETEASE_HEADERS,
            responseType: 'text',
            timeout: config.requestTimeout,
        });
        const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
        let data;
        try {
            data = JSON.parse(text);
        }
        catch {
            throw new Error('网易云搜索接口返回了无法解析的内容');
        }
        const songs = data?.result?.songs ?? [];
        return songs.map((item) => ({
            id: String(item.id),
            server: 'netease',
            name: String(item.name ?? '').trim() || '未知歌曲',
            artist: (item.artists ?? item.ar ?? [])
                .map((artist) => artist?.name)
                .filter(Boolean)
                .join('/'),
            duration: item.duration ? Math.round(item.duration / 1000) : undefined,
        }));
    },
};
const searchViaBuiltin = async (args) => {
    const provider = exports.builtinProviders[args.server];
    if (!provider) {
        throw new SearchUnsupportedError(`平台 ${args.server} 暂无内置搜索，请改用支持 type=search 的 Meting API`);
    }
    return provider(args);
};
exports.searchViaBuiltin = searchViaBuiltin;
//# sourceMappingURL=search.js.map