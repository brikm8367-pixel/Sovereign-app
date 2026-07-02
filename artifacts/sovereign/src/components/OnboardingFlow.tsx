import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Briefcase, Heart } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);

  const finish = () => {
    localStorage.setItem('directly_onboarded', 'true');
    onComplete();
  };

  const next = () => {
    if (step < 3) setStep(step + 1);
    else finish();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] bg-background flex flex-col items-center justify-center px-8"
    >
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-4 text-foreground leading-tight">
              Your messages will always land where they belong — automatically.
            </h1>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-8">
              <Heart className="h-10 w-10 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-foreground">
              Who are the 3 most important people in your life?
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Their messages will always reach you first.
            </p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center max-w-sm space-y-4">
            <h1 className="text-xl font-bold text-foreground mb-2">Three spaces. One you.</h1>
            <div className="w-full space-y-3">
              {[
                { icon: Heart, label: 'Private', desc: 'For the ones you choose.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
                { icon: Briefcase, label: 'Work', desc: 'For those who come with purpose.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { icon: Users, label: 'Relationships', desc: 'For everyone else.', color: 'text-violet-500', bg: 'bg-violet-500/10' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
                  <div className={`p-2.5 rounded-xl ${item.bg}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="text-start">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-primary font-medium">✨ AI handles the rest.</p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.4 }} className="flex flex-col items-center text-center max-w-sm">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-8">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-3 text-foreground">
              Quiet now. Ready for what comes.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Invite your first person — and watch how Sovereign understands.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-12 w-full max-w-sm px-8 space-y-6">
        <div className="flex justify-center gap-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/20'}`} />
          ))}
        </div>
        <Button onClick={next} className="w-full h-14 text-lg rounded-2xl touch-feedback font-semibold">
          {step === 0 ? 'Start' : step === 3 ? 'Get Started' : 'Next'}
        </Button>
        {step < 3 && (
          <button onClick={finish} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
            Skip
          </button>
        )}
      </div>
    </motion.div>
  );
}
