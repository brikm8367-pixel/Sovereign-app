import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useMyFanGroups, FanGroup } from '@/hooks/useFanGroups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Users, Plus, Copy, Check, Trash2, Loader2, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { buildShareLink } from '@/lib/appUrl';

function GroupRow({ group, onUpdate, onRemove }: { group: FanGroup; onUpdate: ReturnType<typeof useMyFanGroups>['update']; onRemove: ReturnType<typeof useMyFanGroups>['remove']; }) {
  const { isRTL } = useLanguage();
  const [topic, setTopic] = useState(group.topic_of_day ?? '');
  const [perHour, setPerHour] = useState(group.messages_per_hour);
  const [allow, setAllow] = useState(group.allow_member_posts);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const link = buildShareLink(`/g/${group.slug}`);
  const dirty = topic !== (group.topic_of_day ?? '') || perHour !== group.messages_per_hour || allow !== group.allow_member_posts;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success(isRTL ? 'تم نسخ رابط الجروب' : 'Group link copied');
    setTimeout(() => setCopied(false), 1500);
  };

  const save = async () => {
    setBusy(true);
    const err = await onUpdate(group.id, { topic_of_day: topic || null, messages_per_hour: perHour, allow_member_posts: allow });
    setBusy(false);
    if (err) toast.error(isRTL ? 'فشل الحفظ' : 'Save failed');
    else toast.success(isRTL ? 'تم الحفظ' : 'Saved');
  };

  return (
    <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold truncate">{group.name}</p>
        <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={async () => {
          if (!confirm(isRTL ? 'حذف الجروب؟' : 'Delete group?')) return;
          const err = await onRemove(group.id);
          if (err) toast.error(isRTL ? 'فشل الحذف' : 'Delete failed');
        }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <button onClick={copy} className="flex items-center gap-2 w-full p-2 rounded-lg bg-background text-[11px] text-muted-foreground" dir="ltr">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        <span className="truncate">{link}</span>
      </button>

      <div>
        <label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
          <Megaphone className="h-3 w-3" />{isRTL ? 'موضوع/سؤال اليوم' : 'Topic / Question of the day'}
        </label>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={140}
          placeholder={isRTL ? 'مثال: ما رأيكم في الألبوم الجديد؟' : 'e.g. What do you think of the new album?'} className="h-9" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] text-muted-foreground">{isRTL ? 'رسائل/ساعة لكل عضو' : 'Messages/hour per member'}</label>
        <Input type="number" min={1} max={100} value={perHour}
          onChange={(e) => setPerHour(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="h-9 w-20" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="text-[11px] text-muted-foreground">{isRTL ? 'السماح للأعضاء بالنشر' : 'Allow members to post'}</label>
        <Switch checked={allow} onCheckedChange={setAllow} />
      </div>

      <Button onClick={save} disabled={!dirty || busy} className="w-full rounded-lg h-9">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRTL ? 'حفظ الإعدادات' : 'Save settings')}
      </Button>
    </div>
  );
}

export function FanGroupsManager() {
  const { isRTL } = useLanguage();
  const { groups, loading, create, update, remove } = useMyFanGroups();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [perHour, setPerHour] = useState(5);
  const [allow, setAllow] = useState(true);
  const [creating, setCreating] = useState(false);

  const submit = async () => {
    if (name.trim().length < 2) { toast.error(isRTL ? 'أدخل اسماً للجروب' : 'Enter a group name'); return; }
    setCreating(true);
    const err = await create(name.trim(), desc.trim(), perHour, allow);
    setCreating(false);
    if (err) { toast.error(isRTL ? 'فشل الإنشاء' : 'Create failed'); return; }
    toast.success(isRTL ? 'تم إنشاء الجروب' : 'Group created');
    setName(''); setDesc(''); setPerHour(5); setAllow(true); setOpen(false);
  };

  if (loading) return null;

  return (
    <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">{isRTL ? 'جروبات المعجبين' : 'Fan Groups'}</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4 me-1" />{isRTL ? 'جروب جديد' : 'New'}
        </Button>
      </div>

      {open && (
        <div className="p-3 rounded-xl border border-border space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={isRTL ? 'اسم الجروب' : 'Group name'} className="h-9" />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} placeholder={isRTL ? 'وصف (اختياري)' : 'Description (optional)'} className="min-h-[60px]" />
          <div className="flex items-center justify-between gap-3">
            <label className="text-[11px] text-muted-foreground">{isRTL ? 'رسائل/ساعة لكل عضو' : 'Messages/hour per member'}</label>
            <Input type="number" min={1} max={100} value={perHour} onChange={(e) => setPerHour(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="h-9 w-20" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-[11px] text-muted-foreground">{isRTL ? 'السماح للأعضاء بالنشر' : 'Allow members to post'}</label>
            <Switch checked={allow} onCheckedChange={setAllow} />
          </div>
          <Button onClick={submit} disabled={creating} className="w-full rounded-lg h-9">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : (isRTL ? 'إنشاء' : 'Create')}
          </Button>
        </div>
      )}

      {groups.length === 0 && !open && (
        <p className="text-[11px] text-muted-foreground">{isRTL ? 'لا توجد جروبات بعد.' : 'No groups yet.'}</p>
      )}
      <div className="space-y-2">
        {groups.map((g) => <GroupRow key={g.id} group={g} onUpdate={update} onRemove={remove} />)}
      </div>
    </div>
  );
}
