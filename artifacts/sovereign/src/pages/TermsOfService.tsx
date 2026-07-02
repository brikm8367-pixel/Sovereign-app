import { useLanguage } from '@/i18n/LanguageContext';
import { BottomNavigation } from '@/components/BottomNavigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const sections = isRTL ? [
    { t: 'قبول الشروط', c: 'باستخدام تطبيق Sovereign، فإنك توافق على هذه الشروط. إذا لم توافق، يرجى عدم استخدام التطبيق. يجب أن يكون عمرك 13 عاماً أو أكثر لاستخدام التطبيق.' },
    { t: 'وصف الخدمة', c: 'Sovereign هو منصة تواصل ذكية تتيح لك التحكم في من يمكنه الوصول إليك عبر ثلاثة مستويات: الخاص (للمقربين)، العمل (للفرص المهنية)، والعلاقات (للتواصل العام). يستخدم الذكاء الاصطناعي لتصنيف الرسائل تلقائياً.' },
    { t: 'حسابك', c: 'أنت مسؤول عن الحفاظ على أمان حسابك وكلمة مرورك. يجب أن تكون المعلومات التي تقدمها دقيقة وحقيقية. لا يُسمح بإنشاء حسابات مزيفة أو انتحال هوية الآخرين.' },
    { t: 'حماية القاصرين', c: 'يجب أن يكون عمرك 13 سنة على الأقل لاستخدام Sovereign. إذا كان عمرك بين 13 و18، يجب أن يوافق ولي أمرك على استخدامك للتطبيق. نحن ملتزمون بحماية سلامة القاصرين ونبلغ عن أي محتوى ضار يتعلق بهم.' },
    { t: 'السلوك المقبول', c: 'يُحظر: إرسال رسائل مزعجة (Spam)، التحرش أو التنمر، انتحال هوية الآخرين، محاولة اختراق النظام، نشر محتوى غير قانوني (مخدرات، إرهاب، استغلال أطفال)، استخدام التطبيق لأي غرض غير قانوني.' },
    { t: 'المحتوى', c: 'أنت مسؤول عن المحتوى الذي ترسله. نحتفظ بالحق في إزالة أي محتوى ينتهك هذه الشروط وتعليق أو حذف الحسابات المخالفة.' },
    { t: 'الملكية الفكرية', c: 'أنت تمتلك المحتوى الذي تنشئه. بإرسال محتوى عبر التطبيق، تمنحنا ترخيصاً محدوداً لمعالجة وتخزين هذا المحتوى لتقديم الخدمة. نحترم حقوق النشر ونتعامل مع شكاوى DMCA.' },
    { t: 'الإبلاغ والحظر', c: 'يمكنك الإبلاغ عن أي مستخدم مسيء أو حظره. نتعامل مع البلاغات بجدية وسرعة. الاستخدام المتكرر للإبلاغ الكاذب قد يؤدي لتعليق حسابك.' },
    { t: 'إنهاء الحساب', c: 'يمكنك حذف حسابك في أي وقت من صفحة الملف الشخصي. حذف الحساب نهائي ويشمل جميع بياناتك ورسائلك. يمكننا تعليق أو إنهاء حسابك في حالة انتهاك هذه الشروط.' },
    { t: 'تحديد المسؤولية', c: 'الخدمة مقدمة "كما هي". لا نضمن خلوها من الأخطاء أو الانقطاعات. لسنا مسؤولين عن محتوى المستخدمين أو الأضرار الناتجة عن استخدام التطبيق. مسؤوليتنا محدودة وفقاً للقانون المعمول به.' },
    { t: 'القانون المعمول به', c: 'تخضع هذه الشروط للقوانين المعمول بها في بلد إقامتك. أي نزاعات تُحل عبر التحكيم الملزم ما لم ينص القانون المحلي على خلاف ذلك.' },
    { t: 'التغييرات', c: 'سنخطرك بأي تغييرات جوهرية. استمرارك في الاستخدام يعني موافقتك على الشروط المحدّثة.' },
  ] : [
    { t: 'Acceptance of Terms', c: 'By using Sovereign, you agree to these terms. If you do not agree, please do not use the app. You must be 13 years or older to use the app.' },
    { t: 'Service Description', c: 'Sovereign is an intelligent communication platform that lets you control who can reach you through three levels: Private (close contacts), Work (professional opportunities), and Audience (general communication). It uses AI to automatically classify messages.' },
    { t: 'Your Account', c: 'You are responsible for maintaining the security of your account and password. Information you provide must be accurate and truthful. Creating fake accounts or impersonating others is not allowed.' },
    { t: 'Child Safety', c: 'You must be at least 13 years old to use Sovereign. If you are between 13 and 18, a parent or guardian must consent to your use of the app. We are committed to protecting the safety of minors and report any harmful content related to them.' },
    { t: 'Acceptable Conduct', c: 'Prohibited: sending spam, harassment or bullying, impersonating others, attempting to hack the system, posting illegal content (drugs, terrorism, child exploitation), or any illegal use of the app.' },
    { t: 'Content', c: 'You are responsible for content you send. We reserve the right to remove any content that violates these terms and to suspend or delete accounts in violation.' },
    { t: 'Intellectual Property', c: 'You own the content you create. By sending content through the app, you grant us a limited license to process and store it to provide the service. We respect copyrights and handle DMCA complaints.' },
    { t: 'Reporting & Blocking', c: 'You can report or block any abusive user. We take reports seriously and act promptly. Repeated false reporting may result in account suspension.' },
    { t: 'Account Termination', c: 'You can delete your account at any time from the Profile page. Account deletion is permanent and includes all your data and messages. We may suspend or terminate your account for violating these terms.' },
    { t: 'Limitation of Liability', c: 'The service is provided "as is." We do not guarantee it will be error-free or uninterrupted. We are not responsible for user-generated content or damages from app use. Our liability is limited as permitted by applicable law.' },
    { t: 'Governing Law', c: 'These terms are governed by the applicable laws of your country of residence. Disputes shall be resolved through binding arbitration unless local law requires otherwise.' },
    { t: 'Changes', c: 'We will notify you of any material changes. Continued use constitutes acceptance of updated terms.' },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="fixed top-0 right-0 left-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-xl">
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          <h1 className="font-bold text-lg">{isRTL ? 'شروط الخدمة' : 'Terms of Service'}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto pt-16 pb-24 px-4 space-y-6">
        <p className="text-sm text-muted-foreground">{isRTL ? 'آخر تحديث: أبريل 2026' : 'Last updated: April 2026'}</p>
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-base font-bold mb-2">{s.t}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.c}</p>
          </section>
        ))}
      </main>
      <BottomNavigation />
    </div>
  );
}
