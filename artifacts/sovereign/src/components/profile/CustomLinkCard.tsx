import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildShareLink, getPublicAppUrl } from '@/lib/appUrl';

const ERR: Record<string, Record<string, string>> = {
  invalid_slug_format: { ar: 'الرابط يجب أن يكون 3-20 حرفاً (أحرف وأرقام و - _).', en: 'Link must be 3-20 chars (letters, numbers, - _).' },
  slug_reserved: { ar: 'هذا الاسم محجوز أو يخص مستخدماً آخر.', en: 'This name is reserved or belongs to another user.' },
  slug_taken: { ar: 'هذا الرابط مستخدم بالفعل.', en: 'This link is already taken.' },
};

export function CustomLinkCard() {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const lang = isRTL ? 'ar' : 'en';
  const [slug, setSlug] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('slug').eq('id', user.id).maybeSingle().then(({ data }) => {
      setSlug((data as any)?.slug ?? '');
      setOriginal((data as any)?.slug ?? '');
      setLoading(false);
    });
  }, [user]);

  const host = getPublicAppUrl().replace(/^https?:\/\//, '');
  const fullLink = buildShareLink(`/s/${slug || '...'}`);

  const save = async () => {
    const clean = slug.trim().toLowerCase();
    if (clean === original) return;
    setSaving(true);
    const { data, error } = await supabase.rpc('set_profile_slug', { _slug: clean });
    setSaving(false);
    if (error) {
      const key = (error.message || '').match(/invalid_slug_format|slug_reserved|slug_taken/)?.[0];
      toast.error(key ? ERR[key][lang] : (isRTL ? 'تعذّر الحفظ' : 'Could not save'));
      return;
    }
    setSlug(data as string);
    setOriginal(data as string);
    toast.success(isRTL ? 'تم تحديث رابطك' : 'Your link is updated');
  };

  const copy = async () => {
    await navigator.clipboard.writeText(buildShareLink(`/s/${original}`));
    setCopied(true);
    toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied');
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) return null;

  return (
    <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" />
        <p className="font-semibold text-sm">{isRTL ? 'رابطك المخصص' : 'Your Custom Link'}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {isRTL ? 'رابط قصير يفتح صفحة إرسال عرض إليك.' : 'A short link that opens your send-a-deal page.'}
      </p>

      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 text-sm" dir="ltr">
        <span className="text-muted-foreground truncate">{host}/s/</span>
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase())}
          maxLength={20}
          className="h-8 flex-1 bg-background"
          placeholder="omar"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={save} disabled={saving || slug.trim().toLowerCase() === original || slug.trim().length < 3} className="flex-1 rounded-xl h-9">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRTL ? 'حفظ الرابط' : 'Save link')}
        </Button>
        <Button onClick={copy} variant="outline" className="rounded-xl h-9" disabled={!original}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {original && (
        <p className="text-[11px] text-muted-foreground truncate" dir="ltr">{fullLink}</p>
      )}
    </div>
  );
}
