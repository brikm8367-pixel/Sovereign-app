import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Shield, Lock, ShieldCheck, Eye } from "lucide-react";
import { DemoPersonaModal } from "./DemoPersonaModal";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion } from "framer-motion";

export function HeroSection() {
  const [showDemo, setShowDemo] = useState(false);
  const { t, isRTL, language } = useLanguage();

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const headline = {
    ar: "تحكم بمن يصل إليك",
    en: "Control who reaches you",
    fr: "Contrôlez qui vous contacte",
    es: "Controla quién te contacta"
  };

  const subheadline = {
    ar: "ودع رسائلك تصل دائمًا إلى مكانها الصحيح.",
    en: "Let your messages always land where they belong.",
    fr: "Vos messages arrivent toujours au bon endroit.",
    es: "Tus mensajes siempre llegan donde deben."
  };

  const tagline = {
    ar: "ادعُ فقط من تريد التواصل معه، ودع الباقي على Sovereign.",
    en: "Invite only who you want to connect with. Let Sovereign handle the rest.",
    fr: "Invitez seulement ceux que vous voulez. Sovereign s'occupe du reste.",
    es: "Invita solo a quienes quieres. Sovereign se encarga del resto."
  };

  const trustItems = [
    {
      icon: ShieldCheck,
      label: { ar: "تشفير من طرف لطرف", en: "End-to-End Encrypted", fr: "Chiffrement de bout en bout", es: "Cifrado de extremo a extremo" },
      color: "text-emerald-500"
    },
    {
      icon: Eye,
      label: { ar: "لا تتبع · لا إعلانات", en: "No Tracking · No Ads", fr: "Pas de suivi · Pas de pub", es: "Sin rastreo · Sin anuncios" },
      color: "text-primary"
    },
    {
      icon: Shield,
      label: { ar: "متوافق مع GDPR", en: "GDPR Compliant", fr: "Conforme au RGPD", es: "Cumple con GDPR" },
      color: "text-accent"
    },
  ];

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-16">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,_hsl(var(--primary)/0.04)_0%,_transparent_70%)]" />
      
      <div className="container relative z-10 px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          
          {/* Minimal lock icon */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-10 inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-primary"
          >
            <Lock className="h-7 w-7" />
          </motion.div>

          {/* Main headline — Apple-style large type */}
          <motion.h1 
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-5 text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl md:text-6xl"
          >
            {headline[language]}
          </motion.h1>

          {/* Sub headline — value proposition */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-3 text-lg md:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed"
          >
            {subheadline[language]}
          </motion.p>

          {/* Tagline — emotional closer */}
          <motion.p 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-12 text-base text-muted-foreground/70 max-w-sm mx-auto leading-relaxed"
          >
            {tagline[language]}
          </motion.p>

          {/* CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-16"
          >
            <Button 
              variant="hero" 
              size="xl" 
              onClick={() => setShowDemo(true)} 
              className="shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {t.hero.cta1}
              <ArrowIcon className="h-5 w-5 mx-2" />
            </Button>
          </motion.div>

          {/* Trust signals — clean, minimal */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
          >
            {trustItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-muted-foreground/80">
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-xs font-medium tracking-wide uppercase">{item.label[language] || item.label.en}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <DemoPersonaModal open={showDemo} onOpenChange={setShowDemo} />
    </section>
  );
}
