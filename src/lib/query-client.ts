type CacheEntry<T> = {
  data: T
  timestamp: number
  expiresAt: number
}

class QueryClient {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultStaleTime = 60 * 1000 // 1 minute

  getCached<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }

  setCache<T>(key: string, data: T, staleTime?: number) {
    const time = staleTime ?? this.defaultStaleTime
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + time,
    })
  }

  invalidate(keyPrefix: string) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key)
      }
    }
  }

  clear() {
    this.cache.clear()
  }
}

export const queryClient = new QueryClient()
