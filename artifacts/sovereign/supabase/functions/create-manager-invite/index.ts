import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { customAlphabet } from 'npm:nanoid@5'

// Code: 8 unambiguous uppercase chars. Token: 16 url-safe chars for the link.
const codeGen = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)
const tokenGen = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 16)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

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
    if (!password || password.length < 1) return json({ error: 'Password required' }, 400)
    if (!user.email) return json({ error: 'Account has no email' }, 400)

    // Verify the celebrity's password by re-authenticating on a throwaway client.
    const verifyClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )
    const { error: signInErr } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password,
    })
    if (signInErr) return json({ error: 'Invalid password' }, 403)

    // Service-role client to write the invitation securely.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Invalidate any previous pending invites from this celebrity.
    await admin
      .from('manager_invitations')
      .update({ status: 'revoked' })
      .eq('celebrity_id', user.id)
      .eq('status', 'pending')

    let code = codeGen()
    const token = tokenGen()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { data: inserted, error: insErr } = await admin
      .from('manager_invitations')
      .insert({ celebrity_id: user.id, code, token, expires_at: expiresAt, status: 'pending' })
      .select('code, token, expires_at')
      .single()

    if (insErr) {
      console.error('insert error', insErr)
      return json({ error: 'Could not create invitation' }, 500)
    }

    return json({
      code: inserted.code,
      token: inserted.token,
      expires_at: inserted.expires_at,
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
