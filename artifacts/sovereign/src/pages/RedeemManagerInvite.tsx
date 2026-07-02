import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Crown, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function RedeemManagerInvite() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate(`/?redirect=/m/${token}`);
  }, [user, loading, token, navigate]);

  const redeem = async () => {
    if (!user) return;
    if (code.length < 8) { toast.error(isRTL ? 'أدخل الكود كاملاً' : 'Enter the full code'); return; }
    setJoining(true);
    const { data, error } = await supabase.functions.invoke('redeem-manager-invite', {
      body: { token, code },
    });
    setJoining(false);
    if (error || data?.error) {
      toast.error(
        (data?.error || '').toLowerCase().includes('expired')
          ? (isRTL ? 'الدعوة غير صالحة أو منتهية' : 'Invalid or expired invitation')
          : (isRTL ? 'الكود غير صحيح' : 'Incorrect code'),
      );
      return;
    }
    setDone(true);
    toast.success(isRTL ? 'أصبحت وكيلاً الآن' : 'You are now a manager');
    setTimeout(() => navigate('/home'), 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
          <Crown className="h-8 w-8 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{isRTL ? 'دعوة لتكون وكيلاً' : 'Manager Invitation'}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isRTL ? 'أدخل الكود المكوّن من 8 أحرف لتأكيد الدعوة' : 'Enter the 8-character code to confirm'}
          </p>
        </div>

        {done ? (
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <Check className="h-5 w-5" /> {isRTL ? 'تم!' : 'Done!'}
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <InputOTP maxLength={8} value={code} onChange={(v) => setCode(v.toUpperCase())}>
                <InputOTPGroup>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} className="w-9 h-11 text-base font-mono" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={redeem} disabled={joining || loading} className="w-full h-12 rounded-2xl">
              {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : isRTL ? 'تأكيد وأصبح وكيلاً' : 'Confirm & Become Manager'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
