import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FanGroup {
  id: string;
  celebrity_id: string;
  name: string;
  description: string | null;
  slug: string;
  topic_of_day: string | null;
  messages_per_hour: number;
  allow_member_posts: boolean;
  is_active: boolean;
  created_at: string;
}

/** Groups owned by the current celebrity. */
export function useMyFanGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<FanGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('fan_groups')
      .select('*')
      .eq('celebrity_id', user.id)
      .order('created_at', { ascending: false });
    setGroups((data as FanGroup[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const create = async (name: string, description: string, perHour: number, allowPosts: boolean) => {
    const { error } = await supabase.rpc('create_fan_group', {
      _name: name,
      _description: description || undefined,
      _messages_per_hour: perHour,
      _allow_member_posts: allowPosts,
    });
    if (!error) await load();
    return error;
  };

  const update = async (id: string, patch: Partial<Pick<FanGroup, 'topic_of_day' | 'messages_per_hour' | 'allow_member_posts' | 'is_active' | 'name' | 'description'>>) => {
    const { error } = await supabase.from('fan_groups').update(patch as any).eq('id', id);
    if (!error) await load();
    return error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('fan_groups').delete().eq('id', id);
    if (!error) await load();
    return error;
  };

  return { groups, loading, create, update, remove, refresh: load };
}
