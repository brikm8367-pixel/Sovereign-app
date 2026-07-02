import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface CategoryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  count: number;
  maxCount: number;
  variant: "work" | "audience" | "others";
  delay?: number;
}

const variantStyles = {
  work: {
    bg: "bg-work-light",
    border: "border-work/15 hover:border-work/35",
    iconBg: "bg-work",
    iconColor: "text-white",
    progressBg: "bg-work/15",
    progressFill: "bg-work",
  },
  audience: {
    bg: "bg-audience-light",
    border: "border-audience/15 hover:border-audience/35",
    iconBg: "bg-audience",
    iconColor: "text-white",
    progressBg: "bg-audience/15",
    progressFill: "bg-audience",
  },
  others: {
    bg: "bg-others-light",
    border: "border-others/15 hover:border-others/35",
    iconBg: "bg-others",
    iconColor: "text-white",
    progressBg: "bg-others/15",
    progressFill: "bg-others",
  },
};

export function CategoryCard({
  title,
  description,
  icon: Icon,
  count,
  maxCount,
  variant,
  delay = 0,
}: CategoryCardProps) {
  const { language } = useLanguage();
  const styles = variantStyles[variant];
  const percentage = (count / maxCount) * 100;

  const messagesLabel = {
    ar: "رسائل",
    en: "messages",
    fr: "messages"
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-6 transition-all duration-500",
        "hover:shadow-xl hover:-translate-y-2 cursor-pointer bg-card",
        "opacity-0 animate-fade-in-up",
        styles.border
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      {/* الأيقونة - ملونة بالكامل لتوضيح الفئة بصرياً */}
      <div
        className={cn(
          "mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm",
          styles.iconBg
        )}
      >
        <Icon className={cn("h-6 w-6", styles.iconColor)} />
      </div>

      {/* المحتوى */}
      <h3 className="mb-2 text-lg font-bold text-foreground">{title}</h3>
      <p className="mb-5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
        {description}
      </p>

      {/* عداد بصري بسيط */}
      <div className="flex items-center gap-3">
        <div className={cn("h-1.5 flex-1 rounded-full overflow-hidden", styles.progressBg)}>
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000 ease-out",
              styles.progressFill
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {count} {messagesLabel[language]}
        </span>
      </div>
    </div>
  );
}
