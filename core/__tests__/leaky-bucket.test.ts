import { createRedisClient } from "../src/redis.client.js";
import { LeakyBucket as LeakyBucketLimiter } from "../src/algorithms/leaky-bucket.js";
import { Redis } from "ioredis";

describe("LeakyBucketLimiter", () => {
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
    const limiter = new LeakyBucketLimiter(redis, 10, 1, WINDOW_SECONDS);

    const result = await limiter.consume(key, 1);

    expect(result.allowed).toBe(true);
  });

  test("burst traffic: N requests up to capacity all succeed immediately", async () => {
    const key = uniqueKey("burst");
    const capacity = 10;
    const limiter = new LeakyBucketLimiter(redis, capacity, 1, WINDOW_SECONDS);

    const results = await Promise.all(
      Array.from({ length: capacity }, () => limiter.consume(key, 1)),
    );
    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(capacity);

    const overflow = await limiter.consume(key, 1);
    expect(overflow.allowed).toBe(false);
  });

  test("full bucket rejection: request fails once level reaches capacity", async () => {
    const key = uniqueKey("full");
    const limiter = new LeakyBucketLimiter(redis, 3, 1, WINDOW_SECONDS);

    await limiter.consume(key, 3);

    const result = await limiter.consume(key, 1);
    expect(result.allowed).toBe(false);
  });

  test("leak behavior: capacity frees up again after waiting", async () => {
    const key = uniqueKey("leak");
    const limiter = new LeakyBucketLimiter(redis, 5, 5, WINDOW_SECONDS);

    await limiter.consume(key, 5);
    const immediateRetry = await limiter.consume(key, 1);
    expect(immediateRetry.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const afterLeak = await limiter.consume(key, 1);
    expect(afterLeak.allowed).toBe(true);
  });

  test("minimum bucket level enforcement: leak never drops level below zero", async () => {
    const key = uniqueKey("floor");
    const capacity = 5;
    const limiter = new LeakyBucketLimiter(
      redis,
      capacity,
      100,
      WINDOW_SECONDS,
    );

    await limiter.consume(key, 1);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Bucket has almost certainly leaked fully to 0 by now (leakRate=100/s).
    // Level is clamped via math.max(0, ...), so a fresh burst up to
    // capacity should all succeed rather than under-allowing due to a
    // negative level sneaking through.
    const fillResults = await Promise.all(
      Array.from({ length: capacity }, () => limiter.consume(key, 1)),
    );
    const allowedFill = fillResults.filter((r) => r.allowed).length;
    expect(allowedFill).toBe(capacity);

    const overCap = await limiter.consume(key, 1);
    expect(overCap.allowed).toBe(false);
  });
});
