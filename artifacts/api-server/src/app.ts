import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import helmet from "helmet";
import router from "./routes";
import { logger } from "./lib/logger";
import { generalLimiter } from "./middlewares/rateLimiter";
import { requestAudit, sanitiseBody } from "./middlewares/security";

const app: Express = express();

// Trust the Replit / cloud reverse proxy so express-rate-limit
// gets the real client IP from X-Forwarded-For.
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// ── CORS ──────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? (process.env.ALLOWED_ORIGINS ?? "").split(",").map(s => s.trim()).filter(Boolean)
      : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

// ── Request logging ───────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));

// ── Sanitise body (strip $ keys) ─────────────────────────────────
app.use(sanitiseBody);

// ── Audit log every /api request ─────────────────────────────────
app.use("/api", requestAudit);

// ── Global rate limit ────────────────────────────────────────────
app.use("/api", generalLimiter);

// ── Routes ───────────────────────────────────────────────────────
app.use("/api", router);

export default app;
