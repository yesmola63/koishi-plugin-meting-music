"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTLCache = void 0;
/**
 * 极简 TTL 缓存。
 *
 * 除了常规的读写，还提供 {@link fetch}：同一 key 的并发请求只会真正回源一次，
 * 避免群里多人同时点同一首歌时把 API 打爆。
 */
class TTLCache {
    constructor(ttl, limit = 512) {
        this.ttl = ttl;
        this.limit = limit;
        this.data = new Map();
        this.pending = new Map();
    }
    get(key) {
        const entry = this.data.get(key);
        if (!entry)
            return;
        if (entry.expire <= Date.now()) {
            this.data.delete(key);
            return;
        }
        return entry.value;
    }
    set(key, value, ttl = this.ttl) {
        if (ttl <= 0)
            return;
        // 容量上限：直接淘汰最早插入的一项，够用且 O(1)
        if (this.data.size >= this.limit) {
            const oldest = this.data.keys().next();
            if (!oldest.done)
                this.data.delete(oldest.value);
        }
        this.data.set(key, { value, expire: Date.now() + ttl });
    }
    /** 读缓存；未命中时调用 loader 并写入。并发调用共享同一次 loader。 */
    fetch(key, loader, ttl = this.ttl) {
        const cached = this.get(key);
        if (cached !== undefined)
            return Promise.resolve(cached);
        const running = this.pending.get(key);
        if (running)
            return running;
        const task = loader()
            .then((value) => {
            this.set(key, value, ttl);
            return value;
        })
            .finally(() => {
            this.pending.delete(key);
        });
        this.pending.set(key, task);
        return task;
    }
    clear() {
        this.data.clear();
    }
}
exports.TTLCache = TTLCache;
//# sourceMappingURL=cache.js.map