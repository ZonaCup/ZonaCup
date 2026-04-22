import { SupabaseClient } from '@supabase/supabase-js';

export type TeamStateEntry = {
  registrationId: string;
  createdAt: string;
  paymentStatus: string;
  team: {
    id: string;
    name: string;
    tag?: string | null;
  } | null;
  captain: {
    id: string;
    display_name?: string | null;
    discord_username?: string | null;
    discord_avatar?: string | null;
    riot_id?: string | null;
    riot_tag?: string | null;
    rank?: string | null;
  } | null;
  members: Array<{
    id: string;
    role: string;
    profile: {
      id: string;
      display_name?: string | null;
      discord_username?: string | null;
      discord_avatar?: string | null;
      riot_id?: string | null;
      riot_tag?: string | null;
      rank?: string | null;
    } | null;
  }>;
  invites: Array<{
    id: string;
    status: string;
    invited_user_id: string;
    invited: {
      id: string;
      display_name?: string | null;
      discord_username?: string | null;
      discord_avatar?: string | null;
      riot_id?: string | null;
      riot_tag?: string | null;
      rank?: string | null;
    } | null;
  }>;
  acceptedCount: number;
  pendingCount: number;
  rejectedCount: number;
  isPaid: boolean;
  isReady: boolean;
};

function normalizeRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }
  return value || null;
}

export async function getTournamentTeamState(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<{ requiredTeamSize: number; entries: TeamStateEntry[] }> {
  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id, format')
    .eq('id', tournamentId)
    .single();

  if (tournamentError || !tournament) {
    throw new Error(tournamentError?.message || 'Tournament not found');
  }

  const requiredTeamSize = tournament.format === '5v5' ? 5 : 2;

  const { data: registrations, error: registrationError } = await supabase
    .from('registrations')
    .select(`
      id,
      created_at,
      payment_status,
      team_id,
      team:teams!registrations_team_id_fkey(id, name, tag),
      captain:profiles!registrations_user_id_fkey(id, display_name, discord_username, discord_avatar, riot_id, riot_tag, rank)
    `)
    .eq('tournament_id', tournamentId)
    .not('team_id', 'is', null)
    .in('payment_status', ['pending', 'approved'])
    .order('created_at', { ascending: true });

  if (registrationError) {
    throw new Error(registrationError.message);
  }

  const dedupedRegistrations = new Map<string, any>();
  for (const registration of registrations || []) {
    if (!registration.team_id || dedupedRegistrations.has(registration.team_id)) continue;
    dedupedRegistrations.set(registration.team_id, registration);
  }

  const teamIds = Array.from(dedupedRegistrations.keys());
  if (teamIds.length === 0) {
    return { requiredTeamSize, entries: [] };
  }

  const [{ data: members, error: membersError }, { data: invites, error: invitesError }] = await Promise.all([
    supabase
      .from('team_members')
      .select(`
        id,
        role,
        team_id,
        profile:profiles!team_members_user_id_fkey(id, display_name, discord_username, discord_avatar, riot_id, riot_tag, rank)
      `)
      .in('team_id', teamIds)
      .order('joined_at', { ascending: true }),
    supabase
      .from('team_invites')
      .select(`
        id,
        status,
        team_id,
        invited_user_id,
        invited:profiles!team_invites_invited_user_id_fkey(id, display_name, discord_username, discord_avatar, riot_id, riot_tag, rank)
      `)
      .eq('tournament_id', tournamentId)
      .in('team_id', teamIds)
      .order('created_at', { ascending: true }),
  ]);

  if (membersError) {
    throw new Error(membersError.message);
  }

  if (invitesError) {
    throw new Error(invitesError.message);
  }

  const membersByTeam = new Map<string, TeamStateEntry['members']>();
  for (const member of members || []) {
    const list = membersByTeam.get(member.team_id) || [];
    list.push({
      id: member.id,
      role: member.role,
      profile: normalizeRelation(member.profile),
    });
    membersByTeam.set(member.team_id, list);
  }

  const invitesByTeam = new Map<string, TeamStateEntry['invites']>();
  for (const invite of invites || []) {
    const list = invitesByTeam.get(invite.team_id) || [];
    list.push({
      id: invite.id,
      status: invite.status,
      invited_user_id: invite.invited_user_id,
      invited: normalizeRelation(invite.invited),
    });
    invitesByTeam.set(invite.team_id, list);
  }

  const entries: TeamStateEntry[] = Array.from(dedupedRegistrations.values()).map((registration: any) => {
    const teamId = registration.team_id as string;
    const registrationInvites = invitesByTeam.get(teamId) || [];
    const registrationMembers = membersByTeam.get(teamId) || [];
    const acceptedCount = registrationInvites.filter((invite) => invite.status === 'accepted').length;
    const pendingCount = registrationInvites.filter((invite) => invite.status === 'pending').length;
    const rejectedCount = registrationInvites.filter((invite) => invite.status === 'rejected').length;
    const isPaid = registration.payment_status === 'approved';
    const isReady =
      isPaid &&
      registrationMembers.length === requiredTeamSize &&
      (
        registrationInvites.length === 0 ||
        (
          registrationInvites.length === requiredTeamSize - 1 &&
          acceptedCount === requiredTeamSize - 1
        )
      );

    return {
      registrationId: registration.id,
      createdAt: registration.created_at,
      paymentStatus: registration.payment_status,
      team: normalizeRelation(registration.team),
      captain: normalizeRelation(registration.captain),
      members: registrationMembers,
      invites: registrationInvites,
      acceptedCount,
      pendingCount,
      rejectedCount,
      isPaid,
      isReady,
    };
  });

  return { requiredTeamSize, entries };
}

export async function getReadyPlayoffTeams(supabase: SupabaseClient, tournamentId: string) {
  const { entries } = await getTournamentTeamState(supabase, tournamentId);

  return entries
    .filter((entry) => entry.isReady && entry.team?.id)
    .map((entry) => ({
      id: entry.team!.id,
      name: entry.team!.name,
      tag: entry.team!.tag || null,
    }))
    .slice(0, 8);
}
