import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/** Emergency Kill Switch — instantly revokes ALL manager access (password confirmed). */
export function KillSwitch({ onDone }: { onDone?: () => void }) {
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!password) { toast.error(isRTL ? 'أدخل كلمة المرور' : 'Enter your password'); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('manager-kill-switch', {
      body: { password },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error;
      toast.error(msg === 'Invalid password'
        ? (isRTL ? 'كلمة المرور غير صحيحة' : 'Incorrect password')
        : (isRTL ? 'تعذّر التنفيذ' : 'Could not complete'));
      return;
    }
    const n = (data as any)?.revoked ?? 0;
    toast.success(isRTL ? `تم سحب صلاحيات ${n} وكيل فوراً` : `Revoked ${n} manager(s) instantly`);
    setPassword('');
    setOpen(false);
    onDone?.();
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        <ShieldAlert className="h-4 w-4 me-2" />
        {isRTL ? 'مفتاح الطوارئ — سحب كل الوكلاء' : 'Kill Switch — revoke all managers'}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              {isRTL ? 'سحب كل صلاحيات الوكلاء' : 'Revoke all manager access'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? 'إجراء فوري لا رجعة فيه. سيفقد كل الوكلاء صلاحياتهم حالاً. أكّد بكلمة مرورك.'
                : 'Immediate and irreversible. Every manager loses access at once. Confirm with your password.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isRTL ? 'كلمة المرور' : 'Password'}
            className="rounded-xl"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <Button onClick={run} disabled={busy} variant="destructive" className="rounded-xl">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRTL ? 'تأكيد السحب' : 'Confirm revoke')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
