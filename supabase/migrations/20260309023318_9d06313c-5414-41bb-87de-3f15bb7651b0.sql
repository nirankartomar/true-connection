
-- Add status column to connections table
ALTER TABLE public.connections ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Update existing connections to 'accepted' so they keep working
UPDATE public.connections SET status = 'accepted';

-- Drop existing RLS policies and recreate with status awareness
DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;

-- Receivers can see pending requests sent TO them, and both sides can see their connections
CREATE POLICY "Users can view own connections"
ON public.connections
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR auth.uid() = connected_user_id
);

-- Sender can update own connections (remove), receiver can update to accept/reject
CREATE POLICY "Users can update own connections"
ON public.connections
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR auth.uid() = connected_user_id
);
