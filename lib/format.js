"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_LABELS = void 0;
exports.serverLabel = serverLabel;
exports.songTitle = songTitle;
exports.formatDuration = formatDuration;
exports.cleanLyric = cleanLyric;
exports.lyricPreview = lyricPreview;
/** 平台标识 -> 展示名 */
exports.SERVER_LABELS = {
    netease: '网易云音乐',
    tencent: 'QQ 音乐',
    kuwo: '酷我音乐',
    kugou: '酷狗音乐',
    migu: '咪咕音乐',
    baidu: '百度音乐',
    xiami: '虾米音乐',
};
function serverLabel(server) {
    return exports.SERVER_LABELS[server] ?? server;
}
/** `歌名 - 歌手`，没有歌手时只返回歌名 */
function songTitle(song) {
    return song.artist ? `${song.name} - ${song.artist}` : song.name;
}
/** 秒数 -> `m:ss` */
function formatDuration(seconds) {
    if (!seconds || seconds <= 0)
        return '';
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return `${minutes}:${String(rest).padStart(2, '0')}`;
}
/** LRC 的时间标签 */
const TIMESTAMP = /\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/;
/** 歌词文件头部的制作人员信息 */
const CREDIT = /^(作?词|作?曲|编曲|制作人|吉他|贝斯|鼓|录音|混音|和声|监制|出品|发行|统筹|配唱|母带|OP|SP)\s*[:：]/;
function strip(line) {
    return line.replace(/\[[^\]]*\]/g, '').trim();
}
/** 去掉时间标签与制作人员信息，得到可以直接阅读的歌词 */
function cleanLyric(lyric) {
    return lyric
        .split('\n')
        .map(strip)
        .filter((line) => line && !CREDIT.test(line))
        .join('\n');
}
/**
 * 从 LRC 里挑出用于预览的歌词行。
 *
 * 只保留带时间标签的行，因此没有时间标签的标题行会被自然过滤掉；
 * 带时间标签的「作词 / 作曲」一类元信息行再单独排除。
 */
function lyricPreview(lyric, lines) {
    const result = [];
    for (const raw of lyric.split('\n')) {
        if (!TIMESTAMP.test(raw))
            continue;
        const text = strip(raw);
        if (!text || CREDIT.test(text))
            continue;
        result.push(text);
        if (result.length >= lines)
            break;
    }
    return result.join('\n');
}
//# sourceMappingURL=format.js.map