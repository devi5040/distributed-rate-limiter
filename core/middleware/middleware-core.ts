import type { RateLimitResult } from "../src/types.js";
import type {
  CheckOutcome,
  MiddlewareOptions,
  RequestContext,
} from "./types.js";

const defaultKeyGenerator = (ctx: RequestContext): string =>
  ctx.ip ?? "unknown";

export function buildHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(Math.max(0, Math.floor(result.remaining))),
    // Conventionally epoch seconds; resetAt is epoch ms
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) {
    // Relative seconds, never 0 or negative
    headers["Retry-After"] = String(retryAfterSeconds(result));
  }

  return headers;
}

function retryAfterSeconds(result: RateLimitResult): number {
  return Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
}

export async function check(
  options: MiddlewareOptions,
  ctx: RequestContext,
): Promise<CheckOutcome> {
  const { limiter, failOpen = true } = options;

  if (options.skip?.(ctx)) {
    return { allowed: true, status: 200, headers: {} };
  }

  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;
  const cost =
    typeof options.cost === "function"
      ? options.cost(ctx)
      : (options.cost ?? 1);

  let result: RateLimitResult;
  try {
    result = await limiter.consume(keyGenerator(ctx), cost);
  } catch (error) {
    options.onError?.(ctx, error);

    if (failOpen) return { allowed: true, status: 200, headers: {} };

    return {
      allowed: false,
      status: 503,
      headers: {},
      body: {
        error: "service_unavailable",
        message: "Rate limiter unavailale. Please try again shortly.",
      },
    };
  }

  const headers = buildHeaders(result);

  if (!result.allowed) {
    options.onLimited?.(ctx, result);
    return {
      allowed: false,
      status: 429,
      headers,
      result,
      body: {
        error: "too_many_requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: retryAfterSeconds(result),
      },
    };
  }

  return { allowed: true, status: 200, headers, result };
}
