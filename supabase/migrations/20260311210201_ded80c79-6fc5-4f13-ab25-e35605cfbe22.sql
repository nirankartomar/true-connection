
CREATE TABLE public.profile_bio_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text NOT NULL,
  new_value text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_bio_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own bio history"
ON public.profile_bio_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bio history"
ON public.profile_bio_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
