/**
 * ScoutPanel — shown inline in DealCardComposer as the sender fills in the form.
 * Scores the draft and gives improvement suggestions before sending.
 */
import { motion, AnimatePresence } from "framer-motion";
import { type ScoutResult } from "@/hooks/useAI";
import { useLanguage } from "@/i18n/LanguageContext";
import { Loader2, Bot, Sparkles, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  result: ScoutResult | null;
  loading: boolean;
}

const VERDICT_CONFIG = {
  strong: {
    color: "text-emerald-600",
    bg: "bg-emerald-500/8 border-emerald-500/20",
    icon: CheckCircle2,
    ar: "عرض قوي",
    en: "Strong offer",
  },
  improve: {
    color: "text-amber-600",
    bg: "bg-amber-500/8 border-amber-500/20",
    icon: AlertCircle,
    ar: "يحتاج تحسين",
    en: "Needs improvement",
  },
  weak: {
    color: "text-red-500",
    bg: "bg-red-500/8 border-red-500/20",
    icon: XCircle,
    ar: "عرض ضعيف",
    en: "Weak offer",
  },
};

function MiniScore({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
      <span className="text-[11px] font-semibold text-foreground/70">{score}</span>
    </div>
  );
}

export function ScoutPanel({ result, loading }: Props) {
  const { isRTL } = useLanguage();

  if (!loading && !result) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={loading ? "loading" : result?.verdict}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-muted/30 border border-border">
            <Bot className="h-3.5 w-3.5 text-muted-foreground" />
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">{isRTL ? "Scout يقيّم عرضك…" : "Scout is scoring your offer…"}</span>
          </div>
        ) : result ? (
          <div className={cn("rounded-xl border p-3 space-y-2", VERDICT_CONFIG[result.verdict].bg)}>
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground">
                  Scout {result.source === "ai" && <Sparkles className="inline h-2.5 w-2.5 text-amber-500" />}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MiniScore score={result.score} />
                <span className={cn("text-[11px] font-bold flex items-center gap-1", VERDICT_CONFIG[result.verdict].color)}>
                  {(() => { const I = VERDICT_CONFIG[result.verdict].icon; return <I className="h-3.5 w-3.5" />; })()}
                  {isRTL ? VERDICT_CONFIG[result.verdict].ar : VERDICT_CONFIG[result.verdict].en}
                </span>
              </div>
            </div>

            {/* Headline */}
            <p className="text-[11px] font-medium leading-snug">{result.headline}</p>

            {/* Pitch feedback */}
            {result.pitch_feedback && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">{result.pitch_feedback}</p>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <ul className="space-y-1">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="text-[11px] text-foreground/80 flex gap-1.5">
                    <span className="text-muted-foreground">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
