"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.SERVERS = void 0;
const koishi_1 = require("koishi");
/** Meting 支持的平台（`server` 参数） */
exports.SERVERS = ['netease', 'tencent', 'kuwo', 'kugou', 'migu', 'baidu', 'xiami'];
exports.Config = koishi_1.Schema.intersect([
    koishi_1.Schema.object({
        endpoint: koishi_1.Schema.string()
            .default('https://api.moeyao.cn/meting/?')
            .description('Meting API 地址。可以以 `?`、`/` 或 `?xxx=yyy` 结尾，插件会自动拼接参数。'),
        defaultServer: koishi_1.Schema.union([...exports.SERVERS])
            .default('netease')
            .description('默认使用的音乐平台，也可以在点歌时用 `-s` 临时指定。'),
        requestTimeout: koishi_1.Schema.natural()
            .default(15000)
            .description('单次请求的超时时间（毫秒）。'),
        cacheTTL: koishi_1.Schema.natural()
            .default(600000)
            .description('歌曲信息与歌词的缓存时间（毫秒），填 0 关闭缓存。'),
    }).description('基础设置'),
    koishi_1.Schema.object({
        searchMode: koishi_1.Schema.union(['auto', 'api', 'builtin'])
            .default('auto')
            .description([
            '搜索方式。',
            '- `auto`：先试 API 的 `type=search`，不行再退回内置搜索',
            '- `api`：只用 Meting API 的 `type=search`',
            '- `builtin`：只用插件内置的平台搜索接口',
        ].join('\n')),
        searchLimit: koishi_1.Schema.natural()
            .min(1).max(50)
            .default(5)
            .description('默认返回的搜索结果数量。'),
        listLimit: koishi_1.Schema.natural()
            .min(1).max(50)
            .default(10)
            .description('点歌时结果列表最多展示多少条。'),
        maxKeywordLength: koishi_1.Schema.natural()
            .min(1).max(200)
            .default(50)
            .description('关键词的最大长度，超出会被截断。'),
        selectTimeout: koishi_1.Schema.natural()
            .min(5).max(300)
            .default(30)
            .description('等待用户回复序号的秒数。'),
        autoPlaySingle: koishi_1.Schema.boolean()
            .default(true)
            .description('搜索结果只有一条时直接播放，不再询问。'),
    }).description('搜索设置'),
    koishi_1.Schema.object({
        sendMode: koishi_1.Schema.union(['audio', 'link'])
            .default('audio')
            .description('发送方式：`audio` 发送语音 / 音频元素，`link` 只发送播放链接。'),
        pictureType: koishi_1.Schema.union(['auto', 'pic', 'cover'])
            .default('auto')
            .description('封面接口类型。不同 Meting API 实现分别使用 `pic` 或 `cover`，`auto` 会自动探测。'),
        showCover: koishi_1.Schema.boolean()
            .default(true)
            .description('播放时附带封面图片。'),
        validateAudio: koishi_1.Schema.boolean()
            .default(true)
            .description([
            '点播前先确认接口真的能取到播放地址。',
            '部分 Meting API 遇到 VIP / 版权曲目会返回空响应，开着这项可以避免发出一条坏音频。',
        ].join('\n')),
        showPlatform: koishi_1.Schema.boolean()
            .default(true)
            .description('在歌曲信息中展示所属平台。'),
        lyricMode: koishi_1.Schema.union(['off', 'preview', 'full'])
            .default('off')
            .description('点歌后附带歌词的方式。'),
        lyricPreviewLines: koishi_1.Schema.natural()
            .min(1).max(100)
            .default(8)
            .description('`preview` 模式下展示的歌词行数。'),
    }).description('播放设置'),
]);
//# sourceMappingURL=config.js.map