import { Router } from "express";
import pilotRouter from "./pilot";
import scoutRouter from "./scout";
import classifyRouter from "./classify";
import { aiLimiter } from "../../middlewares/rateLimiter";

const router = Router();

// Apply AI-specific rate limit to all /ai routes
router.use(aiLimiter);

router.use(pilotRouter);
router.use(scoutRouter);
router.use(classifyRouter);

export default router;
