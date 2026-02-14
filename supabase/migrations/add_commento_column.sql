-- ==========================================
-- MIGRATION: Add commento column to matches
-- ==========================================
-- This migration adds the 'commento' column to store AI-generated match commentary
-- 
-- HOW TO APPLY:
-- 1. Open your Supabase Dashboard
-- 2. Navigate to the SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
--
-- This is safe to run multiple times (uses IF NOT EXISTS)
-- ==========================================

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS commento TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND column_name = 'commento';
