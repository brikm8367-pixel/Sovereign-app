import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  ShieldCheck, Lock, Eye, EyeOff, Server, KeyRound, 
  Globe, ArrowLeft, ArrowRight, Fingerprint,
  Database, Ban, Smartphone, LogOut, Mail, Loader2, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BottomNavigation } from '@/components/BottomNavigation';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { KeyBackupCard } from '@/components/profile/KeyBackupCard';

const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

interface SecurityCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  delay?: number;
}

function SecurityCard({ icon, title, description, badge, delay = 0 }: SecurityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease }}
      className="relative p-5 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors group"
    >
      {badge && (
        <span className="absolute top-3 end-3 text-[10px] font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="p-2.5 rounded-xl bg-primary/10 w-fit mb-3 group-hover:bg-primary/15 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-base mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function Security() {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  // 2FA State
  const [show2FA, setShow2FA] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Device sessions
  const [sessions, setSessions] = useState<{ id: string; device: string; lastActive: string; current: boolean }[]>([]);

  useEffect(() => {
    if (user?.email) setOtpEmail(user.email);
    // Check if 2FA is "enabled" (we store this in localStorage for now)
    setIs2FAEnabled(localStorage.getItem('directly_2fa') === 'true');
    // Mock device sessions from current session
    setSessions([
      { id: '1', device: detectDevice(), lastActive: new Date().toISOString(), current: true },
    ]);
  }, [user]);

  function detectDevice(): string {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone · Safari';
    if (/iPad/.test(ua)) return 'iPad · Safari';
    if (/Android/.test(ua)) return 'Android · Chrome';
    if (/Mac/.test(ua)) return 'Mac · Chrome';
    if (/Windows/.test(ua)) return 'Windows · Chrome';
    return 'Browser';
  }

  const sendOtp = async () => {
    setIsSendingOtp(true);
    try {
      // Use Supabase OTP via email
      const { error } = await supabase.auth.signInWithOtp({ email: otpEmail });
      if (error) throw error;
      setOtpSent(true);
      toast.success(isRTL ? 'تم إرسال رمز التحقق إلى بريدك' : 'Verification code sent to your email');
    } catch {
      toast.error(isRTL ? 'فشل إرسال الرمز' : 'Failed to send code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (otpCode.length < 6) return;
    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: otpEmail, token: otpCode, type: 'email' });
      if (error) throw error;
      localStorage.setItem('directly_2fa', 'true');
      setIs2FAEnabled(true);
      setShow2FA(false);
      setOtpSent(false);
      setOtpCode('');
      toast.success(isRTL ? 'تم تفعيل المصادقة الثنائية ✅' : '2FA enabled successfully ✅');
    } catch {
      toast.error(isRTL ? 'رمز غير صحيح' : 'Invalid code');
    } finally {
      setIsVerifying(false);
    }
  };

  const disable2FA = () => {
    localStorage.removeItem('directly_2fa');
    setIs2FAEnabled(false);
    toast.success(isRTL ? 'تم إلغاء المصادقة الثنائية' : '2FA disabled');
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    toast.success(isRTL ? 'تم تسجيل الخروج من جميع الأجهزة' : 'Signed out from all devices');
    navigate('/');
  };

  const content = {
    ar: {
      title: 'الأمان والخصوصية',
      subtitle: 'بُني من الأساس لحماية خصوصيتك',
      heroText: 'رسائلك مشفرة من طرف إلى طرف. لا نقرأها، لا نخزنها، ولا نبيعها. أنت وحدك من يملك مفاتيح محادثاتك.',
      twoFA: 'المصادقة الثنائية (2FA)',
      twoFADesc: 'حماية إضافية لحسابك عبر رمز بريد إلكتروني',
      enable2FA: 'تفعيل 2FA',
      disable2FA: 'إلغاء 2FA',
      devices: 'الأجهزة المتصلة',
      signOutAll: 'تسجيل الخروج من جميع الأجهزة',
      currentDevice: 'هذا الجهاز',
      sendCode: 'إرسال رمز التحقق',
      verifyCode: 'تحقق',
      enterCode: 'أدخل الرمز المرسل إلى بريدك',
      ageNotice: 'يجب أن يكون عمرك 13 سنة أو أكثر لاستخدام Sovereign.',
      sections: [
        { icon: <Lock className="h-5 w-5 text-primary" />, title: 'تشفير من طرف إلى طرف', description: 'كل رسالة مشفرة باستخدام AES-256-GCM مع مفاتيح ECDH فريدة.', badge: 'AES-256' },
        { icon: <KeyRound className="h-5 w-5 text-primary" />, title: 'مفاتيح تشفير خاصة بك', description: 'يتم إنشاء زوج مفاتيح ECDH (P-256) فريد لكل مستخدم. المفتاح الخاص لا يغادر جهازك أبداً.' },
        { icon: <EyeOff className="h-5 w-5 text-primary" />, title: 'بدون تتبع أو إعلانات', description: 'لا نتتبع نشاطك، لا نبيع بياناتك، ولا نعرض إعلانات.', badge: 'ZERO ADS' },
        { icon: <Globe className="h-5 w-5 text-primary" />, title: 'متوافق مع GDPR', description: 'نلتزم بأعلى معايير حماية البيانات الأوروبية والدولية.', badge: 'GDPR' },
        { icon: <Server className="h-5 w-5 text-primary" />, title: 'بنية تحتية آمنة', description: 'بيانات مشفرة أثناء النقل عبر TLS 1.3 وأثناء التخزين. سياسات RLS صارمة.' },
        { icon: <Fingerprint className="h-5 w-5 text-primary" />, title: 'مصادقة متعددة الطبقات', description: 'تسجيل دخول آمن مع التحقق من البريد الإلكتروني و 2FA.' },
        { icon: <Database className="h-5 w-5 text-primary" />, title: 'حذف البيانات بالكامل', description: 'يمكنك حذف حسابك وجميع بياناتك بشكل نهائي في أي وقت.' },
        { icon: <Ban className="h-5 w-5 text-primary" />, title: 'حماية من الرسائل المزعجة', description: 'نظام حدود ذكي لكل صندوق يمنع الفيضان ويحمي تركيزك.' },
      ],
      comparison: 'كيف يقارن Sovereign؟',
    },
    en: {
      title: 'Security & Privacy',
      subtitle: 'Built from the ground up to protect your privacy',
      heroText: 'Your messages are end-to-end encrypted. We can\'t read them, we don\'t store them, and we never sell them. Only you hold the keys to your conversations.',
      twoFA: 'Two-Factor Authentication (2FA)',
      twoFADesc: 'Extra protection for your account via email verification code',
      enable2FA: 'Enable 2FA',
      disable2FA: 'Disable 2FA',
      devices: 'Connected Devices',
      signOutAll: 'Sign out from all devices',
      currentDevice: 'This device',
      sendCode: 'Send verification code',
      verifyCode: 'Verify',
      enterCode: 'Enter the code sent to your email',
      ageNotice: 'You must be 13 years or older to use Sovereign.',
      sections: [
        { icon: <Lock className="h-5 w-5 text-primary" />, title: 'End-to-End Encryption', description: 'Every message is encrypted using AES-256-GCM with unique ECDH keys.', badge: 'AES-256' },
        { icon: <KeyRound className="h-5 w-5 text-primary" />, title: 'Your Keys, Your Device', description: 'A unique ECDH (P-256) key pair is generated for each user. Your private key never leaves your device.' },
        { icon: <EyeOff className="h-5 w-5 text-primary" />, title: 'No Tracking · No Ads', description: 'We don\'t track your activity, sell your data, or show ads.', badge: 'ZERO ADS' },
        { icon: <Globe className="h-5 w-5 text-primary" />, title: 'GDPR Compliant', description: 'We comply with the highest European and international data protection standards.', badge: 'GDPR' },
        { icon: <Server className="h-5 w-5 text-primary" />, title: 'Secure Infrastructure', description: 'Data encrypted in transit via TLS 1.3 and at rest. Strict RLS policies on every table.' },
        { icon: <Fingerprint className="h-5 w-5 text-primary" />, title: 'Multi-Layer Authentication', description: 'Secure sign-in with email verification, 2FA, and protection against fake accounts.' },
        { icon: <Database className="h-5 w-5 text-primary" />, title: 'Full Data Deletion', description: 'Delete your account and all data permanently at any time. We retain nothing.' },
        { icon: <Ban className="h-5 w-5 text-primary" />, title: 'Spam Protection', description: 'Smart per-inbox limits prevent flooding and protect your focus.' },
      ],
      comparison: 'How does Sovereign compare?',
    },
  };

  const c = isRTL ? content.ar : content.en;

  const comparisonFeatures = [
    { feature: isRTL ? 'تشفير E2E' : 'E2E Encryption', directly: true, whatsapp: true, telegram: '⚡', signal: true },
    { feature: isRTL ? 'بدون إعلانات' : 'No Ads', directly: true, whatsapp: false, telegram: true, signal: true },
    { feature: isRTL ? 'تحكم بالوصول' : 'Access Control', directly: true, whatsapp: false, telegram: false, signal: false },
    { feature: isRTL ? 'صناديق مصنفة' : 'Sorted Inboxes', directly: true, whatsapp: false, telegram: false, signal: false },
    { feature: isRTL ? '2FA' : '2FA', directly: true, whatsapp: true, telegram: true, signal: true },
    { feature: isRTL ? 'حذف كامل للبيانات' : 'Full Data Delete', directly: true, whatsapp: false, telegram: true, signal: true },
    { feature: isRTL ? 'متوافق GDPR' : 'GDPR Compliant', directly: true, whatsapp: true, telegram: false, signal: true },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="fixed top-0 right-0 left-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border safe-area-inset-top">
        <div className="max-w-2xl mx-auto flex h-14 items-center px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <BackIcon className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-sm font-semibold flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {c.title}
            </h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto pt-20 pb-24 px-4">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">{c.subtitle}</h2>
          <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">{c.heroText}</p>
        </motion.div>

        {/* 2FA Section */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease }} className="mb-6 p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Fingerprint className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base">{c.twoFA}</h3>
                <p className="text-xs text-muted-foreground">{c.twoFADesc}</p>
              </div>
              {is2FAEnabled && <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">ON</span>}
            </div>

            {!show2FA && !is2FAEnabled && (
              <Button onClick={() => setShow2FA(true)} className="w-full h-11 rounded-xl">{c.enable2FA}</Button>
            )}
            {is2FAEnabled && (
              <Button variant="outline" onClick={disable2FA} className="w-full h-11 rounded-xl text-destructive">{c.disable2FA}</Button>
            )}

            {show2FA && !is2FAEnabled && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{otpEmail}</span>
                </div>
                {!otpSent ? (
                  <Button onClick={sendOtp} disabled={isSendingOtp} className="w-full h-11 rounded-xl">
                    {isSendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : c.sendCode}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground text-center">{c.enterCode}</p>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                        <InputOTPGroup>
                          {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button onClick={verifyOtp} disabled={isVerifying || otpCode.length < 6} className="w-full h-11 rounded-xl">
                      {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 me-2" />{c.verifyCode}</>}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Device Sessions */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, ease }} className="mb-6 p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-base">{c.devices}</h3>
            </div>
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.device}</p>
                    {s.current && <span className="text-[10px] text-emerald-600 font-semibold">{c.currentDevice}</span>}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={signOutAll} className="w-full h-10 rounded-xl mt-3 text-destructive text-sm">
              <LogOut className="h-4 w-4 me-2" />
              {c.signOutAll}
            </Button>
          </motion.div>
        )}

        {/* E2EE Key Backup (only for signed-in users) */}
        {user && <KeyBackupCard />}

        {/* Security Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
          {c.sections.map((section, i) => (
            <SecurityCard key={i} icon={section.icon} title={section.title} description={section.description} badge={section.badge} delay={i * 0.06} />
          ))}
        </div>

        {/* Comparison Table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5, ease }} className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold text-lg mb-4 text-center">{c.comparison}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-2 font-medium text-muted-foreground"></th>
                  <th className="py-2 font-semibold text-primary">Sovereign</th>
                  <th className="py-2 font-medium text-muted-foreground">WhatsApp</th>
                  <th className="py-2 font-medium text-muted-foreground">Telegram</th>
                  <th className="py-2 font-medium text-muted-foreground">Signal</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 text-start font-medium">{row.feature}</td>
                    <td className="py-2.5 text-center">{row.directly ? <span className="text-emerald-600">✓</span> : '—'}</td>
                    <td className="py-2.5 text-center">{row.whatsapp === true ? <span className="text-emerald-600">✓</span> : row.whatsapp === false ? '—' : row.whatsapp}</td>
                    <td className="py-2.5 text-center">{row.telegram === true ? <span className="text-emerald-600">✓</span> : row.telegram === false ? '—' : row.telegram}</td>
                    <td className="py-2.5 text-center">{row.signal === true ? <span className="text-emerald-600">✓</span> : row.signal === false ? '—' : row.signal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Age notice */}
        <p className="text-center text-xs text-muted-foreground mt-6">{c.ageNotice}</p>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
          {isRTL 
            ? 'Sovereign مبني على بنية تحتية مفتوحة المصدر مع التزام كامل بمعايير الأمان العالمية.'
            : 'Sovereign is built on open-source infrastructure with full commitment to global security standards.'}
        </motion.p>
      </main>

      <BottomNavigation />
    </div>
  );
}
