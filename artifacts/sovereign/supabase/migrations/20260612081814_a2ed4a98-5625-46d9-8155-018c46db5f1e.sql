-- Lock down all app-owned functions from anonymous execution.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_new_user','is_celebrity','active_manager_of','my_managed_celebrity',
        'cleanup_expired_messages','validate_invitation','set_golden_hour',
        'update_updated_at_column','can_send_to_direct','get_message_count','has_role',
        'can_receive_message','has_entitlement','expire_prior_golden_hours',
        'start_golden_hour_on_reply','log_manager_deal_action','kill_switch_revoke_all',
        'generate_referral_code','complete_referral','check_rate_limit','delete_user_data',
        'update_updated_at','gen_unique_slug','set_profile_slug','is_group_member',
        'group_owner','enforce_group_rate_limit','gen_unique_group_slug','create_fan_group'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon;', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role;', fn.sig);
  END LOOP;
END $$;

-- kill_switch_revoke_all must only run via service_role (edge function), not direct clients.
REVOKE EXECUTE ON FUNCTION public.kill_switch_revoke_all(uuid) FROM authenticated;