import { FeatureItem } from "./FeatureItem";
import { 
  SlidersHorizontal, 
  Filter, 
  Shield, 
  Lock, 
  Bell,
  ShieldCheck,
  Eye 
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export function FeaturesSection() {
  const { t, language } = useLanguage();

  return (
    <section id="features" className="py-24">
      <div className="container px-4">
        <div className="grid gap-16 lg:grid-cols-2 items-center">
          {/* Left side - Visual */}
          <div className="relative order-2 lg:order-1">
            <div className="relative rounded-3xl bg-gradient-to-br from-secondary to-muted p-8 card-shadow-lg">
              {/* Mock UI - مستويات الوصول */}
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="h-3 w-20 rounded-full bg-primary/20" />
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-lg bg-work/20" />
                    <div className="h-8 w-8 rounded-lg bg-audience/20" />
                    <div className="h-8 w-8 rounded-lg bg-others/20" />
                  </div>
                </div>
                
                {/* Message previews - تمثل التحكم */}
                {[
                  { color: "work", width: "w-3/4" },
                  { color: "audience", width: "w-full" },
                  { color: "work", width: "w-2/3" },
                  { color: "others", width: "w-4/5" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl bg-card p-4 opacity-0 animate-slide-in`}
                    style={{ animationDelay: `${300 + i * 100}ms`, animationFillMode: "forwards" }}
                  >
                    <div className={`h-10 w-10 rounded-full bg-${item.color}/20 flex-shrink-0`} />
                    <div className="flex-1 space-y-2">
                      <div className={`h-2.5 ${item.width} rounded-full bg-muted`} />
                      <div className="h-2 w-1/2 rounded-full bg-muted/50" />
                    </div>
                    <div className={`h-2 w-2 rounded-full bg-${item.color}`} />
                  </div>
                ))}
              </div>

              {/* Floating notification */}
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 rounded-2xl bg-card p-4 card-shadow animate-float">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.features.notification.title}</div>
                    <div className="text-xs text-muted-foreground">{t.features.notification.subtitle}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative blur */}
            <div className="absolute -z-10 -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          </div>

          {/* Right side - Features */}
          <div className="order-1 lg:order-2">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl opacity-0 animate-fade-in-up">
              {t.features.title1} <span className="text-gradient">{t.features.title2}</span>
            </h2>
            <p className="mb-10 text-lg text-muted-foreground opacity-0 animate-fade-in-up animation-delay-100">
              {t.features.subtitle}
            </p>

            <div className="space-y-8">
              <FeatureItem
                icon={SlidersHorizontal}
                title={t.features.feature1.title}
                description={t.features.feature1.description}
                delay={200}
              />
              <FeatureItem
                icon={Filter}
                title={t.features.feature2.title}
                description={t.features.feature2.description}
                delay={300}
              />
              <FeatureItem
                icon={Shield}
                title={t.features.feature3.title}
                description={t.features.feature3.description}
                delay={400}
              />
              <FeatureItem
                icon={Lock}
                title={t.features.feature4.title}
                description={t.features.feature4.description}
                delay={500}
              />
              <FeatureItem
                icon={ShieldCheck}
                title={language === 'ar' ? "تشفير من طرف لطرف" : "End-to-End Encryption"}
                description={language === 'ar' 
                  ? "كل رسالة مشفرة بتقنية AES-256 + ECDH — لا أحد يستطيع قراءتها سوى أنت والمستلم." 
                  : "Every message is encrypted with AES-256 + ECDH — only you and the recipient can read it."}
                delay={600}
              />
              <FeatureItem
                icon={Eye}
                title={language === 'ar' ? "لا تتبع · لا إعلانات" : "No Tracking · No Ads"}
                description={language === 'ar' 
                  ? "لا نبيع بياناتك. لا نتتبعك. خصوصيتك ليست منتجاً." 
                  : "We don't sell your data. We don't track you. Your privacy is not a product."}
                delay={700}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
