import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, Loader2, User, Mic, Image as ImageIcon, X, Search, AtSign, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import VoiceRecorder from './VoiceRecorder';
import { encryptForRecipient } from '@/utils/e2eManager';

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
}

interface MessageComposerProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: Profile | null;
  onMessageSent?: () => void;
}

export default function MessageComposer({ isOpen, onClose, recipient: initialRecipient, onMessageSent }: MessageComposerProps) {
  const { isRTL } = useLanguage();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ file: File; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Username search state
  const [usernameQuery, setUsernameQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recipient, setRecipient] = useState<Profile | null>(initialRecipient);

  useEffect(() => {
    setRecipient(initialRecipient);
    if (initialRecipient) {
      setUsernameQuery('');
      setSearchResults([]);
    }
  }, [initialRecipient]);

  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setShowVoice(false);
      setMediaPreview(null);
      if (!initialRecipient) {
        setRecipient(null);
        setUsernameQuery('');
        setSearchResults([]);
      }
    }
  }, [isOpen, initialRecipient]);


  // Username search with debounce
  useEffect(() => {
    if (usernameQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const clean = usernameQuery.replace(/^@/, '').toLowerCase();
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, bio')
        .ilike('username', `%${clean}%`)
        .eq('is_public', true)
        .limit(8);
      setSearchResults(data || []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [usernameQuery]);

  const selectRecipient = (profile: Profile) => {
    setRecipient(profile);
    setUsernameQuery('');
    setSearchResults([]);
  };

  const uploadMedia = async (file: File): Promise<{ url: string; type: string } | null> => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    const ext = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('media-messages').upload(fileName, file);
    if (error) return null;
    const { data: urlData } = supabase.storage.from('media-messages').getPublicUrl(fileName);
    return { url: urlData.publicUrl, type: file.type.startsWith('video/') ? 'video' : 'image' };
  };

  const sendMessage = async (text: string, voiceUrl?: string) => {
    if (!recipient || (!text.trim() && !voiceUrl && !mediaPreview)) return;
    setIsSending(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const senderId = auth.user?.id;
      if (!senderId) throw new Error('Not authenticated');

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(30);

      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      if (mediaPreview) {
        const result = await uploadMedia(mediaPreview.file);
        if (result) { mediaUrl = result.url; mediaType = result.type; }
        URL.revokeObjectURL(mediaPreview.url);
        setMediaPreview(null);
      }

      const { data: directAccess } = await supabase
        .from('direct_access')
        .select('id')
        .eq('owner_id', recipient.id)
        .eq('allowed_user_id', senderId)
        .limit(1);

      let category: 'work' | 'audience' | 'direct' = 'audience';
      if (directAccess && directAccess.length > 0) {
        category = 'direct';
      } else {
        const { data: classData } = await supabase.functions.invoke('classify-message', {
          body: { content: text || 'Voice message', senderId, receiverId: recipient.id },
        });

        // Sender transparency: blocked by recipient's filter or spam/toxicity
        if (classData?.blocked) {
          const reasonMsg = classData.message || (
            classData.reason === 'filter'
              ? (isRTL ? `لم تصل رسالتك — المستلم لا يستقبل رسائل من نوع: ${classData.filter_type}` : `Your message was not delivered — recipient doesn't accept ${classData.filter_type} messages.`)
              : classData.reason === 'spam'
                ? (isRTL ? 'لم تصل رسالتك — اعتُبرت سبام.' : 'Your message was not delivered — flagged as spam.')
                : (isRTL ? 'لم تصل رسالتك — تحتوي محتوى غير مسموح.' : 'Your message was not delivered — contains disallowed content.')
          );
          toast.error(reasonMsg, { duration: 5000 });
          setIsSending(false);
          return;
        }

        category = classData?.category || 'audience';
        if (category === 'direct') category = 'audience';
      }

      // Smart routing
      const { data: roots } = await supabase
        .from('messages')
        .select('id, created_at')
        .is('parent_id', null)
        .eq('category', category)
        .or(`and(sender_id.eq.${senderId},receiver_id.eq.${recipient.id}),and(sender_id.eq.${recipient.id},receiver_id.eq.${senderId})`)
        .order('created_at', { ascending: false })
        .limit(1);

      let parentId: string | null = null;
      let shouldDeductCredit = true;

      if (roots && roots.length > 0) {
        parentId = roots[0].id;
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('created_at')
          .or(`id.eq.${roots[0].id},parent_id.eq.${roots[0].id}`)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastTime = lastMsg?.[0]?.created_at;
        if (lastTime) {
          const hoursSince = (Date.now() - new Date(lastTime).getTime()) / 3600000;
          if (hoursSince < 1) {
            shouldDeductCredit = false;
          }
        }
      }

      if (shouldDeductCredit) {
        // Check recipient inbox mode (closed / limited)
        const { data: limitRow } = await supabase
          .from('message_limits')
          .select('inbox_mode, max_messages')
          .eq('user_id', recipient.id)
          .eq('category', category)
          .maybeSingle();

        if (limitRow?.inbox_mode === 'closed' || limitRow?.max_messages === 0) {
          toast.error(
            isRTL
              ? `لم تصل رسالتك — المستلم أغلق صندوق "${category === 'work' ? 'العمل' : category === 'direct' ? 'الخاص' : 'العلاقات'}".`
              : `Your message was not delivered — recipient closed their ${category} inbox.`,
            { duration: 5000 }
          );
          setIsSending(false);
          return;
        }

        // Skip can_receive check if unlimited
        if (limitRow?.inbox_mode !== 'unlimited') {
          const { data: canReceive } = await supabase.rpc('can_receive_message', {
            _user_id: recipient.id, _category: category,
          });
          if (!canReceive) {
            toast.error(isRTL ? 'صندوق المستلم ممتلئ' : "Recipient's inbox is full. They need to increase their limit.");
            setIsSending(false);
            return;
          }
        }
      }

      // Encrypt the message content
      const contentToSend = text || (mediaType === 'video' ? '🎥' : mediaType === 'image' ? '📷' : '🎤');
      const enc = await encryptForRecipient(contentToSend, recipient.id);
      if (!enc.success) {
        toast.error(isRTL ? 'تعذّر التشفير — لم يتم الإرسال' : 'Encryption failed — message not sent');
        setIsSending(false);
        return;
      }
      const encryptedContent = enc.payload;

      const { data: insertedMsg, error } = await supabase.from('messages').insert({
        sender_id: senderId,
        receiver_id: recipient.id,
        content: encryptedContent,
        voice_url: voiceUrl || null,
        media_url: mediaUrl,
        media_type: mediaType,
        category,
        parent_id: parentId,
      } as any).select('id').single();
      if (error) throw error;

      // Push notification with conversationId
      const { data: senderProfile } = await supabase.from('profiles').select('display_name').eq('id', senderId).single();
      const notificationType = voiceUrl ? 'voice' : mediaType ? mediaType : `${category}_message`;
      
      supabase.functions.invoke('send-push-notification', {
        body: {
          receiverId: recipient.id,
          senderName: senderProfile?.display_name || 'Someone',
          messageType: voiceUrl ? 'voice' : mediaType || 'text',
          content: text,
          notificationType,
          conversationId: insertedMsg?.id || null,
          senderId,
        },
      }).catch(() => {});

      toast.success(isRTL ? 'تم الإرسال ✨' : 'Sent ✨');
      setContent('');
      setShowVoice(false);
      onClose();
      onMessageSent?.();
    } catch (error) {
      console.error('Send error:', error);
      toast.error(isRTL ? 'فشل الإرسال' : 'Send failed');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast.error(isRTL ? 'الحد الأقصى 25 ميغابايت' : 'Max 25MB'); return; }
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { toast.error(isRTL ? 'صور وفيديوهات فقط' : 'Images and videos only'); return; }
    setMediaPreview({ file, url: URL.createObjectURL(file) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-3xl p-0 gap-0">
        <DialogHeader className="p-5 pb-3 border-b border-border">
          <DialogTitle className="text-lg font-bold">
            {isRTL ? 'رسالة جديدة' : 'New Message'}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Step 1: Select recipient via username */}
          {!recipient ? (
            <div className="space-y-3">
              <div className="relative">
                <AtSign className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={isRTL ? 'أدخل @username...' : 'Enter @username...'}
                  value={usernameQuery}
                  onChange={(e) => setUsernameQuery(e.target.value.replace(/[^a-z0-9_@]/gi, ''))}
                  className="ps-10 h-12 text-base rounded-xl border-2 focus:border-primary"
                  autoFocus
                />
                {isSearching && <Loader2 className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />}
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectRecipient(p)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-start"
                    >
                      <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                        <AvatarImage src={p.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {p.display_name?.[0] || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{p.display_name || p.username}</p>
                        <p className="text-xs text-muted-foreground">@{p.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {usernameQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isRTL ? 'لا نتائج' : 'No results found'}
                </p>
              )}

              {usernameQuery.length < 2 && (
                <div className="text-center py-8">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'أدخل username المستلم' : 'Enter recipient username'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Step 2: Recipient preview card */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 relative">
                <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                  <AvatarImage src={recipient.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {recipient.display_name?.[0] || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base truncate">{recipient.display_name || recipient.username}</p>
                  {recipient.username && <p className="text-sm text-muted-foreground">@{recipient.username}</p>}
                </div>
                {!initialRecipient && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full absolute top-2 end-2"
                    onClick={() => { setRecipient(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Step 3: Message composition */}
              {showVoice ? (
                <VoiceRecorder
                  onRecordComplete={(url) => sendMessage('🎤', url)}
                  onCancel={() => setShowVoice(false)}
                />
              ) : (
                <>
                  <Textarea
                    placeholder={isRTL ? 'اكتب رسالتك...' : 'Write your message...'}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="resize-none text-base rounded-xl border-2 focus:border-primary p-4"
                    autoFocus
                  />

                  {mediaPreview && (
                    <div className="relative inline-block">
                      {mediaPreview.file.type.startsWith('video/') ? (
                        <video src={mediaPreview.url} className="h-24 rounded-xl" />
                      ) : (
                        <img src={mediaPreview.url} className="h-24 rounded-xl object-cover" alt="" />
                      )}
                      <Button size="icon" variant="destructive" className="absolute top-1 end-1 h-6 w-6 rounded-full" onClick={() => { URL.revokeObjectURL(mediaPreview.url); setMediaPreview(null); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />

                  <div className="flex gap-3">
                    <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="h-13 w-13 rounded-xl touch-feedback">
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setShowVoice(true)} className="h-13 w-13 rounded-xl touch-feedback">
                      <Mic className="h-5 w-5" />
                    </Button>
                    <Button variant="outline" onClick={onClose} className="flex-1 h-13 text-base rounded-xl touch-feedback">
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                      onClick={() => sendMessage(content)}
                      disabled={(!content.trim() && !mediaPreview) || isSending}
                      className="flex-1 h-13 text-base rounded-xl touch-feedback"
                    >
                      {isSending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-5 w-5 me-2" />
                          {isRTL ? 'إرسال' : 'Send'}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* E2E badge */}
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <Shield className="h-3 w-3 text-emerald-500" />
                {isRTL ? 'مشفّر من طرف إلى طرف' : 'End-to-end encrypted'}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
