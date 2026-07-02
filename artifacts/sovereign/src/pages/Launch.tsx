import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shield, Zap, Brain, Users, ArrowRight, Star, Lock, Globe, Sparkles, CheckCircle2, MessageCircle, Eye } from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'AI-Powered Inbox', desc: 'Messages auto-sorted into Work, Audience & Direct using AI classification' },
  { icon: Shield, title: 'E2E Encrypted', desc: 'Every message encrypted with AES-256-GCM + ECDH key exchange' },
  { icon: Sparkles, title: 'Golden Hour', desc: 'Priority windows to reach the people who matter most' },
  { icon: Lock, title: 'Access Control', desc: 'You decide who gets your attention — not algorithms' },
  { icon: Zap, title: 'Instant & Lightweight', desc: 'PWA — no download needed, works on any device instantly' },
  { icon: Globe, title: '4 Languages', desc: 'English, Arabic, French & Spanish — fully localized with RTL' },
];

const TESTIMONIALS = [
  { name: 'Sarah K.', role: 'Product Designer', text: '"Finally, a messaging app that respects my time. The AI inbox sorting is game-changing."', rating: 5 },
  { name: 'Ahmed M.', role: 'Startup Founder', text: '"I replaced 3 apps with Sovereign. Work messages stay in Work, personal stays personal."', rating: 5 },
  { name: 'Emily R.', role: 'Content Creator', text: '"My audience can reach me without flooding my personal inbox. Brilliant."', rating: 5 },
];

const COMPARISON = [
  { feature: 'AI Message Sorting', directly: true, whatsapp: false, telegram: false },
  { feature: 'E2E Encryption', directly: true, whatsapp: true, telegram: false },
  { feature: 'Access Control Levels', directly: true, whatsapp: false, telegram: false },
  { feature: 'Golden Hour Priority', directly: true, whatsapp: false, telegram: false },
  { feature: 'No Phone Number Required', directly: true, whatsapp: false, telegram: false },
  { feature: 'Open Web (PWA)', directly: true, whatsapp: false, telegram: true },
];

export default function Launch() {
  const navigate = useNavigate();
  const { language } = useLanguage();

  useEffect(() => {
    document.title = 'Sovereign — Your Inbox, Your Rules | Product Hunt Launch';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center relative">
          {/* Product Hunt Badge */}
          <a
            href="https://www.producthunt.com/posts/directly"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#DA552F]/10 text-[#DA552F] text-sm font-semibold mb-6 hover:bg-[#DA552F]/20 transition-colors border border-[#DA552F]/20"
          >
            <span className="text-lg">🚀</span>
            <span>We're live on Product Hunt — Vote for us!</span>
            <ArrowRight className="h-4 w-4" />
          </a>

          <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tight">
            Your Inbox.{' '}
            <span className="text-primary">Your Rules.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            The first messaging app that uses AI to sort your conversations, encrypts every message end-to-end, and gives you complete control over who gets your attention.
          </p>

          <div className="flex gap-4 justify-center flex-wrap mb-8">
            <Button onClick={() => navigate('/')} size="lg" className="h-14 px-8 text-lg rounded-2xl">
              Get Started Free
              <ArrowRight className="h-5 w-5 ms-2" />
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-2xl" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              See Features
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>E2E Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-primary" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-primary" />
              <span>4 Languages</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-primary" />
              <span>Open & Transparent</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Built for People Who Value Their Time
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Card key={i} className="p-6 border-primary/10 hover:border-primary/30 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Why Sovereign?</h2>
          <p className="text-center text-muted-foreground mb-8">See how we compare to other messaging platforms</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-start py-3 px-4 font-semibold">Feature</th>
                  <th className="text-center py-3 px-4 font-bold text-primary">Sovereign</th>
                  <th className="text-center py-3 px-4 text-muted-foreground">WhatsApp</th>
                  <th className="text-center py-3 px-4 text-muted-foreground">Telegram</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-3 px-4">{row.feature}</td>
                    <td className="text-center py-3 px-4">
                      {row.directly ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.whatsapp ? <CheckCircle2 className="h-5 w-5 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.telegram ? <CheckCircle2 className="h-5 w-5 text-muted-foreground mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Sign Up', desc: 'Create your account in seconds. No phone number required — just email.' },
              { step: '02', title: 'Share Your Link', desc: 'Share directly.app/@you with anyone. They can message you instantly.' },
              { step: '03', title: 'AI Does the Rest', desc: 'Messages are auto-sorted by AI. You decide who gets your real attention.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-black text-primary/20 mb-3">{item.step}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">What People Are Saying</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <Card key={i} className="p-6 border-primary/10">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <p className="text-sm mb-4">{t.text}</p>
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Privacy & Security Section */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Shield className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Privacy First. Always.</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Every message is encrypted end-to-end using AES-256-GCM with ECDH key exchange. 
            We can't read your messages. Nobody can — except you and your recipient.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Lock, title: 'Zero-Knowledge', desc: 'We never see your message content' },
              { icon: Shield, title: 'AES-256-GCM', desc: 'Military-grade encryption standard' },
              { icon: MessageCircle, title: 'No Metadata Tracking', desc: 'Your conversations stay private' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <item.icon className="h-8 w-8 text-primary" />
                <h3 className="font-bold">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 text-center bg-gradient-to-t from-primary/5 to-transparent">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Take Control?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands who switched to intentional communication.
          </p>
          <Button onClick={() => navigate('/')} size="lg" className="h-14 px-10 text-lg rounded-2xl">
            Start Free — No Credit Card
            <ArrowRight className="h-5 w-5 ms-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-border">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Sovereign. Smart Communication for Everyone.
        </p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
