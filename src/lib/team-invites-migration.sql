-- Ejecutar una sola vez en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  invited_by_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(team_id, invited_user_id)
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'team_invites' AND policyname = 'Users view related invites'
  ) THEN
    CREATE POLICY "Users view related invites" ON public.team_invites
      FOR SELECT USING (auth.uid() = invited_user_id OR auth.uid() = invited_by_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'team_invites' AND policyname = 'Captains create invites'
  ) THEN
    CREATE POLICY "Captains create invites" ON public.team_invites
      FOR INSERT WITH CHECK (auth.uid() = invited_by_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'team_invites' AND policyname = 'Invited users update invite status'
  ) THEN
    CREATE POLICY "Invited users update invite status" ON public.team_invites
      FOR UPDATE USING (auth.uid() = invited_user_id);
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_invites;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
