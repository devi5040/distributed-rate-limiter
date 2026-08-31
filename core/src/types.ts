export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export interface RateLimiterOptions {
  limit: number;
  windowSeconds: number;
}

export interface RateLimiter {
  consume(key: string, cost?: number): Promise<RateLimitResult>;
}

export type LuaResponse = [number, number, number];
