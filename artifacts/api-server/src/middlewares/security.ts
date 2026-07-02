import helmet from "helmet";
import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../lib/logger";

/** Security headers via Helmet */
export const securityHeaders = helmet({
  contentSecurityPolicy: false, // managed by Vite/CDN
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

/** Audit logger — records security-relevant events */
export function auditLog(event: string, meta: Record<string, unknown>) {
  logger.info({ audit: true, event, ...meta });
}

/** Request audit middleware — logs IP, method, path for every API call */
export function requestAudit(req: Request, _res: Response, next: NextFunction) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    ?? req.socket?.remoteAddress
    ?? "unknown";

  auditLog("api_request", {
    ip,
    method: req.method,
    path: req.path,
    ua: req.headers["user-agent"]?.slice(0, 120),
  });
  next();
}

/** Sanitise request body — strip keys that start with $ to prevent NoSQL injection */
export function sanitiseBody(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    req.body = stripDollar(req.body);
  }
  next();
}

function stripDollar(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripDollar);
  if (obj !== null && typeof obj === "object") {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (!k.startsWith("$")) clean[k] = stripDollar(v);
    }
    return clean;
  }
  return obj;
}
