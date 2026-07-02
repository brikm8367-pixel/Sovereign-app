import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';

interface ClassificationBannerProps {
  senderName: string;
  category: 'work' | 'audience' | 'direct';
  isFirst?: boolean;
}

export function ClassificationBanner({ senderName, category, isFirst }: ClassificationBannerProps) {
  const { isRTL } = useLanguage();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const categoryLabels = {
    work: { ar: 'العمل', en: 'Work', emoji: '💼', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    audience: { ar: 'العلاقات', en: 'Relationships', emoji: '👥', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' },
    direct: { ar: 'الخاص', en: 'Private', emoji: '🤍', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  };

  const c = categoryLabels[category];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full border ${c.color} backdrop-blur-sm shadow-lg max-w-xs text-center`}
        >
          <p className="text-sm font-medium">
            {isFirst
              ? (isRTL ? 'أول رسالة وصلت لمكانها — هذا هو Sovereign.' : 'First message landed in its place — this is Sovereign.')
              : (isRTL 
                  ? `رسالة من ${senderName} — فهمناها ووصلت لمكانها في ${c.ar} ${c.emoji}`
                  : `Message from ${senderName} — understood and placed in ${c.en} ${c.emoji}`
                )
            }
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
