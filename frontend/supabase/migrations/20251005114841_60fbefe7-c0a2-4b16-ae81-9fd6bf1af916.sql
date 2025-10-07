-- Remove foreign key constraint from profiles table
-- This allows custom authentication without Supabase Auth

-- Drop the foreign key constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop the trigger that auto-creates profiles from auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;