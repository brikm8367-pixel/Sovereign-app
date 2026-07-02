import { CategoryCard } from "./CategoryCard";
import { Briefcase, Users, Heart } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export function CategoriesSection() {
  const { t, language } = useLanguage();

  // 🧠 عنوان يركز على التحكم في الوصول - Steven Cravotta style
  const sectionTitle = {
    ar: "ثلاثة مستويات وصول",
    en: "Three access levels",
    fr: "Trois niveaux d'accès"
  };

  const sectionSubtitle = {
    ar: "أنت تقرر من يمكنه مقاطعتك",
    en: "You decide who can interrupt you",
    fr: "Vous décidez qui peut vous interrompre"
  };

  return (
    <section id="categories" className="py-24 relative overflow-hidden">
      {/* خلفية تعطي إحساس بالتنظيم */}
      <div className="absolute inset-0 bg-secondary/30" />
      
      {/* خطوط دقيقة تمثل المستويات */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `repeating-linear-gradient(90deg, hsl(var(--foreground)) 0px, hsl(var(--foreground)) 1px, transparent 1px, transparent 80px)`
      }} />
      
      <div className="container relative z-10 px-4">
        {/* عنوان يركز على التحكم */}
        <div className="mx-auto max-w-xl text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground opacity-0 animate-fade-in-up mb-3">
            {sectionTitle[language]}
          </h2>
          <p className="text-lg text-muted-foreground opacity-0 animate-fade-in-up animation-delay-100">
            {sectionSubtitle[language]}
          </p>
        </div>

        {/* البطاقات - مستويات الوصول */}
        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          <CategoryCard
            title={t.categories.work.title}
            description={t.categories.work.description}
            icon={Briefcase}
            count={12}
            maxCount={20}
            variant="work"
            delay={100}
          />
          <CategoryCard
            title={t.categories.audience.title}
            description={t.categories.audience.description}
            icon={Users}
            count={45}
            maxCount={50}
            variant="audience"
            delay={200}
          />
          <CategoryCard
            title={t.categories.others.title}
            description={t.categories.others.description}
            icon={Heart}
            count={8}
            maxCount={15}
            variant="others"
            delay={300}
          />
        </div>
      </div>
    </section>
  );
}
