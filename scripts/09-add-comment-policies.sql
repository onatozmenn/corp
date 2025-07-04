-- Add RLS policies for comments and post deletion
-- This script checks if policies exist before creating them

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
DROP POLICY IF EXISTS "Users can create comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- Create comments policies
CREATE POLICY "Users can view all comments" ON comments 
FOR SELECT TO authenticated, anon 
USING (true);

CREATE POLICY "Users can create comments" ON comments 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON comments 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON comments 
FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- Create posts deletion policy
CREATE POLICY "Users can delete own posts" ON posts 
FOR DELETE TO authenticated 
USING (auth.uid() = user_id);

-- Make sure RLS is enabled
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY; 