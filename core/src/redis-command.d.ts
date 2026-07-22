import "ioredis";
import type { LuaFixedWindowResponse } from "./types.ts";

declare module "ioredis" {
  interface RedisCommander<Context> {
    fixedWindow(
      key: string,
      limit: number | string,
      windowSeconds: number | string,
      cost: number | string,
    ): Promise<LuaFixedWindowResponse>;
  }
}
