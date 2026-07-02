CREATE OR REPLACE FUNCTION public.delete_user_data(_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Messaging & moderation
  DELETE FROM public.message_reactions WHERE user_id = _user_id;
  DELETE FROM public.messages WHERE sender_id = _user_id OR receiver_id = _user_id;
  DELETE FROM public.deleted_messages WHERE user_id = _user_id;
  DELETE FROM public.blocked_content_log WHERE sender_id = _user_id OR receiver_id = _user_id;
  DELETE FROM public.blocked_users WHERE blocker_id = _user_id OR blocked_id = _user_id;
  DELETE FROM public.reports WHERE reporter_id = _user_id;
  DELETE FROM public.call_history WHERE receiver_id = _user_id;

  -- Access & contacts
  DELETE FROM public.direct_access WHERE owner_id = _user_id OR allowed_user_id = _user_id;
  DELETE FROM public.contacts WHERE user_id = _user_id OR contact_id = _user_id;
  DELETE FROM public.recipient_filters WHERE user_id = _user_id;
  DELETE FROM public.message_limits WHERE user_id = _user_id;

  -- Manager system
  DELETE FROM public.deal_cards WHERE sender_id = _user_id OR celebrity_id = _user_id;
  DELETE FROM public.manager_activity_log WHERE celebrity_id = _user_id OR manager_id = _user_id;
  DELETE FROM public.manager_links WHERE celebrity_id = _user_id OR manager_id = _user_id;
  DELETE FROM public.manager_invitations WHERE celebrity_id = _user_id OR used_by = _user_id;

  -- Fan groups (owned groups + their content, and memberships/messages elsewhere)
  DELETE FROM public.fan_group_messages WHERE sender_id = _user_id;
  DELETE FROM public.fan_group_members WHERE user_id = _user_id;
  DELETE FROM public.fan_group_messages WHERE group_id IN (SELECT id FROM public.fan_groups WHERE celebrity_id = _user_id);
  DELETE FROM public.fan_group_members WHERE group_id IN (SELECT id FROM public.fan_groups WHERE celebrity_id = _user_id);
  DELETE FROM public.fan_groups WHERE celebrity_id = _user_id;

  -- Entitlements, devices, notifications, referrals, roles
  DELETE FROM public.feature_entitlements WHERE user_id = _user_id;
  DELETE FROM public.device_keys WHERE user_id = _user_id;
  DELETE FROM public.push_subscriptions WHERE user_id = _user_id;
  DELETE FROM public.referrals WHERE inviter_id = _user_id OR invitee_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;

  -- Finally the profile
  DELETE FROM public.profiles WHERE id = _user_id;
END;
$function$;