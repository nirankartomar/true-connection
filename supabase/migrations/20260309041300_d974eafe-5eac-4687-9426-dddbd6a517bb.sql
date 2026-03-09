CREATE OR REPLACE FUNCTION public.prevent_connection_token_mutation_after_close()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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
