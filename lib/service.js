"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetingService = void 0;
const koishi_1 = require("koishi");
const cache_1 = require("./cache");
const client_1 = require("./client");
const search_1 = require("./search");
const search_2 = require("./search");
/**
 * 音乐服务：对外暴露搜索、取信息、取播放地址 / 封面 / 歌词 / 歌单等能力。
 *
 * 注册为 `ctx.meting`，后续别的插件可以直接注入使用。
 */
class MetingService extends koishi_1.Service {
    constructor(ctx, config) {
        super(ctx, 'meting', true);
        this.config = config;
        this.client = new client_1.MetingClient(ctx, config);
        this.cache = new cache_1.TTLCache(config.cacheTTL);
        this.listCache = new cache_1.TTLCache(config.cacheTTL);
    }
    /**
     * 搜索歌曲。
     *
     * `auto` 模式下会按顺序尝试 API 的 `type=search` 与内置搜索，
     * 两者都不支持时抛 {@link SearchUnsupportedError}，上层可以据此给出准确提示。
     */
    async search(keyword, options = {}) {
        const server = options.server || this.config.defaultServer;
        const limit = Math.min(Math.max(options.limit ?? this.config.searchLimit, 1), 50);
        const page = Math.max(options.page ?? 1, 1);
        const args = {
            ctx: this.ctx,
            client: this.client,
            config: this.config,
            keyword,
            server,
            limit,
            page,
        };
        const strategies = this.config.searchMode === 'api' ? [search_1.searchViaMetingAPI]
            : this.config.searchMode === 'builtin' ? [search_1.searchViaBuiltin]
                : [search_1.searchViaMetingAPI, search_1.searchViaBuiltin];
        const errors = [];
        for (const strategy of strategies) {
            try {
                const songs = await strategy(args);
                if (songs.length)
                    return songs;
            }
            catch (error) {
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }
        if (!errors.length)
            return [];
        // 全部失败：如果都是「不支持」，就把细节汇总成一个可识别的错误
        if (errors.every((error) => error instanceof search_1.SearchUnsupportedError)) {
            throw new search_1.SearchUnsupportedError(errors.map((error) => error.message).join('；'));
        }
        throw errors[errors.length - 1];
    }
    /** 取歌名（Meting 的 `type=name`）；方法名避开 Service 自带的 name 属性 */
    async songName(ref) {
        const key = `name:${ref.server}:${ref.id}`;
        return this.cache.fetch(key, async () => {
            const raw = await this.client.request({ type: 'name', id: ref.id, server: ref.server });
            return raw.trim();
        });
    }
    /** 取歌手名；部分 API 的 `type=artist` 返回的是歌曲列表，这里两种语义都兼容 */
    async artist(ref) {
        const key = `artist:${ref.server}:${ref.id}`;
        return this.cache.fetch(key, async () => {
            try {
                const raw = (await this.client.request({ type: 'artist', id: ref.id, server: ref.server })).trim();
                if (!raw)
                    return '';
                if (raw.startsWith('[')) {
                    const list = (0, client_1.parseArray)(raw);
                    return String(list?.[0]?.artist ?? '');
                }
                return raw;
            }
            catch {
                return '';
            }
        });
    }
    /** 只拿到一个 ID 时，补全成完整的歌曲信息 */
    async resolve(id, server = this.config.defaultServer) {
        const ref = { id, server };
        const name = await this.songName(ref);
        if (!name)
            throw new client_1.MetingAPIError('unknown song', `找不到歌曲 ${id}`);
        const artist = await this.artist(ref);
        return { id, server, name, artist };
    }
    /** API 的播放跳转地址（不做可用性校验） */
    url(ref) {
        return this.client.url({ type: 'url', id: ref.id, server: ref.server });
    }
    /**
     * 真正拿来播放的地址。
     *
     * 部分 Meting API 取不到链时（VIP / 版权曲目、未配置 Cookie）会返回一个空的
     * 200 响应，直接播就会发出一条坏音频，所以这里先探测一次。
     * 校验结果会短期缓存，避免同一首歌反复探测。
     */
    async audioUrl(ref) {
        const apiUrl = this.url(ref);
        if (!this.config.validateAudio)
            return apiUrl;
        const key = `audio:${ref.server}:${ref.id}`;
        return this.cache.fetch(key, async () => {
            const { status, location, body } = await this.client.probe({
                type: 'url',
                id: ref.id,
                server: ref.server,
            });
            if (status >= 300 && status < 400) {
                if (!location)
                    throw new client_1.MetingAPIError('empty url', '接口没有返回播放地址');
                // 返回跳转地址而不是直链：直链有时效，让适配器每次重新取链更稳
                return apiUrl;
            }
            const error = (0, client_1.readError)(body);
            if (error)
                throw new client_1.MetingAPIError(error, `接口不支持取播放地址（${error}）`);
            // 有些实现（代理模式）直接把音频流回来，此时 API 地址本身就能播
            if (status >= 200 && status < 300 && body.length > 0)
                return apiUrl;
            throw new client_1.MetingAPIError('no url', '接口没有返回播放地址，可能是 VIP / 版权曲目（需要在该 Meting API 上配置平台 Cookie）');
        }, Math.min(this.config.cacheTTL, 300000));
    }
    /** 封面地址；`pictureType` 为 auto 时会自动探测该 API 支持 pic 还是 cover */
    async cover(ref) {
        const type = await this.resolvePictureType(ref);
        return this.client.url({ type, id: ref.id, server: ref.server });
    }
    /** 歌词原文（若 API 配置了中文歌词，会以内联形式附带翻译） */
    async lyric(ref) {
        const key = `lrc:${ref.server}:${ref.id}`;
        return this.cache.fetch(key, async () => {
            try {
                return (await this.client.request({ type: 'lrc', id: ref.id, server: ref.server })).trim();
            }
            catch {
                return '';
            }
        });
    }
    /** 批量取歌单 / 专辑的歌曲列表 */
    async playlist(id, server = this.config.defaultServer, limit = 50) {
        const key = `playlist:${server}:${id}:${limit}`;
        return this.listCache.fetch(key, async () => {
            const raw = await this.client.request({ type: 'playlist', id, server });
            const list = (0, client_1.parseArray)(raw);
            if (!list)
                throw new client_1.MetingAPIError('unknown playlist', `找不到歌单 ${id}`);
            return list
                .map((item) => (0, search_2.normalizeSong)(item, server))
                .filter((song) => !!song)
                .slice(0, limit);
        });
    }
    /** 探测当前 API 的封面接口是 `pic` 还是 `cover`，结果会被记住 */
    async resolvePictureType(ref) {
        if (this.config.pictureType !== 'auto')
            return this.config.pictureType;
        if (this.pictureType)
            return this.pictureType;
        for (const type of ['cover', 'pic']) {
            try {
                const { status, body } = await this.client.probe({ type, id: ref.id, server: ref.server });
                const redirected = status >= 300 && status < 400;
                const inlined = !!body.trim() && !body.trim().startsWith('{');
                if (redirected || inlined) {
                    this.pictureType = type;
                    this.ctx.logger('meting-music').debug('封面接口探测结果：%s', type);
                    return type;
                }
            }
            catch (error) {
                this.ctx.logger('meting-music').debug('探测 type=%s 失败：%s', type, error);
            }
        }
        this.pictureType = 'cover';
        return 'cover';
    }
}
exports.MetingService = MetingService;
//# sourceMappingURL=service.js.map