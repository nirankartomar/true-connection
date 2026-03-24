
-- Create timed photos table
CREATE TABLE public.profile_timed_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  storage_path text NOT NULL,
  duration_type text NOT NULL, -- '1_hour', '1_day', '1_week'
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_timed_photos ENABLE ROW LEVEL SECURITY;

-- Owner can CRUD their own photos
CREATE POLICY "Users can insert own timed photos"
  ON public.profile_timed_photos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view timed photos"
  ON public.profile_timed_photos FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can delete own timed photos"
  ON public.profile_timed_photos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for timed photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('timed-photos', 'timed-photos', true);

-- Storage policies
CREATE POLICY "Users can upload timed photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'timed-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view timed photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'timed-photos');

CREATE POLICY "Users can delete own timed photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'timed-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Enable pg_cron and pg_net for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
