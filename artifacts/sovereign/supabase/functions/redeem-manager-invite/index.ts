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
    const manager = userData.user

    const body = await req.json().catch(() => null)
    const raw = typeof body?.code === 'string' ? body.code.trim() : ''
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    if (!raw && !token) return json({ error: 'Code required' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const MAX_ATTEMPTS = 5

    // Match by token (from link) or by code, must be pending + not expired + not locked.
    let query = admin
      .from('manager_invitations')
      .select('id, celebrity_id, expires_at, status, code, token, failed_attempts')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .lt('failed_attempts', MAX_ATTEMPTS)
      .limit(1)

    query = token ? query.eq('token', token) : query.ilike('code', raw)

    const { data: invite, error: findErr } = await query.maybeSingle()
    if (findErr) { console.error(findErr); return json({ error: 'Lookup failed' }, 500) }
    if (!invite) return json({ error: 'Invalid or expired invitation' }, 404)

    // If both token and code provided, ensure code matches; count failed tries and lock out.
    if (token && raw && invite.code.toUpperCase() !== raw.toUpperCase()) {
      const attempts = (invite.failed_attempts ?? 0) + 1
      await admin
        .from('manager_invitations')
        .update({
          failed_attempts: attempts,
          status: attempts >= MAX_ATTEMPTS ? 'revoked' : 'pending',
        })
        .eq('id', invite.id)
      return json({ error: 'Code does not match' }, 403)
    }

    if (invite.celebrity_id === manager.id) {
      return json({ error: "You can't manage yourself" }, 400)
    }


    // Create / reactivate the manager link.
    const { error: linkErr } = await admin
      .from('manager_links')
      .upsert(
        { celebrity_id: invite.celebrity_id, manager_id: manager.id, status: 'active' },
        { onConflict: 'celebrity_id,manager_id' },
      )
    if (linkErr) { console.error(linkErr); return json({ error: 'Could not link manager' }, 500) }

    // Mark invitation used.
    await admin
      .from('manager_invitations')
      .update({ status: 'used', used_by: manager.id })
      .eq('id', invite.id)

    // Audit log: a new manager joined.
    await admin.from('manager_activity_log').insert({
      celebrity_id: invite.celebrity_id,
      manager_id: manager.id,
      action: 'manager_joined',
      detail: 'Manager accepted invitation',
    })


    // Return celebrity info for confirmation UI.
    const { data: celeb } = await admin
      .from('profiles')
      .select('display_name, username')
      .eq('id', invite.celebrity_id)
      .maybeSingle()

    return json({
      celebrity_id: invite.celebrity_id,
      celebrity: celeb ?? null,
    }, 200)
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
