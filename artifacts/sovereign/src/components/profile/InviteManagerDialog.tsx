import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Copy, Check, Link2, ShieldCheck, Clock, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { buildShareLink } from '@/lib/appUrl';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface Invite {
  code: string;
  token: string;
  expires_at: string;
}

export function InviteManagerDialog({ open, onOpenChange }: Props) {
  const { isRTL } = useLanguage();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const inviteLink = invite ? buildShareLink(`/m/${invite.token}`) : '';

  // Countdown to expiry.
  useEffect(() => {
    if (!invite) return;
    const tick = () => {
      const ms = new Date(invite.expires_at).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [invite]);

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setPassword(''); setInvite(null); setLoading(false);
      setCopiedLink(false); setCopiedCode(false);
    }
  }, [open]);

  const generate = async () => {
    if (!password) { toast.error(isRTL ? 'أدخل كلمة المرور' : 'Enter your password'); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('create-manager-invite', {
      body: { password },
    });
    setLoading(false);
    if (error || data?.error) {
      const msg = data?.error || error?.message || '';
      toast.error(
        msg.toLowerCase().includes('password')
          ? (isRTL ? 'كلمة المرور غير صحيحة' : 'Invalid password')
          : (isRTL ? 'تعذّر إنشاء الدعوة' : 'Could not create invitation'),
      );
      return;
    }
    setInvite(data as Invite);
    setPassword('');
  };

  const expired = invite && remaining <= 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" />
            {isRTL ? 'دعوة وكيل' : 'Invite Manager'}
          </DialogTitle>
          <DialogDescription>
            {isRTL
              ? 'أكّد كلمة مرورك لإنشاء كود ورابط صالحين لمدة 15 دقيقة.'
              : 'Confirm your password to generate a code & link valid for 15 minutes.'}
          </DialogDescription>
        </DialogHeader>

        {!invite ? (
          <div className="space-y-3 py-2">
            <Input
              type="password"
              autoComplete="current-password"
              placeholder={isRTL ? 'كلمة المرور' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generate()}
              className="rounded-xl h-12"
            />
            <Button onClick={generate} disabled={loading} className="w-full h-12 rounded-xl">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <><ShieldCheck className="h-4 w-4 me-2" />{isRTL ? 'إنشاء الدعوة' : 'Generate Invitation'}</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className={`flex items-center justify-center gap-2 text-sm font-medium ${expired ? 'text-destructive' : 'text-amber-600'}`}>
              <Clock className="h-4 w-4" />
              {expired
                ? (isRTL ? 'انتهت صلاحية الدعوة' : 'Invitation expired')
                : `${mins}:${secs.toString().padStart(2, '0')}`}
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">{isRTL ? 'الكود' : 'Code'}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold tracking-[0.3em] font-mono">{invite.code}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                  navigator.clipboard.writeText(invite.code);
                  setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000);
                }}>
                  {copiedCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled={!!expired}
              onClick={async () => {
                try {
                  if (navigator.share) {
                    await navigator.share({ title: 'Sovereign', text: isRTL ? 'دعوة لإدارة صندوق العمل' : 'Manager invitation', url: inviteLink });
                  } else {
                    await navigator.clipboard.writeText(inviteLink);
                    toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
                  }
                  setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000);
                } catch { /* cancelled */ }
              }}
            >
              {copiedLink ? <Check className="h-4 w-4 me-2 text-emerald-500" /> : <Link2 className="h-4 w-4 me-2" />}
              {isRTL ? 'مشاركة رابط الدعوة' : 'Share invite link'}
            </Button>

            {expired && (
              <Button onClick={() => setInvite(null)} className="w-full rounded-xl h-11">
                {isRTL ? 'إنشاء دعوة جديدة' : 'Generate new invitation'}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
