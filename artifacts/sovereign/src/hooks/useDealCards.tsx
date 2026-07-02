import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type DealStatus = 'pending' | 'accepted' | 'declined' | 'countered' | 'archived';

export interface DealCard {
  id: string;
  sender_id: string;
  celebrity_id: string;
  message_id: string | null;
  deal_type: string;
  budget_range: string | null;
  timeline: string | null;
  details: string | null;
  status: DealStatus;
  golden_hour: boolean;
  golden_hour_expires_at: string | null;
  created_at: string;
  sticky_until?: string | null;
  archived_at?: string | null;
  visible_to_celebrity?: boolean;
  sender_profile?: { id: string; display_name: string | null; username: string | null; avatar_url: string | null };
}

function isGoldenActive(d: DealCard) {
  return d.golden_hour && d.golden_hour_expires_at != null && new Date(d.golden_hour_expires_at).getTime() > Date.now();
}

function isSticky(d: DealCard) {
  return d.sticky_until != null && new Date(d.sticky_until).getTime() > Date.now();
}

function shouldShow(d: DealCard): boolean {
  if (d.archived_at) return false;
  if (d.visible_to_celebrity === false) return false;
  if (d.status === 'pending') return true;
  if (isGoldenActive(d)) return true;
  if (isSticky(d)) return true;
  return true;
}

/** Deal cards addressed to a celebrity (visible to celebrity + active manager). */
export function useDealCards(celebrityId?: string | null) {
  const { user } = useAuth();
  const [deals, setDeals] = useState<DealCard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const target = celebrityId ?? user?.id;
    if (!target) { setDeals([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('deal_cards')
      .select('*')
      .eq('celebrity_id', target)
      .order('created_at', { ascending: false });

    const rows: DealCard[] = (data ?? []).filter(shouldShow);
    const ids = [...new Set(rows.map((r: DealCard) => r.sender_id))];
    let profiles: any[] = [];
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id, display_name, username, avatar_url').in('id', ids);
      profiles = p ?? [];
    }
    const withProfiles = rows.map((r: DealCard) => ({ ...r, sender_profile: profiles.find((p: any) => p.id === r.sender_id) }));

    withProfiles.sort((a, b) => {
      const ga = isGoldenActive(a) ? 2 : 0;
      const gb = isGoldenActive(b) ? 2 : 0;
      const sa = isSticky(a) ? 1 : 0;
      const sb = isSticky(b) ? 1 : 0;
      const scoreA = ga + sa;
      const scoreB = gb + sb;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setDeals(withProfiles);
    setLoading(false);
  }, [celebrityId, user]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: DealStatus) => {
    await (supabase as any).from('deal_cards').update({ status }).eq('id', id);
    load();
  };

  const archiveDeal = async (id: string) => {
    await (supabase as any)
      .from('deal_cards')
      .update({ archived_at: new Date().toISOString(), status: 'archived' })
      .eq('id', id);
    load();
  };

  const pinDeal = async (id: string, hours = 24) => {
    const sticky_until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    await (supabase as any).from('deal_cards').update({ sticky_until }).eq('id', id);
    load();
  };

  return { deals, loading, refresh: load, updateStatus, isGoldenActive, isSticky, archiveDeal, pinDeal };
}
