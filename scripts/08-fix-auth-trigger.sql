-- Create trigger function to automatically create user record when auth.users gets a new user
-- This works with your existing create_user_profile() function
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Create users record (with a placeholder password_hash since we don't have the actual password)
  INSERT INTO public.users (id, email, username, password_hash, created_at, updated_at, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    'placeholder_hash_' || NEW.id, -- Placeholder since we don't have actual password hash
    NEW.created_at,
    NEW.updated_at,
    NEW.email_confirmed_at IS NOT NULL -- Set verified based on email confirmation
  );
  
  -- Note: Your existing create_user_profile() function will handle user_profiles creation
  -- when the users record is inserted
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing auth trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created(); 