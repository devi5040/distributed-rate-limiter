import { Redis } from "ioredis";
import type { RateLimiter, RateLimitResult } from "../types.js";
import { v4 as uuidv4 } from "uuid";

export class SlidingWindowLogLimiter implements RateLimiter {
  private redis: Redis;
  private limit: number;
  private windowSeconds: number;

  constructor(redis: Redis, limit: number, windowSeconds: number) {
    this.redis = redis;
    this.limit = limit;
    this.windowSeconds = windowSeconds;
  }

  async consume(key: string): Promise<RateLimitResult> {
    let uniqueId = uuidv4();

    const [allowed, remaining, ttl] = await this.redis.slidingWindowLog(
      key,
      this.limit,
      this.windowSeconds,
      uniqueId,
    );

    return {
      allowed: allowed == 1,
      remaining,
      limit: this.limit,
      resetAt: Date.now() + ttl * 1000,
    };
  }
}
