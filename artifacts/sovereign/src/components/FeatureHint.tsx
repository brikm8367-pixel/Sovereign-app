import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface FeatureHintProps {
  id: string;
  text: string;
  className?: string;
}

export function FeatureHint({ id, text, className = '' }: FeatureHintProps) {
  const [visible, setVisible] = useState(false);
  const storageKey = `hint_seen_${id}`;

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setVisible(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(storageKey, 'true');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 ${className}`}
        >
          <span className="text-xs text-muted-foreground flex-1">✨ {text}</span>
          <button onClick={dismiss} className="text-muted-foreground/50 hover:text-muted-foreground">
            <X className="h-3 w-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
