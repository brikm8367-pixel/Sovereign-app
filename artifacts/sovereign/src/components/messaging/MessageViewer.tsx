import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Send, Loader2, User, Zap, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MessageCategory } from './InboxSection';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
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
  category: MessageCategory;
  parent_id: string | null;
}

interface MessageViewerProps {
  message: Message | null;
  isOpen: boolean;
  onClose: () => void;
  onMessageRead?: () => void;
}

export default function MessageViewer({
  message,
  isOpen,
  onClose,
  onMessageRead,
}: MessageViewerProps) {
  const { isRTL } = useLanguage();
  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [thread, setThread] = useState<Message[]>([]);

  // Mark as read when opened
  useEffect(() => {
    const markAsRead = async () => {
      if (message && !message.is_read) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('id', message.id);
        onMessageRead?.();
      }
    };

    if (isOpen && message) {
      markAsRead();
      // Load thread
      loadThread();
    }
  }, [isOpen, message?.id]);

  const loadThread = async () => {
    if (!message) return;
    
    // For now, just show the current message
    // In future, load parent messages for a full thread
    setThread([message]);
  };

  const handleReply = async () => {
    if (!message || !replyContent.trim()) return;

    setIsSending(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('messages').insert({
        sender_id: user.user?.id,
        receiver_id: message.sender_id,
        subject: message.subject ? `Re: ${message.subject}` : null,
        content: replyContent,
        category: message.category,
        parent_id: message.id,
      });

      if (error) throw error;

      toast.success(isRTL ? 'تم إرسال الرد' : 'Reply sent');
      setReplyContent('');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(isRTL ? 'فشل إرسال الرد' : 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(isRTL ? 'ar' : 'en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const categoryLabels = {
    work: { ar: 'العمل', en: 'Work' },
    audience: { ar: 'الجمهور', en: 'Audience' },
    direct: { ar: 'مباشر', en: 'Direct' },
  };

  const categoryColors = {
    work: 'bg-[hsl(var(--work))]',
    audience: 'bg-[hsl(var(--audience))]',
    direct: 'bg-[hsl(var(--others))]',
  };

  if (!message) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 rounded-3xl">
        {/* Header - Larger, clearer */}
        <DialogHeader className="shrink-0 p-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-11 w-11 rounded-xl touch-feedback"
            >
              {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
            </Button>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold truncate">
                {message.subject || (isRTL ? 'رسالة' : 'Message')}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  'text-sm px-3 py-1 rounded-full text-white font-medium',
                  categoryColors[message.category]
                )}>
                  {categoryLabels[message.category][isRTL ? 'ar' : 'en']}
                </span>
                {message.is_important && (
                  <span className="text-sm px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-medium flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    {isRTL ? 'مهم' : 'Important'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Sender info - Larger, more prominent */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50">
            <Avatar className="h-14 w-14 ring-2 ring-primary/10">
              <AvatarImage src={message.sender_profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {message.sender_profile?.display_name?.[0] || <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-foreground">
                {message.sender_profile?.display_name || message.sender_profile?.username}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(message.created_at)}
              </p>
            </div>
          </div>

          {/* Message content - More readable */}
          <div className="p-5 rounded-2xl bg-card border-2 border-border">
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>

        {/* Reply section - Larger, more comfortable */}
        <div className="shrink-0 border-t-2 border-border p-5 space-y-4 bg-muted/30">
          <Textarea
            placeholder={isRTL ? '✍️ اكتب ردك هنا...' : '✍️ Write your reply here...'}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={3}
            className="resize-none text-base rounded-xl border-2 focus:border-primary p-4"
          />
          <Button 
            onClick={handleReply}
            disabled={!replyContent.trim() || isSending}
            size="lg"
            className="w-full h-14 text-lg rounded-xl touch-feedback"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="h-5 w-5 me-2" />
                {isRTL ? 'إرسال الرد' : 'Send Reply'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
