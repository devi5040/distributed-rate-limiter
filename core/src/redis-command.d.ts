import "ioredis";
import type { LuaResponse } from "./types.ts";

declare module "ioredis" {
  interface RedisCommander<Context> {
    fixedWindow(
      key: string,
      limit: number | string,
      windowSeconds: number | string,
      cost: number | string,
    ): Promise<LuaResponse>;
    tokenBucket(
      key: string,
      cost: number | string,
      capacity: number | string,
      refillRate: number | string,
      windowSeconds: number | string,
    ): Promise<LuaResponse>;
    slidingWindowLog(
      key: string,
      limit: number | string,
      windowSeconds: number | string,
      uniqueId: number | string,
    ): Promise<LuaResponse>;

    slidingWindowCounter(
      key: string,
      limit: number | string,
      windowSeconds: number | string,
    ): Promise<LuaResponse>;

    leakyBucket(
      key: string,
      capacity: number | string,
      leakRate: number | string,
      cost: number | string,
      windowSeconds: number | string,
    ): Promise<LuaResponse>;
  }
}
