import type { Redis } from "ioredis";
import type {
  LuaFixedWindowResponse,
  RateLimiter,
  RateLimiterOptions,
  RateLimitResult,
} from "../types.js";

export class FixedWindowLimiter implements RateLimiter {
  private redis: Redis;
  private limit: number;
  private windowSeconds: number;

  constructor(redis: Redis, options: RateLimiterOptions) {
    this.redis = redis;
    this.limit = options.limit;
    this.windowSeconds = options.windowSeconds;
  }

  async consume(key: string, cost = 1): Promise<RateLimitResult> {
    const redisKey = `ratelimit:fixed:${key}`;
    const [allowed, remaining, ttl] = (await this.redis.fixedWindow(
      redisKey,
      this.limit,
      this.windowSeconds,
      cost,
    )) as LuaFixedWindowResponse;

    return {
      allowed: allowed === 1,
      remaining,
      resetAt: Date.now() + ttl * 1000,
      limit: this.limit,
    };
  }
}
