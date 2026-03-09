
-- Table for WebRTC signaling (offer, answer, ICE candidates)
CREATE TABLE public.call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  signal_type text NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'call-start', 'call-end', 'call-reject'
  signal_data jsonb,
  call_type text NOT NULL DEFAULT 'voice', -- 'voice' or 'video'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call signals"
  ON public.call_signals FOR SELECT
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert call signals"
  ON public.call_signals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can delete their own call signals"
  ON public.call_signals FOR DELETE
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Enable realtime for call signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

-- Auto-cleanup old signals (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_old_call_signals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.call_signals WHERE created_at < now() - interval '5 minutes';
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_call_signals_trigger
  AFTER INSERT ON public.call_signals
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_old_call_signals();
