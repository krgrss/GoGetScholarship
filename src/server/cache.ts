/**
 * Simple in-memory TTL cache for server-side helpers.
 * - Not meant for multi-instance deployments; suitable for local dev / hackathon.
 * - Keyed by a string (e.g. JSON of {query, filters, version}).
 */
type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs: number) {
  const expiresAt = Date.now() + ttlMs
  store.set(key, { value, expiresAt })
}

