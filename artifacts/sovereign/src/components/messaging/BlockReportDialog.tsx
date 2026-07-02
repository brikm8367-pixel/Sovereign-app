import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Ban, Flag, Loader2 } from 'lucide-react';

interface BlockReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  targetName: string;
  messageId?: string;
}

const REPORT_REASONS = {
  en: ['Spam', 'Harassment', 'Inappropriate content', 'Fake account', 'Other'],
  ar: ['رسائل مزعجة', 'تحرش', 'محتوى غير لائق', 'حساب مزيف', 'أخرى'],
};

export default function BlockReportDialog({ isOpen, onClose, targetUserId, targetName, messageId }: BlockReportDialogProps) {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [mode, setMode] = useState<'menu' | 'report'>('menu');
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = isRTL ? REPORT_REASONS.ar : REPORT_REASONS.en;

  const handleBlock = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('blocked_users' as any).insert({
        blocker_id: user.id,
        blocked_id: targetUserId,
      });
      if (error && !error.message.includes('duplicate')) throw error;
      toast.success(isRTL ? `تم حظر ${targetName}` : `${targetName} blocked`);
      onClose();
    } catch {
      toast.error(isRTL ? 'فشل الحظر' : 'Block failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReport = async () => {
    if (!user || !selectedReason) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('reports' as any).insert({
        reporter_id: user.id,
        reported_id: targetUserId,
        reason: selectedReason,
        message_id: messageId || null,
        details: details.trim() || null,
      });
      if (error) throw error;
      toast.success(isRTL ? 'تم الإبلاغ — شكراً لمساعدتنا' : 'Report submitted — thank you');
      onClose();
    } catch {
      toast.error(isRTL ? 'فشل الإبلاغ' : 'Report failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMode('menu');
    setSelectedReason('');
    setDetails('');
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="rounded-2xl max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === 'menu'
              ? (isRTL ? targetName : targetName)
              : (isRTL ? 'إبلاغ عن المستخدم' : 'Report User')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mode === 'menu'
              ? (isRTL ? 'اختر إجراء' : 'Choose an action')
              : (isRTL ? 'اختر سبب الإبلاغ' : 'Select a reason')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {mode === 'menu' ? (
          <div className="space-y-2 py-2">
            <Button
              variant="destructive"
              className="w-full h-12 rounded-xl justify-start gap-3"
              onClick={handleBlock}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              {isRTL ? `حظر ${targetName}` : `Block ${targetName}`}
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl justify-start gap-3"
              onClick={() => setMode('report')}
            >
              <Flag className="h-4 w-4" />
              {isRTL ? 'إبلاغ' : 'Report'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {reasons.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-start p-3 rounded-xl border text-sm transition-colors ${
                  selectedReason === reason
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {reason}
              </button>
            ))}
            <Textarea
              placeholder={isRTL ? 'تفاصيل إضافية (اختياري)...' : 'Additional details (optional)...'}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="rounded-xl resize-none"
              rows={2}
            />
            <Button
              onClick={handleReport}
              disabled={!selectedReason || isSubmitting}
              className="w-full h-12 rounded-xl"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : <Flag className="h-4 w-4 me-2" />}
              {isRTL ? 'إرسال الإبلاغ' : 'Submit Report'}
            </Button>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
