import "ioredis";
import type {
  LuaFixedWindowResponse,
  LuaTokenBucketResponse,
} from "./types.ts";

declare module "ioredis" {
  interface RedisCommander<Context> {
    fixedWindow(
      key: string,
      limit: number | string,
      windowSeconds: number | string,
      cost: number | string,
    ): Promise<LuaFixedWindowResponse>;
    tokenBucket(
      key: string,
      cost: number | string,
      capacity: number | string,
      refillRate: number | string,
      windowSeconds: number | string,
    ): Promise<LuaTokenBucketResponse>;
  }
}
