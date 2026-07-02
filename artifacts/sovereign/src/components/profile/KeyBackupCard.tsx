import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Download, Upload, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { exportKeyBackup, importKeyBackup, downloadBackupFile } from '@/utils/e2eBackup';

const ease: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

/** Encrypted export/import of the user's E2EE private key. */
export function KeyBackupCard() {
  const { isRTL } = useLanguage();
  const [mode, setMode] = useState<'idle' | 'export' | 'import'>('idle');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<string | null>(null);

  const t = (ar: string, en: string) => (isRTL ? ar : en);

  const handleExport = async () => {
    if (pass.length < 8) {
      toast.error(t('استخدم عبارة مرور من 8 أحرف على الأقل', 'Use a passphrase of at least 8 characters'));
      return;
    }
    setBusy(true);
    const res = await exportKeyBackup(pass);
    setBusy(false);
    if (!res.success) {
      toast.error(
        (res as any).reason === 'no_local_keys'
          ? t('لا توجد مفاتيح على هذا الجهاز', 'No keys found on this device')
          : t('تعذّر إنشاء النسخة الاحتياطية', 'Could not create backup'),
      );
      return;
    }
    downloadBackupFile(res.file);
    toast.success(t('تم تنزيل النسخة الاحتياطية المشفّرة', 'Encrypted backup downloaded'));
    setMode('idle');
    setPass('');
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pendingFile.current = String(reader.result || '');
      setMode('import');
    };
    reader.onerror = () => toast.error(t('تعذّر قراءة الملف', 'Could not read file'));
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!pendingFile.current) return;
    if (pass.length < 8) {
      toast.error(t('أدخل عبارة المرور الصحيحة', 'Enter the correct passphrase'));
      return;
    }
    setBusy(true);
    const res = await importKeyBackup(pendingFile.current, pass);
    setBusy(false);
    if (!res.success) {
      toast.error(
        (res as any).reason === 'wrong_passphrase'
          ? t('عبارة المرور غير صحيحة', 'Wrong passphrase')
          : (res as any).reason === 'invalid_file'
            ? t('ملف النسخة الاحتياطية غير صالح', 'Invalid backup file')
            : t('تعذّر الاستيراد', 'Import failed'),
      );
      return;
    }
    toast.success(t('تمت استعادة المفاتيح على هذا الجهاز', 'Keys restored on this device'));
    pendingFile.current = null;
    setMode('idle');
    setPass('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, ease }}
      className="mb-6 p-5 rounded-2xl bg-card border border-border"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-base">{t('نسخة احتياطية للمفاتيح', 'Encryption Key Backup')}</h3>
          <p className="text-xs text-muted-foreground">
            {t('صدّر مفتاحك المشفّر لاستعادته على جهاز آخر', 'Export your encrypted key to restore it on another device')}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-xl p-3 mb-3">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
        <span>
          {t(
            'الملف مشفّر بعبارة مرورك — احتفظ بها في مكان آمن، فلا يمكن استعادة المفاتيح بدونها.',
            'The file is encrypted with your passphrase — keep it safe, keys cannot be recovered without it.',
          )}
        </span>
      </div>

      {mode === 'idle' && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-10 rounded-xl text-sm" onClick={() => setMode('export')}>
            <Download className="h-4 w-4 me-2" />
            {t('تصدير', 'Export')}
          </Button>
          <Button variant="outline" className="flex-1 h-10 rounded-xl text-sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 me-2" />
            {t('استيراد', 'Import')}
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onPickFile} />
        </div>
      )}

      {(mode === 'export' || mode === 'import') && (
        <div className="space-y-2">
          <Input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder={
              mode === 'export'
                ? t('عبارة مرور جديدة (8+ أحرف)', 'New passphrase (8+ chars)')
                : t('عبارة مرور النسخة الاحتياطية', 'Backup passphrase')
            }
            className="h-10 rounded-xl"
          />
          <div className="flex gap-2">
            <Button
              className="flex-1 h-10 rounded-xl text-sm"
              disabled={busy}
              onClick={mode === 'export' ? handleExport : handleImport}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'export' ? (
                t('تنزيل الملف المشفّر', 'Download encrypted file')
              ) : (
                t('استعادة المفاتيح', 'Restore keys')
              )}
            </Button>
            <Button
              variant="ghost"
              className="h-10 rounded-xl text-sm"
              disabled={busy}
              onClick={() => {
                setMode('idle');
                setPass('');
                pendingFile.current = null;
              }}
            >
              {t('إلغاء', 'Cancel')}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
