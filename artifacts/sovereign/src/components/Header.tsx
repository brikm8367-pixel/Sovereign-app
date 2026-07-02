import { Button } from "@/components/ui/button";
import { MessageSquare, Menu, X } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState } from "react";

export function Header() {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-foreground">Sovereign</span>
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            {t.header.features}
          </a>
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
            {t.header.howItWorks}
          </a>
          <a href="#categories" className="text-muted-foreground hover:text-foreground transition-colors">
            {t.header.categories}
          </a>
        </nav>

        {/* CTA & Language */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => window.location.href = '/auth'}>
            {t.header.login}
          </Button>
          <Button size="sm" onClick={() => window.location.href = '/auth'}>
            {t.header.getStarted}
          </Button>
          
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <nav className="container px-4 py-4 flex flex-col gap-4">
            <a 
              href="#features" 
              className="text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.header.features}
            </a>
            <a 
              href="#how-it-works" 
              className="text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.header.howItWorks}
            </a>
            <a 
              href="#categories" 
              className="text-muted-foreground hover:text-foreground transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t.header.categories}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
