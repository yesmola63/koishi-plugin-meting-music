import { Context } from 'koishi'
import { applyCommands } from './commands'
import { Config } from './config'
import { MetingService } from './service'

export const name = 'meting-music'

/** 需要 http 服务；Meting 的请求全部走 ctx.http */
export const inject = { required: ['http'] }

export * from './types'
export * from './config'
export * from './format'
export { MetingClient, MetingAPIError, normalizeEndpoint } from './client'
export { MetingService, type SearchOptions } from './service'
export { SearchUnsupportedError, type SearchStrategy, type BuiltinProvider } from './search'

export function apply(ctx: Context, config: Config) {
  ctx.plugin(MetingService, config)
  // 服务是在下一个 tick 才注册完成的，必须等依赖就绪后再注册指令
  ctx.inject(['meting'], (ctx) => {
    applyCommands(ctx, config, ctx.meting)
  })
}
