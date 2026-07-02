import { useLanguage } from "@/i18n/LanguageContext";
import { Lock, Eye, Heart } from "lucide-react";

// 🧠 ثلاث قيم فقط - التحكم في الوصول
const results = [
  { 
    icon: Lock, 
    title: { ar: "تحكّم", en: "Control", fr: "Contrôle" },
    subtitle: { ar: "في من يصل إليك", en: "who reaches you", fr: "qui vous atteint" },
    color: "primary"
  },
  { 
    icon: Eye, 
    title: { ar: "وضوح", en: "Clarity", fr: "Clarté" },
    subtitle: { ar: "الرسائل المهمة فقط", en: "only what matters", fr: "seulement ce qui compte" },
    color: "accent"
  },
  { 
    icon: Heart, 
    title: { ar: "راحة", en: "Peace", fr: "Sérénité" },
    subtitle: { ar: "بدون ضوضاء", en: "no noise", fr: "sans bruit" },
    color: "others"
  },
];

export function ResultsSection() {
  const { language } = useLanguage();

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      primary: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
      accent: { bg: "bg-accent/10", text: "text-accent", border: "border-accent/20" },
      others: { bg: "bg-others/10", text: "text-others", border: "border-others/20" },
    };
    return colors[color];
  };

  return (
    <section className="py-20 relative">
      <div className="container px-4">
        {/* ثلاث قيم - يفهمها العقل فوراً */}
        <div className="flex items-center justify-center gap-8 md:gap-16">
          {results.map((result, index) => {
            const colors = getColorClasses(result.color);
            return (
              <div 
                key={index}
                className="text-center group opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${index * 150}ms`, animationFillMode: "forwards" }}
              >
                <div className={`inline-flex items-center justify-center h-16 w-16 md:h-20 md:w-20 rounded-2xl ${colors.bg} ${colors.text} border ${colors.border} mb-4 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg`}>
                  <result.icon className="h-7 w-7 md:h-8 md:w-8" />
                </div>
                <h3 className={`text-lg md:text-xl font-bold ${colors.text} mb-1`}>
                  {result.title[language]}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {result.subtitle[language]}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
