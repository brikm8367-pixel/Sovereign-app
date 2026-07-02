import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoryProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  hasUnread: boolean;
  category: 'work' | 'audience' | 'direct';
}

interface StoriesRowProps {
  userId: string;
  messages: { sender_id: string; receiver_id: string; is_read: boolean; category: string; sender_profile?: any; created_at: string }[];
  myAvatar?: string | null;
  myName?: string | null;
  onStoryClick: (profile: StoryProfile) => void;
}

/**
 * Snapchat / Instagram style stories row.
 * Displays the most recent contacts as gradient rings; unread = animated ring.
 * Pure presentation: clicking a story opens the conversation with that person.
 */
export default function StoriesRow({ userId, messages, myAvatar, myName, onStoryClick }: StoriesRowProps) {
  const { isRTL, language } = useLanguage();
  const [stories, setStories] = useState<StoryProfile[]>([]);

  useEffect(() => {
    // Aggregate unique senders from inbox (last 24h is psychologically "fresh")
    const map = new Map<string, StoryProfile>();
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    messages.forEach(m => {
      const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
      if (otherId === userId) return;
      const age = now - new Date(m.created_at).getTime();
      if (age > DAY * 7) return; // last 7 days only

      const existing = map.get(otherId);
      const isFresh = age < DAY;
      const hasUnread = m.receiver_id === userId && !m.is_read;

      if (!existing || (hasUnread && !existing.hasUnread)) {
        map.set(otherId, {
          id: otherId,
          display_name: m.sender_profile?.display_name || null,
          username: m.sender_profile?.username || null,
          avatar_url: m.sender_profile?.avatar_url || null,
          hasUnread: hasUnread || existing?.hasUnread || false,
          category: (m.category as any) || 'audience',
        });
      } else if (existing && hasUnread) {
        existing.hasUnread = true;
      }
    });

    // Order: unread first, then by recency
    const ordered = Array.from(map.values()).sort((a, b) => Number(b.hasUnread) - Number(a.hasUnread));
    setStories(ordered.slice(0, 12));
  }, [messages, userId]);

  if (stories.length === 0) return null;

  const ringFor = (cat: string, unread: boolean) => {
    if (!unread) return 'ring-2 ring-muted/40';
    // Gradient ring depending on category — Snap/IG style
    if (cat === 'direct') return 'ring-[2.5px] ring-amber-400 ring-offset-2 ring-offset-background animate-pulse-subtle';
    if (cat === 'work') return 'ring-[2.5px] ring-blue-400 ring-offset-2 ring-offset-background';
    return 'ring-[2.5px] ring-violet-400 ring-offset-2 ring-offset-background';
  };

  return (
    <div className="-mx-4 px-4">
      <div className={cn(
        'flex items-start gap-3 overflow-x-auto scrollbar-hide pb-2',
        isRTL && 'flex-row-reverse'
      )}>
        {/* Your story (self) */}
        <button
          className="flex flex-col items-center gap-1.5 shrink-0 w-16"
          onClick={() => {/* future: post status */}}
        >
          <div className="relative">
            <Avatar className="h-14 w-14 ring-2 ring-muted/40">
              <AvatarImage src={myAvatar || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {myName?.[0] || <User className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -end-0.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background">
              <Plus className="h-3 w-3" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center">
            {language === 'ar' ? 'أنت' : 'You'}
          </span>
        </button>

        {stories.map((s) => {
          const initial = s.display_name?.[0] || s.username?.[0] || '?';
          return (
            <button
              key={s.id}
              onClick={() => onStoryClick(s)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-16 group"
            >
              <Avatar className={cn(
                'h-14 w-14 transition-transform group-active:scale-95',
                ringFor(s.category, s.hasUnread)
              )}>
                <AvatarImage src={s.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-muted-foreground text-base font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium text-foreground truncate w-full text-center">
                {s.display_name || s.username || '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
