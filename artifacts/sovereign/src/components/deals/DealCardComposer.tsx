import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, Briefcase, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useScout } from '@/hooks/useAI';
import { ScoutPanel } from './ScoutPanel';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  celebrityId: string;
  celebrityName?: string | null;
  onSent?: () => void;
}

// ── Lookup tables ────────────────────────────────────────────────
const DEAL_TYPES = [
  { id: 'sponsorship',  ar: 'رعاية',          en: 'Sponsorship' },
  { id: 'appearance',  ar: 'ظهور إعلاني',     en: 'Brand Appearance' },
  { id: 'event',       ar: 'حضور فعالية',     en: 'Event Attendance' },
  { id: 'collab',      ar: 'تعاون محتوى',     en: 'Content Collab' },
  { id: 'endorsement', ar: 'ترويج منتج',      en: 'Product Endorsement' },
  { id: 'other',       ar: 'أخرى',            en: 'Other' },
];

const BUDGETS = [
  { id: 'sub5k',   label: '< $5K' },
  { id: '5k-25k',  label: '$5K – $25K' },
  { id: '25k-100k',label: '$25K – $100K' },
  { id: '100k+',   label: '$100K+' },
];

const PAYMENT_STRUCTURES = [
  { id: 'full',     ar: 'دفعة واحدة',    en: 'Full upfront' },
  { id: 'half',     ar: '50% مقدم',      en: '50% upfront' },
  { id: 'monthly',  ar: 'شهري',          en: 'Monthly' },
  { id: 'post',     ar: 'بعد التنفيذ',   en: 'Post-delivery' },
];

const TIMELINES = [
  { id: 'asap', ar: 'عاجل',        en: 'ASAP' },
  { id: '1m',   ar: 'خلال شهر',   en: 'Within a month' },
  { id: '3m',   ar: 'خلال 3 أشهر',en: 'Within 3 months' },
  { id: 'flex', ar: 'مرن',         en: 'Flexible' },
];

const COMMITMENTS = [
  { id: 'exclusive_30', ar: 'حصرية 30 يوم',     en: 'Exclusivity 30d' },
  { id: 'exclusive_90', ar: 'حصرية 90 يوم',     en: 'Exclusivity 90d' },
  { id: 'usage_rights', ar: 'حقوق الاستخدام',   en: 'Usage rights' },
  { id: '1_post',       ar: 'منشور واحد',        en: '1 post' },
  { id: '3_posts',      ar: '3 منشورات',         en: '3 posts' },
  { id: 'story_only',   ar: 'ستوري فقط',         en: 'Story only' },
];

// Toggle button generic component
function ChoiceBtn({ active, onClick, children, className }: {
  active: boolean; onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-2.5 rounded-xl border text-xs font-medium text-start transition-all duration-150',
        active
          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
          : 'border-border hover:bg-muted/60 text-foreground/80',
        className,
      )}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold mb-2 text-muted-foreground uppercase tracking-wide">{children}</p>;
}

export function DealCardComposer({ open, onOpenChange, celebrityId, celebrityName, onSent }: Props) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();

  // Form state
  const [dealType,          setDealType]         = useState('');
  const [budget,            setBudget]            = useState('');
  const [paymentStructure,  setPaymentStructure]  = useState('');
  const [timeline,          setTimeline]          = useState('');
  const [commitments,       setCommitments]       = useState<string[]>([]);
  const [pitch,             setPitch]             = useState('');
  const [goldenHour,        setGoldenHour]        = useState(false);

  // Meta state
  const [sending,       setSending]       = useState(false);
  const [goldenAllowed, setGoldenAllowed] = useState(false);
  const [hasPending,    setHasPending]    = useState(false);
  const [checking,      setChecking]      = useState(true);

  // Scout AI
  const { result: scoutResult, loading: scoutLoading, score: scoutScore } = useScout();
  const scoutTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Trigger Scout scoring with 600ms debounce when form changes
  const triggerScout = useCallback(() => {
    clearTimeout(scoutTimer.current);
    scoutTimer.current = setTimeout(() => {
      scoutScore({
        deal_type: dealType || null,
        budget_range: budget || null,
        payment_structure: paymentStructure || null,
        timeline: timeline || null,
        commitments,
        pitch: pitch || null,
        celebrity_username: celebrityName || null,
      });
    }, 600);
  }, [dealType, budget, paymentStructure, timeline, commitments, pitch, celebrityName, scoutScore]);

  useEffect(() => { triggerScout(); }, [triggerScout]);
  useEffect(() => () => clearTimeout(scoutTimer.current), []);

  // Entitlement + pending check on open
  useEffect(() => {
    if (!open || !user) return;
    let alive = true;
    setChecking(true);
    (async () => {
      const [{ data: ent }, { data: pending }] = await Promise.all([
        supabase.from('feature_entitlements').select('granted, expires_at')
          .eq('user_id', user.id).eq('feature', 'golden_hour').maybeSingle(),
        supabase.from('deal_cards' as any).select('id')
          .eq('sender_id', user.id).eq('celebrity_id', celebrityId).eq('status', 'pending').limit(1),
      ]);
      if (!alive) return;
      const e = ent as any;
      const allowed = !!e?.granted && (!e.expires_at || new Date(e.expires_at) > new Date());
      setGoldenAllowed(allowed);
      setHasPending((pending?.length ?? 0) > 0);
      if (!allowed) setGoldenHour(false);
      setChecking(false);
    })();
    return () => { alive = false; };
  }, [open, user, celebrityId]);

  const reset = () => {
    setDealType(''); setBudget(''); setPaymentStructure(''); setTimeline('');
    setCommitments([]); setPitch(''); setGoldenHour(false);
  };

  const toggleCommitment = (id: string) => {
    setCommitments(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  };

  const submit = async () => {
    if (!user) return;
    if (!dealType) { toast.error(isRTL ? 'اختر نوع العرض' : 'Choose a deal type'); return; }
    if (!budget)   { toast.error(isRTL ? 'حدد الميزانية' : 'Specify the budget'); return; }
    if (hasPending) {
      toast.error(isRTL ? 'لديك عرض قيد المراجعة — انتظر الرد أولاً' : 'You have a pending deal — wait for a reply first');
      return;
    }
    setSending(true);

    const typeLabel = DEAL_TYPES.find(t => t.id === dealType);
    const budgetLabel = BUDGETS.find(b => b.id === budget)?.label ?? budget;
    const summary = `${isRTL ? 'عرض عمل' : 'Deal'}: ${typeLabel?.[isRTL ? 'ar' : 'en'] ?? dealType} · ${budgetLabel}`;

    // Pack all structured fields into details JSON
    const detailsPayload = JSON.stringify({
      payment_structure: paymentStructure || null,
      commitments,
      pitch: pitch.trim() || null,
    });

    const { data: msg, error: msgErr } = await supabase.from('messages').insert({
      sender_id:   user.id,
      receiver_id: celebrityId,
      category:    'work',
      subject:     isRTL ? 'بطاقة عرض' : 'Deal Card',
      content:     summary,
      is_important: goldenHour,
    }).select('id').single();

    if (msgErr) { setSending(false); toast.error(isRTL ? 'تعذّر الإرسال' : 'Could not send'); return; }

    const { error: dealErr } = await (supabase as any).from('deal_cards').insert({
      sender_id:   user.id,
      celebrity_id: celebrityId,
      message_id:  msg.id,
      deal_type:   dealType,
      budget_range: budgetLabel,
      timeline:    timeline || null,
      details:     detailsPayload,
      golden_hour: goldenHour,
    });

    setSending(false);
    if (dealErr) {
      const gated = String((dealErr as any)?.message ?? '').includes('golden_hour_not_allowed');
      toast.error(gated
        ? (isRTL ? 'Golden Hour ميزة مدفوعة' : 'Golden Hour is a paid feature')
        : (isRTL ? 'تعذّر إنشاء البطاقة' : 'Could not create deal card'));
      return;
    }

    toast.success(isRTL ? 'تم إرسال بطاقة العرض ✓' : 'Deal card sent ✓');
    reset();
    onOpenChange(false);
    onSent?.();
  };

  const pitchLeft = 300 - pitch.length;
  const pitchColor = pitchLeft < 30 ? 'text-destructive' : pitchLeft < 80 ? 'text-amber-500' : 'text-muted-foreground';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            {isRTL ? 'بطاقة عرض عمل' : 'Deal Card'}
          </DialogTitle>
          <DialogDescription>
            {(isRTL ? 'عرض منظّم إلى ' : 'Structured offer to ')}{celebrityName ? `@${celebrityName}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">

          {/* 1 — Deal type */}
          <div>
            <SectionLabel>{isRTL ? 'نوع العرض' : 'Deal type'}</SectionLabel>
            <div className="grid grid-cols-3 gap-2">
              {DEAL_TYPES.map(t => (
                <ChoiceBtn key={t.id} active={dealType === t.id} onClick={() => setDealType(t.id)}>
                  {t[isRTL ? 'ar' : 'en']}
                </ChoiceBtn>
              ))}
            </div>
          </div>

          {/* 2 — Budget */}
          <div>
            <SectionLabel>{isRTL ? 'الميزانية الصافية' : 'Net budget'}</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {BUDGETS.map(b => (
                <ChoiceBtn key={b.id} active={budget === b.id} onClick={() => setBudget(b.id)}>
                  {b.label}
                </ChoiceBtn>
              ))}
            </div>
          </div>

          {/* 3 — Payment structure */}
          <div>
            <SectionLabel>{isRTL ? 'هيكل الدفع' : 'Payment structure'}</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_STRUCTURES.map(p => (
                <ChoiceBtn key={p.id} active={paymentStructure === p.id} onClick={() => setPaymentStructure(p.id)}>
                  {p[isRTL ? 'ar' : 'en']}
                </ChoiceBtn>
              ))}
            </div>
          </div>

          {/* 4 — Timeline */}
          <div>
            <SectionLabel>{isRTL ? 'الجدول الزمني' : 'Timeline'}</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {TIMELINES.map(t => (
                <ChoiceBtn key={t.id} active={timeline === t.id} onClick={() => setTimeline(t.id)}>
                  {t[isRTL ? 'ar' : 'en']}
                </ChoiceBtn>
              ))}
            </div>
          </div>

          {/* 5 — Commitments (multi-select) */}
          <div>
            <SectionLabel>{isRTL ? 'الالتزامات الرئيسية' : 'Main commitments'}</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {COMMITMENTS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCommitment(c.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150',
                    commitments.includes(c.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted/60 text-foreground/70',
                  )}
                >
                  {commitments.includes(c.id) ? '✓ ' : ''}{c[isRTL ? 'ar' : 'en']}
                </button>
              ))}
            </div>
          </div>

          {/* 6 — Pitch Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>{isRTL ? 'Pitch Box' : 'Pitch Box'}</SectionLabel>
              <span className={cn('text-[10px] font-medium', pitchColor)}>{pitchLeft}</span>
            </div>
            <Textarea
              placeholder={isRTL
                ? 'لماذا هذا المشهور تحديداً؟ ما قيمة التعاون للطرفين؟ (≤ 300 حرف)'
                : 'Why this celebrity specifically? What\'s the value for both sides? (≤ 300 chars)'}
              value={pitch}
              maxLength={300}
              onChange={e => setPitch(e.target.value)}
              className="rounded-xl resize-none text-sm leading-relaxed"
              rows={3}
            />
          </div>

          {/* Scout Panel */}
          <ScoutPanel result={scoutResult} loading={scoutLoading} />

          {/* Golden Hour */}
          <div className={cn(
            'flex items-center justify-between p-3 rounded-xl border',
            goldenAllowed ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-muted/30',
          )}>
            <div className="flex items-center gap-2">
              {goldenAllowed
                ? <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                : <Lock className="h-4 w-4 text-muted-foreground shrink-0" />}
              <div>
                <p className="text-sm font-semibold">Golden Hour</p>
                <p className="text-[11px] text-muted-foreground">
                  {goldenAllowed
                    ? (isRTL ? 'أولوية 60 دقيقة تبدأ عند أول رد' : '60-min priority window on first reply')
                    : (isRTL ? 'ميزة مدفوعة' : 'Paid feature')}
                </p>
              </div>
            </div>
            <Switch
              checked={goldenHour}
              onCheckedChange={setGoldenHour}
              disabled={!goldenAllowed || checking}
            />
          </div>

          {hasPending && (
            <p className="text-[11px] text-amber-600 text-center bg-amber-500/5 rounded-xl py-2 px-3">
              {isRTL
                ? 'لديك عرض قيد المراجعة — لا يمكن الإرسال حتى يتم الرد.'
                : 'You have a pending deal — cannot send until it gets a reply.'}
            </p>
          )}

          <Button
            onClick={submit}
            disabled={sending || checking || hasPending || !dealType || !budget}
            className="w-full h-12 rounded-xl font-semibold text-base"
          >
            {sending
              ? <Loader2 className="h-5 w-5 animate-spin" />
              : <><Check className="h-4 w-4 me-2" />{isRTL ? 'إرسال العرض' : 'Send Deal'}</>}
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
}
