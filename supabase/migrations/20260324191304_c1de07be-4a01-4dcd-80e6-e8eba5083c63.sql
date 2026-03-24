
ALTER TABLE public.profile_timed_photos
  ADD COLUMN title text,
  ADD COLUMN caption text,
  ADD COLUMN location text,
  ADD COLUMN mood text[] DEFAULT '{}',
  ADD COLUMN tags text[] DEFAULT '{}',
  ADD COLUMN category text DEFAULT 'Other',
  ADD COLUMN privacy text DEFAULT 'public';
