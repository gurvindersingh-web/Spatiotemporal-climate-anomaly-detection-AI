/**
 * In-memory cache with TTL support.
 * Keys are strings, values are any serializable data.
 */

class CacheStore {
  constructor() {
    /** @type {Map<string, { value: any, expiresAt: number }>} */
    this.store = new Map();
    this.stats = { hits: 0, misses: 0, sets: 0 };

    // Cleanup expired entries every 5 minutes
    this._cleanupInterval = setInterval(() => this._cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get a cached value by key.
   * @param {string} key
   * @returns {any|null} The cached value or null if expired/missing.
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a cache entry.
   * @param {string} key
   * @param {any} value
   * @param {number} ttlMs - Time to live in milliseconds (default: 1 hour)
   */
  set(key, value, ttlMs = 3600000) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.stats.sets++;
  }

  /**
   * Check if key exists and is not expired.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a specific key.
   * @param {string} key
   */
  delete(key) {
    this.store.delete(key);
  }

  /** Clear all entries. */
  clear() {
    this.store.clear();
  }

  /** Get cache statistics. */
  getStats() {
    return {
      ...this.stats,
      size: this.store.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1) + '%'
        : '0%',
    };
  }

  /** Remove expired entries. */
  _cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      // Minimal logging — only if something was cleaned
    }
  }

  /** Stop the cleanup interval (for graceful shutdown). */
  destroy() {
    clearInterval(this._cleanupInterval);
  }
}

// Singleton cache instances
export const baselineCache = new CacheStore();   // Long TTL — 24 hours
export const currentCache = new CacheStore();     // Short TTL — 10 minutes
export const timeseriesCache = new CacheStore();  // Medium TTL — 6 hours

export default CacheStore;
