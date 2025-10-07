-- Remove foreign key constraint from profiles table for custom authentication
-- The ID column needs to remain as primary key but without foreign key reference

-- Drop the foreign key constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop the trigger that was creating profiles from auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;