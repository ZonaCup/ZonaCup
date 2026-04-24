import { SupabaseClient } from '@supabase/supabase-js';

export type RankingEntry = {
  user_id: string;
  season: number;
  points: number;
  tournaments_played: number;
  wins: number;
  division: 'bronce' | 'plata' | 'oro' | 'platino' | 'radiant';
  display_name: string | null;
  riot_id: string | null;
  riot_tag: string | null;
  country: string | null;
  rank: string | null;
  discord_avatar: string | null;
  position: number;
};

type FinishedTournament = {
  id: string;
  date: string;
  is_major: boolean | null;
  is_special: boolean | null;
  points_multiplier: number | string | null;
};

type FinalMatch = {
  tournament_id: string;
  round: number;
  winner_id: string | null;
};

type TeamMemberProfile = {
  id: string;
  display_name?: string | null;
  riot_id?: string | null;
  riot_tag?: string | null;
  country?: string | null;
  rank?: string | null;
  discord_avatar?: string | null;
};

type TeamMemberRow = {
  team_id: string;
  profile: TeamMemberProfile | TeamMemberProfile[] | null;
};

type RegisteredMemberRow = {
  team_id: string;
  user_id: string;
};

type RegistrationRow = {
  tournament_id: string;
  team_id: string | null;
};

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function getTournamentWinPoints(tournament: FinishedTournament) {
  const multiplier = Number(tournament.points_multiplier || 1);
  const basePoints = tournament.is_major ? 500 : tournament.is_special ? 250 : 100;
  return Math.round(basePoints * multiplier);
}

function getDivision(points: number): RankingEntry['division'] {
  if (points >= 2500) return 'radiant';
  if (points >= 1800) return 'platino';
  if (points >= 1200) return 'oro';
  if (points >= 600) return 'plata';
  return 'bronce';
}

export async function getRealRankings(
  supabase: SupabaseClient,
  options?: {
    season?: number;
    country?: string | null;
    limit?: number;
  }
) {
  const season = options?.season || 1;
  const limit = options?.limit || 50;
  const countryFilter = options?.country || null;

  const { data: tournaments, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, date, is_major, is_special, points_multiplier')
    .eq('status', 'finished')
    .order('date', { ascending: false });

  if (tournamentError) {
    throw new Error(tournamentError.message);
  }

  const finishedTournaments = (tournaments || []) as FinishedTournament[];
  if (finishedTournaments.length === 0) {
    return [] as RankingEntry[];
  }

  const tournamentIds = finishedTournaments.map((tournament) => tournament.id);

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('tournament_id, round, winner_id')
    .in('tournament_id', tournamentIds)
    .not('winner_id', 'is', null)
    .in('status', ['finished', 'bye'])
    .order('round', { ascending: false })
    .order('match_number', { ascending: false });

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const finalsByTournament = new Map<string, FinalMatch>();
  for (const match of (matches || []) as FinalMatch[]) {
    if (!finalsByTournament.has(match.tournament_id)) {
      finalsByTournament.set(match.tournament_id, match);
    }
  }

  const winningTeamIds = Array.from(
    new Set(
      Array.from(finalsByTournament.values())
        .map((match) => match.winner_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  if (winningTeamIds.length === 0) {
    return [] as RankingEntry[];
  }

  const { data: winnerMembers, error: membersError } = await supabase
    .from('team_members')
    .select(`
      team_id,
      profile:profiles!team_members_user_id_fkey(id, display_name, riot_id, riot_tag, country, rank, discord_avatar)
    `)
    .in('team_id', winningTeamIds);

  if (membersError) {
    throw new Error(membersError.message);
  }

  const { data: registrations, error: registrationsError } = await supabase
    .from('registrations')
    .select('tournament_id, team_id')
    .in('tournament_id', tournamentIds)
    .eq('payment_status', 'approved')
    .not('team_id', 'is', null);

  if (registrationsError) {
    throw new Error(registrationsError.message);
  }

  const registeredTeamIds = Array.from(
    new Set(
      ((registrations || []) as RegistrationRow[])
        .map((registration) => registration.team_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const { data: registeredMembers, error: registeredMembersError } = await supabase
    .from('team_members')
    .select('team_id, user_id')
    .in('team_id', registeredTeamIds);

  if (registeredMembersError) {
    throw new Error(registeredMembersError.message);
  }

  const tournamentsPlayedByUser = new Map<string, Set<string>>();
  const usersByTeam = new Map<string, string[]>();

  for (const member of (registeredMembers || []) as RegisteredMemberRow[]) {
    const list = usersByTeam.get(member.team_id) || [];
    list.push(member.user_id);
    usersByTeam.set(member.team_id, list);
  }

  for (const registration of (registrations || []) as RegistrationRow[]) {
    if (!registration.team_id) continue;

    const userIds = usersByTeam.get(registration.team_id) || [];
    for (const userId of userIds) {
      const played = tournamentsPlayedByUser.get(userId) || new Set<string>();
      played.add(registration.tournament_id);
      tournamentsPlayedByUser.set(userId, played);
    }
  }

  const winnerProfilesByTeam = new Map<string, TeamMemberProfile[]>();
  for (const row of (winnerMembers || []) as TeamMemberRow[]) {
    const profile = normalizeRelation(row.profile);
    if (!profile) continue;

    const list = winnerProfilesByTeam.get(row.team_id) || [];
    list.push(profile);
    winnerProfilesByTeam.set(row.team_id, list);
  }

  const tournamentMap = new Map(finishedTournaments.map((tournament) => [tournament.id, tournament]));
  const rankingByUser = new Map<string, Omit<RankingEntry, 'position'>>();

  for (const [tournamentId, finalMatch] of finalsByTournament.entries()) {
    const tournament = tournamentMap.get(tournamentId);
    if (!tournament || !finalMatch.winner_id) continue;

    const profiles = winnerProfilesByTeam.get(finalMatch.winner_id) || [];
    const points = getTournamentWinPoints(tournament);

    for (const profile of profiles) {
      if (countryFilter && profile.country !== countryFilter) continue;

      const existing = rankingByUser.get(profile.id);
      const nextPoints = (existing?.points || 0) + points;

      rankingByUser.set(profile.id, {
        user_id: profile.id,
        season,
        points: nextPoints,
        tournaments_played: tournamentsPlayedByUser.get(profile.id)?.size || 0,
        wins: (existing?.wins || 0) + 1,
        division: getDivision(nextPoints),
        display_name: profile.display_name || null,
        riot_id: profile.riot_id || null,
        riot_tag: profile.riot_tag || null,
        country: profile.country || null,
        rank: profile.rank || null,
        discord_avatar: profile.discord_avatar || null,
      });
    }
  }

  return Array.from(rankingByUser.values())
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.tournaments_played !== a.tournaments_played) return b.tournaments_played - a.tournaments_played;
      return (a.display_name || '').localeCompare(b.display_name || '');
    })
    .slice(0, limit)
    .map((entry, index) => ({
      ...entry,
      position: index + 1,
    }));
}
