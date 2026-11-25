import type { RateLimiter, RateLimitResult } from "../src/types.js";

export interface RequestContext {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  path: string;
  method?: string;
}

export interface MiddlewareOptions {
  limiter: RateLimiter;
  /** Builds the rate-limit key for a request. Defaults to the client IP. */
  keyGenerator?: (ctx: RequestContext) => string;

  /** Units consumed per request (default 1). May be a function for per-route cost. */
  cost?: number | ((ctx: RequestContext) => number);

  /** If Redis errors: true = let the request through, false = block it (503). Default true. */
  failOpen?: boolean;

  /** Skip rate limiting for some requests (health checks, internal calls). */
  skip?: (ctx: RequestContext) => boolean;

  /** Hooks for logging/metrics. */
  onLimited?: (ctx: RequestContext, result: RateLimitResult) => void;
  onError?: (ctx: RequestContext, error: unknown) => void;
}

export interface CheckOutcome {
  /** Should the request proceed to the handler? */
  allowed: boolean;

  /** HTTP status to send when not allowed: 429 (limited) or 503 (Redis down, fail-closed). */
  status: number;

  /** Headers to set on the response (empty if the limiter was skipped or errored). */
  headers: Record<string, string>;

  /** Raw limiter result, when available. */
  result?: RateLimitResult;

  /** JSON body to send when blocked. */
  body?: { error: string; message: string; retryAfter?: number };
}
