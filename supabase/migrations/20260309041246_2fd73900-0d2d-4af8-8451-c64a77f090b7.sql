-- 1) Ensure token strings are unique so the same link can never map to multiple rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'connection_tokens_token_unique'
  ) THEN
    ALTER TABLE public.connection_tokens
      ADD CONSTRAINT connection_tokens_token_unique UNIQUE (token);
  END IF;
END $$;

-- 2) Prevent re-activating or mutating tokens after they are no longer active
CREATE OR REPLACE FUNCTION public.prevent_connection_token_mutation_after_close()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Once a token is no longer active, it becomes immutable
  IF OLD.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Token can no longer be modified once it is %', OLD.status;
  END IF;

  -- Additionally block re-activation attempts explicitly
  IF OLD.status IN ('used','expired') AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'Cannot re-activate a % token', OLD.status;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_prevent_connection_token_mutation_after_close'
  ) THEN
    CREATE TRIGGER trg_prevent_connection_token_mutation_after_close
    BEFORE UPDATE ON public.connection_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_connection_token_mutation_after_close();
  END IF;
END $$;

-- 3) Tighten RLS update policy: owners can only update ACTIVE tokens (prevents client-side reactivation)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'connection_tokens'
      AND policyname = 'Users can update own tokens'
  ) THEN
    EXECUTE 'DROP POLICY "Users can update own tokens" ON public.connection_tokens';
  END IF;
END $$;

CREATE POLICY "Users can update own active tokens"
ON public.connection_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id AND status = 'active')
WITH CHECK (auth.uid() = owner_user_id AND status = 'active');
