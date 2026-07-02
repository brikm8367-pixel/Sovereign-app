import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus, Copy, Check, Gift, Users } from 'lucide-react';
import { toast } from 'sonner';
import { shareProfile } from '@/utils/sharing';

interface InviteSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteSystem({ isOpen, onClose }: InviteSystemProps) {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) return;
    const fetch = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code, username')
        .eq('id', user.id)
        .single();
      if (profile?.referral_code) setReferralCode(profile.referral_code);

      const { count } = await (supabase as any)
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('inviter_id', user.id)
        .eq('status', 'completed');
      setReferralCount(count || 0);
    };
    fetch();
  }, [user, isOpen]);

  const inviteLink = `${window.location.origin}/?ref=${referralCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Sovereign',
        text: isRTL
          ? 'أرسل لك هذا لأنك أول من أفكر فيه عند اختبار شيء مختلف'
          : "I'm sending you this because you're the first person I think of when trying something different",
        url: inviteLink,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            {isRTL ? 'ادعُ شخصاً — واكتشف كيف يتواصل' : 'Invite someone — discover how they communicate'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Reward info */}
          <div className="text-center p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm font-medium">
              {isRTL ? 'كل شخص ينضم = +10 رسائل إضافية لك' : 'Each person who joins = +10 extra messages for you'}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{referralCount}</p>
              <p className="text-xs text-muted-foreground">{isRTL ? 'انضموا' : 'Joined'}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">+{referralCount * 10}</p>
              <p className="text-xs text-muted-foreground">{isRTL ? 'رسائل إضافية' : 'Bonus messages'}</p>
            </div>
          </div>

          {/* Invite message preview */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground italic">
              "{isRTL 
                ? 'أرسل لك هذا لأنك أول من أفكر فيه عند اختبار شيء مختلف'
                : "I'm sending you this because you're the first person I think of when trying something different"}"
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button onClick={handleShare} className="w-full h-12 rounded-xl font-medium gap-2">
              <UserPlus className="h-5 w-5" />
              {isRTL ? 'ادعُ شخصاً' : 'Invite someone'}
            </Button>
            <Button onClick={handleCopy} variant="outline" className="w-full h-11 rounded-xl gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? (isRTL ? 'تم النسخ' : 'Copied!') : (isRTL ? 'نسخ الرابط' : 'Copy link')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
