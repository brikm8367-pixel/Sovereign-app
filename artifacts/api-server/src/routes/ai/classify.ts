/**
 * POST /api/ai/classify
 * Classifies a message into work / audience / direct.
 * Used on first message in a conversation and after Golden Hour expires.
 */
import { Router } from "express";
import { z } from "zod";
import { callGemini, geminiAvailable } from "../../lib/gemini";
import { CLASSIFIER_SYSTEM } from "../../lib/prompts";
import { auditLog } from "../../middlewares/security";

const router = Router();

const MsgSchema = z.object({
  content: z.string().max(2000),
  subject: z.string().max(200).optional().nullable(),
  sender_name: z.string().max(64).optional().nullable(),
});

export type ClassifyResult = {
  category: "work" | "audience" | "direct";
  confidence: number;
  source: "ai" | "heuristic";
};

// Note: \b does not work for Arabic — use plain alternation without word boundaries.
const WORK_PATTERNS = [
  /sponsor|sponsorship|deal|collab|collaboration|partnership|brand|campaign|paid|budget|contract|endorsement/i,
  /رعاية|عرض تعاون|عرض عمل|تعاون|ميزانية|عقد|صفقة|إعلان|ترويج|شراكة|اعلان|حملة/,
];
const AUDIENCE_PATTERNS = [
  /\b(love|fan|amazing|awesome|idol|follow|support|inspire|huge fan)\b/i,
  /معجب|أحبك|بحبك|متابع من|مذهل|رائع|ألهمتني|ألهمتني|أحب محتواك|أتابعك/,
];
const DIRECT_PATTERNS = [
  /\b(personal|private|family|friend)\b/i,
  /خاص|شخصي|عائلة|صديق|أخي|أختي/,
];

function heuristicClassify(content: string, subject?: string | null): ClassifyResult {
  const text = `${subject ?? ""} ${content}`.toLowerCase();

  const workScore = WORK_PATTERNS.filter(p => p.test(text)).length;
  const audienceScore = AUDIENCE_PATTERNS.filter(p => p.test(text)).length;
  const directScore = DIRECT_PATTERNS.filter(p => p.test(text)).length;

  const max = Math.max(workScore, audienceScore, directScore);

  if (max === 0) {
    // Default to audience for short unclassified messages, work if long/formal
    const category = content.trim().length > 200 ? "work" : "audience";
    return { category, confidence: 0.55, source: "heuristic" };
  }

  if (workScore >= max) return { category: "work", confidence: Math.min(0.95, 0.6 + workScore * 0.1), source: "heuristic" };
  if (audienceScore >= max) return { category: "audience", confidence: Math.min(0.95, 0.6 + audienceScore * 0.1), source: "heuristic" };
  return { category: "direct", confidence: Math.min(0.95, 0.6 + directScore * 0.1), source: "heuristic" };
}

router.post("/classify", async (req, res) => {
  const parsed = MsgSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid message data" });
    return;
  }

  const { content, subject, sender_name } = parsed.data;
  auditLog("classify_request", { len: content.length });

  if (!geminiAvailable) {
    res.json(heuristicClassify(content, subject));
    return;
  }

  const userPrompt = `Subject: ${subject ?? "(none)"}\nSender: ${sender_name ?? "unknown"}\n\nMessage:\n${content}`;
  try {
    const raw = await callGemini(CLASSIFIER_SYSTEM, userPrompt, 64);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const result = JSON.parse(jsonMatch[0]) as { category: ClassifyResult["category"]; confidence: number };
    if (!["work", "audience", "direct"].includes(result.category)) throw new Error("Bad category");
    res.json({ ...result, source: "ai" as const });
  } catch {
    res.json(heuristicClassify(content, subject));
  }
});

export default router;
