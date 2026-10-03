/**
 * 指令端到端测试：用 Koishi 官方 Mock 适配器跑完整的聊天交互。
 *
 * 两个注意点：
 * 1. 群聊消息里指令必须带前缀（私聊不需要），所以这里统一用 `.` 开头；
 * 2. MessageClient.receive 的回复收集时序对异步指令不友好，这里直接往 bot
 *    投递消息事件，并拦截 client.flush 收集机器人真正发出的内容。
 *
 *   node scripts/e2e-command.cjs [API地址]
 */
const { App, clone, h } = require('koishi')
const { HTTP } = require('@koishijs/plugin-http')
const Mock = require('@koishijs/plugin-mock')

const endpoint = process.argv[2] || 'https://api.moeyao.cn/meting/?'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let messageId = 0
const sent = []

function title(text) {
  console.log('\n' + '='.repeat(64) + '\n' + text + '\n' + '='.repeat(64))
}

function dump(replies) {
  if (!replies.length) {
    console.log('   (没有回复)')
    return
  }
  replies.forEach((reply, i) => {
    console.log(`   [${i}] ${reply.replace(/\n/g, '\n       ')}`)
  })
}

async function main() {
  const app = new App({ prefix: ['/', '.'] })
  app.on('internal/error', (e) => console.log('!! internal/error:', e))
  app.plugin(HTTP, {})
  app.plugin(Mock.default ?? Mock, { selfId: '514' })
  app.plugin(require('../lib'), {
    endpoint,
    defaultServer: 'netease',
    searchMode: 'auto',
    searchLimit: 5,
    listLimit: 5,
    selectTimeout: 15,
    showCover: true,
    lyricMode: 'preview',
    lyricPreviewLines: 3,
  })

  await app.start()
  app.command('ping', '连通性对照').action(() => 'pong')
  console.log('app.mock =', !!app.mock, '| app.meting =', !!app.meting)

  const client = app.mock.client('user-1', 'channel-1')

  // 拦截机器人真正发出去的内容
  const originalFlush = client.flush.bind(client)
  client.flush = (buffer) => {
    if (buffer) sent.push(buffer)
    return originalFlush(buffer)
  }

  /** 发一条消息，等一会，返回这段时间里机器人发出的内容 */
  async function talk(content, wait = 5000) {
    sent.length = 0
    client.bot.receive({
      ...clone(client.event),
      message: { id: String(++messageId), content, elements: h.parse(content) },
    }, client)
    await sleep(wait)
    return sent.slice()
  }

  /** 清掉上一步可能残留的「等待序号」状态 */
  async function clearPending() {
    sent.length = 0
    client.bot.receive({
      ...clone(client.event),
      message: { id: String(++messageId), content: '0', elements: h.parse('0') },
    }, client)
    await sleep(500)
    sent.length = 0
  }

  /** 独立场景：先清残留，再发指令 */
  async function step(content, wait) {
    await clearPending()
    return talk(content, wait)
  }

  title('0. 对照组：.ping（带指令前缀）')
  dump(await step('.ping', 1000))

  title('1. .点歌 晴天 —— 应返回结果列表并等待选择')
  dump(await step('.点歌 晴天'))

  title('2. 回复序号 1 —— 应播放第一首')
  dump(await talk('1', 8000))

  title('3. .点歌 晴天 -d —— 选项在关键词后面，应直接播放')
  dump(await step('.点歌 晴天 -d', 8000))

  title('4. .点歌 -s netease 晴天 -n 3 —— 选项在关键词前面')
  dump(await step('.点歌 -s netease 晴天 -n 3', 6000))

  title('5. .搜索 稻香 -n 3 —— 只搜索，不播放')
  dump(await step('.搜索 稻香 -n 3'))

  title('6. .按id点歌 186016 —— VIP 曲目，应给出友好提示')
  dump(await step('.按id点歌 186016', 8000))

  title('7. .歌词 186016')
  dump(await step('.歌词 186016', 8000))

  title('8. .点歌单 2619366284 -n 5')
  dump(await step('.点歌单 2619366284 -n 5', 8000))

  title('9. .音乐平台')
  dump(await step('.音乐平台', 1000))

  title('10. .点歌（无参数）—— 应返回用法')
  dump(await step('.点歌', 1000))

  title('11. 取消流程：点歌后回复 0')
  dump(await step('.点歌 晴天'))
  dump(await talk('0', 2000))

  title('12. 无效输入后重试：先回 abc 再回 2')
  await clearPending()
  dump(await talk('.点歌 晴天'))
  dump(await talk('abc', 2000))
  dump(await talk('2', 8000))

  title('13. 等待超时（selectTimeout=15s）')
  const startedAt = Date.now()
  dump(await step('.点歌 晴天', 18000))
  console.log(`   （耗时 ${Math.round((Date.now() - startedAt) / 1000)}s）`)

  console.log('\n✅ 端到端流程跑完')
  process.exit(0)
}

main().catch((error) => {
  console.error('\n❌ 失败:', error)
  process.exit(1)
})
