import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, Users, Heart, Settings2, Mail, MailOpen, Check, CheckCheck, ShieldCheck, Pin, Infinity as InfinityIcon, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type MessageCategory = 'work' | 'audience' | 'direct';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  category: MessageCategory;
  parent_id: string | null;
  sender_profile?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  subject: string | null;
  content: string;
  is_important: boolean;
  is_read: boolean;
  created_at: string;
  voice_url?: string | null;
}

interface InboxSectionProps {
  category: MessageCategory;
  messages: Message[];
  messageLimit: number;
  onSetLimit: (limit: number) => void;
  onMessageClick: (message: Message) => void;
  isLoading?: boolean;
  isOnline?: (userId: string) => boolean;
  pinnedIds?: Set<string>;
  onTogglePin?: (messageId: string) => void;
}

const categoryConfig = {
  work: {
    icon: Briefcase,
    label: { ar: 'العمل', en: 'Business' },
    subtitle: { ar: 'العروض الاحترافية', en: 'Professional offers only' },
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    emoji: '💼',
  },
  audience: {
    icon: Users,
    label: { ar: 'الجماهير', en: 'Fans' },
    subtitle: { ar: 'الجمهور والمعجبون', en: 'Your audience & fans' },
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    emoji: '👥',
  },
  direct: {
    icon: Lock,
    label: { ar: 'الخاص', en: 'Private' },
    subtitle: { ar: 'مساحتك أنت فقط — بلا ذكاء اصطناعي', en: 'Your private space — no AI' },
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    emoji: '🔒',
  },
};

export default function InboxSection({
  category,
  messages,
  messageLimit,
  onSetLimit,
  onMessageClick,
  isLoading = false,
  isOnline,
  pinnedIds,
  onTogglePin,
}: InboxSectionProps) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [tempLimit, setTempLimit] = useState(messageLimit);
  const [tempMode, setTempMode] = useState<'unlimited' | 'limited' | 'closed'>('limited');
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);

  const config = categoryConfig[category];
  const Icon = config.icon;

  // Load current mode
  useEffect(() => {
    if (!user || !isLimitDialogOpen) return;
    (async () => {
      const { data } = await supabase
        .from('message_limits')
        .select('inbox_mode, max_messages')
        .eq('user_id', user.id)
        .eq('category', category)
        .maybeSingle();
      if (data) {
        setTempMode((data.inbox_mode as any) || 'limited');
        setTempLimit(data.max_messages || 100);
      }
    })();
  }, [user, isLimitDialogOpen, category]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return isRTL ? `${diffMins} د` : `${diffMins}m`;
    if (diffHours < 24) return isRTL ? `${diffHours} س` : `${diffHours}h`;
    return isRTL ? `${diffDays} ي` : `${diffDays}d`;
  };

  const handleSaveLimit = async () => {
    if (!user) return;
    const finalLimit = tempMode === 'unlimited' ? 999999 : tempMode === 'closed' ? 0 : tempLimit;
    await supabase.from('message_limits').upsert({
      user_id: user.id,
      category,
      max_messages: finalLimit,
      inbox_mode: tempMode,
    }, { onConflict: 'user_id,category' });
    onSetLimit(finalLimit);
    setIsLimitDialogOpen(false);
  };

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <div className={cn(
      'rounded-2xl border p-4 transition-all duration-200 bg-card border-border',
      unreadCount > 0 && 'border-primary/25'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl', config.bgColor)}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">
                {config.label[isRTL ? 'ar' : 'en']}
              </h3>
              {unreadCount > 0 && (
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full text-white',
                  category === 'work' ? 'bg-blue-500' : category === 'audience' ? 'bg-violet-500' : 'bg-amber-500'
                )}>
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {messageLimit >= 999999
                ? (isRTL ? `مساحتك — ${messages.length} (لا محدود)` : `Your space — ${messages.length} (unlimited)`)
                : messageLimit === 0
                  ? (isRTL ? 'مغلق — لا يصلك أحد' : 'Closed — no one reaches you')
                  : (isRTL ? `مساحتك — ${messages.length}/${messageLimit}` : `Your space — ${messages.length}/${messageLimit}`)
              }
              <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" />
                <span className="text-[10px] font-medium">E2E</span>
              </span>
            </p>
          </div>
        </div>

        <Dialog open={isLimitDialogOpen} onOpenChange={setIsLimitDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg touch-feedback">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">{isRTL ? 'أنت تتحكم في من يصل' : 'You control who reaches you'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setTempMode('unlimited')}
                  className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all touch-feedback',
                    tempMode === 'unlimited' ? 'border-primary bg-primary/5' : 'border-border bg-card')}>
                  <InfinityIcon className="h-5 w-5 text-primary" />
                  <span className="text-[11px] font-semibold">{isRTL ? 'غير محدود' : 'Unlimited'}</span>
                </button>
                <button onClick={() => setTempMode('limited')}
                  className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all touch-feedback',
                    tempMode === 'limited' ? 'border-primary bg-primary/5' : 'border-border bg-card')}>
                  <Settings2 className="h-5 w-5 text-primary" />
                  <span className="text-[11px] font-semibold">{isRTL ? 'محدود' : 'Limited'}</span>
                </button>
                <button onClick={() => setTempMode('closed')}
                  className={cn('flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all touch-feedback',
                    tempMode === 'closed' ? 'border-primary bg-primary/5' : 'border-border bg-card')}>
                  <Lock className="h-5 w-5 text-primary" />
                  <span className="text-[11px] font-semibold">{isRTL ? 'مغلق' : 'Closed'}</span>
                </button>
              </div>

              {tempMode === 'unlimited' && (
                <div className="text-center p-4 bg-muted rounded-xl">
                  <p className="text-sm font-medium">{isRTL ? 'تستقبل رسائل بلا حد' : 'Receive unlimited messages'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isRTL ? 'لا يوجد سقف لعدد الرسائل' : 'No cap on incoming messages'}</p>
                </div>
              )}
              {tempMode === 'limited' && (
                <>
                  <div className="text-center p-4 bg-muted rounded-xl">
                    <span className="text-4xl font-bold">{tempLimit}</span>
                    <p className="text-sm text-muted-foreground mt-1">{isRTL ? 'الحد الأقصى للرسائل' : 'Max messages'}</p>
                  </div>
                  <Slider value={[tempLimit]} onValueChange={([v]) => setTempLimit(v)} min={0} max={1000} step={10} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>1000</span>
                  </div>
                </>
              )}
              {tempMode === 'closed' && (
                <div className="text-center p-4 bg-muted rounded-xl">
                  <Lock className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">{isRTL ? 'مغلق تماماً' : 'Fully closed'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{isRTL ? 'لا يمكن لأي أحد أن يرسل لك في هذا الصندوق' : 'No one can send you messages in this box'}</p>
                </div>
              )}

              <Button onClick={handleSaveLimit} className="w-full h-11 rounded-xl">{isRTL ? 'حفظ' : 'Save'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages */}
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground">{isRTL ? 'هادئ الآن. وجاهز لما يأتي.' : 'Quiet now. Ready for what comes.'}</p>
          </div>
        ) : (
          messages.slice(0, 5).map((message) => {
            const senderName = message.sender_profile?.display_name || message.sender_profile?.username || (isRTL ? 'مجهول' : 'Unknown');
            const senderOnline = category === 'direct' && isOnline && message.sender_profile?.id
              ? isOnline(message.sender_profile.id) : false;
            const isPinned = pinnedIds?.has(message.id);

            return (
              <div key={message.id} className="relative group">
                <button
                  onClick={() => onMessageClick(message)}
                  className={cn(
                    'w-full text-start p-3 rounded-xl transition-all touch-feedback',
                    message.is_read ? 'bg-muted/30' : 'bg-primary/5 border border-primary/15',
                    isPinned && 'ring-1 ring-primary/20',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('p-1.5 rounded-lg relative', message.is_read ? 'bg-muted' : 'bg-primary/10')}>
                      {message.is_read ? <MailOpen className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-primary" />}
                      {senderOnline && (
                        <div className="absolute -top-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-card" style={{ background: 'var(--gradient-gold)' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                        <span className={cn('font-medium text-sm truncate', !message.is_read && 'text-foreground')}>
                          {senderName} <span className={cn('text-[10px] font-normal', config.color)}>— {config.label[isRTL ? 'ar' : 'en']} {config.emoji}</span>
                        </span>
                        {senderOnline && (
                          <span className="text-[10px] text-primary font-medium">{isRTL ? 'نشط' : 'Active'}</span>
                        )}
                        <span className="text-xs text-muted-foreground ms-auto">{formatTime(message.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                        {message.sender_id === user?.id && (
                          message.is_read
                            ? <CheckCheck className={cn('h-3 w-3 shrink-0', category === 'work' ? 'text-blue-400' : category === 'audience' ? 'text-violet-400' : 'text-amber-400')} />
                            : <Check className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        )}
                        {message.voice_url ? (isRTL ? '🎤 رسالة صوتية' : '🎤 Voice message') : message.content}
                      </p>
                    </div>
                  </div>
                </button>
                {/* Pin button on hover/long-press */}
                {onTogglePin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onTogglePin(message.id); }}
                    className={cn(
                      'absolute top-2 end-2 h-7 w-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity',
                      isPinned ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:text-primary'
                    )}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {messages.length > 5 && (
        <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
          {isRTL ? `الكل (${messages.length})` : `All (${messages.length})`}
        </Button>
      )}
    </div>
  );
}
