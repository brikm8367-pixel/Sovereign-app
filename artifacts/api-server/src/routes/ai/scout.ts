/**
 * POST /api/ai/scout
 * Scores and improves a Deal Card before the sender submits it.
 */
import { Router } from "express";
import { z } from "zod";
import { callGemini, geminiAvailable } from "../../lib/gemini";
import { SCOUT_SYSTEM } from "../../lib/prompts";
import { auditLog } from "../../middlewares/security";

const router = Router();

const DealDraftSchema = z.object({
  deal_type: z.string().max(64).optional().nullable(),
  budget_range: z.string().max(64).optional().nullable(),
  payment_structure: z.string().max(64).optional().nullable(),
  timeline: z.string().max(64).optional().nullable(),
  commitments: z.array(z.string()).optional().default([]),
  pitch: z.string().max(300).optional().nullable(),
  celebrity_username: z.string().max(64).optional().nullable(),
});

export type ScoutResult = {
  score: number;
  verdict: "strong" | "improve" | "weak";
  headline: string;
  suggestions: string[];
  pitch_feedback: string | null;
  source: "ai" | "heuristic";
};

function heuristicScout(deal: z.infer<typeof DealDraftSchema>): ScoutResult {
  let score = 0;

  if (deal.deal_type) score += 15;
  if (deal.budget_range) score += 25;
  if (deal.payment_structure) score += 10;
  if (deal.timeline) score += 10;
  if ((deal.commitments ?? []).length > 0) score += 10;

  const pitchLen = (deal.pitch ?? "").trim().length;
  if (pitchLen >= 100) score += 20;
  else if (pitchLen >= 40) score += 10;
  else if (pitchLen > 0) score += 5;

  // Bonus for complete form
  const allFilled = deal.deal_type && deal.budget_range && deal.timeline && pitchLen >= 50;
  if (allFilled) score += 10;

  score = Math.min(100, score);
  const verdict: ScoutResult["verdict"] = score >= 75 ? "strong" : score >= 45 ? "improve" : "weak";

  const isArabic = /[\u0600-\u06FF]/.test(deal.pitch ?? deal.deal_type ?? "");
  const lang = isArabic ? "ar" : "en";

  const headlines: Record<ScoutResult["verdict"], Record<string, string>> = {
    strong: {
      ar: "عرضك قوي وجاهز للإرسال.",
      en: "Your offer is strong and ready to send.",
    },
    improve: {
      ar: "عرضك جيد لكن يمكن تحسينه قبل الإرسال.",
      en: "Good offer — a few tweaks will improve your chances.",
    },
    weak: {
      ar: "العرض يحتاج تطوير قبل الإرسال لضمان الرد.",
      en: "Offer needs work before sending to get a response.",
    },
  };

  const suggestions: string[] = [];
  if (!deal.budget_range) {
    suggestions.push(lang === "ar" ? "أضف الميزانية — هي أهم معلومة للوكيل" : "Add your budget — it's the most important detail for the manager");
  }
  if (!deal.payment_structure) {
    suggestions.push(lang === "ar" ? "حدد هيكل الدفع لتجنب أسئلة لاحقة" : "Specify payment structure to avoid follow-up questions");
  }
  if (!deal.timeline) {
    suggestions.push(lang === "ar" ? "أضف الجدول الزمني لتعزيز مصداقية العرض" : "Add timeline to strengthen offer credibility");
  }
  if (pitchLen < 80) {
    suggestions.push(lang === "ar" ? "وسّع Pitch Box — اشرح لماذا هذا المشهور تحديداً" : "Expand Pitch Box — explain why this celebrity specifically");
  }

  const pitchFeedback = pitchLen === 0
    ? (lang === "ar" ? "Pitch Box فارغ — هذا يضعف عرضك بشكل كبير" : "Empty Pitch Box — this significantly weakens your offer")
    : pitchLen < 50
    ? (lang === "ar" ? "الـ Pitch قصير جداً — أضف تفاصيل عن حملتك وقيمة التعاون" : "Pitch too short — add details about your campaign and collaboration value")
    : null;

  return {
    score,
    verdict,
    headline: headlines[verdict][lang],
    suggestions: suggestions.slice(0, 2),
    pitch_feedback: pitchFeedback,
    source: "heuristic",
  };
}

router.post("/scout", async (req, res) => {
  const parsed = DealDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid deal draft", details: parsed.error.issues });
    return;
  }

  const deal = parsed.data;
  auditLog("scout_request", { deal_type: deal.deal_type });

  if (!geminiAvailable) {
    res.json({ ...heuristicScout(deal) });
    return;
  }

  const userPrompt = JSON.stringify(deal, null, 2);
  try {
    const raw = await callGemini(SCOUT_SYSTEM, userPrompt, 400);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const result = JSON.parse(jsonMatch[0]) as ScoutResult;
    res.json({ ...result, source: "ai" as const });
  } catch {
    res.json({ ...heuristicScout(deal) });
  }
});

export default router;
