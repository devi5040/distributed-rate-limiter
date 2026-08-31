import type { Redis } from "ioredis";
import type { RateLimiter, RateLimitResult } from "../types.js";

export class LeakyBucket implements RateLimiter {
  private redis: Redis;
  private capacity: number;
  private leakRate: number;
  private windowSeconds: number;

  constructor(
    redis: Redis,
    capacity: number,
    leakRate: number,
    windowSeconds: number,
  ) {
    this.redis = redis;
    this.capacity = capacity;
    this.leakRate = leakRate;
    this.windowSeconds = windowSeconds;
  }

  async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const [allowed, remaining, ttl] = await this.redis.leakyBucket(
      key,
      this.leakRate,
      this.capacity,
      cost,
      this.windowSeconds,
    );

    return {
      allowed: allowed == 1,
      remaining,
      limit: this.capacity,
      resetAt: Date.now() + ttl * 1000,
    };
  }
}
