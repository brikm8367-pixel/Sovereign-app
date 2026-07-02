/**
 * POST /api/ai/pilot
 * Analyses a Deal Card and returns a structured recommendation for the manager.
 * Uses Gemini when GEMINI_API_KEY is set; falls back to deterministic heuristics.
 */
import { Router } from "express";
import { z } from "zod";
import { callGemini, geminiAvailable } from "../../lib/gemini";
import { PILOT_SYSTEM } from "../../lib/prompts";
import { auditLog } from "../../middlewares/security";

const router = Router();

const DealSchema = z.object({
  deal_type: z.string().max(64),
  budget_range: z.string().max(64).optional().nullable(),
  payment_structure: z.string().max(64).optional().nullable(),
  timeline: z.string().max(64).optional().nullable(),
  commitments: z.array(z.string()).optional().default([]),
  pitch: z.string().max(300).optional().nullable(),
  celebrity_username: z.string().max(64).optional().nullable(),
  sender_name: z.string().max(64).optional().nullable(),
});

export type PilotResult = {
  verdict: "accept" | "negotiate" | "decline";
  score: number;
  headline: string;
  points: string[];
  risk: string | null;
  suggested_counter: string | null;
  source: "ai" | "heuristic";
};

function heuristicPilot(deal: z.infer<typeof DealSchema>): PilotResult {
  // Budget score
  const budgetMap: Record<string, number> = {
    "< $5K": 15, "$5K–$25K": 45, "$25K–$100K": 72, "$100K+": 92,
  };
  const budgetScore = budgetMap[deal.budget_range ?? ""] ?? 35;

  // Deal type bonus
  const typeBonus: Record<string, number> = { // eslint-disable-line

    sponsorship: 10, endorsement: 10, appearance: 6, event: 6, collab: 4, other: 0,
  };
  const typeScore = typeBonus[deal.deal_type] ?? 0;

  // Pitch quality
  const pitchLen = (deal.pitch ?? "").trim().length;
  const pitchScore = pitchLen >= 80 ? 8 : pitchLen >= 30 ? 4 : 0;

  // Commitments risk
  const hasExclusivity = (deal.commitments ?? []).some((c: string) => c.includes("exclusiv") || c.includes("حصري"));
  const riskPenalty = hasExclusivity ? -8 : 0;

  const score = Math.min(100, Math.max(0, budgetScore + typeScore + pitchScore + riskPenalty));
  const verdict: PilotResult["verdict"] = score >= 70 ? "accept" : score >= 40 ? "negotiate" : "decline";

  const isArabic = /[\u0600-\u06FF]/.test(deal.pitch ?? deal.deal_type);
  const lang = isArabic ? "ar" : "en";

  const headlines: Record<typeof verdict, Record<string, string>> = {
    accept: {
      ar: "عرض قوي يستحق القبول بشروطه الحالية.",
      en: "Strong offer worth accepting on current terms.",
    },
    negotiate: {
      ar: "العرض واعد لكنه يحتاج تعديلاً في الشروط أو الميزانية.",
      en: "Promising offer but terms or budget need adjustment.",
    },
    decline: {
      ar: "الميزانية منخفضة جداً أو التفاصيل غير كافية للمضي قدماً.",
      en: "Budget too low or details insufficient to proceed.",
    },
  };

  const points: Record<typeof verdict, Record<string, string[]>> = {
    accept: {
      ar: ["الميزانية تعكس جدية المُرسِل", "النوع يتناسب مع ملف المشهور", "الجدول الزمني واضح"],
      en: ["Budget reflects sender's seriousness", "Deal type fits celebrity's profile", "Timeline is clear"],
    },
    negotiate: {
      ar: ["اطلب رفع الميزانية بنسبة 20–30%", "وضّح الشروط الحصرية قبل الموافقة", "اطلب تفاصيل إضافية عن العلامة"],
      en: ["Request 20–30% budget increase", "Clarify exclusivity terms before agreeing", "Ask for more brand details"],
    },
    decline: {
      ar: ["الميزانية لا تعكس حجم المشهور", "التفاصيل غير كافية لاتخاذ قرار", "انتظر عرضاً أقوى"],
      en: ["Budget doesn't match celebrity's scale", "Details insufficient to decide", "Wait for a stronger offer"],
    },
  };

  return {
    verdict,
    score,
    headline: headlines[verdict][lang],
    points: points[verdict][lang],
    risk: hasExclusivity
      ? (lang === "ar" ? "شرط الحصرية قد يقيّد فرصاً أخرى" : "Exclusivity clause may block other opportunities")
      : null,
    suggested_counter: verdict === "negotiate"
      ? (lang === "ar" ? "اقترح رفع الميزانية 25% وإلغاء الحصرية" : "Propose 25% budget increase and remove exclusivity")
      : null,
    source: "heuristic",
  };
}

router.post("/pilot", async (req, res) => {
  const parsed = DealSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid deal card data", details: parsed.error.issues });
    return;
  }

  const deal = parsed.data;
  auditLog("pilot_request", { deal_type: deal.deal_type, budget: deal.budget_range });

  if (!geminiAvailable) {
    res.json({ ...heuristicPilot(deal) });
    return;
  }

  const userPrompt = JSON.stringify(deal, null, 2);
  try {
    const raw = await callGemini(PILOT_SYSTEM, userPrompt, 512);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const parsed = JSON.parse(jsonMatch[0]) as PilotResult;
    res.json({ ...parsed, source: "ai" as const });
  } catch {
    // Graceful fallback to heuristics if AI fails
    res.json({ ...heuristicPilot(deal) });
  }
});

export default router;
