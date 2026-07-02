import rateLimit from "express-rate-limit";

/** General API rate limit — 120 req/min per IP */
export const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests — slow down." },
  skipSuccessfulRequests: false,
});

/** AI endpoints — heavier compute, stricter limit: 20 req/min per IP */
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "AI rate limit reached — please wait." },
});

/** Auth-sensitive endpoints: 10 req/min per IP */
export const strictLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Rate limit exceeded." },
});
