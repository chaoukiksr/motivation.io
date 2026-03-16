/**
 * cache.js — Lightweight in-memory TTL cache
 *
 * Design rationale
 * ────────────────
 * This system makes up to 3 model calls per user request:
 *   1. generateMotivationLetter  (Opus  — expensive)
 *   2. analyzeOfferFit           (Haiku — ~1 800 input tokens)
 *   3. extractProgramInfo        (Haiku — ~900 input tokens)
 *
 * Calls 2 and 3 are pure functions of (cvText, offerUrl) and offerUrl
 * respectively. They produce identical output for the same inputs, so
 * running them on every request is pure waste.
 *
 * The scraping step is also deterministic for a given URL within a
 * reasonable time window — re-fetching the same page on every regen
 * burns network time and risks rate-limiting from university servers.
 *
 * A Map-based singleton is sufficient for a single-process deployment.
 * To scale horizontally, replace `_store` with Redis calls while keeping
 * the same `cacheGet` / `cacheSet` interface — no callers need to change.
 *
 * Cache entries
 * ─────────────
 *   offer:<url>               → scraped offer text          TTL 7 days
 *   programInfo:<url>         → { universityName, masterAcronym }  TTL 7 days
 *   offerFit:<cvHash>:<url>   → analyzeOfferFit result      TTL 7 days
 *
 * Stats are exposed via cacheStats() and surfaced on the /cache-stats
 * health endpoint so you can confirm hits are accumulating in production.
 */

const _store  = new Map()
let   _hits   = 0
let   _misses = 0

/**
 * Retrieve a cached value.
 * Returns `undefined` on miss or expiry (expired entries are pruned lazily).
 *
 * @param {string} key
 * @returns {any | undefined}
 */
export function cacheGet(key) {
  const entry = _store.get(key)

  if (!entry) {
    _misses++
    return undefined
  }

  if (Date.now() > entry.expiresAt) {
    _store.delete(key)
    _misses++
    return undefined
  }

  _hits++
  return entry.value
}

/**
 * Store a value with a TTL.
 *
 * @param {string} key
 * @param {any}    value
 * @param {number} ttlMs  - Time to live in milliseconds
 */
export function cacheSet(key, value, ttlMs) {
  _store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

/**
 * Return hit/miss counters and current entry count.
 * Used by the /cache-stats health endpoint.
 *
 * @returns {{ size: number, hits: number, misses: number, hitRate: string }}
 */
export function cacheStats() {
  console.log('hello world');
  
  const total   = _hits + _misses
  const hitRate = total === 0 ? 'n/a' : `${(((_hits / total) * 100)).toFixed(1)}%`
  return { size: _store.size, hits: _hits, misses: _misses, hitRate }
}
