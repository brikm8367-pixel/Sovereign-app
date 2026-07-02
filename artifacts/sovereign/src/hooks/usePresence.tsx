import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePresence(userId: string | undefined) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [whoAddedMe, setWhoAddedMe] = useState<Set<string>>(new Set());
  const [whoIAdded, setWhoIAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    const fetchAccess = async () => {
      const [{ data: addedMe }, { data: iAdded }] = await Promise.all([
        supabase.from('direct_access').select('owner_id').eq('allowed_user_id', userId),
        supabase.from('direct_access').select('allowed_user_id').eq('owner_id', userId),
      ]);
      if (addedMe) setWhoAddedMe(new Set(addedMe.map(d => d.owner_id)));
      if (iAdded) setWhoIAdded(new Set(iAdded.map(d => d.allowed_user_id)));
    };
    fetchAccess();

    const channel = supabase.channel('online-presence', {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineUsers(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Can I see this person's status? Only if THEY added me to their direct_access
  const canSeePresence = useCallback((targetId: string) => whoAddedMe.has(targetId), [whoAddedMe]);
  const isOnline = useCallback((targetId: string) => canSeePresence(targetId) && onlineUsers.has(targetId), [canSeePresence, onlineUsers]);
  // Mutual access = both added each other (required for calling)
  const canCall = useCallback((targetId: string) => whoAddedMe.has(targetId) && whoIAdded.has(targetId), [whoAddedMe, whoIAdded]);

  const refreshAccess = useCallback(async () => {
    if (!userId) return;
    const [{ data: addedMe }, { data: iAdded }] = await Promise.all([
      supabase.from('direct_access').select('owner_id').eq('allowed_user_id', userId),
      supabase.from('direct_access').select('allowed_user_id').eq('owner_id', userId),
    ]);
    if (addedMe) setWhoAddedMe(new Set(addedMe.map(d => d.owner_id)));
    if (iAdded) setWhoIAdded(new Set(iAdded.map(d => d.allowed_user_id)));
  }, [userId]);

  return { isOnline, canSeePresence, canCall, onlineUsers, refreshAccess };
}
