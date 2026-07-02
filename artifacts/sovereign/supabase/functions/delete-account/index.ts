import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Permanently deletes the authenticated user's account:
// 1) wipes all their app data (public schema) via the security-definer RPC
// 2) deletes the auth.users row itself so the account is truly gone and the
//    email can be reused for a fresh signup.
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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1) Wipe all app data. The RPC enforces auth.uid() = _user_id, so run it as the user.
    const { error: wipeErr } = await userClient.rpc('delete_user_data', { _user_id: user.id })
    if (wipeErr) {
      console.error('data wipe error', wipeErr)
      return json({ error: 'Could not delete account data' }, 500)
    }

    // 2) Permanently delete the auth user (frees the email for re-registration).
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
    if (delErr) {
      console.error('auth delete error', delErr)
      return json({ error: 'Could not remove account' }, 500)
    }

    return json({ deleted: true }, 200)
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
