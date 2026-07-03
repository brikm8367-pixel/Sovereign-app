import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)
    const user = userData.user

    const body = await req.json().catch(() => null)
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!password) return json({ error: 'Password required' }, 400)
    if (!user.email) return json({ error: 'Account has no email' }, 400)

    // Verify the celebrity's password.
    const verifyClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )
    const { error: signInErr } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password,
    })
    if (signInErr) return json({ error: 'Invalid password' }, 403)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Capture currently-active managers so we can log each revocation.
    const { data: activeLinks } = await admin
      .from('manager_links')
      .select('manager_id')
      .eq('celebrity_id', user.id)
      .eq('status', 'active')

    const { data: revokedCount, error: rpcErr } = await admin
      .rpc('kill_switch_revoke_all', { _celebrity: user.id })

    if (rpcErr) {
      console.error('kill switch error', rpcErr)
      return json({ error: 'Could not revoke managers' }, 500)
    }

    // Also invalidate any pending invitations.
    await admin
      .from('manager_invitations')
      .update({ status: 'revoked' })
      .eq('celebrity_id', user.id)
      .eq('status', 'pending')

    // Log one activity entry per revoked manager.
    if (activeLinks?.length) {
      await admin.from('manager_activity_log').insert(
        activeLinks.map((l: { manager_id: string }) => ({
          celebrity_id: user.id,
          manager_id: l.manager_id,
          action: 'kill_switch',
          detail: 'تم سحب كل الصلاحيات فوراً',
        })),
      )

      // Clear active_celebrity_id for every revoked manager so their
      // dashboard no longer points to this celebrity.
      const revokedIds = activeLinks.map((l: { manager_id: string }) => l.manager_id)
      await admin
        .from('profiles')
        .update({ active_celebrity_id: null })
        .in('id', revokedIds)
        .eq('active_celebrity_id', user.id)
    }

    return json({ revoked: revokedCount ?? 0 }, 200)
  } catch (e) {
    console.error(e)
    return json({ error: 'Internal error' }, 500)
  }
})

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}
