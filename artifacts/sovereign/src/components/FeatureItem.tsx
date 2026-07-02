import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface FeatureItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

export function FeatureItem({ icon: Icon, title, description, delay = 0 }: FeatureItemProps) {
  return (
    <div 
      className="flex gap-4 opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex-shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div>
        <h4 className="mb-1 text-lg font-semibold text-foreground">{title}</h4>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
