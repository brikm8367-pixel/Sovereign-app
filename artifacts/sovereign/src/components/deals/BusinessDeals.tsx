import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDealCards, DealCard } from '@/hooks/useDealCards';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Briefcase, Sparkles, Check, X, RefreshCw, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  sponsorship: { ar: 'رعاية', en: 'Sponsorship' },
  appearance: { ar: 'ظهور إعلاني', en: 'Brand Appearance' },
  event: { ar: 'حضور فعالية', en: 'Event Attendance' },
  collab: { ar: 'تعاون', en: 'Collaboration' },
  endorsement: { ar: 'ترويج منتج', en: 'Product Endorsement' },
  other: { ar: 'أخرى', en: 'Other' },
};

const STATUS_STYLE: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-500/10',
  accepted: 'text-emerald-600 bg-emerald-500/10',
  declined: 'text-destructive bg-destructive/10',
  countered: 'text-blue-600 bg-blue-500/10',
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
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
      <Sparkles className="h-3 w-3" /> Golden Hour · {m}:{s.toString().padStart(2, '0')}
      <span className="sr-only">{isRTL ? 'متبقٍ' : 'left'}</span>
    </span>
  );
}

function DealRow({ deal, canManage, onStatus, isGoldenActive }: {
  deal: DealCard;
  canManage: boolean;
  onStatus: (id: string, s: any) => void;
  isGoldenActive: (d: DealCard) => boolean;
}) {
  const { isRTL } = useLanguage();
  const name = deal.sender_profile?.display_name || deal.sender_profile?.username || (isRTL ? 'مجهول' : 'Unknown');
  const type = TYPE_LABELS[deal.deal_type]?.[isRTL ? 'ar' : 'en'] || deal.deal_type;
  const golden = isGoldenActive(deal);

  return (
    <div className={cn('rounded-xl border p-3 space-y-2 bg-card',
      golden ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-border')}>
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={deal.sender_profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-blue-500/10 text-blue-600 text-xs">
            {name[0] || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-[11px] text-muted-foreground">{type}</p>
        </div>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', STATUS_STYLE[deal.status])}>
          {deal.status === 'pending' ? (isRTL ? 'قيد المراجعة' : 'Pending')
            : deal.status === 'accepted' ? (isRTL ? 'مقبول' : 'Accepted')
            : deal.status === 'declined' ? (isRTL ? 'مرفوض' : 'Declined')
            : (isRTL ? 'عرض مضاد' : 'Countered')}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {deal.budget_range && <span>💰 {deal.budget_range}</span>}
        {deal.timeline && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{deal.timeline}</span>}
        {golden && deal.golden_hour_expires_at && <GoldenCountdown expiresAt={deal.golden_hour_expires_at} />}
      </div>

      {deal.details && <p className="text-xs text-foreground/80">{deal.details}</p>}

      {canManage && deal.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => onStatus(deal.id, 'accepted')}>
            <Check className="h-3.5 w-3.5 me-1" />{isRTL ? 'قبول' : 'Accept'}
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => onStatus(deal.id, 'countered')}>
            <RefreshCw className="h-3.5 w-3.5 me-1" />{isRTL ? 'عرض مضاد' : 'Counter'}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => onStatus(deal.id, 'declined')}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/** Business-box deal cards for the celebrity or their active manager. */
export function BusinessDeals({ celebrityId, canManage }: { celebrityId?: string | null; canManage: boolean }) {
  const { isRTL } = useLanguage();
  const { deals, loading, updateStatus, isGoldenActive } = useDealCards(celebrityId);

  // A deal card lives in the Business box until the first reply.
  // After a reply (status leaves "pending") it disappears — unless its Golden Hour is still running.
  const visible = deals.filter((d) => d.status === 'pending' || isGoldenActive(d));

  if (loading || visible.length === 0) return null;

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.03] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-blue-500/10"><Briefcase className="h-5 w-5 text-blue-500" /></div>
        <div>
          <h3 className="font-semibold text-base">{isRTL ? 'عروض العمل' : 'Deal Cards'}</h3>
          <p className="text-xs text-muted-foreground">{isRTL ? 'عروض منظّمة في صندوق العمل' : 'Structured offers in your Business box'}</p>
        </div>
      </div>
      <div className="space-y-2">
        {visible.map(d => (
          <DealRow key={d.id} deal={d} canManage={canManage} onStatus={updateStatus} isGoldenActive={isGoldenActive} />
        ))}
      </div>
    </div>
  );
}
