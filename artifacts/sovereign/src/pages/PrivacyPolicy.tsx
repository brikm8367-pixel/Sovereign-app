import { useLanguage } from '@/i18n/LanguageContext';
import { BottomNavigation } from '@/components/BottomNavigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const sections = isRTL ? [
    { t: 'مقدمة', c: 'تطبيق Sovereign يحترم خصوصيتك. نلتزم بحماية بياناتك الشخصية وفقاً لأعلى المعايير الدولية بما في ذلك GDPR (الاتحاد الأوروبي) و CCPA (كاليفورنيا) و COPPA (حماية الأطفال).' },
    { t: 'البيانات التي نجمعها', c: 'البريد الإلكتروني، اسم المستخدم، الاسم الظاهر، صورة الملف الشخصي، الرسائل المرسلة والمستلمة (مشفرة). لا نجمع: بيانات الموقع، جهات الاتصال، سجل المكالمات، أو أي بيانات حساسة أخرى دون إذنك الصريح.' },
    { t: 'كيف نستخدم بياناتك', c: 'تقديم خدمة التواصل وتحسين تجربتك. تصنيف الرسائل تلقائياً باستخدام الذكاء الاصطناعي. إرسال الإشعارات. منع الإساءة والاحتيال. لا نبيع أو نشارك بياناتك مع أطراف ثالثة لأغراض إعلانية مطلقاً.' },
    { t: 'الذكاء الاصطناعي وتصنيف الرسائل', c: 'نستخدم الذكاء الاصطناعي لتصنيف رسائلك إلى الصناديق المناسبة (عمل، علاقات، خاص) فقط. التصنيف يتم على محتوى الرسائل مؤقتاً ولا يُخزّن النص الأصلي بعد التصنيف.' },
    { t: 'تشفير الرسائل', c: 'جميع الرسائل محمية بتشفير TLS أثناء النقل. المكالمات الصوتية والمرئية مشفرة باستخدام DTLS/SRTP عبر WebRTC. بياناتك مخزنة بشكل آمن في خوادم محمية مع تشفير أثناء التخزين.' },
    { t: 'حقوقك (GDPR و CCPA)', c: 'لديك الحق في: الوصول إلى بياناتك، تعديلها، حذفها بالكامل، تصديرها، والاعتراض على معالجتها. يمكنك حذف حسابك وجميع بياناتك بالكامل من صفحة الملف الشخصي. الحذف نهائي وغير قابل للاسترجاع.' },
    { t: 'ملفات تعريف الارتباط', c: 'نستخدم ملفات تعريف الارتباط الأساسية فقط لتشغيل التطبيق (الجلسة والمصادقة). لا نستخدم ملفات تتبع أو إعلانية أو ملفات طرف ثالث.' },
    { t: 'الأطفال (COPPA)', c: 'التطبيق مخصص للبالغين (18 عاماً فأكثر). لا نجمع بيانات من الأطفال دون سن 13 عاماً عن علم. إذا اكتشفنا حساباً لطفل، سنحذفه فوراً.' },
    { t: 'مشاركة البيانات', c: 'لا نبيع بياناتك. قد نشارك بيانات مجهولة الهوية لأغراض التحليل الإحصائي. قد نكشف عن معلومات استجابة لأمر قضائي أو طلب قانوني ملزم.' },
    { t: 'الأمان', c: 'نستخدم أفضل الممارسات الأمنية: تشفير البيانات، حماية من هجمات DDoS وSQL Injection وXSS، مراقبة مستمرة للنظام، نسخ احتياطي مشفر.' },
    { t: 'التغييرات على هذه السياسة', c: 'سنخطرك بأي تغييرات جوهرية عبر إشعار داخل التطبيق. استمرارك في استخدام التطبيق بعد التحديث يعني موافقتك على السياسة المحدّثة.' },
    { t: 'التواصل معنا', c: 'لأي استفسارات حول الخصوصية: privacy@directly.app' },
  ] : [
    { t: 'Introduction', c: 'Sovereign respects your privacy. We are committed to protecting your personal data in accordance with the highest international standards including GDPR (EU), CCPA (California), and COPPA (Children\'s Privacy).' },
    { t: 'Data We Collect', c: 'Email address, username, display name, profile photo, sent/received messages (encrypted). We do NOT collect: location data, contacts, call logs, or any other sensitive data without your explicit consent.' },
    { t: 'How We Use Your Data', c: 'Providing communication services and improving your experience. Automatically classifying messages using AI. Sending notifications. Preventing abuse and fraud. We never sell or share your data with third parties for advertising.' },
    { t: 'AI & Message Classification', c: 'We use AI only to classify your messages into appropriate inboxes (Work, Audience, Private). Classification is performed temporarily on message content; original text is not stored after classification.' },
    { t: 'Message Encryption', c: 'All messages are protected with TLS encryption in transit. Voice and video calls are encrypted using DTLS/SRTP via WebRTC. Your data is stored securely on protected servers with encryption at rest.' },
    { t: 'Your Rights (GDPR & CCPA)', c: 'You have the right to: access, modify, delete, export, and object to processing of your data at any time. You can delete your account and all data permanently from the Profile page. Deletion is final and irreversible.' },
    { t: 'Cookies', c: 'We use only essential cookies to operate the app (session and authentication). We do not use tracking, advertising, or third-party cookies.' },
    { t: 'Children (COPPA)', c: 'The app is intended for adults (18+). We do not knowingly collect data from children under 13. If we discover a child\'s account, we will delete it immediately.' },
    { t: 'Data Sharing', c: 'We do not sell your data. We may share anonymized data for statistical analysis. We may disclose information in response to a court order or binding legal request.' },
    { t: 'Security', c: 'We use industry-best security practices: data encryption, DDoS/SQL Injection/XSS protection, continuous system monitoring, and encrypted backups.' },
    { t: 'Changes to This Policy', c: 'We will notify you of any material changes via an in-app notification. Continued use of the app after an update constitutes acceptance of the updated policy.' },
    { t: 'Contact Us', c: 'For any privacy inquiries: privacy@directly.app' },
  ];

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <header className="fixed top-0 right-0 left-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-lg mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 rounded-xl">
            {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
          </Button>
          <h1 className="font-bold text-lg">{isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto pt-16 pb-24 px-4 space-y-6">
        <p className="text-sm text-muted-foreground">{isRTL ? 'آخر تحديث: مارس 2026' : 'Last updated: March 2026'}</p>
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
