import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AccountType = 'celebrity' | 'sender';
export type SovereignRole = 'celebrity' | 'manager' | 'sender';

interface RoleState {
  accountType: AccountType;
  role: SovereignRole;
  managedCelebrityId: string | null;
  loading: boolean;
}

/**
 * Sovereign role layer.
 * - celebrity: account_type = 'celebrity'
 * - manager:   has an active row in manager_links as manager_id
 * - sender:    everyone else (fans + companies)
 */
export function useRole(): RoleState & { refresh: () => Promise<void> } {
  const { user } = useAuth();
  const [state, setState] = useState<RoleState>({
    accountType: 'sender',
    role: 'sender',
    managedCelebrityId: null,
    loading: true,
  });

  const load = useCallback(async () => {
    if (!user) {
      setState({ accountType: 'sender', role: 'sender', managedCelebrityId: null, loading: false });
      return;
    }

    const [{ data: profile }, { data: link }] = await Promise.all([
      supabase.from('profiles').select('account_type').eq('id', user.id).maybeSingle(),
      supabase
        .from('manager_links')
        .select('celebrity_id')
        .eq('manager_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    const accountType = ((profile as any)?.account_type ?? 'sender') as AccountType;
    const managedCelebrityId = (link as any)?.celebrity_id ?? null;

    let role: SovereignRole = 'sender';
    if (accountType === 'celebrity') role = 'celebrity';
    else if (managedCelebrityId) role = 'manager';

    setState({ accountType, role, managedCelebrityId, loading: false });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
