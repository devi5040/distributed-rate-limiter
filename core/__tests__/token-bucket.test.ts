import { createRedisClient } from "../src/redis.client.js";
import { TokenBucketLimiter } from "../src/algorithms/token-bucket.js";
import { Redis } from "ioredis";

describe("TokenBucketLimiter", () => {
  let redis: Redis;

  beforeAll(() => {
    redis = createRedisClient();
  });

  afterAll(async () => {
    await redis.quit();
  });

  const uniqueKey = (label: string) =>
    `test-${label}-${Date.now()}-${Math.random()}`;
  const WINDOW_SECONDS = 3600;

  test("normal request flow: single request within capacity is allowed", async () => {
    const key = uniqueKey("normal");
    const limiter = new TokenBucketLimiter(redis, 10, 1, WINDOW_SECONDS);

    const result = await limiter.consume(key, 1);

    expect(result.allowed).toBe(true);
  });

  test("burst traffic: N requests up to capacity all succeed immediately", async () => {
    const key = uniqueKey("burst");
    const capacity = 10;
    const limiter = new TokenBucketLimiter(redis, capacity, 1, WINDOW_SECONDS);

    const results = await Promise.all(
      Array.from({ length: capacity }, () => limiter.consume(key, 1)),
    );
    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(capacity);

    const overflow = await limiter.consume(key, 1);
    expect(overflow.allowed).toBe(false);
  });

  test("empty bucket rejection: request fails once tokens are exhausted", async () => {
    const key = uniqueKey("empty");
    const limiter = new TokenBucketLimiter(redis, 3, 1, WINDOW_SECONDS);

    await limiter.consume(key, 3);

    const result = await limiter.consume(key, 1);
    expect(result.allowed).toBe(false);
  });

  test("token refill behavior: tokens become available again after waiting", async () => {
    const key = uniqueKey("refill");
    const limiter = new TokenBucketLimiter(redis, 5, 5, WINDOW_SECONDS);

    await limiter.consume(key, 5);
    const immediateRetry = await limiter.consume(key, 1);
    expect(immediateRetry.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const afterRefill = await limiter.consume(key, 1);
    expect(afterRefill.allowed).toBe(true);
  });

  test("maximum bucket capacity enforcement: refill never exceeds capacity", async () => {
    const key = uniqueKey("cap");
    const capacity = 5;
    const limiter = new TokenBucketLimiter(
      redis,
      capacity,
      100,
      WINDOW_SECONDS,
    );

    await limiter.consume(key, 1);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const drainResults = await Promise.all(
      Array.from({ length: capacity }, () => limiter.consume(key, 1)),
    );
    const allowedDrain = drainResults.filter((r) => r.allowed).length;
    expect(allowedDrain).toBeLessThanOrEqual(capacity);

    const overCap = await limiter.consume(key, 1);
    expect(overCap.allowed).toBe(false);
  });
});
