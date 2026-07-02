
REVOKE ALL ON FUNCTION public.kill_switch_revoke_all(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kill_switch_revoke_all(uuid) TO service_role;
