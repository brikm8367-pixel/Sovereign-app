import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, CheckCircle2, Share, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 text-white">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">تم التثبيت بنجاح! 🎉</CardTitle>
            <CardDescription className="text-slate-300">
              يمكنك الآن استخدام Sovereign من شاشتك الرئيسية
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => navigate("/")}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              ابدأ الاستخدام
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4">
            <Download className="w-10 h-10 text-indigo-400" />
          </div>
          <CardTitle className="text-2xl">ثبّت Sovereign</CardTitle>
          <CardDescription className="text-slate-300">
            احصل على تجربة أفضل بتثبيت التطبيق على جهازك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-300">
              <Smartphone className="w-5 h-5 text-indigo-400" />
              <span>وصول سريع من الشاشة الرئيسية</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <Monitor className="w-5 h-5 text-indigo-400" />
              <span>يعمل بدون اتصال بالإنترنت</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              <span>إشعارات فورية للرسائل الجديدة</span>
            </div>
          </div>

          {/* Install Button or Instructions */}
          {deferredPrompt ? (
            <Button
              onClick={handleInstall}
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
            >
              <Download className="w-5 h-5 ml-2" />
              تثبيت التطبيق
            </Button>
          ) : isIOS ? (
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-slate-300 font-medium">لتثبيت التطبيق على iOS:</p>
              <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
                <li className="flex items-center gap-2">
                  اضغط على زر المشاركة <Share className="w-4 h-4 inline" />
                </li>
                <li>اختر "إضافة إلى الشاشة الرئيسية"</li>
                <li>اضغط "إضافة"</li>
              </ol>
            </div>
          ) : (
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-slate-300 font-medium">لتثبيت التطبيق:</p>
              <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
                <li className="flex items-center gap-2">
                  اضغط على قائمة المتصفح <MoreVertical className="w-4 h-4 inline" />
                </li>
                <li>اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"</li>
              </ol>
            </div>
          )}

          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full text-slate-400 hover:text-white"
          >
            متابعة بدون تثبيت
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
