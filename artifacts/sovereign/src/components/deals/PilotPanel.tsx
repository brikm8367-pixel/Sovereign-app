/**
 * PilotPanel — AI deal analyst shown below each pending Deal Card.
 * Gives the manager a clear Accept / Negotiate / Decline recommendation.
 */
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePilot, type PilotResult } from "@/hooks/useAI";
import { useLanguage } from "@/i18n/LanguageContext";
import { DealCard } from "@/hooks/useDealCards";
import { Button } from "@/components/ui/button";
import { Loader2, Bot, TrendingUp, TrendingDown, Minus, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  deal: DealCard & { payment_structure?: string | null; commitments?: string[]; pitch?: string | null };
  senderName?: string | null;
  celebrityUsername?: string | null;
}

const VERDICT_CONFIG = {
  accept: {
    color: "text-emerald-600",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: TrendingUp,
    ar: "اقبل",
    en: "Accept",
  },
  negotiate: {
    color: "text-amber-600",
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: Minus,
    ar: "تفاوض",
    en: "Negotiate",
  },
  decline: {
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/20",
    icon: TrendingDown,
    ar: "ارفض",
    en: "Decline",
  },
};

function ScoreRing({ score }: { score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
      <circle
        cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

export function PilotPanel({ deal, senderName, celebrityUsername }: Props) {
  const { isRTL } = useLanguage();
  const { result, loading, error, analyse, reset } = usePilot();

  // Parse structured details if stored as JSON
  const parsedDetails = (() => {
    try { return JSON.parse(deal.details ?? ""); } catch { return null; }
  })();

  useEffect(() => {
    analyse({
      deal_type: deal.deal_type,
      budget_range: deal.budget_range,
      payment_structure: deal.payment_structure ?? parsedDetails?.payment_structure ?? null,
      timeline: deal.timeline,
      commitments: deal.commitments ?? parsedDetails?.commitments ?? [],
      pitch: deal.pitch ?? parsedDetails?.pitch ?? deal.details ?? null,
      sender_name: senderName,
      celebrity_username: celebrityUsername,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 px-3 rounded-xl bg-muted/30 border border-border">
        <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{isRTL ? "Pilot يحلّل العرض…" : "Pilot is analysing the deal…"}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-muted/20 border border-border text-xs text-muted-foreground">
        <Bot className="h-4 w-4 shrink-0" />
        <span>{isRTL ? "تعذّر تحليل العرض" : "Could not analyse deal"}</span>
        <Button size="sm" variant="ghost" className="h-6 px-2 ms-auto text-xs" onClick={() => { reset(); analyse({ deal_type: deal.deal_type, budget_range: deal.budget_range }); }}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (!result) return null;

  const vc = VERDICT_CONFIG[result.verdict];
  const VIcon = vc.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn("rounded-xl border p-3 space-y-2.5", vc.bg)}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground">
              Pilot{result.source === "heuristic" ? " ·" : <Sparkles className="inline h-2.5 w-2.5 ms-0.5 text-amber-500" />}
              {result.source === "heuristic" && <span className="text-[10px]"> {isRTL ? "تحليل ذكي" : "smart analysis"}</span>}
            </span>
          </div>

          <div className="ms-auto flex items-center gap-2">
            <ScoreRing score={result.score} />
            <span className={cn("font-bold text-sm flex items-center gap-1", vc.color)}>
              <VIcon className="h-4 w-4" />
              {isRTL ? vc.ar : vc.en}
            </span>
          </div>
        </div>

        {/* Headline */}
        <p className="text-xs font-semibold leading-snug">{result.headline}</p>

        {/* Points */}
        {result.points.length > 0 && (
          <ul className="space-y-1">
            {result.points.map((p, i) => (
              <li key={i} className="text-[11px] text-foreground/80 flex gap-1.5">
                <span className="text-muted-foreground mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Risk */}
        {result.risk && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{result.risk}</span>
          </div>
        )}

        {/* Counter suggestion */}
        {result.suggested_counter && (
          <div className="text-[11px] text-muted-foreground italic border-t border-border/50 pt-2">
            💡 {result.suggested_counter}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
