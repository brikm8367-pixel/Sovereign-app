import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Loader2, ArrowLeft, Send, Megaphone, LogOut, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface Group {
  id: string; celebrity_id: string; name: string; description: string | null;
  topic_of_day: string | null; messages_per_hour: number; allow_member_posts: boolean; is_active: boolean;
}
interface GMessage { id: string; sender_id: string; content: string; created_at: string; }

export default function FanGroup() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<GMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const isOwner = group?.celebrity_id === user?.id;
  const canPost = isOwner || (isMember && group?.allow_member_posts && group?.is_active);

  const loadMessages = async (gid: string) => {
    const { data } = await supabase.from('fan_group_messages').select('id, sender_id, content, created_at').eq('group_id', gid).order('created_at', { ascending: true }).limit(200);
    setMessages((data as GMessage[]) ?? []);
  };

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      const { data: g } = await supabase.from('fan_groups').select('*').ilike('slug', slug).maybeSingle();
      if (!g) { setLoading(false); return; }
      setGroup(g as Group);
      if (user) {
        const { data: m } = await supabase.from('fan_group_members').select('id').eq('group_id', (g as Group).id).eq('user_id', user.id).maybeSingle();
        setIsMember(!!m);
        if (m || (g as Group).celebrity_id === user.id) await loadMessages((g as Group).id);
      }
      setLoading(false);
    };
    load();
  }, [slug, user]);

  useEffect(() => {
    if (!group || (!isMember && !isOwner)) return;
    const ch = supabase.channel(`group-${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fan_group_messages', filter: `group_id=eq.${group.id}` },
        (p) => setMessages((prev) => [...prev, p.new as GMessage]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [group, isMember, isOwner]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const join = async () => {
    if (!user) { navigate(`/?redirect=/g/${slug}`); return; }
    if (!group) return;
    const { error } = await supabase.from('fan_group_members').insert({ group_id: group.id, user_id: user.id });
    if (error) { toast.error(isRTL ? 'تعذّر الانضمام' : 'Could not join'); return; }
    setIsMember(true);
    await loadMessages(group.id);
    toast.success(isRTL ? 'انضممت للجروب' : 'Joined group');
  };

  const leave = async () => {
    if (!group || !user) return;
    await supabase.from('fan_group_members').delete().eq('group_id', group.id).eq('user_id', user.id);
    setIsMember(false);
    toast.success(isRTL ? 'غادرت الجروب' : 'Left group');
  };

  const send = async () => {
    if (!group || !user || !text.trim()) return;
    setSending(true);
    const { error } = await supabase.from('fan_group_messages').insert({ group_id: group.id, sender_id: user.id, content: text.trim() });
    setSending(false);
    if (error) {
      const msg = (error.message || '').includes('rate_limit')
        ? (isRTL ? 'تجاوزت حد الرسائل في الساعة' : 'Hourly message limit reached')
        : (isRTL ? 'تعذّر الإرسال' : 'Could not send');
      toast.error(msg);
      return;
    }
    setText('');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!group) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center">
      <Users className="h-10 w-10 text-muted-foreground" />
      <p className="text-muted-foreground">{isRTL ? 'هذا الجروب غير موجود' : 'Group not found'}</p>
      <Button variant="outline" onClick={() => navigate('/home')}><ArrowLeft className="h-4 w-4 me-2" />{isRTL ? 'العودة' : 'Back'}</Button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 glass border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{group.name}</p>
          {group.description && <p className="text-[11px] text-muted-foreground truncate">{group.description}</p>}
        </div>
        {isMember && !isOwner && (
          <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={leave}><LogOut className="h-4 w-4" /></Button>
        )}
      </header>

      {group.topic_of_day && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
          <Megaphone className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm">{group.topic_of_day}</p>
        </div>
      )}

      {!isMember && !isOwner ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <Users className="h-10 w-10 text-primary" />
          <p className="text-muted-foreground max-w-xs">{isRTL ? 'انضم لهذا الجروب لرؤية الرسائل والمشاركة.' : 'Join this group to see and join the conversation.'}</p>
          <Button onClick={join} className="rounded-xl">{isRTL ? 'انضمام' : 'Join group'}</Button>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[80%] p-2.5 rounded-2xl text-sm ${m.sender_id === user?.id ? 'ms-auto bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {m.content}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {canPost ? (
            <div className="sticky bottom-0 border-t border-border/50 bg-background p-3 flex items-center gap-2">
              <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'} className="h-10 rounded-xl" maxLength={1000} />
              <Button size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={send} disabled={sending || !text.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <div className="border-t border-border/50 p-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />{isRTL ? 'النشر مقتصر على المشهور حالياً' : 'Only the celebrity can post right now'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
