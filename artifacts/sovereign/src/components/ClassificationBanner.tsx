import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { useClassify } from '@/hooks/useAI';

interface ClassificationBannerProps {
  senderName: string;
  /** Pre-computed category — if omitted, banner will classify via AI */
  category?: 'work' | 'audience' | 'direct';
  /** Provide message content so the banner can classify on its own */
  messageContent?: string;
  messageSubject?: string;
  isFirst?: boolean;
  duration?: number;
}

const CATEGORY_CONFIG = {
  work:     { ar: 'صندوق العمل',   en: 'Work Box',     emoji: '💼', color: 'bg-blue-500/10   text-blue-600   dark:text-blue-400   border-blue-500/20' },
  audience: { ar: 'صندوق الجمهور', en: 'Audience Box', emoji: '👥', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  direct:   { ar: 'الصندوق الخاص', en: 'Private Box',  emoji: '🤍', color: 'bg-amber-500/10  text-amber-600  dark:text-amber-400  border-amber-500/20' },
};

export function ClassificationBanner({
  senderName,
  category: propCategory,
  messageContent,
  messageSubject,
  isFirst,
  duration = 4000,
}: ClassificationBannerProps) {
  const { isRTL } = useLanguage();
  const { classify } = useClassify();
  const [show, setShow] = useState(false);
  const [resolvedCategory, setResolvedCategory] = useState<keyof typeof CATEGORY_CONFIG | null>(propCategory ?? null);

  const resolve = useCallback(async () => {
    if (propCategory) {
      setResolvedCategory(propCategory);
      setShow(true);
      return;
    }
    if (messageContent) {
      const result = await classify(messageContent, messageSubject ?? null, senderName);
      if (result?.category) {
        setResolvedCategory(result.category);
        setShow(true);
      }
    }
  }, [propCategory, messageContent, messageSubject, senderName, classify]);

  useEffect(() => { resolve(); }, [resolve]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(t);
  }, [show, duration]);

  if (!resolvedCategory) return null;

  const cfg = CATEGORY_CONFIG[resolvedCategory];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            'fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5',
            'rounded-2xl border backdrop-blur-sm shadow-lg max-w-sm text-center cursor-pointer',
            cfg.color,
          )}
          onClick={() => setShow(false)}
        >
          <p className="text-sm font-semibold leading-snug">
            {isFirst
              ? (isRTL
                  ? 'وصلت أول رسالة لمكانها — هذا هو Sovereign ✓'
                  : 'First message landed in its place — this is Sovereign ✓')
              : (isRTL
                  ? `رسالة من ${senderName} وصلت إلى ${cfg.ar} ${cfg.emoji}`
                  : `Message from ${senderName} placed in ${cfg.en} ${cfg.emoji}`)}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
