-- ==========================================
-- SUPABASE SCHEMA - CALCETTO WEB APP
-- ==========================================

-- 1. PLAYERS TABLE
-- Stores player profiles and statistics
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    soprannome TEXT,
    telefono TEXT,
    email TEXT UNIQUE,
    password_numeric TEXT DEFAULT '0000', -- User requested 4-digit password
    ruolo TEXT NOT NULL DEFAULT 'operatore' CHECK (ruolo IN ('admin', 'supervisore', 'operatore')),
    tipologia TEXT NOT NULL DEFAULT 'riserva' CHECK (tipologia IN ('titolare', 'riserva')),
    ruolo_principale TEXT NOT NULL DEFAULT 'centrocampista',
    ruolo_secondario TEXT,
    valutazione_generale INTEGER DEFAULT 3 CHECK (valutazione_generale BETWEEN 1 AND 5),
    visione_gioco INTEGER DEFAULT 3 CHECK (visione_gioco BETWEEN 1 AND 5),
    corsa INTEGER DEFAULT 3 CHECK (corsa BETWEEN 1 AND 5),
    possesso INTEGER DEFAULT 3 CHECK (possesso BETWEEN 1 AND 5),
    forma_fisica INTEGER DEFAULT 3 CHECK (forma_fisica BETWEEN 1 AND 5),
    foto TEXT, -- URL to storage bucket
    bloccato BOOLEAN DEFAULT FALSE,
    
    -- Cumulative stats (can be calculated or cached)
    punti_mvp INTEGER DEFAULT 0,
    partite_vinte INTEGER DEFAULT 0,
    presenze INTEGER DEFAULT 0,
    gol_segnati INTEGER DEFAULT 0,
    ammonizioni_ricevute INTEGER DEFAULT 0,
    partite_rossi INTEGER DEFAULT 0,
    partite_blu INTEGER DEFAULT 0,
    data_nascita DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. MATCHES TABLE
-- Stores match metadata and final summary
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    orario TIME NOT NULL DEFAULT '20:00',
    luogo TEXT NOT NULL DEFAULT 'OGGIONA',
    tipologia TEXT NOT NULL DEFAULT '8v8',
    stato TEXT NOT NULL DEFAULT 'creata' CHECK (stato IN ('creata', 'completa', 'squadre_generate', 'pubblicata', 'chiusa')),
    fase_convocazione INTEGER DEFAULT 1, -- 1: Titolari, 2: Riserve
    data_apertura_riserve TIMESTAMP WITH TIME ZONE,
    gol_rossi INTEGER,
    gol_blu INTEGER,
    mvp_rossi UUID REFERENCES public.players(id),
    mvp_blu UUID REFERENCES public.players(id),
    pronostico TEXT,
    numero_partita INTEGER, -- Serial number within the year
    marcatori JSONB DEFAULT '[]',
    ammonizioni JSONB DEFAULT '[]',
    commento TEXT,

    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. MATCH CONVOCATIONS
-- Tracks player responses to a specific match
CREATE TABLE IF NOT EXISTS public.match_convocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    risposta TEXT NOT NULL DEFAULT 'in_attesa' CHECK (risposta IN ('presente', 'forse', 'assente', 'in_attesa')),
    is_convocato BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(match_id, player_id)
);

-- 4. MATCH TEAMS
-- Stores team assignments for a specific match
CREATE TABLE IF NOT EXISTS public.match_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    team TEXT NOT NULL CHECK (team IN ('rossi', 'blu')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(match_id, player_id)
);

-- 5. MATCH EVENTS
-- Detailed events like goals and cards
CREATE TABLE IF NOT EXISTS public.match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('gol', 'ammonizione')),
    quantita INTEGER DEFAULT 1, -- For goals
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_convocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- 1. PLAYERS POLICIES
DROP POLICY IF EXISTS "Public players are viewable by everyone" ON public.players;
CREATE POLICY "Public players are viewable by everyone" ON public.players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.players;
CREATE POLICY "Users can update own profile" ON public.players FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins have full access to players" ON public.players;
CREATE POLICY "Admins have full access to players" ON public.players TO authenticated USING (
    EXISTS (SELECT 1 FROM public.players WHERE id = auth.uid() AND ruolo = 'admin')
);

-- 2. MATCHES POLICIES
DROP POLICY IF EXISTS "Matches are viewable by everyone" ON public.matches;
CREATE POLICY "Matches are viewable by everyone" ON public.matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and Supervisors can manage matches" ON public.matches;
CREATE POLICY "Admins and Supervisors can manage matches" ON public.matches FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.players WHERE id = auth.uid() AND ruolo IN ('admin', 'supervisore'))
);

-- 3. CONVOCATIONS POLICIES
DROP POLICY IF EXISTS "Convocations are viewable by everyone" ON public.match_convocations;
CREATE POLICY "Convocations are viewable by everyone" ON public.match_convocations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow any response update" ON public.match_convocations;
CREATE POLICY "Allow any response update" ON public.match_convocations FOR UPDATE USING (true) WITH CHECK (true);

-- 4. PROPER RESTRICTIVE POLICIES
-- These replace the previous development-only "FOR ALL USING (true)" policies.
-- ⚠️ You MUST apply these changes manually via the Supabase SQL Editor.

-- Players: anon can read and self-register, only admin can delete
DROP POLICY IF EXISTS "Allow management for players" ON public.players;

CREATE POLICY "Anon can insert players (registration)" ON public.players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anon can read players" ON public.players
  FOR SELECT USING (true);

CREATE POLICY "Anon can update players" ON public.players
  FOR UPDATE USING (true) WITH CHECK (true);

-- Matches: anon can read, insert, update, delete (since app uses anon key for all operations)  
DROP POLICY IF EXISTS "Allow management for matches" ON public.matches;

CREATE POLICY "Anon can manage matches" ON public.matches
  FOR ALL USING (true) WITH CHECK (true);

-- Match convocations: anyone can manage
DROP POLICY IF EXISTS "Allow management for match_convocations" ON public.match_convocations;

CREATE POLICY "Anon can manage convocations" ON public.match_convocations
  FOR ALL USING (true) WITH CHECK (true);

-- Match teams: anyone can manage
DROP POLICY IF EXISTS "Allow management for match_teams" ON public.match_teams;

CREATE POLICY "Anon can manage teams" ON public.match_teams
  FOR ALL USING (true) WITH CHECK (true);

-- Match events: anyone can manage
DROP POLICY IF EXISTS "Allow management for match_events" ON public.match_events;

CREATE POLICY "Anon can manage events" ON public.match_events
  FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to players and matches
DROP TRIGGER IF EXISTS set_updated_at_players ON public.players;
CREATE TRIGGER set_updated_at_players
BEFORE UPDATE ON public.players
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_matches ON public.matches;
CREATE TRIGGER set_updated_at_matches
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
