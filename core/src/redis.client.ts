import { Redis } from "ioredis";
import type { RedisOptions } from "ioredis";
import fs from "fs";

export function createRedisClient(options?: RedisOptions): Redis {
  const redis = new Redis({
    host: "localhost",
    port: 6379,
    ...options,
  });

  redis.defineCommand("fixedWindow", {
    numberOfKeys: 1,
    lua: fs.readFileSync(
      "/distributed-rate-limiter/core/scripts/fixed-window.lua",
      "utf-8",
    ),
  });

  redis.defineCommand("tokenBucket", {
    numberOfKeys: 1,
    lua: fs.readFileSync(
      "/distributed-rate-limiter/core/scripts/token-bucket.lua",
      "utf-8",
    ),
  });

  redis.defineCommand("slidingWindowLog", {
    numberOfKeys: 1,
    lua: fs.readFileSync(
      "/distributed-rate-limiter/core/scripts/sliding-window-log.lua",
      "utf-8",
    ),
  });

  redis.defineCommand("slidingWindowCounter", {
    numberOfKeys: 1,
    lua: fs.readFileSync(
      "/distributed-rate-limiter/core/scripts/sliding-window-counter.lua",
      "utf-8",
    ),
  });

  return redis;
}
