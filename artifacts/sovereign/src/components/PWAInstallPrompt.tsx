/**
 * PWAInstallPrompt — native-style install banner.
 * Shows once per session when the browser fires `beforeinstallprompt`.
 * On iOS (where the event never fires) shows a manual "Add to Home Screen" tip.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { Download, X, Share } from "lucide-react";
import { cn } from "@/lib/utils";

type InstallState = "hidden" | "android" | "ios" | "installed";

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

export function PWAInstallPrompt() {
  const { isRTL } = useLanguage();
  const [state, setState] = useState<InstallState>("hidden");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem("pwa_prompt_dismissed") === "1",
  );

  useEffect(() => {
    if (dismissed || isStandalone()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setState("android");
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS: show manual tip after 3s if no native prompt
    let timer: ReturnType<typeof setTimeout>;
    if (isIOS()) {
      timer = setTimeout(() => setState("ios"), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [dismissed]);

  useEffect(() => {
    const handler = () => setState("installed");
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  const dismiss = () => {
    setState("hidden");
    sessionStorage.setItem("pwa_prompt_dismissed", "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setState("installed");
    else dismiss();
    setDeferredPrompt(null);
  };

  const show = state === "android" || state === "ios";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-[100]",
            "px-4 pb-safe-bottom pt-4",
            "bg-card/95 backdrop-blur-xl border-t border-border/60 shadow-2xl",
          )}
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center gap-3 max-w-md mx-auto">
            {/* App icon */}
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0 shadow-lg">
              <span className="text-2xl">👑</span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight">
                {isRTL ? "ثبّت Sovereign" : "Install Sovereign"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {state === "ios"
                  ? (isRTL
                    ? 'اضغط على "مشاركة" ثم "إضافة للشاشة الرئيسية"'
                    : 'Tap "Share" then "Add to Home Screen"')
                  : (isRTL
                    ? "تجربة native كاملة — أسرع وبدون متصفح"
                    : "Full native experience — faster, no browser")}
              </p>
            </div>

            {/* Action */}
            {state === "android" ? (
              <button
                onClick={install}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3.5 py-2 rounded-xl shrink-0 hover:bg-primary/90 active:scale-95 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                {isRTL ? "تثبيت" : "Install"}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-primary text-xs font-medium shrink-0">
                <Share className="h-4 w-4" />
                <span>{isRTL ? "مشاركة" : "Share"}</span>
              </div>
            )}

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted/60 text-muted-foreground shrink-0 -me-1"
              aria-label="dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
