-- ==========================================
-- MIGRATION: Add tiro and difesa columns to players
-- ==========================================
-- This migration adds technical rating columns to the players table
-- to support the new 1-10 rating system and dynamic weighting.
--
-- HOW TO APPLY:
-- 1. Open your Supabase Dashboard (https://supabase.com)
-- 2. Navigate to the "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this entire script
-- 5. Click "Run" (bottom right)
-- ==========================================

-- Add columns with default value 6 (sufficiency)
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS tiro INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS difesa INTEGER DEFAULT 6;

-- Comment for documentation
COMMENT ON COLUMN public.players.tiro IS 'Valutazione tecnica tiro e finalizzazione (1-10)';
COMMENT ON COLUMN public.players.difesa IS 'Valutazione tecnica difesa e interdizione (1-10)';

-- Verify columns were added correctly
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'players' 
AND column_name IN ('tiro', 'difesa');
