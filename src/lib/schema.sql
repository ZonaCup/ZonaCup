/*
  ============================================
  ZONA CUP - Database Schema
  ============================================
  
  Ejecutar este SQL en el SQL Editor de Supabase:
  https://supabase.com/dashboard → Tu proyecto → SQL Editor → New Query
  
  Pegá todo este contenido y dale a "Run"
*/

-- ========== PROFILES (extends Supabase auth.users) ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_id TEXT UNIQUE,
  discord_username TEXT,
  discord_avatar TEXT,
  riot_id TEXT,
  riot_tag TEXT,
  display_name TEXT,
  country TEXT CHECK (country IN ('AR', 'CL', 'PE', 'OTHER')),
  rank TEXT,
  integrity_score INTEGER DEFAULT 100,
  points INTEGER DEFAULT 0,
  is_pro BOOLEAN DEFAULT FALSE,
  pro_expires_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT FALSE,
  is_referee BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles viewable" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, discord_id, discord_username, discord_avatar, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'provider_id',
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', 'Player')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ========== TEAMS ==========
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tag TEXT,
  logo_url TEXT,
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  captain_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams viewable" ON public.teams
  FOR SELECT USING (true);

CREATE POLICY "Users create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = captain_id);


-- ========== TEAM MEMBERS ==========
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('captain', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members viewable" ON public.team_members
  FOR SELECT USING (true);

CREATE POLICY "Users join teams" ON public.team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ========== TOURNAMENTS ==========
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('2v2', '5v5')),
  description TEXT,
  rules_url TEXT,
  date TIMESTAMPTZ NOT NULL,
  checkin_start TIMESTAMPTZ,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'checkin', 'live', 'finished', 'cancelled')),
  entry_fee_usd NUMERIC(10,2) NOT NULL,
  entry_fee_ars NUMERIC(10,2),
  entry_fee_clp NUMERIC(10,2),
  entry_fee_pen NUMERIC(10,2),
  prize_pool NUMERIC(10,2) DEFAULT 0,
  max_slots INTEGER NOT NULL DEFAULT 32,
  current_slots INTEGER DEFAULT 0,
  bracket_url TEXT,
  stream_url TEXT,
  is_major BOOLEAN DEFAULT FALSE,
  is_special BOOLEAN DEFAULT FALSE,
  special_rules TEXT,
  rank_min TEXT,
  rank_max TEXT,
  points_multiplier NUMERIC(3,1) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tournaments viewable" ON public.tournaments
  FOR SELECT USING (true);

CREATE POLICY "Admins manage tournaments" ON public.tournaments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );


-- ========== REGISTRATIONS ==========
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id),
  user_id UUID REFERENCES public.profiles(id),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected', 'refunded')),
  payment_id TEXT,
  payment_provider TEXT CHECK (payment_provider IN ('mercadopago', 'stripe', 'manual')),
  amount_paid NUMERIC(10,2),
  currency TEXT DEFAULT 'ARS',
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registrations viewable" ON public.registrations
  FOR SELECT USING (true);

CREATE POLICY "Users create registrations" ON public.registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own registrations" ON public.registrations
  FOR SELECT USING (auth.uid() = user_id);


-- ========== MATCHES ==========
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER,
  team_a_id UUID REFERENCES public.teams(id),
  team_b_id UUID REFERENCES public.teams(id),
  winner_id UUID REFERENCES public.teams(id),
  score_a INTEGER,
  score_b INTEGER,
  lobby_code TEXT,
  map TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'finished', 'disputed', 'bye')),
  vod_url TEXT,
  played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches viewable" ON public.matches
  FOR SELECT USING (true);


-- ========== PAYMENTS LOG ==========
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id),
  registration_id UUID REFERENCES public.registrations(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  provider TEXT NOT NULL CHECK (provider IN ('mercadopago', 'stripe', 'manual')),
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);


-- ========== RANKINGS ==========
CREATE TABLE public.rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  season INTEGER NOT NULL DEFAULT 1,
  points INTEGER DEFAULT 0,
  tournaments_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  best_placement INTEGER,
  division TEXT DEFAULT 'bronce' CHECK (division IN ('bronce', 'plata', 'oro', 'platino', 'radiant')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season)
);

ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rankings viewable" ON public.rankings
  FOR SELECT USING (true);


-- ========== USEFUL VIEWS ==========

-- Ranking leaderboard
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  r.user_id,
  r.season,
  r.points,
  r.tournaments_played,
  r.wins,
  r.division,
  p.display_name,
  p.riot_id,
  p.riot_tag,
  p.country,
  p.rank,
  p.discord_avatar,
  ROW_NUMBER() OVER (PARTITION BY r.season ORDER BY r.points DESC) AS position
FROM public.rankings r
JOIN public.profiles p ON p.id = r.user_id
ORDER BY r.points DESC;

-- Tournament with registration count
CREATE OR REPLACE VIEW public.tournaments_with_slots AS
SELECT
  t.*,
  COUNT(r.id) FILTER (WHERE r.payment_status = 'approved') AS confirmed_slots
FROM public.tournaments t
LEFT JOIN public.registrations r ON r.tournament_id = t.id
GROUP BY t.id;


-- ========== FUNCTIONS ==========

-- Update slot count after registration payment
CREATE OR REPLACE FUNCTION public.update_tournament_slots()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'approved' AND (OLD IS NULL OR OLD.payment_status != 'approved') THEN
    UPDATE public.tournaments
    SET current_slots = current_slots + 1,
        prize_pool = prize_pool + COALESCE(NEW.amount_paid, 0)
    WHERE id = NEW.tournament_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_registration_approved
  AFTER INSERT OR UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_tournament_slots();

-- Update ranking points
CREATE OR REPLACE FUNCTION public.add_ranking_points(
  p_user_id UUID,
  p_season INTEGER,
  p_points INTEGER,
  p_is_win BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.rankings (user_id, season, points, tournaments_played, wins)
  VALUES (p_user_id, p_season, p_points, 1, CASE WHEN p_is_win THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, season) DO UPDATE SET
    points = rankings.points + p_points,
    tournaments_played = rankings.tournaments_played + 1,
    wins = rankings.wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    division = CASE
      WHEN rankings.points + p_points >= 2500 THEN 'radiant'
      WHEN rankings.points + p_points >= 1800 THEN 'platino'
      WHEN rankings.points + p_points >= 1200 THEN 'oro'
      WHEN rankings.points + p_points >= 600 THEN 'plata'
      ELSE 'bronce'
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========== REALTIME ==========
-- Habilitar realtime en tablas clave
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rankings;
