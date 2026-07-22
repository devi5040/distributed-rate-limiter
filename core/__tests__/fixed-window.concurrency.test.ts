import { FixedWindowLimiter } from "../src/algorithms/fixed-window.js";
import { createRedisClient } from "../src/redis.client.js";

test("exactly `limit` requests succeed under concurrent load", async () => {
  const redis = createRedisClient();
  const limiter = new FixedWindowLimiter(redis, {
    limit: 10,
    windowSeconds: 60,
  });

  const key = `test-${Date.now()}`;

  const results = await Promise.all(
    Array.from({ length: 50 }, () => limiter.consume(key, 1)),
  );

  const allowedCount = results.filter((r) => r.allowed).length;
  expect(allowedCount).toBe(10);

  await redis.quit();
});
