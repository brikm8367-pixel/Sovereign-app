import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDealCards, DealCard } from '@/hooks/useDealCards';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Briefcase, Sparkles, Check, X, RefreshCw, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PilotPanel } from './PilotPanel';

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
      <span className="sr-only">{isRTL ? 'متبقٍ' : 'left'}</span>
    </span>
  );
}

/** Parse the deal details JSON if it was stored as structured payload. */
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

function DealRow({ deal, canManage, onStatus, isGoldenActive, senderName, celebrityUsername }: {
  deal: DealCard;
  canManage: boolean;
  onStatus: (id: string, s: any) => void;
  isGoldenActive: (d: DealCard) => boolean;
  senderName?: string | null;
  celebrityUsername?: string | null;
}) {
  const { isRTL } = useLanguage();
  const [showPilot, setShowPilot] = useState(false);
  const name = deal.sender_profile?.display_name || deal.sender_profile?.username || (isRTL ? 'مجهول' : 'Unknown');
  const type = TYPE_LABELS[deal.deal_type]?.[isRTL ? 'ar' : 'en'] || deal.deal_type;
  const golden = isGoldenActive(deal);
  const parsed = parseDealDetails(deal.details);
  const paymentLabel = parsed.payment_structure ? PAYMENT_LABELS[parsed.payment_structure]?.[isRTL ? 'ar' : 'en'] : null;

  return (
    <div className={cn(
      'rounded-2xl border p-4 space-y-3 bg-card shadow-sm transition-shadow hover:shadow-md',
      golden ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-border',
    )}>
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

      {/* Deal metadata chips */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
        {deal.budget_range && (
          <span className="inline-flex items-center gap-1 bg-muted/50 rounded-full px-2 py-0.5">
            💰 {deal.budget_range}
          </span>
        )}
        {paymentLabel && (
          <span className="inline-flex items-center gap-1 bg-muted/50 rounded-full px-2 py-0.5">
            💳 {paymentLabel}
          </span>
        )}
        {deal.timeline && (
          <span className="inline-flex items-center gap-1 bg-muted/50 rounded-full px-2 py-0.5">
            <Clock className="h-3 w-3" />
            {deal.timeline}
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

      {/* Action buttons for manager */}
      {canManage && deal.status === 'pending' && (
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

      {/* Pilot toggle — only for managers on pending deals */}
      {canManage && deal.status === 'pending' && (
        <div>
          <button
            type="button"
            onClick={() => setShowPilot(p => !p)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPilot
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />}
            {isRTL ? (showPilot ? 'إخفاء تحليل Pilot' : 'عرض تحليل Pilot') : (showPilot ? 'Hide Pilot' : 'Analyse with Pilot')}
          </button>
          {showPilot && (
            <div className="mt-2">
              <PilotPanel
                deal={deal}
                senderName={name}
                celebrityUsername={celebrityUsername}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Business-box deal cards for the celebrity or their active manager. */
export function BusinessDeals({ celebrityId, canManage }: { celebrityId?: string | null; canManage: boolean }) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { deals, loading, updateStatus, isGoldenActive } = useDealCards(celebrityId);

  const visible = deals.filter(d => d.status === 'pending' || isGoldenActive(d));
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
              ? `${visible.length} عرض${visible.length > 1 ? ' نشط' : ' نشط'} — مرتّب حسب الأولوية`
              : `${visible.length} active deal${visible.length > 1 ? 's' : ''} — sorted by priority`}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {visible.map(d => (
          <DealRow
            key={d.id}
            deal={d}
            canManage={canManage}
            onStatus={updateStatus}
            isGoldenActive={isGoldenActive}
            senderName={d.sender_profile?.display_name ?? d.sender_profile?.username}
            celebrityUsername={user?.user_metadata?.username}
          />
        ))}
      </div>
    </div>
  );
}
