import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { usePresence } from '@/hooks/usePresence';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Search, Loader2, User, Send, TrendingUp, Heart, PenSquare, Pin, X } from 'lucide-react';
import { InboxSection, MessageComposer, ConversationView, DirectAccessManager, MessageCategory, Message } from '@/components/messaging';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { BottomNavigation } from '@/components/BottomNavigation';
import CallScreen from '@/components/messaging/CallScreen';
import IncomingCallOverlay from '@/components/messaging/IncomingCallOverlay';
import { playNotificationSound } from '@/utils/sounds';
import { registerPushNotifications, showInAppNotification } from '@/utils/pushNotifications';
import { startRingtone, stopRingtone } from '@/utils/sounds';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { FeatureHint } from '@/components/FeatureHint';
import { ClassificationBanner } from '@/components/ClassificationBanner';
import { decryptFromSender, isEncryptedMessage } from '@/utils/e2eManager';
import RecipientFiltersManager from '@/components/messaging/RecipientFiltersManager';
import StoriesRow from '@/components/messaging/StoriesRow';
import { BusinessDeals } from '@/components/deals/BusinessDeals';


interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default function Dashboard() {
  const { user, loading } = useAuth();
  const { isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isOnline, canCall } = usePresence(user?.id);
  const { role, managedCelebrityId } = useRole();
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('directly_onboarded'));

  const getInitialTab = () => {
    const tab = searchParams.get('tab');
    if (tab === 'search') return 'search';
    if (tab === 'patterns') return 'patterns';
    return 'inbox';
  };

  const [activeTab, setActiveTab] = useState<'inbox' | 'search' | 'patterns'>(getInitialTab());
  const [messages, setMessages] = useState<{ work: Message[]; audience: Message[]; direct: Message[] }>({ work: [], audience: [], direct: [] });
  const [limits, setLimits] = useState<{ work: number; audience: number; direct: number }>({ work: 100, audience: 100, direct: 100 });
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [composeRecipient, setComposeRecipient] = useState<Profile | null>(null);
  const [isDirectAccessOpen, setIsDirectAccessOpen] = useState(false);
  
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [classificationBanner, setClassificationBanner] = useState<{ name: string; category: 'work' | 'audience' | 'direct'; isFirst: boolean } | null>(null);
  
  // Message search
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageSearchResults, setMessageSearchResults] = useState<Message[]>([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  // Incoming call state
  const [incomingCall, setIncomingCall] = useState<{ from: string; callType: 'audio' | 'video'; offer: RTCSessionDescriptionInit; callerName?: string; callerAvatar?: string } | null>(null);
  const [activeIncomingCall, setActiveIncomingCall] = useState<typeof incomingCall>(null);

  // Self profile for stories row
  const [myProfile, setMyProfile] = useState<{ avatar_url: string | null; display_name: string | null } | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('avatar_url, display_name').eq('id', user.id).single().then(({ data }) => {
      if (data) setMyProfile(data);
    });
  }, [user]);

  useEffect(() => { if (!loading && !user) navigate('/'); }, [user, loading, navigate]);

  // Register push notifications on mount
  useEffect(() => {
    if (user) {
      registerPushNotifications();
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [user]);

  // Fetch pinned conversations
  useEffect(() => {
    if (!user) return;
    const fetchPins = async () => {
      const { data } = await (supabase as any).from('pinned_conversations').select('conversation_id').eq('user_id', user.id);
      if (data) setPinnedIds(new Set(data.map((p: any) => p.conversation_id)));
    };
    fetchPins();
  }, [user]);

  const togglePin = async (messageId: string) => {
    if (!user) return;
    if (pinnedIds.has(messageId)) {
      await (supabase as any).from('pinned_conversations').delete().eq('user_id', user.id).eq('conversation_id', messageId);
      setPinnedIds(prev => { const next = new Set(prev); next.delete(messageId); return next; });
    } else {
      await (supabase as any).from('pinned_conversations').insert({ user_id: user.id, conversation_id: messageId });
      setPinnedIds(prev => new Set([...prev, messageId]));
    }
  };

  // Listen for incoming calls via Supabase Realtime broadcast
  useEffect(() => {
    if (!user) return;
    const callChannels: any[] = [];

    const setupCallListener = async () => {
      // Build the peer set from EVERY person we have any communication tie with —
      // direct_access (both directions) + anyone we exchanged a message with.
      // Without this, recipients who weren't pre-approved never hear the offer broadcast.
      const [{ data: iAdded }, { data: addedMe }, { data: msgPeers }] = await Promise.all([
        supabase.from('direct_access').select('allowed_user_id').eq('owner_id', user.id),
        supabase.from('direct_access').select('owner_id').eq('allowed_user_id', user.id),
        supabase.from('messages')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .limit(500),
      ]);

      const peerIds = new Set<string>([
        ...(iAdded?.map(r => r.allowed_user_id) ?? []),
        ...(addedMe?.map(r => r.owner_id) ?? []),
        ...(msgPeers?.flatMap(m => [m.sender_id, m.receiver_id]).filter(id => id !== user.id) ?? []),
      ]);

      if (peerIds.size === 0) return;

      for (const peerId of peerIds) {
        const channelName = [user.id, peerId].sort().join('-');
        const channel = supabase.channel(`call-${channelName}`);

        channel
          .on('broadcast', { event: 'offer' }, async ({ payload }) => {
            if (payload.from !== user.id) {
              startRingtone();

              const { data: callerProfile } = await supabase
                .from('profiles')
                .select('display_name, avatar_url')
                .eq('id', payload.from)
                .single();

              setIncomingCall({
                from: payload.from,
                callType: payload.callType || 'audio',
                offer: payload.offer,
                callerName: callerProfile?.display_name || 'Unknown',
                callerAvatar: callerProfile?.avatar_url || undefined,
              });

              supabase.functions.invoke('send-push-notification', {
                body: {
                  receiverId: user.id,
                  senderName: callerProfile?.display_name || 'Someone',
                  notificationType: payload.callType === 'video' ? 'call_video' : 'call_audio',
                },
              }).catch(() => {});
            }
          })
          .subscribe();

        callChannels.push(channel);
      }
    };

    setupCallListener();
    return () => { callChannels.forEach(ch => supabase.removeChannel(ch)); };
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    setIsLoadingMessages(true);

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (data) {
      const userIds = [...new Set(data.flatMap(m => [m.sender_id, m.receiver_id]).filter(id => id !== user.id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
        : { data: [] };

      const withProfiles = await Promise.all(data.map(async (m) => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        // Decrypt preview content for inbox display (silent — user never sees encryption)
        let displayContent = m.content;
        if (isEncryptedMessage(m.content)) {
          const res = await decryptFromSender(m.content, m.sender_id === user.id ? m.receiver_id : m.sender_id);
          displayContent = res.success ? res.plaintext : '🔒';
        }
        return {
          ...m,
          content: displayContent,
          sender_profile: profiles?.find(p => p.id === otherId) || { id: otherId, display_name: null, username: null, avatar_url: null },
        };
      })) as Message[];

      setMessages({
        work: withProfiles.filter(m => m.category === 'work'),
        audience: withProfiles.filter(m => m.category === 'audience'),
        direct: withProfiles.filter(m => m.category === 'direct'),
      });
    }

    const { data: limitsData } = await supabase
      .from('message_limits')
      .select('category, max_messages')
      .eq('user_id', user.id);

    if (limitsData) {
      const newLimits = { work: 100, audience: 100, direct: 100 };
      limitsData.forEach(l => { newLimits[l.category as MessageCategory] = l.max_messages; });
      setLimits(newLimits);
    }

    setIsLoadingMessages(false);
  }, [user]);

  useEffect(() => { if (user) fetchMessages(); }, [user, fetchMessages]);

  // Realtime: category-specific notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('messages-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, async (payload) => {
        fetchMessages();
        playNotificationSound();
        const msg = payload.new as any;
        if (msg) {
          const categoryLabel = msg.category === 'work' ? '💼' : msg.category === 'direct' ? '⭐' : '👥';
          showInAppNotification(
            `${categoryLabel} Sovereign`,
            msg.voice_url ? '🎤 Voice message' : msg.media_url ? '📷 Media' : msg.content?.substring(0, 50) || 'New message'
          );
          // Classification banner
          const { data: senderProfile } = await supabase.from('profiles').select('display_name').eq('id', msg.sender_id).single();
          const totalMsgs = messages.work.length + messages.audience.length + messages.direct.length;
          setClassificationBanner({
            name: senderProfile?.display_name || 'Someone',
            category: msg.category,
            isFirst: totalMsgs === 0,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchMessages]);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2 || !user) { setSearchResults([]); return; }
      setIsSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .neq('id', user.id)
        .limit(15);
      setSearchResults(data || []);
      setIsSearching(false);
    };
    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user]);

  // Search in messages
  useEffect(() => {
    if (messageSearchQuery.length < 2 || !user) { setMessageSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearchingMessages(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)
        .ilike('content', `%${messageSearchQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        const userIds = [...new Set(data.flatMap(m => [m.sender_id, m.receiver_id]).filter(id => id !== user.id))];
        const { data: profiles } = userIds.length > 0
          ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
          : { data: [] };
        
        setMessageSearchResults(data.map(m => {
          const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
          return {
            ...m,
            sender_profile: profiles?.find(p => p.id === otherId) || { id: otherId, display_name: null, username: null, avatar_url: null },
          };
        }) as Message[]);
      }
      setIsSearchingMessages(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [messageSearchQuery, user]);

  const handleSetLimit = async (category: MessageCategory, limit: number) => {
    if (!user) return;
    await supabase.from('message_limits').upsert({
      user_id: user.id, category, max_messages: limit,
    }, { onConflict: 'user_id,category' });
    setLimits(prev => ({ ...prev, [category]: limit }));
  };

  // Sort messages: pinned first
  const sortWithPins = (msgs: Message[]) => {
    const pinned = msgs.filter(m => pinnedIds.has(m.id));
    const unpinned = msgs.filter(m => !pinnedIds.has(m.id));
    return [...pinned, ...unpinned];
  };

  const unreadCount = messages.work.filter(m => !m.is_read).length + messages.audience.filter(m => !m.is_read).length + messages.direct.filter(m => !m.is_read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Classification Banner */}
      {classificationBanner && (
        <ClassificationBanner
          key={Date.now()}
          senderName={classificationBanner.name}
          category={classificationBanner.category}
          isFirst={classificationBanner.isFirst}
        />
      )}

      <header className="fixed top-0 right-0 left-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border safe-area-inset-top">
        <div className="max-w-lg mx-auto flex h-14 items-center justify-between px-4">
          <p className="text-sm font-medium text-muted-foreground">
            {unreadCount > 0
              ? (isRTL ? `✨ ${unreadCount} جديد` : `✨ ${unreadCount} new`)
              : (isRTL ? 'كل شيء في مكانه — تلقائيًا' : 'Everything in its place — automatically')}
          </p>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl touch-feedback" onClick={() => setIsDirectAccessOpen(true)}>
              <Heart className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto pt-16 pb-20 px-4"
        onTouchStart={(e) => {
          const touch = e.touches[0];
          (e.currentTarget as any)._swipeStartX = touch.clientX;
          (e.currentTarget as any)._swipeStartY = touch.clientY;
        }}
        onTouchEnd={(e) => {
          const startX = (e.currentTarget as any)._swipeStartX;
          const startY = (e.currentTarget as any)._swipeStartY;
          if (startX == null) return;
          const touch = e.changedTouches[0];
          const dx = touch.clientX - startX;
          const dy = touch.clientY - startY;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            const tabs: ('inbox' | 'search' | 'patterns')[] = ['inbox', 'search', 'patterns'];
            const idx = tabs.indexOf(activeTab);
            const swipeRight = isRTL ? dx > 0 : dx < 0;
            const next = swipeRight ? idx + 1 : idx - 1;
            if (next >= 0 && next < tabs.length) setActiveTab(tabs[next]);
          }
        }}
      >
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-4">
          {[
            { id: 'inbox', icon: MessageSquare, label: isRTL ? 'الرسائل' : language === 'fr' ? 'Boîte' : language === 'es' ? 'Bandeja' : 'Inbox' },
            { id: 'search', icon: Search, label: isRTL ? 'بحث' : language === 'fr' ? 'Recherche' : language === 'es' ? 'Buscar' : 'Search' },
            { id: 'patterns', icon: TrendingUp, label: isRTL ? 'الفلاتر' : language === 'fr' ? 'Filtres' : language === 'es' ? 'Filtros' : 'Filters' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all touch-feedback flex items-center justify-center gap-2 ${
                activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'inbox' && (
          <div className="space-y-4">
            {/* Value proposition */}
            <div className="text-center py-4 px-2">
              <p className="text-[15px] font-medium leading-relaxed text-foreground/90">
                {isRTL 
                  ? 'تحكم بمن يصل إليك، ودع رسائلك تصل دائمًا إلى مكانها الصحيح.'
                  : 'Control who reaches you, and let your messages always land where they belong.'}
              </p>
              <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                {isRTL 
                  ? 'ادعُ فقط من تريد التواصل معه، ودع الباقي على Sovereign.'
                  : 'Invite only who you want to connect with. Leave the rest to Sovereign.'}
              </p>
            </div>

            {/* Stories Row — Snapchat / Instagram style */}
            {user && (
              <StoriesRow
                userId={user.id}
                messages={[...messages.direct, ...messages.work, ...messages.audience] as any}
                myAvatar={myProfile?.avatar_url}
                myName={myProfile?.display_name}
                onStoryClick={(p) => {
                  // Open the most recent message thread with that person
                  const all = [...messages.direct, ...messages.work, ...messages.audience];
                  const msg = all
                    .filter(m => m.sender_profile?.id === p.id || m.sender_id === p.id || m.receiver_id === p.id)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                  if (msg) setSelectedMessage(msg);
                  else setComposeRecipient({ id: p.id, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url });
                }}
              />
            )}

            {/* Message search bar */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? '🔍 ابحث في الرسائل والمحادثات...' : '🔍 Search messages & conversations...'}
                value={messageSearchQuery}
                onChange={(e) => setMessageSearchQuery(e.target.value)}
                className="ps-9 h-10 text-sm rounded-xl border"
              />
              {messageSearchQuery && (
                <button onClick={() => setMessageSearchQuery('')} className="absolute end-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Message search results */}
            {messageSearchQuery.length >= 2 && (
              <div className="space-y-2">
                {isSearchingMessages && (
                  <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></div>
                )}
                {!isSearchingMessages && messageSearchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">{isRTL ? 'لا نتائج' : 'No results found'}</p>
                )}
                {messageSearchResults.map(msg => (
                  <button
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors text-start"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={msg.sender_profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {msg.sender_profile?.display_name?.[0] || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{msg.sender_profile?.display_name || msg.sender_profile?.username || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{msg.content}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Deal Cards — Business box (celebrity sees own, manager sees linked celebrity) */}
            {messageSearchQuery.length < 2 && (role === 'celebrity' || role === 'manager') && (
              <BusinessDeals
                celebrityId={role === 'manager' ? managedCelebrityId : user?.id}
                canManage={role === 'celebrity' || role === 'manager'}
              />
            )}

            {/* Inbox categories — visibility driven by Sovereign role */}
            {messageSearchQuery.length < 2 && (
              <>
                {(
                  role === 'manager'
                    ? (['work'] as MessageCategory[]) // Manager → Business box only
                    : role === 'celebrity'
                      ? (['direct', 'work', 'audience'] as MessageCategory[]) // Celebrity → Private + Business + Fans
                      : (['direct', 'work', 'audience'] as MessageCategory[]) // Sender/Fan → own conversations
                ).map(category => (
                  <InboxSection
                    key={category}
                    category={category}
                    messages={sortWithPins(messages[category]) as any}
                    messageLimit={limits[category]}
                    onSetLimit={(limit) => handleSetLimit(category, limit)}
                    onMessageClick={setSelectedMessage}
                    isLoading={isLoadingMessages}
                    isOnline={category === 'direct' ? isOnline : undefined}
                    pinnedIds={pinnedIds}
                    onTogglePin={togglePin}
                  />
                ))}
              </>
            )}
          </div>

        )}

        {activeTab === 'search' && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'من تريد أن يسمعك؟' : 'Who do you want to hear you?'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-12 h-13 text-base rounded-2xl border-2 focus:border-primary"
              />
              {isSearching && <Loader2 className="absolute end-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />}
            </div>
            {searchQuery.length >= 2 ? (
              <div className="space-y-3">
                {searchResults.length === 0 && !isSearching ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">{isRTL ? 'لم نجد أحداً بهذا الاسم — هل الاسم صحيح؟' : "We couldn't find anyone — is the name correct?"}</p>
                  </div>
                ) : (
                  searchResults.map((profile) => (
                    <div key={profile.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border touch-feedback">
                      <button onClick={() => profile.username && navigate(`/@${profile.username}`)} className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {profile.display_name?.[0] || <User className="h-5 w-5" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 text-start">
                          <p className="font-semibold truncate">{profile.display_name || profile.username}</p>
                          {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
                        </div>
                      </button>
                      <Button size="icon" onClick={() => setComposeRecipient(profile)} className="h-11 w-11 rounded-xl touch-feedback">
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-3">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium mb-1">{isRTL ? 'من تريد أن يسمعك؟' : 'Who do you want to hear you?'}</p>
                <p className="text-sm text-muted-foreground">{isRTL ? 'كل شخص له مكانه' : 'Everyone has their place'}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'patterns' && user && (
          <div className="space-y-6">
            <RecipientFiltersManager />
          </div>
        )}
      </main>

      {/* WhatsApp-style Compose FAB */}
      <button
        onClick={() => setComposeRecipient({} as any)}
        className="fixed z-40 bottom-20 end-5 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center touch-feedback hover:scale-105 active:scale-95 transition-transform"
        aria-label={isRTL ? 'إنشاء رسالة' : 'New message'}
      >
        <PenSquare className="h-6 w-6" />
      </button>

      <BottomNavigation />

      {/* Incoming call overlay */}
      {incomingCall && !activeIncomingCall && (
        <IncomingCallOverlay
          callerName={incomingCall.callerName || 'Unknown'}
          callerAvatar={incomingCall.callerAvatar}
          callType={incomingCall.callType}
          onAnswer={() => {
            stopRingtone();
            setActiveIncomingCall(incomingCall);
            setIncomingCall(null);
          }}
          onReject={() => {
            stopRingtone();
            const channelName = [user?.id, incomingCall.from].sort().join('-');
            const ch = supabase.channel(`call-${channelName}`);
            ch.subscribe((s) => {
              if (s === 'SUBSCRIBED') {
                ch.send({ type: 'broadcast', event: 'end-call', payload: { from: user?.id } });
                setTimeout(() => supabase.removeChannel(ch), 1000);
              }
            });
            setIncomingCall(null);
          }}
        />
      )}

      {/* Active incoming call screen */}
      {activeIncomingCall && (
        <CallScreen
          recipientId={activeIncomingCall.from}
          recipientName={activeIncomingCall.callerName || 'Unknown'}
          recipientAvatar={activeIncomingCall.callerAvatar}
          callType={activeIncomingCall.callType}
          isIncoming
          offer={activeIncomingCall.offer}
          onEnd={() => { stopRingtone(); setActiveIncomingCall(null); }}
        />
      )}

      <ConversationView
        message={selectedMessage}
        isOpen={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        onMessageRead={fetchMessages}
        canCall={selectedMessage ? canCall(selectedMessage.sender_profile?.id || selectedMessage.sender_id) : false}
      />
      <MessageComposer isOpen={!!composeRecipient} onClose={() => setComposeRecipient(null)} recipient={composeRecipient?.id ? composeRecipient : null} onMessageSent={fetchMessages} />
      <DirectAccessManager isOpen={isDirectAccessOpen} onClose={() => setIsDirectAccessOpen(false)} />
      
    </div>
  );
}
