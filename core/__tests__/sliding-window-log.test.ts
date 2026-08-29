import { createRedisClient } from "../src/redis.client.js";
import { SlidingWindowLogLimiter } from "../src/algorithms/sliding-window-log.js";
import { Redis } from "ioredis";

describe("SlidingWindowLogLimiter", () => {
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
    const limiter = new SlidingWindowLogLimiter(redis, 10, 60);

    const result = await limiter.consume(key);

    expect(result.allowed).toBe(true);
  });

  test("concurrency: exactly `limit` of N parallel requests succeed", async () => {
    const key = uniqueKey("concurrency");
    const limit = 10;
    const limiter = new SlidingWindowLogLimiter(redis, limit, 60);

    const results = await Promise.all(
      Array.from({ length: 50 }, () => limiter.consume(key)),
    );

    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(limit);
  });

  test("rejects once limit is reached within the window", async () => {
    const key = uniqueKey("reject");
    const limit = 3;
    const limiter = new SlidingWindowLogLimiter(redis, limit, 60);

    for (let i = 0; i < limit; i++) {
      const r = await limiter.consume(key);
      expect(r.allowed).toBe(true);
    }

    const overflow = await limiter.consume(key);
    expect(overflow.allowed).toBe(false);
  });

  test("sliding behavior: only expired entries free up slots, not the whole window", async () => {
    const key = uniqueKey("sliding");
    const limit = 5;
    const windowSeconds = 2; // short window so the test doesn't take forever
    const limiter = new SlidingWindowLogLimiter(redis, limit, windowSeconds);

    // Fill the bucket with 5 requests, spaced out slightly.
    await limiter.consume(key); // t=0
    await new Promise((r) => setTimeout(r, 300));
    await limiter.consume(key); // t=0.3
    await new Promise((r) => setTimeout(r, 300));
    await limiter.consume(key); // t=0.6
    await new Promise((r) => setTimeout(r, 300));
    await limiter.consume(key); // t=0.9
    await new Promise((r) => setTimeout(r, 300));
    await limiter.consume(key); // t=1.2 — bucket now full (5/5)

    const immediateRetry = await limiter.consume(key);
    expect(immediateRetry.allowed).toBe(false);

    // Wait until the t=0 and t=0.3 entries fall outside the 2s window,
    // but t=0.6, t=0.9, t=1.2 are still inside it.
    await new Promise((r) => setTimeout(r, 900)); // now ~2.1s since t=0

    // Only entries older than (now - 2s) should have expired —
    // roughly 1-2 slots freed, not all 5.
    const afterPartialExpiry = await limiter.consume(key);
    expect(afterPartialExpiry.allowed).toBe(true);

    // But the window shouldn't have fully reset — try to immediately
    // fire several more than what should be available.
    const rapidFire = await Promise.all(
      Array.from({ length: 4 }, () => limiter.consume(key)),
    );
    const allowedInRapidFire = rapidFire.filter((r) => r.allowed).length;
    // Should be strictly less than 4 — proves it's not a full fixed-window-style reset.
    expect(allowedInRapidFire).toBeLessThan(4);
  });
});
