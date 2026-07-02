import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Filter, ShieldX, Coins, Building2, Network } from 'lucide-react';
import { toast } from 'sonner';

const FILTER_TYPES = [
  { id: 'marketing', icon: Filter, label: { ar: 'التسويق والعروض', en: 'Marketing & Promos', fr: 'Marketing & Promos', es: 'Marketing y Promos' } },
  { id: 'real_estate', icon: Building2, label: { ar: 'العقارات', en: 'Real Estate', fr: 'Immobilier', es: 'Inmobiliario' } },
  { id: 'crypto', icon: Coins, label: { ar: 'العملات الرقمية', en: 'Crypto', fr: 'Crypto', es: 'Cripto' } },
  { id: 'mlm', icon: Network, label: { ar: 'التسويق الشبكي', en: 'Network Marketing', fr: 'MLM', es: 'MLM' } },
] as const;

export default function RecipientFiltersManager() {
  const { user } = useAuth();
  const { language, isRTL } = useLanguage();
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('recipient_filters')
        .select('filter_type, is_active')
        .eq('user_id', user.id);
      if (data) {
        setActiveFilters(new Set(data.filter((f: any) => f.is_active).map((f: any) => f.filter_type)));
      }
      setLoading(false);
    })();
  }, [user]);

  const toggleFilter = async (filterType: string) => {
    if (!user) return;
    const isActive = activeFilters.has(filterType);
    const newSet = new Set(activeFilters);

    if (isActive) {
      // Deactivate
      await (supabase as any).from('recipient_filters')
        .update({ is_active: false })
        .eq('user_id', user.id).eq('filter_type', filterType);
      newSet.delete(filterType);
    } else {
      // Upsert active
      await (supabase as any).from('recipient_filters').upsert({
        user_id: user.id, filter_type: filterType, is_active: true,
      }, { onConflict: 'user_id,filter_type' });
      newSet.add(filterType);
    }
    setActiveFilters(newSet);
    toast.success(isRTL ? 'تم الحفظ ✨' : 'Saved ✨');
  };

  const t = {
    ar: { title: 'حجب أنواع الرسائل', subtitle: 'الرسائل التي لا تريد استقبالها — يحجبها التطبيق تلقائياً قبل أن تصلك.' },
    en: { title: 'Block message types', subtitle: 'Messages you don\'t want — the app blocks them automatically before they reach you.' },
    fr: { title: 'Bloquer des types de messages', subtitle: 'Les messages que vous ne voulez pas — bloqués automatiquement avant de vous parvenir.' },
    es: { title: 'Bloquear tipos de mensajes', subtitle: 'Los mensajes que no quieres — bloqueados automáticamente antes de llegar a ti.' },
  }[language] || { title: 'Block message types', subtitle: '' };

  if (loading) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldX className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold text-base">{t.title}</h3>
          <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      <div className="space-y-2">
        {FILTER_TYPES.map(f => {
          const Icon = f.icon;
          const isActive = activeFilters.has(f.id);
          const label = f.label[language as keyof typeof f.label] || f.label.en;
          return (
            <div key={f.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <Switch checked={isActive} onCheckedChange={() => toggleFilter(f.id)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
