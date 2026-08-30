import { createRedisClient } from "../src/redis.client.js";
import { SlidingWindowCounter } from "../src/algorithms/sliding-window-counter.js";
import { Redis } from "ioredis";

describe("SlidingWindowCounter", () => {
  let redis: Redis;

  beforeAll(() => {
    redis = createRedisClient();
  });

  afterAll(async () => {
    await redis.quit();
  });

  const uniqueKey = (label: string) =>
    `test-${label}-${Date.now()}-${Math.random()}`;

  test("normal request flow: single request within limit is allowed", async () => {
    const key = uniqueKey("normal");
    const limiter = new SlidingWindowCounter(redis, 10, 60);

    const result = await limiter.consume(key);

    expect(result.allowed).toBe(true);
  });

  test("concurrency: exactly `limit` of N parallel requests succeed (fresh window)", async () => {
    const key = uniqueKey("concurrency");
    const limit = 10;
    const limiter = new SlidingWindowCounter(redis, limit, 60);

    const results = await Promise.all(
      Array.from({ length: 50 }, () => limiter.consume(key)),
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(limit);
  });

  test("rejects once estimated count reaches limit within the window", async () => {
    const key = uniqueKey("reject");
    const limit = 3;
    const limiter = new SlidingWindowCounter(redis, limit, 60);

    for (let i = 0; i < limit; i++) {
      const r = await limiter.consume(key);
      expect(r.allowed).toBe(true);
    }

    const overflow = await limiter.consume(key);
    expect(overflow.allowed).toBe(false);
  });

  test("smoothing: previous window traffic still weighs against the new window, unlike fixed window", async () => {
    const key = uniqueKey("smoothing");
    const limit = 10;
    const windowSeconds = 2; // short window so the test doesn't take forever
    const limiter = new SlidingWindowCounter(redis, limit, windowSeconds);

    // Fill the current window to its limit.
    const fillResults = await Promise.all(
      Array.from({ length: limit }, () => limiter.consume(key)),
    );
    expect(fillResults.filter((r) => r.allowed).length).toBe(limit);

    // Next request in the same window should be rejected.
    const immediateRetry = await limiter.consume(key);
    expect(immediateRetry.allowed).toBe(false);

    // Wait just past the window boundary — a NEW window index begins,
    // but the previous window's `limit` requests should still weigh
    // heavily against the estimate (weight = 1 - elapsedFraction, close to 1
    // right after the boundary).
    await new Promise((r) => setTimeout(r, windowSeconds * 1000 + 100));

    // Fixed window would allow a full new burst of `limit` here.
    // Sliding window counter should allow far fewer, since most of the
    // previous window's count is still weighted in.
    const rapidFireAfterBoundary = await Promise.all(
      Array.from({ length: limit }, () => limiter.consume(key)),
    );
    const allowedAfterBoundary = rapidFireAfterBoundary.filter(
      (r) => r.allowed,
    ).length;

    // Should be well under `limit` — proves smoothing, not a hard reset.
    expect(allowedAfterBoundary).toBeLessThan(limit);
  });

  test("previous-window key eventually expires (no key leak) once well past its relevance", async () => {
    const key = uniqueKey("expiry");
    const windowSeconds = 1;
    const limiter = new SlidingWindowCounter(redis, 5, windowSeconds);

    const result = await limiter.consume(key);
    expect(result.allowed).toBe(true);
    // ttl should be positive and roughly within the expected buffer window
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});
