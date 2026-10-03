/**
 * 极简 TTL 缓存。
 *
 * 除了常规的读写，还提供 {@link fetch}：同一 key 的并发请求只会真正回源一次，
 * 避免群里多人同时点同一首歌时把 API 打爆。
 */
export declare class TTLCache<K, V> {
    private ttl;
    private limit;
    private data;
    private pending;
    constructor(ttl: number, limit?: number);
    get(key: K): V | undefined;
    set(key: K, value: V, ttl?: number): void;
    /** 读缓存；未命中时调用 loader 并写入。并发调用共享同一次 loader。 */
    fetch(key: K, loader: () => Promise<V>, ttl?: number): Promise<V>;
    clear(): void;
}
