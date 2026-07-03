import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Bug, Mail, CheckCircle2, AlertTriangle } from 'lucide-react';

const GOLD = '#D4A843';

export default function BugBounty() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm mb-8 text-primary hover:opacity-70 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          رجوع
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: `${GOLD}20` }}>
            <Bug className="w-6 h-6" style={{ color: GOLD }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">برنامج Bug Bounty</h1>
            <p className="text-sm text-muted-foreground">أمان Sovereign مسؤولية مشتركة</p>
          </div>
        </div>

        <p className="mt-8 text-base leading-relaxed text-muted-foreground">
          نؤمن أن خصوصية المستخدم لا تُختزل. إذا اكتشفت ثغرة أمنية في Sovereign،
          نُقدّر إبلاغنا قبل الإفصاح العلني.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: GOLD }} />
            النطاق المقبول
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• تطبيق الويب: sovereign-app.replit.app</li>
            <li>• وظائف الخادم Edge Functions</li>
            <li>• ثغرات التشفير E2E</li>
            <li>• تجاوز قواعد الصناديق والتصنيف</li>
            <li>• تسريب بيانات أو تجاوز RLS</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" style={{ color: GOLD }} />
            خارج النطاق
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• هجمات DDoS أو Brute force</li>
            <li>• Social Engineering لموظفينا</li>
            <li>• ثغرات تتطلب وصولاً فيزيائياً للجهاز</li>
            <li>• مشاكل تتعلق بمتصفحات قديمة غير مدعومة</li>
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: GOLD }} />
            قواعد الإفصاح
          </h2>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>أبلغنا قبل أي إفصاح علني (مهلة 90 يوماً).</li>
            <li>لا تستهدف بيانات مستخدمين حقيقيين.</li>
            <li>لا تخرّب أو تعدّل بيانات.</li>
            <li>قدّم خطوات إعادة الإنتاج بدقة.</li>
          </ol>
        </section>

        <section className="mt-10 p-6 rounded-2xl border" style={{
          background: `${GOLD}08`,
          borderColor: `${GOLD}40`,
        }}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: GOLD }} />
            كيف تُبلِغ
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            أرسل تقريرك إلى:
          </p>
          <a
            href="mailto:security@directly.app"
            className="text-base font-medium"
            style={{ color: GOLD }}
          >
            security@directly.app
          </a>
          <p className="mt-4 text-xs text-muted-foreground">
            سنردّ خلال 48 ساعة. التقارير المؤكدة تُكافأ حسب الخطورة.
          </p>
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          شكراً لمساعدتنا في حماية مستخدمينا.
        </p>
      </div>
    </div>
  );
}
