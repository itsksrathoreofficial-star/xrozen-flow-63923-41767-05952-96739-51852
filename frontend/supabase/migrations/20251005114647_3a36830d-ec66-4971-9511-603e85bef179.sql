-- Create function to create user profile with custom ID
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_id uuid,
  p_email text,
  p_full_name text,
  p_user_category user_category,
  p_password_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_category,
    password_hash,
    subscription_active,
    subscription_tier,
    trial_end_date,
    created_at,
    updated_at
  ) VALUES (
    p_id,
    p_email,
    p_full_name,
    p_user_category,
    p_password_hash,
    true,
    'basic'::subscription_tier,
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  );
  
  RETURN p_id;
END;
$$;