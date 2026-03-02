-- Add updated_at column to match_convocations table
-- This is required for sorting players by their last response status change.

ALTER TABLE public.match_convocations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Create trigger to automatically update the timestamp on every change
DROP TRIGGER IF EXISTS set_updated_at_convocations ON public.match_convocations;
CREATE TRIGGER set_updated_at_convocations
BEFORE UPDATE ON public.match_convocations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Backfill existing records (if any) to have a valid timestamp
UPDATE public.match_convocations SET updated_at = created_at WHERE updated_at IS NULL;
