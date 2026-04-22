import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase-server';

async function requireAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
  }

  return { supabase: createAdminSupabase() };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return adminCheck.error;
  }

  const { id: tournamentId } = await context.params;
  const body = await request.json();
  const memberIds = Array.from(
    new Set(
      (Array.isArray(body.memberIds) ? body.memberIds : [])
        .filter((value: unknown) => typeof value === 'string' && value.length > 0)
    )
  );
  const teamName = typeof body.teamName === 'string' ? body.teamName.trim() : '';

  const { data: tournament, error: tournamentError } = await adminCheck.supabase
    .from('tournaments')
    .select('id, format, max_slots, current_slots')
    .eq('id', tournamentId)
    .single();

  if (tournamentError || !tournament) {
    return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
  }

  const requiredTeamSize = tournament.format === '5v5' ? 5 : 2;
  if (memberIds.length !== requiredTeamSize) {
    return NextResponse.json({
      error: `Este torneo requiere ${requiredTeamSize} jugadores para cargar un equipo manual`,
    }, { status: 400 });
  }

  if (tournament.current_slots >= tournament.max_slots) {
    return NextResponse.json({ error: 'Torneo lleno' }, { status: 400 });
  }

  const { data: players, error: playersError } = await adminCheck.supabase
    .from('profiles')
    .select('id, display_name, discord_username')
    .in('id', memberIds);

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  if ((players || []).length !== memberIds.length) {
    return NextResponse.json({ error: 'Uno o mas jugadores no existen' }, { status: 400 });
  }

  const { data: conflictingMemberships, error: conflictingMembershipsError } = await adminCheck.supabase
    .from('team_members')
    .select('team_id, user_id')
    .in('user_id', memberIds);

  if (conflictingMembershipsError) {
    return NextResponse.json({ error: conflictingMembershipsError.message }, { status: 500 });
  }

  const teamIds = Array.from(new Set((conflictingMemberships || []).map((membership) => membership.team_id)));
  if (teamIds.length > 0) {
    const { data: conflictingRegistrations, error: conflictingRegistrationsError } = await adminCheck.supabase
      .from('registrations')
      .select('id')
      .eq('tournament_id', tournamentId)
      .in('team_id', teamIds)
      .neq('payment_status', 'rejected');

    if (conflictingRegistrationsError) {
      return NextResponse.json({ error: conflictingRegistrationsError.message }, { status: 500 });
    }

    if ((conflictingRegistrations || []).length > 0) {
      return NextResponse.json({ error: 'Uno de los jugadores ya esta cargado en este torneo' }, { status: 400 });
    }
  }

  const captainId = memberIds[0];
  const captainProfile = (players || []).find((player) => player.id === captainId);
  const fallbackName = captainProfile?.display_name || captainProfile?.discord_username || 'Equipo manual';
  const resolvedTeamName = teamName.length >= 3 ? teamName.slice(0, 32) : `${fallbackName} Manual`;

  const { data: team, error: teamError } = await adminCheck.supabase
    .from('teams')
    .insert({
      name: resolvedTeamName,
      captain_id: captainId,
    })
    .select('id, name')
    .single();

  if (teamError || !team) {
    return NextResponse.json({ error: teamError?.message || 'No se pudo crear el equipo' }, { status: 500 });
  }

  const { error: membersError } = await adminCheck.supabase
    .from('team_members')
    .insert(
      memberIds.map((userId, index) => ({
        team_id: team.id,
        user_id: userId,
        role: index === 0 ? 'captain' : 'member',
      }))
    );

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  const { data: registration, error: registrationError } = await adminCheck.supabase
    .from('registrations')
    .insert({
      tournament_id: tournamentId,
      team_id: team.id,
      user_id: captainId,
      payment_status: 'approved',
      payment_provider: 'manual',
      amount_paid: 0,
      currency: 'USD',
    })
    .select('id, team_id')
    .single();

  if (registrationError || !registration) {
    return NextResponse.json({ error: registrationError?.message || 'No se pudo crear la inscripcion manual' }, { status: 500 });
  }

  return NextResponse.json({ registration, team }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return adminCheck.error;
  }

  const { id: tournamentId } = await context.params;
  const url = new URL(request.url);
  const registrationId = url.searchParams.get('registrationId');

  if (!registrationId) {
    return NextResponse.json({ error: 'registrationId es requerido' }, { status: 400 });
  }

  const { data: registration, error: registrationError } = await adminCheck.supabase
    .from('registrations')
    .select('id, tournament_id, team_id, payment_status, amount_paid')
    .eq('id', registrationId)
    .eq('tournament_id', tournamentId)
    .single();

  if (registrationError || !registration) {
    return NextResponse.json({ error: 'Inscripcion no encontrada' }, { status: 404 });
  }

  if (registration.payment_status === 'approved') {
    const { data: tournament } = await adminCheck.supabase
      .from('tournaments')
      .select('current_slots, prize_pool')
      .eq('id', tournamentId)
      .single();

    if (tournament) {
      await adminCheck.supabase
        .from('tournaments')
        .update({
          current_slots: Math.max(0, Number(tournament.current_slots || 0) - 1),
          prize_pool: Math.max(0, Number(tournament.prize_pool || 0) - Number(registration.amount_paid || 0)),
        })
        .eq('id', tournamentId);
    }
  }

  const { error: deleteRegistrationError } = await adminCheck.supabase
    .from('registrations')
    .delete()
    .eq('id', registrationId);

  if (deleteRegistrationError) {
    return NextResponse.json({ error: deleteRegistrationError.message }, { status: 500 });
  }

  if (registration.team_id) {
    await adminCheck.supabase
      .from('teams')
      .delete()
      .eq('id', registration.team_id);
  }

  return NextResponse.json({ success: true });
}
