interface Entry<V> {
  value: V
  expire: number
}

/**
 * 极简 TTL 缓存。
 *
 * 除了常规的读写，还提供 {@link fetch}：同一 key 的并发请求只会真正回源一次，
 * 避免群里多人同时点同一首歌时把 API 打爆。
 */
export class TTLCache<K, V> {
  private data = new Map<K, Entry<V>>()
  private pending = new Map<K, Promise<V>>()

  constructor(private ttl: number, private limit = 512) {}

  get(key: K): V | undefined {
    const entry = this.data.get(key)
    if (!entry) return
    if (entry.expire <= Date.now()) {
      this.data.delete(key)
      return
    }
    return entry.value
  }

  set(key: K, value: V, ttl = this.ttl): void {
    if (ttl <= 0) return
    // 容量上限：直接淘汰最早插入的一项，够用且 O(1)
    if (this.data.size >= this.limit) {
      const oldest = this.data.keys().next()
      if (!oldest.done) this.data.delete(oldest.value)
    }
    this.data.set(key, { value, expire: Date.now() + ttl })
  }

  /** 读缓存；未命中时调用 loader 并写入。并发调用共享同一次 loader。 */
  fetch(key: K, loader: () => Promise<V>, ttl = this.ttl): Promise<V> {
    const cached = this.get(key)
    if (cached !== undefined) return Promise.resolve(cached)

    const running = this.pending.get(key)
    if (running) return running

    const task = loader()
      .then((value) => {
        this.set(key, value, ttl)
        return value
      })
      .finally(() => {
        this.pending.delete(key)
      })

    this.pending.set(key, task)
    return task
  }

  clear(): void {
    this.data.clear()
  }
}
