import { SupabaseClient } from '@supabase/supabase-js';

type TeamRef = {
  id: string;
  name: string;
  tag?: string | null;
};

type MatchRecord = {
  id: string;
  round: number;
  match_number: number;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_id: string | null;
  status: string;
};

const PLAYOFF_SIZE = 8;
const FIRST_ROUND_PAIRINGS = [
  [0, 7],
  [3, 4],
  [1, 6],
  [2, 5],
];

async function loadApprovedTeams(supabase: SupabaseClient, tournamentId: string): Promise<TeamRef[]> {
  const { data, error } = await supabase
    .from('registrations')
    .select('team_id, created_at, team:teams!registrations_team_id_fkey!inner(id, name, tag)')
    .eq('tournament_id', tournamentId)
    .eq('payment_status', 'approved')
    .not('team_id', 'is', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const seen = new Set<string>();
  const teams: TeamRef[] = [];

  for (const row of data || []) {
    const team = Array.isArray(row.team) ? row.team[0] : row.team;
    if (!team?.id || seen.has(team.id)) continue;
    seen.add(team.id);
    teams.push({ id: team.id, name: team.name, tag: team.tag });
  }

  return teams.slice(0, PLAYOFF_SIZE);
}

async function loadMatches(supabase: SupabaseClient, tournamentId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      tournament_id,
      round,
      match_number,
      status,
      score_a,
      score_b,
      team_a_id,
      team_b_id,
      winner_id,
      team_a:teams!matches_team_a_id_fkey(id, name, tag),
      team_b:teams!matches_team_b_id_fkey(id, name, tag),
      winner:teams!matches_winner_id_fkey(id, name, tag)
    `)
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function propagateBracketWinners(supabase: SupabaseClient, tournamentId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select('id, round, match_number, team_a_id, team_b_id, winner_id, status')
    .eq('tournament_id', tournamentId)
    .order('round', { ascending: true })
    .order('match_number', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const matches = (data || []) as MatchRecord[];
  const matchMap = new Map(matches.map((match) => [`${match.round}-${match.match_number}`, match]));

  for (const match of matches) {
    if (match.status === 'finished' && !match.winner_id) continue;
    if (match.winner_id && match.status === 'finished') continue;
    if (!match.winner_id) continue;

    const { error: statusError } = await supabase
      .from('matches')
      .update({ status: 'finished' })
      .eq('id', match.id);

    if (statusError) {
      throw new Error(statusError.message);
    }

    match.status = 'finished';
  }

  for (const match of matches) {
    if (!match.winner_id) continue;
    const nextRound = match.round + 1;
    const nextMatchNumber = Math.ceil(match.match_number / 2);
    const nextMatch = matchMap.get(`${nextRound}-${nextMatchNumber}`);
    if (!nextMatch) continue;

    const slotKey = match.match_number % 2 === 1 ? 'team_a_id' : 'team_b_id';
    const currentValue = nextMatch[slotKey];

    if (currentValue !== match.winner_id) {
      const { error: updateError } = await supabase
        .from('matches')
        .update({ [slotKey]: match.winner_id })
        .eq('id', nextMatch.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      nextMatch[slotKey] = match.winner_id;
    }
  }

  for (const match of matches) {
    const hasA = Boolean(match.team_a_id);
    const hasB = Boolean(match.team_b_id);
    if ((hasA && hasB) || (!hasA && !hasB) || match.winner_id) continue;

    const winnerId = match.team_a_id || match.team_b_id;
    const nextStatus = winnerId ? 'bye' : match.status;

    const { error: byeError } = await supabase
      .from('matches')
      .update({ winner_id: winnerId, status: nextStatus })
      .eq('id', match.id);

    if (byeError) {
      throw new Error(byeError.message);
    }

    match.winner_id = winnerId;
    match.status = nextStatus;
  }

  return loadMatches(supabase, tournamentId);
}

export async function ensureTournamentPlayoff(supabase: SupabaseClient, tournamentId: string) {
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, status')
    .eq('id', tournamentId)
    .single();

  if (tournamentError || !tournament) {
    throw new Error(tournamentError?.message || 'Tournament not found');
  }

  const existingMatches = await loadMatches(supabase, tournamentId);
  if (existingMatches.length > 0) {
    return propagateBracketWinners(supabase, tournamentId);
  }

  if (tournament.status !== 'live') {
    return [];
  }

  const teams = await loadApprovedTeams(supabase, tournamentId);
  if (teams.length === 0) {
    return [];
  }

  const seededTeams: Array<TeamRef | null> = [...teams];
  while (seededTeams.length < PLAYOFF_SIZE) {
    seededTeams.push(null);
  }

  const payload = FIRST_ROUND_PAIRINGS.map(([homeSeed, awaySeed], index) => {
    const teamA = seededTeams[homeSeed];
    const teamB = seededTeams[awaySeed];
    const winnerId = !teamA && !teamB ? null : teamA && !teamB ? teamA.id : !teamA && teamB ? teamB.id : null;
    const status = winnerId ? 'bye' : 'pending';

    return {
      tournament_id: tournamentId,
      round: 1,
      match_number: index + 1,
      team_a_id: teamA?.id || null,
      team_b_id: teamB?.id || null,
      winner_id: winnerId,
      status,
    };
  });

  payload.push(
    { tournament_id: tournamentId, round: 2, match_number: 1, team_a_id: null, team_b_id: null, winner_id: null, status: 'pending' },
    { tournament_id: tournamentId, round: 2, match_number: 2, team_a_id: null, team_b_id: null, winner_id: null, status: 'pending' },
    { tournament_id: tournamentId, round: 3, match_number: 1, team_a_id: null, team_b_id: null, winner_id: null, status: 'pending' }
  );

  const { error: insertError } = await supabase.from('matches').insert(payload);
  if (insertError) {
    throw new Error(insertError.message);
  }

  return propagateBracketWinners(supabase, tournamentId);
}
