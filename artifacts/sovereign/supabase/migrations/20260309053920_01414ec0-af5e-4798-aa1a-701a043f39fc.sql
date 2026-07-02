
CREATE OR REPLACE FUNCTION public.check_rate_limit(_user_id uuid, _action text, _max_per_minute integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_cnt integer;
  win_start timestamptz;
BEGIN
  SELECT rl.count, rl.window_start INTO current_cnt, win_start
  FROM public.rate_limits rl
  WHERE rl.user_id = _user_id AND rl.action = _action;
  
  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (user_id, action, count, window_start)
    VALUES (_user_id, _action, 1, now());
    RETURN true;
  END IF;
  
  IF win_start < now() - interval '1 minute' THEN
    UPDATE public.rate_limits SET count = 1, window_start = now()
    WHERE user_id = _user_id AND action = _action;
    RETURN true;
  END IF;
  
  IF current_cnt >= _max_per_minute THEN
    RETURN false;
  END IF;
  
  UPDATE public.rate_limits SET count = count + 1
  WHERE user_id = _user_id AND action = _action;
  RETURN true;
END;
$$;
