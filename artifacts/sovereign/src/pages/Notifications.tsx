import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Bell, Loader2, Briefcase, Users, Heart, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | 'work' | 'audience' | 'direct';

interface NotificationItem {
  id: string;
  type: 'message' | 'inbox_warning' | 'direct_access';
  title: string;
  description: string;
  category?: string;
  avatar_url?: string | null;
  username?: string | null;
  timestamp: string;
  isRead: boolean;
}

const LABELS: Record<string, Record<string, string>> = {
  ar: {
    notifications: 'الإشعارات', all: 'الكل', work: 'العمل', audience: 'العلاقات',
    private: 'الخاص', noNotifications: 'لا توجد إشعارات', sentYou: 'أرسل لك',
    message: 'رسالة', voiceMessage: 'رسالة صوتية', media: 'وسائط',
    inboxAlmostFull: 'صندوقك يقترب من الامتلاء', inboxFull: 'صندوقك ممتلئ',
    adjustLimit: 'تعديل الحد', gaveAccess: 'منحك وصول خاص',
  },
  en: {
    notifications: 'Notifications', all: 'All', work: 'Work', audience: 'Audience',
    private: 'Private', noNotifications: 'No notifications', sentYou: 'sent you a',
    message: 'message', voiceMessage: 'voice message', media: 'media',
    inboxAlmostFull: 'Your inbox is almost full', inboxFull: 'Your inbox is full',
    adjustLimit: 'Adjust Limit', gaveAccess: 'gave you private access',
  },
  fr: {
    notifications: 'Notifications', all: 'Tout', work: 'Travail', audience: 'Audience',
    private: 'Privé', noNotifications: 'Aucune notification', sentYou: 'vous a envoyé un',
    message: 'message', voiceMessage: 'message vocal', media: 'média',
    inboxAlmostFull: 'Votre boîte est presque pleine', inboxFull: 'Votre boîte est pleine',
    adjustLimit: 'Ajuster la limite', gaveAccess: 'vous a donné un accès privé',
  },
  es: {
    notifications: 'Notificaciones', all: 'Todo', work: 'Trabajo', audience: 'Audiencia',
    private: 'Privado', noNotifications: 'Sin notificaciones', sentYou: 'te envió un',
    message: 'mensaje', voiceMessage: 'mensaje de voz', media: 'multimedia',
    inboxAlmostFull: 'Tu bandeja está casi llena', inboxFull: 'Tu bandeja está llena',
    adjustLimit: 'Ajustar límite', gaveAccess: 'te dio acceso privado',
  },
};

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const l = LABELS[language] || LABELS.en;
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (!loading && !user) navigate('/'); }, [user, loading, navigate]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;

      // Fetch recent messages (last 7 days) as notifications
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [{ data: messages }, { data: limits }, { data: directAccess }] = await Promise.all([
        supabase.from('messages')
          .select('id, sender_id, category, content, voice_url, media_url, created_at, is_read')
          .eq('receiver_id', user.id)
          .is('parent_id', null)
          .gte('created_at', weekAgo)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('message_limits')
          .select('category, max_messages')
          .eq('user_id', user.id),
        supabase.from('direct_access')
          .select('allowed_user_id, created_at')
          .eq('owner_id', user.id)
          .gte('created_at', weekAgo)
          .order('created_at', { ascending: false }),
      ]);

      // Get sender profiles
      const senderIds = [...new Set([
        ...(messages || []).map(m => m.sender_id),
        ...(directAccess || []).map(d => d.allowed_user_id),
      ])];
      const { data: profiles } = senderIds.length > 0
        ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', senderIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const items: NotificationItem[] = [];

      // Message notifications
      (messages || []).forEach(msg => {
        const sender = profileMap.get(msg.sender_id);
        const msgType = msg.voice_url ? l.voiceMessage : msg.media_url ? l.media : l.message;
        const categoryLabel = msg.category === 'work' ? `💼 ${l.work}` : msg.category === 'direct' ? `⭐ ${l.private}` : `👥 ${l.audience}`;
        items.push({
          id: `msg-${msg.id}`,
          type: 'message',
          title: sender?.display_name || sender?.username || '?',
          description: `${l.sentYou} ${msgType} · ${categoryLabel}`,
          category: msg.category,
          avatar_url: sender?.avatar_url,
          username: sender?.username,
          timestamp: msg.created_at,
          isRead: !!msg.is_read,
        });
      });

      // Direct access notifications
      (directAccess || []).forEach(da => {
        const sender = profileMap.get(da.allowed_user_id);
        items.push({
          id: `da-${da.allowed_user_id}`,
          type: 'direct_access',
          title: sender?.display_name || sender?.username || '?',
          description: l.gaveAccess,
          category: 'direct',
          avatar_url: sender?.avatar_url,
          username: sender?.username,
          timestamp: da.created_at,
          isRead: true,
        });
      });

      // Inbox limit warnings
      if (limits) {
        for (const lim of limits) {
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('receiver_id', user.id)
            .eq('category', lim.category);
          const current = count || 0;
          const max = lim.max_messages || 100;
          if (current >= max) {
            items.push({
              id: `full-${lim.category}`,
              type: 'inbox_warning',
              title: l.inboxFull,
              description: `${current}/${max} · ${lim.category === 'work' ? l.work : lim.category === 'direct' ? l.private : l.audience}`,
              category: lim.category,
              timestamp: new Date().toISOString(),
              isRead: false,
            });
          } else if (current >= max * 0.8) {
            items.push({
              id: `warn-${lim.category}`,
              type: 'inbox_warning',
              title: l.inboxAlmostFull,
              description: `${current}/${max} · ${lim.category === 'work' ? l.work : lim.category === 'direct' ? l.private : l.audience}`,
              category: lim.category,
              timestamp: new Date().toISOString(),
              isRead: false,
            });
          }
        }
      }

      // Sort by timestamp desc
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(items);
      setIsLoading(false);
    };

    if (user) fetchNotifications();
  }, [user, language]);

  const filteredNotifications = (activeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.category === activeFilter)
  ).filter(n => !dismissedIds.has(n.id));

  const unreadCount = filteredNotifications.filter(n => !n.isRead).length;

  const handleSwipeDismiss = (id: string, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      setDismissedIds(prev => new Set([...prev, id]));
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    if (n.type === 'message' && n.username) {
      navigate('/home?tab=inbox');
    } else if (n.type === 'direct_access' && n.username) {
      navigate(`/@${n.username}`);
    } else if (n.type === 'inbox_warning') {
      navigate('/home');
    }
  };

  const relativeTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return isRTL ? 'الآن' : 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };

  const filterTabs: { id: FilterTab; label: string; icon: typeof Bell }[] = [
    { id: 'all', label: l.all, icon: Bell },
    { id: 'work', label: l.work, icon: Briefcase },
    { id: 'audience', label: l.audience, icon: Users },
    { id: 'direct', label: l.private, icon: Heart },
  ];

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="fixed top-0 right-0 left-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border safe-area-inset-top">
        <div className="max-w-lg mx-auto flex h-14 items-center justify-between px-4">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {l.notifications}
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1.5">
                {unreadCount}
              </span>
            )}
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto pt-16 pb-20 px-4">
        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-4 overflow-x-auto">
          {filterTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap',
                  activeFilter === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Notification List — Instagram-style */}
        <AnimatePresence>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground font-medium">{isRTL ? 'لا شيء بعد.' : 'Nothing yet.'}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {isRTL ? 'لكن كل ما يأتي سيصل لمكانه.' : 'But everything that comes will land in its place.'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredNotifications.map(n => (
                <motion.div
                  key={n.id}
                  layout
                  drag="x"
                  dragConstraints={{ left: -120, right: 120 }}
                  dragElastic={0.3}
                  onDragEnd={(_, info) => handleSwipeDismiss(n.id, info)}
                  exit={{ opacity: 0, x: isRTL ? 300 : -300, transition: { duration: 0.3 } }}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors',
                    !n.isRead ? 'bg-primary/5' : 'hover:bg-muted/50'
                  )}
                >
                  {/* Avatar or Icon */}
                  {n.avatar_url || n.username ? (
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={n.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {n.title[0] || <User className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className={cn(
                      'h-11 w-11 rounded-full flex items-center justify-center shrink-0',
                      n.type === 'inbox_warning' ? 'bg-destructive/10' : 'bg-primary/10'
                    )}>
                      {n.type === 'inbox_warning' ? (
                        <MessageSquare className="h-5 w-5 text-destructive" />
                      ) : (
                        <Bell className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{n.title}</span>
                      {' '}
                      <span className="text-muted-foreground">{n.description}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{relativeTime(n.timestamp)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.isRead && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>

      <BottomNavigation />
    </div>
  );
}
