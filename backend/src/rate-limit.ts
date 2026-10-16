// Minimal in-memory fixed-window rate limiter.
// No external dependencies; suitable because the backend runs as a single instance.
// Counters are lost on restart, which is acceptable for brute-force throttling.

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {
    // Periodically drop expired buckets so memory stays bounded
    setInterval(() => this.prune(), 60 * 1000).unref();
  }

  /** Seconds until the key may try again, or 0 if it is not currently limited. */
  retryAfter(key: string): number {
    const bucket = this.buckets.get(key);
    const now = Date.now();
    if (!bucket || bucket.resetAt <= now || bucket.count < this.max) {
      return 0;
    }
    return Math.ceil((bucket.resetAt - now) / 1000);
  }

  /** Record one event for the key. */
  hit(key: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      bucket.count++;
    }
  }

  /** Clear the key's counter (e.g. after a successful login). */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// All password login attempts per client IP
export const loginIpLimiter = new RateLimiter(10, FIFTEEN_MINUTES);

// Failed password logins per username (protects a single account from distributed guessing)
export const loginUserLimiter = new RateLimiter(5, FIFTEEN_MINUTES);

// OIDC login initiations per client IP (each one allocates server-side state)
export const oidcIpLimiter = new RateLimiter(30, FIFTEEN_MINUTES);
