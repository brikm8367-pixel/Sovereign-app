import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, Briefcase, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  celebrityId: string;
  celebrityName?: string | null;
  onSent?: () => void;
}

const DEAL_TYPES = [
  { id: 'sponsorship', ar: 'رعاية', en: 'Sponsorship' },
  { id: 'appearance', ar: 'ظهور إعلاني', en: 'Brand Appearance' },
  { id: 'event', ar: 'حضور فعالية', en: 'Event Attendance' },
  { id: 'collab', ar: 'تعاون', en: 'Collaboration' },
  { id: 'endorsement', ar: 'ترويج منتج', en: 'Product Endorsement' },
  { id: 'other', ar: 'أخرى', en: 'Other' },
];
const BUDGETS = ['< $5K', '$5K–$25K', '$25K–$100K', '$100K+'];
const TIMELINES = [
  { id: 'asap', ar: 'عاجل', en: 'ASAP' },
  { id: '1m', ar: 'خلال شهر', en: 'Within a month' },
  { id: '3m', ar: 'خلال 3 أشهر', en: 'Within 3 months' },
  { id: 'flex', ar: 'مرن', en: 'Flexible' },
];

export function DealCardComposer({ open, onOpenChange, celebrityId, celebrityName, onSent }: Props) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const [dealType, setDealType] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [details, setDetails] = useState('');
  const [goldenHour, setGoldenHour] = useState(false);
  const [sending, setSending] = useState(false);
  const [goldenAllowed, setGoldenAllowed] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const [checking, setChecking] = useState(true);

  // On open: check Golden Hour entitlement (payment gate) + existing pending deal.
  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    setChecking(true);
    (async () => {
      const [{ data: ent }, { data: pending }] = await Promise.all([
        supabase
          .from('feature_entitlements')
          .select('granted, expires_at')
          .eq('user_id', user.id)
          .eq('feature', 'golden_hour')
          .maybeSingle(),
        supabase
          .from('deal_cards')
          .select('id')
          .eq('sender_id', user.id)
          .eq('celebrity_id', celebrityId)
          .eq('status', 'pending')
          .limit(1),
      ]);
      if (!active) return;
      const e = ent as any;
      const allowed = !!e?.granted && (!e.expires_at || new Date(e.expires_at) > new Date());
      setGoldenAllowed(allowed);
      setHasPending((pending?.length ?? 0) > 0);
      if (!allowed) setGoldenHour(false);
      setChecking(false);
    })();
    return () => { active = false; };
  }, [open, user, celebrityId]);

  const reset = () => {
    setDealType(''); setBudget(''); setTimeline(''); setDetails(''); setGoldenHour(false);
  };

  const submit = async () => {
    if (!user) return;
    if (!dealType) { toast.error(isRTL ? 'اختر نوع العرض' : 'Choose a deal type'); return; }
    if (hasPending) {
      toast.error(isRTL ? 'لديك عرض قيد المراجعة بالفعل — انتظر الرد أولاً' : 'You already have a pending deal — wait for a reply first');
      return;
    }
    setSending(true);

    const typeLabel = DEAL_TYPES.find(t => t.id === dealType);
    const summary = `${isRTL ? 'عرض عمل' : 'Deal'}: ${typeLabel ? typeLabel[isRTL ? 'ar' : 'en'] : dealType}`
      + (budget ? ` · ${budget}` : '');

    // 1) Create the linked work message so it lands in the Business box.
    const { data: msg, error: msgErr } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: celebrityId,
        category: 'work',
        subject: isRTL ? 'بطاقة عرض' : 'Deal Card',
        content: summary,
        is_important: goldenHour,
      })
      .select('id')
      .single();

    if (msgErr) { setSending(false); toast.error(isRTL ? 'تعذّر الإرسال' : 'Could not send'); return; }

    // 2) Create the structured deal card.
    const { error: dealErr } = await (supabase as any).from('deal_cards').insert({
      sender_id: user.id,
      celebrity_id: celebrityId,
      message_id: msg.id,
      deal_type: dealType,
      budget_range: budget || null,
      timeline: timeline || null,
      details: details.trim() || null,
      golden_hour: goldenHour,
    });

    setSending(false);
    if (dealErr) {
      const gated = String((dealErr as any)?.message || '').includes('golden_hour_not_allowed');
      toast.error(gated
        ? (isRTL ? 'Golden Hour ميزة مدفوعة وغير مفعّلة لحسابك' : 'Golden Hour is a paid feature not enabled on your account')
        : (isRTL ? 'تعذّر إنشاء البطاقة' : 'Could not create deal card'));
      return;
    }

    toast.success(isRTL ? 'تم إرسال بطاقة العرض' : 'Deal card sent');
    reset();
    onOpenChange(false);
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-blue-500" />
            {isRTL ? 'بطاقة عرض عمل' : 'Deal Card'}
          </DialogTitle>
          <DialogDescription>
            {(isRTL ? 'عرض منظّم إلى ' : 'A structured offer to ') + (celebrityName ? `@${celebrityName}` : '')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground">{isRTL ? 'نوع العرض' : 'Deal type'}</p>
            <div className="grid grid-cols-2 gap-2">
              {DEAL_TYPES.map(t => (
                <button key={t.id} onClick={() => setDealType(t.id)}
                  className={cn('p-2.5 rounded-xl border text-sm text-start transition-colors',
                    dealType === t.id ? 'border-blue-500 bg-blue-500/10 font-medium' : 'border-border hover:bg-muted/50')}>
                  {t[isRTL ? 'ar' : 'en']}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground">{isRTL ? 'الميزانية' : 'Budget'}</p>
            <div className="grid grid-cols-4 gap-2">
              {BUDGETS.map(b => (
                <button key={b} onClick={() => setBudget(b)}
                  className={cn('p-2 rounded-xl border text-xs transition-colors',
                    budget === b ? 'border-blue-500 bg-blue-500/10 font-medium' : 'border-border hover:bg-muted/50')}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-2 text-muted-foreground">{isRTL ? 'الجدول الزمني' : 'Timeline'}</p>
            <div className="grid grid-cols-2 gap-2">
              {TIMELINES.map(t => (
                <button key={t.id} onClick={() => setTimeline(t.id)}
                  className={cn('p-2 rounded-xl border text-sm transition-colors',
                    timeline === t.id ? 'border-blue-500 bg-blue-500/10 font-medium' : 'border-border hover:bg-muted/50')}>
                  {t[isRTL ? 'ar' : 'en']}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            placeholder={isRTL ? 'تفاصيل إضافية (اختياري)' : 'Additional details (optional)'}
            value={details}
            maxLength={1000}
            onChange={(e) => setDetails(e.target.value)}
            className="rounded-xl resize-none"
            rows={3}
          />

          <div className={cn('flex items-center justify-between p-3 rounded-xl border',
            goldenAllowed ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-muted/30')}>
            <div className="flex items-center gap-2">
              {goldenAllowed ? <Sparkles className="h-4 w-4 text-amber-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">Golden Hour</p>
                <p className="text-[11px] text-muted-foreground">
                  {goldenAllowed
                    ? (isRTL ? 'أولوية 60 دقيقة تبدأ عند أول رد' : 'A 60-min priority window that starts on the first reply')
                    : (isRTL ? 'ميزة مدفوعة — تتطلب اشتراكاً لتفعيلها' : 'Paid feature — requires a subscription to unlock')}
                </p>
              </div>
            </div>
            <Switch checked={goldenHour} onCheckedChange={setGoldenHour} disabled={!goldenAllowed || checking} />
          </div>

          {hasPending && (
            <p className="text-[11px] text-amber-600 text-center">
              {isRTL ? 'لديك عرض قيد المراجعة — لا يمكن إرسال عرض جديد حتى يتم الرد.' : 'You have a pending deal — you cannot send a new one until it gets a reply.'}
            </p>
          )}

          <Button onClick={submit} disabled={sending || checking || hasPending} className="w-full h-12 rounded-xl">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <><Check className="h-4 w-4 me-2" />{isRTL ? 'إرسال العرض' : 'Send Deal'}</>
            )}
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
}
