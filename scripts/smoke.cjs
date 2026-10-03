/**
 * 端到端冒烟测试：直接加载插件，走真实的 Meting API。
 *
 *   node scripts/smoke.cjs [API地址]
 */
const { App } = require('koishi')
const { HTTP } = require('@koishijs/plugin-http')

const endpoint = process.argv[2] || 'https://api.moeyao.cn/meting/?'

function line(title) {
  console.log('\n' + '='.repeat(60) + '\n' + title + '\n' + '='.repeat(60))
}

function show(label, value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  console.log(`  ${label}: ${text.length > 220 ? text.slice(0, 220) + '…' : text}`)
}

async function main() {
  const app = new App({ prefix: ['.', '/'] })
  app.on('internal/error', (e) => console.log('!! internal/error:', e))
  app.on('internal/warning', (e) => console.log('!! internal/warning:', e))
  app.on('error', (e) => console.log('!! error:', e))
  app.plugin(HTTP, {})
  app.plugin(require('../lib'), {
    endpoint,
    defaultServer: 'netease',
    searchMode: 'auto',
    searchLimit: 5,
    cacheTTL: 60000,
    requestTimeout: 20000,
    showCover: true,
  })

  await app.start()
  console.log('app started, endpoint =', endpoint)

  const meting = app.meting
  console.log('ctx.meting 是否注册:', !!meting)
  if (!meting) throw new Error('服务未注册')
  console.log('client.endpoint =', meting.client.endpoint)

  line('1. 搜索（auto 模式）')
  const songs = await meting.search('晴天')
  show('命中', songs.length)
  songs.forEach((s, i) => console.log(`   ${i + 1}. [${s.server}] ${s.name} - ${s.artist} (id=${s.id})`))
  if (!songs.length) throw new Error('搜索没有结果')

  const first = songs[0]

  line('2. 取歌名 / 歌手（type=name, type=artist）')
  show('songName', await meting.songName({ id: '186016', server: 'netease' }))
  show('artist', await meting.artist({ id: '186016', server: 'netease' }))

  line('3. resolve（只有 ID 时补全信息）')
  const song = await meting.resolve('186016', 'netease')
  show('song', song)

  line('4. 播放地址 / 封面（含 302 与封面类型探测）')
  show('api url', meting.url(song))
  show('cover', await meting.cover(song))
  show('探测到的 pictureType', meting.pictureType)
  try {
    show('audioUrl（已校验）', await meting.audioUrl(song))
  } catch (error) {
    show('audioUrl 校验失败（预期：VIP 曲目）', error.message)
  }

  line('5. 歌词')
  const lyric = await meting.lyric(song)
  show('行数', lyric.split('\n').length)
  show('开头', lyric.slice(0, 120))

  line('6. 歌单')
  const playlist = await meting.playlist('2619366284', 'netease', 5)
  show('取到', playlist.length)
  playlist.forEach((s, i) => console.log(`   ${i + 1}. ${s.name} - ${s.artist} (id=${s.id})`))

  line('7. 搜索不支持时的报错类型（builtin 关闭 + 假接口）')
  const app2 = new App({})
  app2.plugin(HTTP, {})
  app2.plugin(require('../lib'), {
    endpoint: 'https://api.moeyao.cn/meting/?',
    searchMode: 'builtin',
    requestTimeout: 20000,
  })
  await app2.start()
  const songs2 = await app2.meting.search('稻香')
  show('内置搜索命中', songs2.length)
  songs2.forEach((s, i) => console.log(`   ${i + 1}. ${s.name} - ${s.artist} (id=${s.id})`))
  await app2.stop()

  line('8. 从搜索结果里找可播放的歌曲')
  let playable = 0
  for (const s of songs) {
    try {
      await meting.audioUrl(s)
      playable++
      console.log(`   ✅ 可播: ${s.name} - ${s.artist}`)
    } catch (error) {
      console.log(`   ❌ 不可播: ${s.name} - ${s.artist} (${error.message.slice(0, 40)})`)
    }
  }
  show('可播数量', `${playable}/${songs.length}`)

  await app.stop()
  console.log('\n✅ 全部通过')
}

main().catch((error) => {
  console.error('\n❌ 失败:', error)
  process.exit(1)
})
