
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_name TEXT;
  short_code TEXT;
  final_username TEXT;
BEGIN
  -- Generate Discord-style short username: name + 4-digit random
  base_name := LOWER(COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'username'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  ));
  -- Clean: only alphanumeric and underscore, max 10 chars
  base_name := SUBSTRING(REGEXP_REPLACE(base_name, '[^a-z0-9_]', '', 'g') FROM 1 FOR 10);
  IF base_name = '' THEN base_name := 'user'; END IF;
  
  -- Add 4-digit random suffix (Discord style)
  short_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  final_username := base_name || short_code;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    short_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    final_username := base_name || short_code;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'username')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;
