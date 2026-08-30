import { Redis } from "ioredis";
import type { RateLimiter, RateLimitResult } from "../types.js";

export class SlidingWindowCounter implements RateLimiter {
  private redis: Redis;
  private limit: number;
  private windowSeconds: number;

  constructor(redis: Redis, limit: number, windowSeconds: number) {
    this.redis = redis;
    this.limit = limit;
    this.windowSeconds = windowSeconds;
  }

  async consume(key: string, cost?: number): Promise<RateLimitResult> {
    const [allowed, remaining, ttl] = await this.redis.slidingWindowCounter(
      `ratelimit:swc:${key}`,
      this.limit,
      this.windowSeconds,
    );

    return {
      allowed: allowed == 1,
      remaining,
      limit: this.limit,
      resetAt: Date.now() + ttl * 1000,
    };
  }
}
