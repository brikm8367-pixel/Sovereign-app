import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { Clock, UserCog, Check, X, RefreshCw, ShieldOff, History, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface LogRow {
  id: string;
  manager_id: string;
  action: string;
  detail: string | null;
  created_at: string;
  manager_name?: string | null;
}

const ACTION_META: Record<string, { ar: string; en: string; icon: typeof Check; tone: string }> = {
  deal_accepted:   { ar: 'قبِل عرض عمل',              en: 'Accepted a deal',                  icon: Check,         tone: 'text-emerald-600' },
  deal_declined:   { ar: 'رفض عرض عمل',               en: 'Declined a deal',                  icon: X,             tone: 'text-destructive' },
  deal_countered:  { ar: 'قدّم عرضاً مضاداً',         en: 'Countered a deal',                 icon: RefreshCw,     tone: 'text-blue-600' },
  deal_escalated:  { ar: 'أحال عرضاً للموافقة',       en: 'Forwarded deal for approval',      icon: Send,          tone: 'text-blue-500' },
  deal_approved:   { ar: 'وافق المشهور على العرض',    en: 'Celebrity approved the deal',      icon: CheckCircle2,  tone: 'text-emerald-600' },
  deal_rejected:   { ar: 'رفض المشهور العرض',          en: 'Celebrity rejected the deal',      icon: X,             tone: 'text-destructive' },
  deal_revision:   { ar: 'طلب المشهور تعديل العرض',   en: 'Celebrity requested revisions',    icon: RefreshCw,     tone: 'text-amber-600' },
  kill_switch:     { ar: 'سُحبت صلاحياته (طوارئ)',    en: 'Access revoked (emergency)',       icon: ShieldOff,     tone: 'text-amber-600' },
};

/** Read-only audit trail of manager actions — visible to the celebrity only. */
export function ManagerActivityLog() {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('manager_activity_log')
      .select('id, manager_id, action, detail, created_at')
      .eq('celebrity_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    const list = (data ?? []) as LogRow[];
    const ids = [...new Set(list.map((r) => r.manager_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, display_name, username').in('id', ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.display_name || p.username]));
      list.forEach((r) => { r.manager_name = map.get(r.manager_id) ?? null; });
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  if (loading || rows.length === 0) return null;

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(isRTL ? 'ar' : 'en', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" />
        {isRTL ? 'سجل نشاط الوكلاء' : 'Manager activity log'}
      </p>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const meta = ACTION_META[r.action];
          const Icon = meta?.icon ?? UserCog;
          const isEscalationAction = ['deal_escalated', 'deal_approved', 'deal_rejected', 'deal_revision'].includes(r.action);
          return (
            <div key={r.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl ${isEscalationAction ? 'bg-blue-500/5 border border-blue-500/10' : 'bg-muted/40'}`}>
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${meta?.tone ?? 'text-muted-foreground'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{r.manager_name || (isRTL ? 'وكيل' : 'Manager')}</span>{' '}
                  {meta ? meta[isRTL ? 'ar' : 'en'] : r.action}
                </p>
                {r.detail && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{r.detail}</p>
                )}
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />{fmt(r.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
