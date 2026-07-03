import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDealCards, DealCard } from '@/hooks/useDealCards';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Briefcase, Sparkles, Check, X, RefreshCw, Clock, User,
  ChevronDown, ChevronUp, Send, AlertCircle, Hourglass,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PilotPanel } from './PilotPanel';
import { toast } from 'sonner';

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  sponsorship: { ar: 'رعاية',         en: 'Sponsorship' },
  appearance:  { ar: 'ظهور إعلاني',  en: 'Brand Appearance' },
  event:       { ar: 'حضور فعالية',  en: 'Event Attendance' },
  collab:      { ar: 'تعاون محتوى',  en: 'Content Collab' },
  endorsement: { ar: 'ترويج منتج',   en: 'Product Endorsement' },
  other:       { ar: 'أخرى',         en: 'Other' },
};

const PAYMENT_LABELS: Record<string, { ar: string; en: string }> = {
  full:    { ar: 'دفعة واحدة', en: 'Full upfront' },
  half:    { ar: '50% مقدم',   en: '50% upfront' },
  monthly: { ar: 'شهري',       en: 'Monthly' },
  post:    { ar: 'بعد التنفيذ',en: 'Post-delivery' },
};

const STATUS_STYLE: Record<string, string> = {
  pending:   'text-amber-600  bg-amber-500/10',
  accepted:  'text-emerald-600 bg-emerald-500/10',
  declined:  'text-destructive bg-destructive/10',
  countered: 'text-blue-600   bg-blue-500/10',
};

function GoldenCountdown({ expiresAt }: { expiresAt: string }) {
  const { isRTL } = useLanguage();
  const [left, setLeft] = useState(0);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (left <= 0) return null;
  const m = Math.floor(left / 60), s = left % 60;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
      <Sparkles className="h-3 w-3" />
      Golden Hour · {m}:{s.toString().padStart(2, '0')}
    </span>
  );
}

function parseDealDetails(details?: string | null) {
  if (!details) return { payment_structure: null, commitments: [], pitch: null, raw: null };
  try {
    const p = JSON.parse(details);
    return {
      payment_structure: p.payment_structure ?? null,
      commitments: Array.isArray(p.commitments) ? p.commitments : [],
      pitch: p.pitch ?? null,
      raw: null,
    };
  } catch {
    return { payment_structure: null, commitments: [], pitch: null, raw: details };
  }
}

function DealRow({
  deal, canManage, userRole, onStatus, isGoldenActive, senderName, celebrityUsername,
  onEscalate, onEscalationResponse,
}: {
  deal: DealCard & { escalated_to_celebrity?: boolean; celebrity_approval_status?: string | null; escalation_note?: string | null };
  canManage: boolean;
  userRole: 'celebrity' | 'manager' | 'sender';
  onStatus: (id: string, s: any) => void;
  isGoldenActive: (d: DealCard) => boolean;
  senderName?: string | null;
  celebrityUsername?: string | null;
  onEscalate: (id: string, note?: string) => Promise<void>;
  onEscalationResponse: (id: string, status: 'approved' | 'rejected' | 'revision', note?: string) => Promise<void>;
}) {
  const { isRTL } = useLanguage();
  const [showPilot, setShowPilot] = useState(false);
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [escalateNote, setEscalateNote] = useState('');
  const [escalating, setEscalating] = useState(false);
  const [responseNote, setResponseNote] = useState('');
  const [showResponseForm, setShowResponseForm] = useState<'revision' | null>(null);
  const [responding, setResponding] = useState(false);

  const name = deal.sender_profile?.display_name || deal.sender_profile?.username || (isRTL ? 'مجهول' : 'Unknown');
  const type = TYPE_LABELS[deal.deal_type]?.[isRTL ? 'ar' : 'en'] || deal.deal_type;
  const golden = isGoldenActive(deal);
  const parsed = parseDealDetails(deal.details);
  const paymentLabel = parsed.payment_structure ? PAYMENT_LABELS[parsed.payment_structure]?.[isRTL ? 'ar' : 'en'] : null;
  const isEscalated = !!(deal as any).escalated_to_celebrity;
  const approvalStatus: string | null = (deal as any).celebrity_approval_status ?? null;

  const handleEscalate = async () => {
    setEscalating(true);
    await onEscalate(deal.id, escalateNote || undefined);
    setEscalating(false);
    setShowEscalateForm(false);
    setEscalateNote('');
  };

  const handleResponse = async (status: 'approved' | 'rejected' | 'revision') => {
    setResponding(true);
    await onEscalationResponse(deal.id, status, responseNote || undefined);
    setResponding(false);
    setShowResponseForm(null);
    setResponseNote('');
  };

  return (
    <div className={cn(
      'rounded-2xl border p-4 space-y-3 bg-card shadow-sm transition-shadow hover:shadow-md',
      golden ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-border',
      isEscalated && approvalStatus === 'pending' && userRole === 'celebrity'
        ? 'ring-2 ring-blue-500/30 border-blue-500/30'
        : '',
    )}>
      {/* Celebrity-needs-your-approval banner */}
      {isEscalated && approvalStatus === 'pending' && userRole === 'celebrity' && (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-600 bg-blue-500/10 rounded-xl px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {isRTL ? 'طلب وكيلك موافقتك على هذا العرض' : 'Your manager is waiting for your approval'}
        </div>
      )}

      {/* Awaiting celebrity badge for manager */}
      {isEscalated && approvalStatus === 'pending' && userRole === 'manager' && (
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
          <Hourglass className="h-3.5 w-3.5 shrink-0 animate-pulse" />
          {isRTL ? 'في انتظار موافقة المشهور' : 'Awaiting celebrity approval'}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={deal.sender_profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {name[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <p className="text-[11px] text-muted-foreground">{type}</p>
        </div>
        <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0', STATUS_STYLE[deal.status] ?? STATUS_STYLE.pending)}>
          {deal.status === 'pending'   ? (isRTL ? 'قيد المراجعة' : 'Pending')
           : deal.status === 'accepted' ? (isRTL ? 'مقبول'        : 'Accepted')
           : deal.status === 'declined' ? (isRTL ? 'مرفوض'        : 'Declined')
           :                              (isRTL ? 'عرض مضاد'     : 'Countered')}
        </span>
      </div>

      {/* Metadata chips */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
        {deal.budget_range && (
          <span className="inline-flex items-center gap-1 bg-muted/50 rounded-full px-2 py-0.5">💰 {deal.budget_range}</span>
        )}
        {paymentLabel && (
          <span className="inline-flex items-center gap-1 bg-muted/50 rounded-full px-2 py-0.5">💳 {paymentLabel}</span>
        )}
        {deal.timeline && (
          <span className="inline-flex items-center gap-1 bg-muted/50 rounded-full px-2 py-0.5">
            <Clock className="h-3 w-3" />{deal.timeline}
          </span>
        )}
        {golden && deal.golden_hour_expires_at && (
          <GoldenCountdown expiresAt={deal.golden_hour_expires_at} />
        )}
      </div>

      {/* Commitments */}
      {parsed.commitments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {parsed.commitments.map(c => (
            <span key={c} className="text-[10px] bg-primary/8 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium">
              {c.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Pitch */}
      {(parsed.pitch || parsed.raw) && (
        <p className="text-xs text-foreground/80 bg-muted/30 rounded-xl p-2.5 leading-relaxed">
          {parsed.pitch ?? parsed.raw}
        </p>
      )}

      {/* ── MANAGER ACTIONS ── */}
      {canManage && userRole === 'manager' && deal.status === 'pending' && !isEscalated && (
        <>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold"
              onClick={() => onStatus(deal.id, 'accepted')}>
              <Check className="h-3.5 w-3.5 me-1" />{isRTL ? 'قبول' : 'Accept'}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl font-semibold"
              onClick={() => onStatus(deal.id, 'countered')}>
              <RefreshCw className="h-3.5 w-3.5 me-1" />{isRTL ? 'عرض مضاد' : 'Counter'}
            </Button>
            <Button size="sm" variant="ghost" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
              onClick={() => onStatus(deal.id, 'declined')}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Send to Celebrity for approval */}
          {!showEscalateForm ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 rounded-xl text-blue-600 border-blue-500/30 hover:bg-blue-500/10 text-xs gap-1.5"
              onClick={() => setShowEscalateForm(true)}
            >
              <Send className="h-3 w-3" />
              {isRTL ? 'إرسال للمشهور للموافقة' : 'Send to Celebrity for Approval'}
            </Button>
          ) : (
            <div className="space-y-2">
              <Textarea
                placeholder={isRTL ? 'ملاحظة للمشهور (اختياري)...' : 'Note to celebrity (optional)...'}
                value={escalateNote}
                onChange={e => setEscalateNote(e.target.value)}
                className="text-xs rounded-xl resize-none h-16"
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs" onClick={handleEscalate} disabled={escalating}>
                  {escalating ? <RefreshCw className="h-3 w-3 animate-spin" /> : (isRTL ? 'إرسال' : 'Send')}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs" onClick={() => setShowEscalateForm(false)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CELEBRITY ACTIONS (own deals + escalated) ── */}
      {canManage && userRole === 'celebrity' && deal.status === 'pending' && (
        <div className="space-y-2">
          {/* Standard approve/reject (always visible for celebrity) */}
          {!isEscalated && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold"
                onClick={() => onStatus(deal.id, 'accepted')}>
                <Check className="h-3.5 w-3.5 me-1" />{isRTL ? 'قبول' : 'Accept'}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl font-semibold"
                onClick={() => onStatus(deal.id, 'countered')}>
                <RefreshCw className="h-3.5 w-3.5 me-1" />{isRTL ? 'عرض مضاد' : 'Counter'}
              </Button>
              <Button size="sm" variant="ghost" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                onClick={() => onStatus(deal.id, 'declined')}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Escalated deal — celebrity approval buttons */}
          {isEscalated && approvalStatus === 'pending' && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold"
                  onClick={() => handleResponse('approved')} disabled={responding}>
                  <Check className="h-3.5 w-3.5 me-1" />{isRTL ? 'موافق' : 'Approve'}
                </Button>
                <Button size="sm" variant="outline" className="flex-1 h-9 rounded-xl text-amber-600 border-amber-500/30 hover:bg-amber-500/10 font-semibold"
                  onClick={() => setShowResponseForm('revision')}>
                  <RefreshCw className="h-3.5 w-3.5 me-1" />{isRTL ? 'طلب تعديل' : 'Revision'}
                </Button>
                <Button size="sm" variant="ghost" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                  onClick={() => handleResponse('rejected')} disabled={responding}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {showResponseForm === 'revision' && (
                <div className="space-y-2">
                  <Textarea
                    placeholder={isRTL ? 'وضّح التعديلات المطلوبة...' : 'Describe the required revisions...'}
                    value={responseNote}
                    onChange={e => setResponseNote(e.target.value)}
                    className="text-xs rounded-xl resize-none h-16"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs"
                      onClick={() => handleResponse('revision')} disabled={responding}>
                      {isRTL ? 'إرسال الملاحظات' : 'Send Feedback'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs" onClick={() => setShowResponseForm(null)}>
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pilot AI Analysis — managers only */}
      {canManage && userRole === 'manager' && deal.status === 'pending' && !isEscalated && (
        <div>
          <button
            type="button"
            onClick={() => setShowPilot(p => !p)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPilot ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {isRTL ? (showPilot ? 'إخفاء تحليل Pilot' : 'عرض تحليل Pilot') : (showPilot ? 'Hide Pilot' : 'Analyse with Pilot')}
          </button>
          {showPilot && (
            <div className="mt-2">
              <PilotPanel deal={deal} senderName={name} celebrityUsername={celebrityUsername} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Business-box deal cards — supports celebrity and manager views with escalation. */
export function BusinessDeals({
  celebrityId,
  canManage,
  userRole = 'celebrity',
}: {
  celebrityId?: string | null;
  canManage: boolean;
  userRole?: 'celebrity' | 'manager' | 'sender';
}) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { deals, loading, updateStatus, isGoldenActive, refresh } = useDealCards(celebrityId);

  const visible = deals.filter(d => {
    const da = d as any;
    if (d.status === 'pending') return true;
    if (isGoldenActive(d)) return true;
    if (da.escalated_to_celebrity && da.celebrity_approval_status === 'pending') return true;
    return false;
  });

  const escalateToCelebrity = async (id: string, note?: string) => {
    const deal = deals.find(d => d.id === id);
    if (!deal) return;
    const { error } = await (supabase as any).from('deal_cards').update({
      escalated_to_celebrity: true,
      celebrity_approval_status: 'pending',
      escalation_note: note ?? null,
      escalated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { toast.error(isRTL ? 'فشل الإرسال' : 'Failed to send'); return; }
    await (supabase as any).from('manager_activity_log').insert({
      celebrity_id: deal.celebrity_id,
      manager_id: user?.id,
      action: 'deal_escalated',
      detail: isRTL ? 'أحال الوكيل العرض للمشهور للموافقة' : 'Manager forwarded deal for celebrity approval',
    });
    toast.success(isRTL ? 'تم إرسال العرض للمشهور' : 'Deal sent to celebrity');
    refresh();
  };

  const respondToEscalation = async (id: string, status: 'approved' | 'rejected' | 'revision', note?: string) => {
    const { error } = await (supabase as any).from('deal_cards').update({
      celebrity_approval_status: status,
      celebrity_response_note: note ?? null,
      ...(status === 'approved' ? { status: 'accepted' } : {}),
      ...(status === 'rejected' ? { status: 'declined' } : {}),
    }).eq('id', id);
    if (error) { toast.error(isRTL ? 'فشل الإجراء' : 'Action failed'); return; }
    const msgs: Record<string, string> = {
      approved: isRTL ? 'تمت الموافقة على العرض' : 'Deal approved',
      rejected: isRTL ? 'تم رفض العرض' : 'Deal rejected',
      revision: isRTL ? 'طُلب تعديل العرض' : 'Revision requested',
    };
    toast.success(msgs[status]);
    refresh();
  };

  if (loading || visible.length === 0) return null;

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-primary/10 shrink-0">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-base">{isRTL ? 'صندوق العمل' : 'Deal Cards'}</h3>
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? `${visible.length} عرض نشط — مرتّب حسب الأولوية`
              : `${visible.length} active deal${visible.length > 1 ? 's' : ''} — sorted by priority`}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {visible.map(d => (
          <DealRow
            key={d.id}
            deal={d as any}
            canManage={canManage}
            userRole={userRole}
            onStatus={updateStatus}
            isGoldenActive={isGoldenActive}
            senderName={d.sender_profile?.display_name ?? d.sender_profile?.username}
            celebrityUsername={user?.user_metadata?.username}
            onEscalate={escalateToCelebrity}
            onEscalationResponse={respondToEscalation}
          />
        ))}
      </div>
    </div>
  );
}
