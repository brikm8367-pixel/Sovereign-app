import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AccountType = 'celebrity' | 'sender';
export type SovereignRole = 'celebrity' | 'manager' | 'sender';

export interface ManagedCelebrity {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface RoleState {
  accountType: AccountType;
  role: SovereignRole;
  /** The currently active celebrity this manager is viewing. Null for non-managers. */
  managedCelebrityId: string | null;
  /** All celebrities this user actively manages (empty for non-managers). */
  managedCelebrities: ManagedCelebrity[];
  loading: boolean;
}

export function useRole(): RoleState & {
  refresh: () => Promise<void>;
  switchCelebrity: (id: string) => Promise<void>;
} {
  const { user } = useAuth();
  const [state, setState] = useState<RoleState>({
    accountType: 'sender',
    role: 'sender',
    managedCelebrityId: null,
    managedCelebrities: [],
    loading: true,
  });

  const load = useCallback(async () => {
    if (!user) {
      setState({ accountType: 'sender', role: 'sender', managedCelebrityId: null, managedCelebrities: [], loading: false });
      return;
    }

    const [{ data: profile }, { data: links }] = await Promise.all([
      supabase.from('profiles').select('account_type, active_celebrity_id').eq('id', user.id).maybeSingle(),
      supabase
        .from('manager_links')
        .select('celebrity_id')
        .eq('manager_id', user.id)
        .eq('status', 'active'),
    ]);

    const accountType = ((profile as any)?.account_type ?? 'sender') as AccountType;
    const savedActiveCelebId: string | null = (profile as any)?.active_celebrity_id ?? null;
    const linkedIds: string[] = (links ?? []).map((l: any) => l.celebrity_id);

    let celebrities: ManagedCelebrity[] = [];
    if (linkedIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', linkedIds);
      celebrities = (profs ?? []) as ManagedCelebrity[];
    }

    // Active = saved preference (if still valid) or first available celebrity
    let activeCelebrity: string | null = null;
    if (celebrities.length > 0) {
      const savedIsStillValid = celebrities.some(c => c.id === savedActiveCelebId);
      activeCelebrity = savedIsStillValid ? savedActiveCelebId : celebrities[0].id;
    }

    let role: SovereignRole = 'sender';
    if (accountType === 'celebrity') role = 'celebrity';
    else if (celebrities.length > 0) role = 'manager';

    setState({ accountType, role, managedCelebrityId: activeCelebrity, managedCelebrities: celebrities, loading: false });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /** One-tap switch — persists in DB and reflects instantly in UI. */
  const switchCelebrity = useCallback(async (id: string) => {
    if (!user) return;
    setState(prev => ({ ...prev, managedCelebrityId: id }));
    await supabase.from('profiles').update({ active_celebrity_id: id } as any).eq('id', user.id);
  }, [user]);

  return { ...state, refresh: load, switchCelebrity };
}
