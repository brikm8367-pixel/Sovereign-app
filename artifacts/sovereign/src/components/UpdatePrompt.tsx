/**
 * UpdatePrompt — shown when a new PWA version is available.
 * Prompts user to refresh and get the latest version.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function UpdatePrompt() {
  const { isRTL } = useLanguage();
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) { r && setInterval(() => r.update(), 60 * 60 * 1000); },
  });
  const [dismissed, setDismissed] = useState(false);

  const show = needRefresh && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed top-safe-top left-0 right-0 z-[200] px-4 pt-safe-top"
          style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
        >
          <div className="max-w-sm mx-auto bg-primary text-primary-foreground rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
            <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
            <p className="text-sm font-semibold flex-1">
              {isRTL ? "تحديث جديد متاح" : "New update available"}
            </p>
            <button
              onClick={() => updateServiceWorker(true)}
              className="text-xs font-bold underline underline-offset-2"
            >
              {isRTL ? "تحديث" : "Update"}
            </button>
            <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
