import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { authenticateBiometric } from '@/utils/biometric';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const GOLD = '#D4A843';
const BG = '#0A0A0F';

interface PlanProps {
  highlighted?: boolean;
  title: string;
  price: string;
  per?: string;
  bullets: string[];
  cta: string;
  onSelect: () => void;
  loading?: boolean;
}

function Plan({ highlighted, title, price, per, bullets, cta, onSelect, loading }: PlanProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-3xl p-[1.5px]"
      style={{
        background: highlighted
          ? `linear-gradient(135deg, ${GOLD} 0%, #FFE07A 50%, ${GOLD} 100%)`
          : `linear-gradient(135deg, ${GOLD}55 0%, transparent 100%)`,
      }}
    >
      <div
        className="rounded-[calc(1.5rem-1.5px)] p-7 h-full flex flex-col"
        style={{ background: BG }}
      >
        {highlighted && (
          <div
            className="absolute -top-3 right-6 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider"
            style={{ background: GOLD, color: BG }}
          >
            الأكثر اختياراً
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          {highlighted && <Crown className="w-5 h-5" style={{ color: GOLD }} />}
          <h3 className="text-base font-medium" style={{ color: '#fff' }}>
            {title}
          </h3>
        </div>

        <div className="flex items-baseline gap-1 mb-6">
          <span
            className="text-4xl font-bold tracking-tight"
            style={{ color: highlighted ? GOLD : '#fff' }}
          >
            {price}
          </span>
          {per && <span className="text-sm" style={{ color: '#888' }}>{per}</span>}
        </div>

        <ul className="space-y-3 mb-8 flex-1">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: '#D8D8DC' }}>
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={onSelect}
          disabled={loading}
          className="w-full h-12 rounded-2xl font-semibold transition-all"
          style={{
            background: highlighted ? GOLD : 'transparent',
            color: highlighted ? BG : GOLD,
            border: `1.5px solid ${GOLD}`,
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : cta}
        </Button>
      </div>
    </motion.div>
  );
}

export default function Subscribe() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelect = async (plan: 'single' | 'pro') => {
    if (!user) {
      navigate('/');
      return;
    }
    setLoading(plan);
    try {
      const bio = await authenticateBiometric(
        plan === 'pro' ? 'تأكيد الاشتراك الشهري' : 'تأكيد فتح القناة'
      );
      if (!bio.success) {
        toast.error('لم تتم المصادقة');
        return;
      }
      toast.success('تمت المصادقة — قريباً ستفتح بوابة الدفع', {
        description: 'الدفع سيُفعَّل بعد إكمال إعداد البوابة الآمنة.',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: BG }} dir="rtl">
      {/* ambient gold glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: `radial-gradient(circle at 30% 0%, ${GOLD}22 0%, transparent 50%), radial-gradient(circle at 70% 100%, ${GOLD}15 0%, transparent 50%)`,
        }}
      />

      <div className="relative max-w-3xl mx-auto px-5 pt-6 pb-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm mb-12 transition-opacity hover:opacity-70"
          style={{ color: GOLD }}
        >
          <ArrowLeft className="w-4 h-4" />
          رجوع
        </button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
            style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}40` }}>
            <Sparkles className="w-3.5 h-3.5" style={{ color: GOLD }} />
            <span className="text-[11px] font-medium tracking-wider" style={{ color: GOLD }}>
              EXCLUSIVE ACCESS
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold mb-4 leading-tight"
            style={{ color: '#fff' }}
          >
            امتلك مفتاح <span style={{ color: GOLD }}>الوصول</span>.
          </h1>
          <p className="text-base max-w-md mx-auto" style={{ color: '#9A9A9F' }}>
            رسالتك تستحق أن تُقرأ — لا أن تضيع في الضجيج.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          <Plan
            title="رسالة واحدة — وصول مضمون"
            price="$9.99"
            bullets={[
              'فتح قناة لموضوع واحد',
              'وصول مضمون للقراءة',
              'سرية تامة End-to-End',
              'صلاحية 72 ساعة من آخر رد',
            ]}
            cta="افتح القناة"
            onSelect={() => handleSelect('single')}
            loading={loading === 'single'}
          />

          <Plan
            highlighted
            title="5 مفاتيح ذهبية — كل شهر"
            price="$34.99"
            per="/ شهرياً"
            bullets={[
              '5 قنوات وصول شهرياً',
              'تجديد تلقائي آمن',
              'أولوية في صندوق العمل',
              'شارة ذهبية على ملفك',
              'إلغاء فوري في أي وقت',
            ]}
            cta="ابدأ الآن"
            onSelect={() => handleSelect('pro')}
            loading={loading === 'pro'}
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 text-sm" style={{ color: '#6A6A6F' }}>
            <span>بدون Sovereign: ضجيج</span>
            <span style={{ color: GOLD }}>·</span>
            <span style={{ color: '#fff' }}>مع Sovereign: وصول مضمون</span>
          </div>
        </motion.div>

        <p className="mt-10 text-center text-[11px]" style={{ color: '#5A5A5F' }}>
          مدفوعات آمنة · Apple Pay · Google Pay · بطاقات ائتمان
        </p>
      </div>
    </div>
  );
}
