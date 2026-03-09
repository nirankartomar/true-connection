
CREATE TABLE public.connection_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  owner_user_id uuid NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('friend', 'family', 'lover', 'view_only')),
  intent_message text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  used_at timestamptz,
  used_by_user_id uuid
);

ALTER TABLE public.connection_tokens ENABLE ROW LEVEL SECURITY;

-- Owner can view their own tokens
CREATE POLICY "Users can view own tokens"
  ON public.connection_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_user_id);

-- Owner can insert tokens
CREATE POLICY "Users can insert own tokens"
  ON public.connection_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

-- Owner can update own tokens (for expiring/cancelling)
CREATE POLICY "Users can update own tokens"
  ON public.connection_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_user_id);

-- Anyone authenticated can read active tokens by token value (for redemption)
CREATE POLICY "Anyone can read active token by value"
  ON public.connection_tokens FOR SELECT
  TO authenticated
  USING (status = 'active');
