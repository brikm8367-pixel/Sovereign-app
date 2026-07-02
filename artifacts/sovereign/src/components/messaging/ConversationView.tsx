import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Send, Loader2, User, ArrowLeft, ArrowRight, Mic, Phone, Video, Image as ImageIcon, X, Check, CheckCheck, Copy, Reply, MoreVertical, Shield, Pencil, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Message, MessageCategory } from './InboxSection';
import VoiceRecorder from './VoiceRecorder';
import VoicePlayer from './VoicePlayer';
import CallScreen from './CallScreen';
import BlockReportDialog from './BlockReportDialog';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { encryptForRecipient, decryptFromSender, isEncryptedMessage } from '@/utils/e2eManager';
import { initScreenshotDetection, onScreenshot, notifyScreenshot } from '@/utils/screenshotDetection';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConversationViewProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
  onMessageRead?: () => void;
  canCall?: boolean;
}

interface ThreadMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean | null;
  category: MessageCategory;
  parent_id: string | null;
  voice_url?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  is_edited?: boolean | null;
  edited_at?: string | null;
  expires_at?: string | null;
}

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
}

const REACTIONS = ['❤️', '👍', '🔥', '😂', '👎'];
const UNSEND_WINDOW_MS = 5 * 60 * 1000;
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const DISAPPEAR_OPTIONS = [
  { label: '10s', value: 10 * 1000 },
  { label: '1h', value: 60 * 60 * 1000 },
  { label: '24h', value: 24 * 60 * 60 * 1000 },
  { label: '7d', value: 7 * 24 * 60 * 60 * 1000 },
];

const haptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) navigator.vibrate(style === 'light' ? 10 : style === 'medium' ? 20 : 40);
};

function relativeTime(dateStr: string, isRTL: boolean): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return isRTL ? 'الآن' : 'Now';
  if (mins < 60) return isRTL ? `${mins} د` : `${mins}m`;
  if (hours < 24) return isRTL ? `${hours} س` : `${hours}h`;
  if (days === 1) return isRTL ? 'أمس' : 'Yesterday';
  return new Intl.DateTimeFormat(isRTL ? 'ar' : 'en', { dateStyle: 'short' }).format(new Date(dateStr));
}

function dateSeparator(dateStr: string, isRTL: boolean): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffDays === 0) return isRTL ? 'اليوم' : 'Today';
  if (diffDays === 1) return isRTL ? 'أمس' : 'Yesterday';
  return new Intl.DateTimeFormat(isRTL ? 'ar' : 'en', { dateStyle: 'medium' }).format(new Date(dateStr));
}

export default function ConversationView({ message, isOpen, onClose, onMessageRead, canCall }: ConversationViewProps) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendingMsgId, setSendingMsgId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isMine: boolean; createdAt: string } | null>(null);
  const [showVoice, setShowVoice] = useState(false);
  const [activeCall, setActiveCall] = useState<{ type: 'audio' | 'video' } | null>(null);
  const [mediaPreview, setMediaPreview] = useState<{ file: File; url: string } | null>(null);
  const [showBlockReport, setShowBlockReport] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showDisappear, setShowDisappear] = useState(false);
  const [disappearTimer, setDisappearTimer] = useState<number | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const getRootId = (msg: Message | null): string | null => msg ? (msg.parent_id || msg.id) : null;

  const isInactiveThread = useCallback((threadMsgs: ThreadMessage[]) => {
    if (threadMsgs.length === 0) return true;
    return (Date.now() - new Date(threadMsgs[threadMsgs.length - 1].created_at).getTime()) / 3600000 >= 1;
  }, []);

  const decryptThread = async (msgs: ThreadMessage[]): Promise<ThreadMessage[]> => {
    if (!user) return msgs;
    return Promise.all(msgs.map(async (msg) => {
      if (isEncryptedMessage(msg.content)) {
        const res = await decryptFromSender(msg.content, msg.sender_id === user.id ? msg.receiver_id : msg.sender_id);
        return { ...msg, content: res.success ? res.plaintext : '🔒' };
      }
      return msg;
    }));
  };

  const loadThread = useCallback(async () => {
    if (!message || !user) return;
    const rootId = getRootId(message);
    if (!rootId) return;

    const [{ data }, { data: rxns }, { data: delMsgs }] = await Promise.all([
      supabase.from('messages').select('*').or(`id.eq.${rootId},parent_id.eq.${rootId}`).order('created_at', { ascending: true }),
      supabase.from('message_reactions').select('*'),
      supabase.from('deleted_messages').select('message_id').eq('user_id', user.id),
    ]);

    const deletedSet = new Set((delMsgs || []).map(d => d.message_id));
    setDeletedIds(deletedSet);
    const filtered = ((data as ThreadMessage[]) || []).filter(m => !deletedSet.has(m.id));
    const decrypted = await decryptThread(filtered);
    setThread(decrypted);
    setReactions((rxns as Reaction[]) || []);
    setIsLoading(false);

    if (data) {
      const unreadIds = data.filter(m => m.receiver_id === user.id && !m.is_read).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        onMessageRead?.();
      }
    }
  }, [message?.id, user?.id]);

  useEffect(() => {
    if (isOpen && message) { setIsLoading(true); loadThread(); }
  }, [isOpen, message?.id]);

  // Realtime
  useEffect(() => {
    if (!isOpen || !message || !user) return;
    const rootId = getRootId(message);
    if (!rootId) return;

    const typingChannel = supabase.channel(`typing-${rootId}`);
    typingChannel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId !== user.id) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      }
    }).subscribe();

    const msgChannel = supabase.channel(`thread-${rootId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new as any;
        if (msg && (msg.id === rootId || msg.parent_id === rootId)) {
          await loadThread();
        }
      }).subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
      supabase.removeChannel(msgChannel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setIsTyping(false);
    };
  }, [isOpen, message?.id, user?.id]);

  const broadcastTyping = useCallback(() => {
    if (!message || !user) return;
    const rootId = getRootId(message);
    if (!rootId) return;
    const channel = supabase.channel(`typing-${rootId}`);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id } });
      }
    });
  }, [message?.id, user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread]);

  // 📸 Screenshot detection — notify the other party in real-time
  useEffect(() => {
    if (!isOpen || !user?.id || !message) return;
    initScreenshotDetection();
    const otherId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
    const off = onScreenshot(() => {
      toast.warning('تم رصد لقطة شاشة — تم إخطار الطرف الآخر');
      notifyScreenshot({
        senderId: user.id,
        receiverId: otherId,
        category: message.category as any,
      });
    });
    return () => { off(); };
  }, [isOpen, user?.id, message?.id]);

  const otherUserId = message?.sender_id === user?.id ? message?.receiver_id : message?.sender_id;
  const isInactive = isInactiveThread(thread);

  const uploadMedia = async (file: File): Promise<{ url: string; type: string } | null> => {
    const { data: auth } = await supabase.auth.getUser();
    const ext = file.name.split('.').pop();
    const fileName = `${auth.user?.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media-messages').upload(fileName, file);
    if (error) return null;
    const { data: urlData } = supabase.storage.from('media-messages').getPublicUrl(fileName);
    return { url: urlData.publicUrl, type: file.type.startsWith('video/') ? 'video' : 'image' };
  };

  const handleSendReply = async (text: string, voiceUrl?: string) => {
    if (!message || (!text.trim() && !voiceUrl && !mediaPreview) || !user) return;
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ThreadMessage = {
      id: tempId, sender_id: user.id, receiver_id: otherUserId!,
      content: text || (voiceUrl ? '🎤' : '📷'), created_at: new Date().toISOString(),
      is_read: null, category: message.category, parent_id: getRootId(message),
      voice_url: voiceUrl || null, media_url: mediaPreview?.url || null,
      media_type: mediaPreview?.file.type.startsWith('video/') ? 'video' : mediaPreview ? 'image' : null,
    };
    setSendingMsgId(tempId);
    setThread(prev => [...prev, optimisticMsg]);
    haptic('light');

    try {
      const rootId = getRootId(message);
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      if (mediaPreview) {
        const result = await uploadMedia(mediaPreview.file);
        if (result) { mediaUrl = result.url; mediaType = result.type; }
        URL.revokeObjectURL(mediaPreview.url);
        setMediaPreview(null);
      }

      const shouldDeductCredit = isInactive;
      if (shouldDeductCredit) {
        const { data: canReceive } = await supabase.rpc('can_receive_message', { _user_id: otherUserId!, _category: message.category });
        if (!canReceive) {
          toast.error(isRTL ? 'صندوق المستلم ممتلئ' : "Recipient's inbox is full");
          setThread(prev => prev.filter(m => m.id !== tempId));
          setIsSending(false); setSendingMsgId(null);
          return;
        }
      }

      let finalCategory = message.category;
      if (shouldDeductCredit && text.trim()) {
        try {
          const { data: classData } = await supabase.functions.invoke('classify-message', {
            body: { content: text, senderId: user.id, receiverId: otherUserId },
          });
          // If blocked by spam/toxicity/filter, silently drop (sender never knows)
          if (classData?.blocked) {
            toast.success(isRTL ? 'تم الإرسال' : 'Sent');
            setThread(prev => prev.filter(m => m.id !== tempId));
            setReplyContent('');
            setIsSending(false); setSendingMsgId(null);
            return;
          }
          if (classData?.category && classData.category !== 'direct' && message.category !== 'direct') finalCategory = classData.category;
        } catch { /* keep */ }
      }

      const contentToSend = text || (mediaType === 'video' ? '🎥' : mediaType === 'image' ? '📷' : '🎤');
      const enc = await encryptForRecipient(contentToSend, otherUserId!);
      if (!enc.success) {
        toast.error(isRTL ? 'تعذّر التشفير — لم يتم الإرسال' : 'Encryption failed — message not sent');
        setThread(prev => prev.filter(m => m.id !== tempId));
        setIsSending(false); setSendingMsgId(null);
        return;
      }
      const encryptedContent = enc.payload;

      // Calculate expires_at based on disappear timer
      let expiresAt: string | null = null;
      if (disappearTimer) {
        expiresAt = new Date(Date.now() + disappearTimer).toISOString();
      }

      const { error } = await supabase.from('messages').insert({
        sender_id: user.id, receiver_id: otherUserId!, content: encryptedContent,
        voice_url: voiceUrl || null, media_url: mediaUrl, media_type: mediaType,
        category: finalCategory, parent_id: rootId,
        expires_at: expiresAt,
      } as any);
      if (error) throw error;

      // Push notification (fire and forget)
      const senderProfile = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
      supabase.functions.invoke('send-push-notification', {
        body: { receiverId: otherUserId, senderName: senderProfile.data?.display_name || 'Someone', messageType: voiceUrl ? 'voice' : mediaType || 'text', content: text },
      }).catch(() => {});

      setReplyContent('');
      setShowVoice(false);
      haptic('medium');
      await loadThread();
      setSendingMsgId(null);
      onMessageRead?.();
    } catch (error) {
      console.error('Reply error:', error);
      toast.error(isRTL ? 'فشل الإرسال' : 'Send failed');
      setThread(prev => prev.filter(m => m.id !== tempId));
      setSendingMsgId(null);
    } finally {
      setIsSending(false);
    }
  };

  // Edit message
  const handleEditMessage = async (msgId: string) => {
    if (!editContent.trim()) return;
    try {
      const enc = await encryptForRecipient(editContent, otherUserId!);
      if (!enc.success) {
        toast.error(isRTL ? 'تعذّر التشفير' : 'Encryption failed');
        return;
      }
      await supabase.from('messages').update({
        content: enc.payload, is_edited: true, edited_at: new Date().toISOString(),
      }).eq('id', msgId);
      setEditingMsg(null);
      setEditContent('');
      await loadThread();
      toast.success(isRTL ? 'تم تعديل الرسالة' : 'Message edited');
    } catch {
      toast.error(isRTL ? 'فشل التعديل' : 'Edit failed');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    if (file.size > 25 * 1024 * 1024) { toast.error(isRTL ? 'الحد الأقصى 25 ميغابايت' : 'Max 25MB'); return; }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { toast.error(isRTL ? 'صور وفيديوهات فقط' : 'Images and videos only'); return; }
    setMediaPreview({ file, url: URL.createObjectURL(file) });
  };

  const toggleReaction = async (messageId: string, reaction: string) => {
    if (!user) return;
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === user.id && r.reaction === reaction);
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
      setReactions(prev => prev.filter(r => r.id !== existing.id));
    } else {
      const { data } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, reaction } as any).select().single();
      if (data) setReactions(prev => [...prev, data as Reaction]);
    }
    haptic('light');
    setShowReactions(null);
  };

  // Improved swipe — controlled with spring back
  const handleSwipe = (msgId: string, info: PanInfo, isMine: boolean) => {
    const threshold = 50;
    if (Math.abs(info.offset.x) < threshold) return;
    
    // Swipe right (LTR) or left (RTL) = reply
    const isReplySwipe = (!isRTL && info.offset.x > threshold) || (isRTL && info.offset.x < -threshold);
    // Swipe left (LTR) or right (RTL) = delete
    const isDeleteSwipe = (!isRTL && info.offset.x < -threshold) || (isRTL && info.offset.x > threshold);
    
    if (isReplySwipe) {
      const msg = thread.find(m => m.id === msgId);
      if (msg) setReplyContent(`> ${msg.content?.substring(0, 50) || ''}\n`);
      haptic('light');
      inputRef.current?.focus();
    } else if (isDeleteSwipe && isMine) {
      const msg = thread.find(m => m.id === msgId);
      if (msg) setDeleteTarget({ id: msgId, isMine, createdAt: msg.created_at });
      haptic('medium');
    }
  };

  // Long press
  const handleTouchStart = (msgId: string, e: React.TouchEvent | React.MouseEvent) => {
    longPressTimer.current = setTimeout(() => {
      haptic('medium');
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setContextMenu({ msgId, x: rect.left, y: Math.max(rect.top - 160, 60) });
    }, 500);
  };
  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const copyMessage = (msgId: string) => {
    const msg = thread.find(m => m.id === msgId);
    if (msg?.content) { navigator.clipboard.writeText(msg.content); toast.success(isRTL ? 'تم النسخ' : 'Copied'); }
    setContextMenu(null);
  };

  const fmtTime = (d: string) => new Intl.DateTimeFormat(isRTL ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));

  if (!message) return null;
  if (activeCall) {
    return (
      <CallScreen
        recipientId={otherUserId!}
        recipientName={message.sender_profile?.display_name || message.sender_profile?.username || ''}
        recipientAvatar={message.sender_profile?.avatar_url || undefined}
        callType={activeCall.type}
        onEnd={() => setActiveCall(null)}
      />
    );
  }

  const senderProfile = message.sender_profile;
  const otherName = senderProfile?.display_name || senderProfile?.username || (isRTL ? 'مجهول' : 'Unknown');

  const categoryBubbleClass = message.category === 'work'
    ? 'bg-[hsl(var(--work))] text-white'
    : message.category === 'direct'
    ? 'bg-primary text-primary-foreground'
    : 'bg-[hsl(var(--audience))] text-white';

  return (
    <>
    <Dialog open={isOpen} onOpenChange={() => { setContextMenu(null); onClose(); }}>
      <DialogContent className="w-full max-w-lg h-[100dvh] sm:h-[92vh] flex flex-col p-0 gap-0 sm:rounded-3xl rounded-none border-0 sm:border sm:border-primary/10">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card sm:rounded-t-3xl">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-xl touch-feedback shrink-0">
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          <button
            onClick={() => { if (senderProfile?.username) { onClose(); navigate(`/@${senderProfile.username}`); } }}
            className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-10 w-10 ring-2 ring-primary/10">
              <AvatarImage src={senderProfile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {otherName[0] || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            <div className="text-start min-w-0">
              <p className="font-semibold text-[15px] truncate leading-tight">{otherName}</p>
              {isTyping ? (
                <p className="text-xs text-primary font-medium animate-pulse">{isRTL ? 'يكتب...' : 'typing...'}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {senderProfile?.username ? `@${senderProfile.username}` : ''}
                  <Shield className="h-3 w-3 text-emerald-500 inline" />
                  <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">E2E</span>
                </p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Disappearing messages toggle */}
            <Button variant="ghost" size="icon" onClick={() => setShowDisappear(!showDisappear)} className={cn("h-9 w-9 rounded-xl", disappearTimer && "text-primary")}>
              <Timer className="h-4 w-4" />
            </Button>
            {canCall && message.category === 'direct' && (
              <>
                <Button variant="ghost" size="icon" onClick={() => setActiveCall({ type: 'audio' })} className="h-9 w-9 rounded-xl touch-feedback">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveCall({ type: 'video' })} className="h-9 w-9 rounded-xl touch-feedback">
                  <Video className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={() => setShowBlockReport(true)} className="h-9 w-9 rounded-xl touch-feedback">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Disappearing messages picker */}
        <AnimatePresence>
          {showDisappear && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border bg-muted/30"
            >
              <div className="flex items-center justify-center gap-2 px-4 py-2.5">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{isRTL ? 'رسائل مؤقتة:' : 'Disappearing:'}</span>
                {DISAPPEAR_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setDisappearTimer(disappearTimer === opt.value ? null : opt.value); setShowDisappear(false); }}
                    className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
                      disappearTimer === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                {disappearTimer && (
                  <button onClick={() => { setDisappearTimer(null); setShowDisappear(false); }}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive"
                  >
                    {isRTL ? 'إيقاف' : 'Off'}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1-hour inactivity notice */}
        {isInactive && thread.length > 0 && (
          <div className="mx-3 mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-primary/5">
            <p className="text-[11px] text-muted-foreground">
              {isRTL ? 'مضت ساعة — رسالتك التالية ستُخصم من الرصيد' : 'Over an hour — next message deducts a credit'}
            </p>
          </div>
        )}

        {/* Messages thread - full height like WhatsApp */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" onClick={() => { setContextMenu(null); setShowReactions(null); }}
          style={{ backgroundImage: 'var(--gradient-hero)', backgroundSize: 'cover' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            thread.map((msg, i) => {
              const isMine = msg.sender_id === user?.id;
              const showDateSep = i === 0 || dateSeparator(msg.created_at, isRTL) !== dateSeparator(thread[i - 1].created_at, isRTL);
              const isSendingThis = msg.id === sendingMsgId;
              const msgReactions = reactions.filter(r => r.message_id === msg.id);
              const canUnsend = isMine && (Date.now() - new Date(msg.created_at).getTime()) < UNSEND_WINDOW_MS;
              const canEdit = isMine && (Date.now() - new Date(msg.created_at).getTime()) < EDIT_WINDOW_MS && !msg.voice_url && !msg.media_url;

              const readStatus = isMine ? (
                isSendingThis ? (
                  <Check className="h-3 w-3 text-white/40" />
                ) : msg.is_read ? (
                  <CheckCheck className={cn('h-3 w-3', message.category === 'work' ? 'text-blue-300' : 'text-white/70')} />
                ) : (
                  <CheckCheck className="h-3 w-3 text-white/40" />
                )
              ) : null;

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="text-center my-3">
                      <span className="text-[11px] text-muted-foreground bg-card/80 backdrop-blur-sm px-3 py-1 rounded-full font-medium">
                        {dateSeparator(msg.created_at, isRTL)}
                      </span>
                    </div>
                  )}
                  {/* Editing mode */}
                  {editingMsg === msg.id ? (
                    <div className={cn('flex mb-1', isMine ? 'justify-end' : 'justify-start')}>
                      <div className="max-w-[80%] flex flex-col gap-1">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="text-sm p-2.5 rounded-xl border-2 border-primary bg-card resize-none min-h-[60px]"
                          autoFocus
                        />
                        <div className="flex gap-1.5 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setEditingMsg(null)} className="h-7 text-xs rounded-lg">
                            {isRTL ? 'إلغاء' : 'Cancel'}
                          </Button>
                          <Button size="sm" onClick={() => handleEditMessage(msg.id)} className="h-7 text-xs rounded-lg">
                            {isRTL ? 'حفظ' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      drag="x"
                      dragConstraints={{ left: -60, right: 60 }}
                      dragElastic={0.15}
                      dragSnapToOrigin
                      onDragEnd={(_, info) => handleSwipe(msg.id, info, isMine)}
                      className={cn('flex mb-0.5', isMine ? 'justify-end' : 'justify-start')}
                      onTouchStart={(e) => handleTouchStart(msg.id, e)}
                      onTouchEnd={handleTouchEnd}
                      onMouseDown={(e) => handleTouchStart(msg.id, e)}
                      onMouseUp={handleTouchEnd}
                      onMouseLeave={handleTouchEnd}
                    >
                      <div className="relative max-w-[80%]">
                        <div className={cn(
                          'px-3 py-2 rounded-2xl text-[15px] leading-relaxed',
                          isSendingThis ? 'bg-muted text-muted-foreground'
                            : isMine ? `${categoryBubbleClass} rounded-ee-sm` : 'bg-card border border-border rounded-es-sm'
                        )}>
                          {/* Disappearing message indicator */}
                          {msg.expires_at && (
                            <div className={cn("flex items-center gap-1 mb-1", isMine ? "text-white/50" : "text-muted-foreground")}>
                              <Timer className="h-3 w-3" />
                              <span className="text-[10px]">{isRTL ? 'مؤقتة' : 'Disappearing'}</span>
                            </div>
                          )}
                          {msg.media_url && msg.media_type === 'image' && (
                            <img src={msg.media_url} alt="" className="rounded-xl max-w-full mb-1.5 cursor-pointer" onClick={() => window.open(msg.media_url!, '_blank')} />
                          )}
                          {msg.media_url && msg.media_type === 'video' && (
                            <video src={msg.media_url} controls className="rounded-xl max-w-full mb-1.5" />
                          )}
                          {msg.voice_url ? (
                            <VoicePlayer url={msg.voice_url} isMine={isMine} />
                          ) : msg.content && !['📷', '🎥', '🎤'].includes(msg.content) ? (
                            <p className="whitespace-pre-wrap">{msg.content === '🔒' ? (
                              <span className="flex items-center gap-1 text-muted-foreground italic text-sm">
                                <Shield className="h-3 w-3" /> {isRTL ? 'مشفرة' : 'Encrypted'}
                              </span>
                            ) : msg.content}</p>
                          ) : null}
                          <div className={cn('flex items-center gap-1 mt-0.5', isMine ? 'justify-end' : '')}>
                            {msg.is_edited && (
                              <span className={cn('text-[10px] italic', isMine ? 'text-white/50' : 'text-muted-foreground')}>
                                {isRTL ? 'معدّلة' : 'Edited'}
                              </span>
                            )}
                            <span className={cn('text-[10px]', isMine ? 'text-white/50' : 'text-muted-foreground')}>
                              {fmtTime(msg.created_at)}
                            </span>
                            {readStatus}
                          </div>
                        </div>

                        {/* Reactions */}
                        {msgReactions.length > 0 && (
                          <div className={cn('flex gap-0.5 mt-0.5', isMine ? 'justify-end' : 'justify-start')}>
                            {[...new Set(msgReactions.map(r => r.reaction))].map(emoji => {
                              const count = msgReactions.filter(r => r.reaction === emoji).length;
                              return (
                                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                  className="px-1.5 py-0.5 rounded-full bg-card/80 border border-border text-xs flex items-center gap-0.5"
                                >
                                  {emoji}{count > 1 && <span className="text-[10px] text-muted-foreground">{count}</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Reaction picker */}
                        <AnimatePresence>
                          {showReactions === msg.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }}
                              className={cn('absolute -top-10 flex gap-1 bg-card rounded-full shadow-lg border border-border px-2 py-1 z-50', isMine ? 'end-0' : 'start-0')}
                            >
                              {REACTIONS.map(emoji => (
                                <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                                  className="text-lg hover:scale-125 transition-transform p-0.5"
                                >{emoji}</button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })
          )}
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start mb-1">
              <div className="px-3 py-2 rounded-2xl rounded-es-sm bg-card border border-border">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Context menu */}
        <AnimatePresence>
          {contextMenu && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-[100] bg-card rounded-2xl shadow-xl border border-border py-1.5 min-w-[170px]"
              style={{ left: Math.min(contextMenu.x, window.innerWidth - 200), top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => { setShowReactions(contextMenu.msgId); setContextMenu(null); }} className="w-full px-4 py-2 text-sm text-start hover:bg-muted flex items-center gap-3">
                <span>❤️</span> {isRTL ? 'تفاعل' : 'React'}
              </button>
              <button onClick={() => { setReplyContent(`> ${thread.find(m => m.id === contextMenu.msgId)?.content?.substring(0, 50) || ''}\n`); setContextMenu(null); inputRef.current?.focus(); }} className="w-full px-4 py-2 text-sm text-start hover:bg-muted flex items-center gap-3">
                <Reply className="h-4 w-4" /> {isRTL ? 'رد' : 'Reply'}
              </button>
              <button onClick={() => copyMessage(contextMenu.msgId)} className="w-full px-4 py-2 text-sm text-start hover:bg-muted flex items-center gap-3">
                <Copy className="h-4 w-4" /> {isRTL ? 'نسخ' : 'Copy'}
              </button>
              {/* Edit option */}
              {(() => {
                const msg = thread.find(m => m.id === contextMenu.msgId);
                if (msg && msg.sender_id === user?.id && (Date.now() - new Date(msg.created_at).getTime()) < EDIT_WINDOW_MS && !msg.voice_url) {
                  return (
                    <button onClick={() => { setEditingMsg(msg.id); setEditContent(msg.content); setContextMenu(null); }} className="w-full px-4 py-2 text-sm text-start hover:bg-muted flex items-center gap-3">
                      <Pencil className="h-4 w-4" /> {isRTL ? 'تعديل' : 'Edit'}
                    </button>
                  );
                }
                return null;
              })()}
              <div className="h-px bg-border mx-3 my-1" />
              <button onClick={() => {
                const msg = thread.find(m => m.id === contextMenu.msgId);
                if (msg) setDeleteTarget({ id: msg.id, isMine: msg.sender_id === user?.id, createdAt: msg.created_at });
                setContextMenu(null);
              }} className="w-full px-4 py-2 text-sm text-start hover:bg-muted flex items-center gap-3 text-destructive">
                <X className="h-4 w-4" /> {isRTL ? 'حذف' : 'Delete'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Media preview */}
        {mediaPreview && (
          <div className="mx-3 mb-1 relative">
            {mediaPreview.file.type.startsWith('video/') ? (
              <video src={mediaPreview.url} className="h-20 rounded-xl" />
            ) : (
              <img src={mediaPreview.url} className="h-20 rounded-xl object-cover" />
            )}
            <Button size="icon" variant="destructive" className="absolute top-1 end-1 h-6 w-6 rounded-full" onClick={() => { URL.revokeObjectURL(mediaPreview.url); setMediaPreview(null); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Disappearing timer indicator */}
        {disappearTimer && (
          <div className="flex items-center justify-center gap-1.5 py-1 bg-primary/5">
            <Timer className="h-3 w-3 text-primary" />
            <span className="text-[11px] text-primary font-medium">
              {isRTL ? 'الرسائل المؤقتة مفعّلة' : 'Disappearing messages on'} — {DISAPPEAR_OPTIONS.find(o => o.value === disappearTimer)?.label}
            </span>
          </div>
        )}

        {/* Reply area - WhatsApp style */}
        <div className="shrink-0 border-t border-border px-2 py-2 bg-card sm:rounded-b-3xl">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
          {showVoice ? (
            <VoiceRecorder onRecordComplete={(url) => handleSendReply('🎤', url)} onCancel={() => setShowVoice(false)} />
          ) : (
            <div className="flex items-end gap-1.5">
              <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="h-10 w-10 rounded-full shrink-0">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </Button>
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  placeholder={isRTL ? 'اكتب رسالة...' : 'Message...'}
                  value={replyContent}
                  onChange={(e) => { setReplyContent(e.target.value); broadcastTyping(); }}
                  rows={1}
                  className="w-full resize-none text-[15px] rounded-2xl border border-border bg-muted/30 px-4 py-2.5 min-h-[42px] max-h-28 focus:outline-none focus:border-primary transition-colors"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(replyContent); } }}
                />
              </div>
              {replyContent.trim() || mediaPreview ? (
                <Button onClick={() => handleSendReply(replyContent)} disabled={isSending} size="icon" className="h-10 w-10 rounded-full shrink-0 touch-feedback">
                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setShowVoice(true)} className="h-10 w-10 rounded-full shrink-0 touch-feedback">
                  <Mic className="h-5 w-5 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete dialog */}
    <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{isRTL ? 'حذف الرسالة' : 'Delete message'}</AlertDialogTitle>
          <AlertDialogDescription>{isRTL ? 'كيف تريد حذف هذه الرسالة؟' : 'How do you want to delete this message?'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          {deleteTarget?.isMine && (Date.now() - new Date(deleteTarget.createdAt).getTime()) < UNSEND_WINDOW_MS && (
            <AlertDialogAction onClick={async () => {
              await supabase.from('messages').delete().eq('id', deleteTarget.id);
              setThread(prev => prev.filter(m => m.id !== deleteTarget.id));
              setDeleteTarget(null); toast.success(isRTL ? 'تم الحذف للجميع' : 'Deleted for everyone');
            }} className="bg-destructive text-destructive-foreground rounded-xl">
              {isRTL ? 'حذف للجميع' : 'Delete for everyone'}
            </AlertDialogAction>
          )}
          <AlertDialogAction onClick={async () => {
            await supabase.from('deleted_messages').insert({ user_id: user!.id, message_id: deleteTarget!.id } as any);
            setDeletedIds(prev => new Set([...prev, deleteTarget!.id]));
            setThread(prev => prev.filter(m => m.id !== deleteTarget!.id));
            setDeleteTarget(null); toast.success(isRTL ? 'تم الحذف' : 'Deleted');
          }} className="rounded-xl">
            {isRTL ? 'حذف لي فقط' : 'Delete for me'}
          </AlertDialogAction>
          <AlertDialogCancel className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {showBlockReport && message && (
      <BlockReportDialog
        isOpen={showBlockReport}
        onClose={() => setShowBlockReport(false)}
        targetUserId={otherUserId!}
        targetName={otherName}
      />
    )}
    </>
  );
}
