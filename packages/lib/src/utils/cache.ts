/**
 * Simple in-memory cache utility for frequently accessed data
 * Provides TTL (Time To Live) support and automatic cleanup
 * Compatible with both Node.js and browser environments
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: any = null;

  constructor() {
    // Only set up cleanup interval in Node.js environment
    if (
      typeof globalThis !== "undefined" &&
      typeof setInterval !== "undefined"
    ) {
      // Clean up expired entries every 5 minutes
      this.cleanupInterval = setInterval(
        () => {
          this.cleanup();
        },
        5 * 60 * 1000
      );
    }
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set data in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      expiresAt: now + ttlMs,
      createdAt: now,
    });
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());

    return {
      totalEntries: this.cache.size,
      expiredEntries: entries.filter((entry) => now > entry.expiresAt).length,
      memoryUsage:
        typeof process !== "undefined" && process.memoryUsage
          ? process.memoryUsage()
          : null,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval && typeof clearInterval !== "undefined") {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache key generators
export const CacheKeys = {
  // Dashboard data
  dashboardStats: (userId?: string) => `dashboard:stats:${userId || "global"}`,

  // Economy metrics
  economyMetrics: (timePeriod: string) => `economy:metrics:${timePeriod}`,

  // Player data
  playerLookup: (firstName: string, lastName: string) =>
    `player:lookup:${firstName.toLowerCase()}:${lastName.toLowerCase()}`,

  // Match data
  matchesByTournament: (tournamentId: string, status: string) =>
    `matches:tournament:${tournamentId}:${status}`,

  // User data
  userProfile: (userId: string) => `user:profile:${userId}`,

  // Leaderboard
  leaderboard: (type: string, limit: number) => `leaderboard:${type}:${limit}`,
} as const;

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 2 * 60 * 1000, // 2 minutes
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<T> {
  // Try to get from cache first
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  cache.set(key, data, ttl);

  return data;
}

/**
 * Invalidate cache entries by pattern
 */
export function invalidateCache(pattern: string): void {
  const regex = new RegExp(pattern);
  const keysToDelete: string[] = [];

  for (const key of cache["cache"].keys()) {
    if (regex.test(key)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => cache.delete(key));
}
