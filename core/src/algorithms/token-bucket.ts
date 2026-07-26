import { Redis } from "ioredis";
import type { RateLimiter, RateLimitResult } from "../types.js";

export class TokenBucketLimiter implements RateLimiter {
  private redis: Redis;
  private capacity: number;
  private refillRate: number;
  private windowSeconds: number;

  constructor(
    redis: Redis,
    capacity: number,
    refillRate: number,
    windowSeconds: number,
  ) {
    this.redis = redis;
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.windowSeconds = windowSeconds;
  }

  async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const redisKey = `ratelimit:token-bucket:${key}`;

    const [allowed, remaining, ttl] = await this.redis.tokenBucket(
      redisKey,
      cost,
      this.capacity,
      this.refillRate,
      this.windowSeconds,
    );

    return {
      allowed: allowed == 1,
      remaining,
      resetAt: Date.now() + ttl * 1000,
      limit: this.capacity,
    };
  }
}
