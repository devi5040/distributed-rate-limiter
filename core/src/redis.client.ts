import { Redis } from "ioredis";
import type { RedisOptions } from "ioredis";
import fs from "fs";
import path from "path";

export function createRedisClient(options?: RedisOptions): Redis {
  const redis = new Redis({
    host: "localhost",
    port: 6379,
    ...options,
  });

  redis.defineCommand("fixedWindow", {
    numberOfKeys: 1,
    lua: fs.readFileSync(
      path.join(__dirname, "../scripts/fixed-window.lua"),
      "utf-8",
    ),
  });

  return redis;
}
