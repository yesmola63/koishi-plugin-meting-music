import { Context } from 'koishi';
import { Config } from './config';
export declare const name = "meting-music";
/** 需要 http 服务；Meting 的请求全部走 ctx.http */
export declare const inject: {
    required: string[];
};
export * from './types';
export * from './config';
export * from './format';
export { MetingClient, MetingAPIError, normalizeEndpoint } from './client';
export { MetingService, type SearchOptions } from './service';
export { SearchUnsupportedError, type SearchStrategy, type BuiltinProvider } from './search';
export declare function apply(ctx: Context, config: Config): void;
