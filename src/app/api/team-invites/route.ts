import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = await createServerSupabase();
    const adminSupabase = createAdminSupabase();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { tournamentId, tournamentSlug, teammateIds = [], teamName } = await request.json();

    let tournament = null as any;

    if (typeof tournamentId === 'string' && tournamentId.length > 0) {
      const { data, error } = await adminSupabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      tournament = data || null;
    }

    if (!tournament && typeof tournamentSlug === 'string' && tournamentSlug.length > 0) {
      const { data, error } = await adminSupabase
        .from('tournaments')
        .select('*')
        .eq('slug', tournamentSlug)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      tournament = data || null;
    }

    if (!tournament) {
      return NextResponse.json({
        error: 'Torneo no encontrado',
        debug: {
          tournamentId: tournamentId ?? null,
          tournamentSlug: tournamentSlug ?? null,
        },
      }, { status: 404 });
    }

    const requiredTeamSize = tournament.format === '5v5' ? 5 : 2;
    const normalizedTeammateIds = Array.from(
      new Set(
        (Array.isArray(teammateIds) ? teammateIds : [])
          .filter((value) => typeof value === 'string' && value.length > 0 && value !== user.id)
      )
    );

    if (normalizedTeammateIds.length !== requiredTeamSize - 1) {
      return NextResponse.json({
        error: tournament.format === '5v5'
          ? 'Para 5v5 tenes que invitar 4 companeros'
          : 'Para 2v2 tenes que invitar 1 companero',
      }, { status: 400 });
    }

    const { data: captainProfile, error: captainProfileError } = await adminSupabase
      .from('profiles')
      .select('id, display_name, discord_username')
      .eq('id', user.id)
      .single();

    if (captainProfileError || !captainProfile) {
      return NextResponse.json({ error: captainProfileError?.message || 'Perfil no encontrado' }, { status: 500 });
    }

    const { data: teammateProfiles, error: teammateProfilesError } = await adminSupabase
      .from('profiles')
      .select('id, display_name, discord_username, riot_id, riot_tag')
      .in('id', normalizedTeammateIds);

    if (teammateProfilesError) {
      return NextResponse.json({ error: teammateProfilesError.message }, { status: 500 });
    }

    if ((teammateProfiles || []).length !== normalizedTeammateIds.length) {
      return NextResponse.json({ error: 'Uno o mas jugadores no existen en la base' }, { status: 400 });
    }

    const { data: conflictingInvites, error: conflictingInvitesError } = await adminSupabase
      .from('team_invites')
      .select('id')
      .eq('tournament_id', tournament.id)
      .in('invited_user_id', normalizedTeammateIds)
      .in('status', ['pending', 'accepted']);

    if (conflictingInvitesError) {
      return NextResponse.json({ error: conflictingInvitesError.message }, { status: 500 });
    }

    if ((conflictingInvites || []).length > 0) {
      return NextResponse.json({ error: 'Uno de los jugadores ya tiene una invitacion activa en este torneo' }, { status: 400 });
    }

    const { data: conflictingMemberships, error: conflictingMembershipsError } = await adminSupabase
      .from('team_members')
      .select('team_id, user_id')
      .in('user_id', [user.id, ...normalizedTeammateIds]);

    if (conflictingMembershipsError) {
      return NextResponse.json({ error: conflictingMembershipsError.message }, { status: 500 });
    }

    const teamIds = Array.from(new Set((conflictingMemberships || []).map((membership) => membership.team_id)));
    if (teamIds.length > 0) {
      const { data: conflictingRegistrations, error: conflictingRegistrationsError } = await adminSupabase
        .from('registrations')
        .select('id')
        .eq('tournament_id', tournament.id)
        .in('team_id', teamIds)
        .neq('payment_status', 'rejected');

      if (conflictingRegistrationsError) {
        return NextResponse.json({ error: conflictingRegistrationsError.message }, { status: 500 });
      }

      if ((conflictingRegistrations || []).length > 0) {
        return NextResponse.json({ error: 'Uno de los jugadores ya esta vinculado a un equipo de este torneo' }, { status: 400 });
      }
    }

    const captainName = captainProfile.display_name || captainProfile.discord_username || 'Jugador';
    const teammateNames = (teammateProfiles || []).map((profile) => profile.display_name || profile.discord_username || profile.riot_id || 'Jugador');
    const normalizedTeamName = typeof teamName === 'string' ? teamName.trim() : '';
    const resolvedTeamName = normalizedTeamName.length >= 3
      ? normalizedTeamName.slice(0, 32)
      : tournament.format === '2v2'
        ? `${captainName} + ${teammateNames[0]}`
        : `${captainName} Squad`;

    const { data: team, error: teamError } = await adminSupabase
      .from('teams')
      .insert({
        name: resolvedTeamName,
        captain_id: user.id,
      })
      .select('id, name')
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: teamError?.message || 'No pudimos crear el equipo' }, { status: 500 });
    }

    const { error: captainMemberError } = await adminSupabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'captain',
      });

    if (captainMemberError) {
      return NextResponse.json({ error: captainMemberError.message }, { status: 500 });
    }

    const invitePayload = normalizedTeammateIds.map((teammateId) => ({
      tournament_id: tournament.id,
      team_id: team.id,
      invited_user_id: teammateId,
      invited_by_user_id: user.id,
      status: 'pending',
    }));

    const { data: invites, error: invitesError } = await adminSupabase
      .from('team_invites')
      .insert(invitePayload)
      .select(`
        id,
        status,
        invited_user_id,
        invited:profiles!team_invites_invited_user_id_fkey(id, display_name, discord_username, discord_avatar, riot_id, riot_tag)
      `);

    if (invitesError) {
      return NextResponse.json({ error: invitesError.message }, { status: 500 });
    }

    return NextResponse.json({
      team,
      invites,
    });
  } catch (error) {
    console.error('Create team invites error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 });
  }
}
