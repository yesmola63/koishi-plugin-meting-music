# koishi-plugin-meting-music

> 🚧 **开发中（Work in Progress）**
>
> 当前版本 `0.1.0-dev.1`，接口与配置项仍可能变动，请勿用于生产环境。
> 已实现并实测通过：点歌、搜索、按 ID 点歌、歌词、封面、歌单。
> 计划中的功能见文末「后续可以加的」。

基于 [Meting API](https://github.com/metowolf/Meting) 的 Koishi 音乐点播插件：点歌、搜索、歌词、封面、歌单。

已实测兼容两种 Meting API 实现：

| 实现 | 例 | 搜索返回的字段 |
| --- | --- | --- |
| 上游 injahow/meting-api | `https://api.moeyao.cn/meting/?` | **不支持 `type=search`**，插件自动退回内置搜索 |
| 二改版 / metowolf Meting-API | `https://meting.mikus.ink/api` | `{ title, author, pic, url, lrc }` |

两种字段命名（`name/artist/cover` 与 `title/author/pic`）都已兼容。

## 功能

- `点歌 <关键词>` —— 搜索后列出结果，回复序号即可播放
- `搜索 <关键词>` —— 同样列出结果并可回复序号播放，区别是**只有一条结果时也会先列出来**
- `按id点歌 <id>` —— 已知歌曲 ID 时直接点播
- `歌词 <id>` —— 查看完整歌词
- `点歌单 <id>` —— 从歌单里挑一首播放
- `音乐平台` —— 查看可用平台

播放时会发送「歌名 - 歌手」+ 封面 + 音频元素，可选附带歌词（`off` / `preview` / `full`）。

## 安装

```bash
npm i koishi-plugin-meting-music
```

也可以直接从 GitHub 安装（仓库已包含编译产物 `lib/`，不需要本地构建）：

```bash
npm i github:yesmola63/koishi-plugin-meting-music
```

如果 npm 在准备 git 依赖时报 `EALLOWSCRIPTS`（例如 `.npmrc` 里设置了 npm 11 的
`allow-scripts` 白名单），可以改用 Release 里附带的 tar 包，这条路径不经过 git 子安装：

```bash
npm i https://github.com/yesmola63/koishi-plugin-meting-music/releases/download/v0.1.0-dev.1/koishi-plugin-meting-music-0.1.0-dev.1.tgz
```

> 仓库里提交了 `lib/` 是为了让 git 安装开箱即用（避免安装时执行构建脚本）。
> 改动 `src/` 后请执行 `npm run build` 再提交，否则 `lib/` 会与源码不一致。

在 `koishi.yml` 里启用（`http` 服务是本插件的硬依赖，标准 Koishi 模板自带）：

```yaml
plugins:
  ~http: {}
  meting-music:
    endpoint: https://api.moeyao.cn/meting/?
    defaultServer: netease
    searchMode: auto
    searchLimit: 5
```

## 配置

### 基础设置

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `endpoint` | `https://api.moeyao.cn/meting/?` | Meting API 地址。以 `?`、`/` 或 `?xxx=yyy` 结尾都可以，插件会自动拼接参数 |
| `defaultServer` | `netease` | 默认平台，点歌时可用 `-s` 临时覆盖 |
| `requestTimeout` | `15000` | 单次请求超时（毫秒） |
| `cacheTTL` | `600000` | 歌曲信息与歌词的缓存时间（毫秒），填 0 关闭 |

### 搜索设置

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `searchMode` | `auto` | `auto` 先试 API 的 `type=search`，不行再退回内置搜索；`api` 只用 API；`builtin` 只用内置 |
| `searchLimit` | `5` | 默认返回的结果数量 |
| `listLimit` | `10` | 结果列表最多展示多少条 |
| `maxKeywordLength` | `50` | 关键词最大长度 |
| `selectTimeout` | `30` | 等待用户回复序号的秒数 |
| `autoPlaySingle` | `true` | 只有一条结果时直接播放 |

### 播放设置

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `sendMode` | `audio` | `audio` 发送音频元素，`link` 只发播放链接 |
| `pictureType` | `auto` | 封面接口用 `pic` 还是 `cover`，`auto` 会探测 |
| `showCover` | `true` | 是否附带封面 |
| `showPlatform` | `true` | 是否展示平台名 |
| `validateAudio` | `true` | 点播前先确认接口真的能取到播放地址 |
| `lyricMode` | `off` | 点歌后附带歌词的方式：`off` / `preview` / `full` |
| `lyricPreviewLines` | `8` | `preview` 模式展示的歌词行数 |

## 指令

```
点歌 <关键词>          搜索并列出结果，回复序号播放
搜索 <关键词>          同上，但只有一条结果时也会先列出来
按id点歌 <id>          已知歌曲 ID 时直接点播
歌词 <id>              查看歌词
点歌单 <id>            从歌单里挑一首播放
音乐平台               查看可用平台
```

通用选项：`-s <平台>`、`-n <数量>`、`-p <页码>`、`-d`（直接播放第一条）、`-l`（附带完整歌词）。

选项写在关键词前面或后面都可以：

```
点歌 晴天
点歌 晴天 -s tencent
点歌 -s tencent 晴天 -n 10
```

子指令支持点号与空格两种写法，效果一致：

```
.music.search 稻香
.music search 稻香
.搜索 稻香
```

> 群聊里需要带指令前缀（默认 `/` 或 `.`），私聊不需要。

## 关于搜索

上游 `injahow/meting-api` 的 `index.php` **没有实现 `type=search`**，会直接返回 `{"error":"unknown type"}`（`https://api.moeyao.cn/meting/?` 就是这一类）。二改版与 `metowolf/Meting-API` 才支持。

所以插件内置了平台搜索兜底，`searchMode` 默认 `auto` 时：

1. 先请求 `type=search`；
2. 如果 API 明确不支持（返回错误体），再走插件内置的平台搜索接口（目前实现了 `netease`）；
3. 两者都不行时给出明确提示，而不是静默失败。

想扩展其它平台，只要往 `src/search.ts` 的 `builtinProviders` 里加一个函数即可。

### 字段名兼容

不同 Meting 实现的 `type=search` 返回字段并不统一，插件两套都认：

| 实现 | 曲名 | 歌手 | 封面 |
| --- | --- | --- | --- |
| APlayer / MetingJS | `name` | `artist` | `cover` |
| 二改版（如 meting.mikus.ink） | `title` | `author` | `pic` |

封面接口本身也有 `type=pic` 与 `type=cover` 两种，`pictureType: auto` 会自动探测。

## 关于 VIP / 版权曲目

Meting 取播放地址的接口在遇到 VIP / 版权曲目、或匿名 Cookie 权限不足时，会返回一个**空的 200 响应**（既没有 `Location` 头，也没有内容体）。直接播放就会发出一条坏音频。

插件默认开启 `validateAudio`：播放前先探测一次（带 `Range: bytes=0-0`，最多只下载 1 个字节），确认取得到地址再发；取不到就提示：

> ⚠️ 接口没有返回播放地址，可能是 VIP / 版权曲目（需要在该 Meting API 上配置平台 Cookie）

要让这些歌能播，需要在你自己的 Meting API 上配置平台 Cookie（`meting-api-ported/config.php` 里的 `$PLATFORM_COOKIES`，或官方版的 cookie 设置）。QQ 音乐的热门曲必须配，网易云配了能提高成功率。

## 插件 API

插件注册了一个 `meting` 服务，别的插件可以直接注入使用：

```ts
export const inject = ['meting']

export function apply(ctx: Context) {
  const songs = await ctx.meting.search('晴天', { server: 'netease', limit: 5 })
  const url = await ctx.meting.audioUrl(songs[0])   // 已校验可用
  const lyric = await ctx.meting.lyric(songs[0])
}
```

`MetingService` 上可用的方法：

| 方法 | 说明 |
| --- | --- |
| `search(keyword, options?)` | 搜索，返回 `Song[]` |
| `resolve(id, server?)` | 只有 ID 时补全歌名与歌手 |
| `songName(ref)` / `artist(ref)` | 单独取歌名 / 歌手 |
| `url(ref)` | API 的播放跳转地址（不校验） |
| `audioUrl(ref)` | 已校验可播的地址，取不到会抛 `MetingAPIError` |
| `cover(ref)` | 封面地址（自动探测 `pic` / `cover`） |
| `lyric(ref)` | 歌词原文 |
| `playlist(id, server?, limit?)` | 歌单歌曲列表 |
| `client` | 裸的 `MetingClient`，可自行拼请求 |

`MetingClient` 提供 `url()`、`request()`、`probe()`，以及导出的 `normalizeEndpoint()`、`readError()`、`parseArray()` 等工具函数。

## 本地开发

```bash
npm install
npm run build        # 产出 lib/
npm run typecheck

# 直接打真实 API 的冒烟测试
npm run test:smoke

# 用 Koishi 官方 Mock 适配器跑完整聊天交互
npm run test:e2e
```

两个测试脚本都接受一个 API 地址参数：

```bash
node scripts/smoke.cjs http://127.0.0.1:3000/meting/?
```

### 本地起一个 Meting API

- `meting-api/`（PHP 版）需要 PHP 运行环境；
- `Meting-API-mikus-loli/` 是 Node 版，`npm i && npm start` 即可，而且支持 `type=search`，正好可以用来验证搜索的 API 路径。

## 目录结构

```
src/
  index.ts      插件入口：元信息、配置、apply()
  config.ts     Schema 配置定义
  service.ts    ctx.meting 服务（搜索 / 信息 / 缓存 / 封面探测）
  client.ts     Meting API 裸客户端（拼地址、请求、错误体识别、探测）
  search.ts     搜索策略：API 搜索 + 内置平台搜索
  commands.ts   指令定义与「搜索 → 选择 → 播放」流程
  format.ts     展示格式与歌词预览
  cache.ts      带并发去重的 TTL 缓存
  types.ts      数据结构
scripts/
  smoke.cjs         服务层冒烟测试（真实 API）
  e2e-command.cjs   指令层端到端测试（Mock 适配器）
```

## 更新日志

### 0.1.0-dev.1

修复实测反馈的三个问题：

- **曲名全部显示「未知歌曲」**：`type=search` 的返回字段随实现而异，之前只读 `name`，
  遇到返回 `title` 的实现（如 `https://meting.mikus.ink/api`）就拿不到曲名。
  现在 `name/title/songName`、`artist/author/singer`、`cover/pic` 都兼容。
- **`music search 晴天`（空格写法）把 `search` 当成关键词**：Koishi 不会把
  `music search X` 路由到子指令 `music.search`，现在根指令里做了兜底分发，
  点号与空格两种写法结果一致。
- **`搜索` 指令没有选择环节**：之前 `搜索` 只列结果，无法回复序号。
  现在同样可以回复序号播放，与 `点歌` 的区别只剩「只有一条结果时也会先列出来」。

### 0.1.0-dev.0

首个开发版：点歌 / 搜索 / 按 ID 点歌 / 歌词 / 封面 / 歌单，播放地址预校验，封面接口自动探测。

## 后续可以加的

- 每个用户 / 频道的默认平台（需要 database 支持）
- 点歌队列与顺序播放
- 更多平台的 `builtinProviders`（QQ 音乐等）
- 语音 / 文件发送模式
- 多语言文案（i18n）

## License

MIT
