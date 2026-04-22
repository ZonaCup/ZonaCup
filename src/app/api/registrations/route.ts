import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase-server';
import { createTournamentPayment } from '@/lib/mercadopago';
import { fetchExchangeRates } from '@/lib/currency';

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = await createServerSupabase();
    const adminSupabase = createAdminSupabase();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { tournamentId, teamId } = await request.json();

    const { data: tournament, error: tournamentError } = await adminSupabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
    }

    if (!['upcoming', 'checkin'].includes(tournament.status)) {
      return NextResponse.json({ error: 'El torneo no esta abierto para inscripcion' }, { status: 400 });
    }

    if (tournament.current_slots >= tournament.max_slots) {
      return NextResponse.json({ error: 'Torneo lleno' }, { status: 400 });
    }

    const { data: existingRegistration, error: existingRegistrationError } = await adminSupabase
      .from('registrations')
      .select('id, payment_status, team_id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .neq('payment_status', 'rejected')
      .maybeSingle();

    if (existingRegistrationError) {
      return NextResponse.json({ error: existingRegistrationError.message }, { status: 500 });
    }

    if (existingRegistration?.payment_status === 'approved') {
      return NextResponse.json({ error: 'Ya estas inscripto en este torneo' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const requiredTeamSize = tournament.format === '5v5' ? 5 : 2;
    let resolvedTeamId = teamId || existingRegistration?.team_id || null;

    if (!resolvedTeamId) {
      return NextResponse.json({ error: 'Primero tenes que crear tu equipo e invitar a los jugadores' }, { status: 400 });
    }

    const { data: team, error: teamError } = await adminSupabase
      .from('teams')
      .select('id, captain_id')
      .eq('id', resolvedTeamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    if (team.captain_id !== user.id) {
      return NextResponse.json({ error: 'Solo el capitan puede pagar la inscripcion' }, { status: 403 });
    }

    const { data: invites, error: invitesError } = await adminSupabase
      .from('team_invites')
      .select('id, status')
      .eq('tournament_id', tournamentId)
      .eq('team_id', resolvedTeamId);

    if (invitesError) {
      return NextResponse.json({ error: invitesError.message }, { status: 500 });
    }

    if ((invites || []).length !== requiredTeamSize - 1) {
      return NextResponse.json({ error: 'Primero tenes que elegir a todo tu equipo' }, { status: 400 });
    }

    if ((invites || []).some((invite) => invite.status === 'cancelled')) {
      return NextResponse.json({ error: 'Hay invitaciones canceladas en este equipo' }, { status: 400 });
    }

    let registration = existingRegistration;

    if (!registration) {
      const { data: createdRegistration, error: registrationError } = await adminSupabase
        .from('registrations')
        .insert({
          tournament_id: tournamentId,
          team_id: resolvedTeamId,
          user_id: user.id,
          payment_status: 'pending',
          payment_provider: 'mercadopago',
        })
        .select()
        .single();

      if (registrationError || !createdRegistration) {
        return NextResponse.json({ error: 'Error creando inscripcion' }, { status: 500 });
      }

      registration = createdRegistration;
    } else if ((!registration.team_id && resolvedTeamId) || registration.team_id !== resolvedTeamId) {
      const { data: updatedRegistration, error: updateError } = await adminSupabase
        .from('registrations')
        .update({
          team_id: resolvedTeamId,
          payment_id: null,
        })
        .eq('id', registration.id)
        .select()
        .single();

      if (updateError || !updatedRegistration) {
        return NextResponse.json({ error: 'Error actualizando inscripcion' }, { status: 500 });
      }

      registration = updatedRegistration;
    }

    if (!registration) {
      return NextResponse.json({ error: 'No pudimos preparar tu inscripcion' }, { status: 500 });
    }

    let preference;
    try {
      const exchange = await fetchExchangeRates();
      const entryFeeArs = Number((Number(tournament.entry_fee_usd || 0) * exchange.rates.ARS).toFixed(2));

      preference = await createTournamentPayment({
        tournamentName: tournament.name,
        tournamentId: tournament.id,
        tournamentSlug: tournament.slug,
        userId: user.id,
        registrationId: registration.id,
        amount: entryFeeArs || tournament.entry_fee_ars || tournament.entry_fee_usd * 1400,
        playerEmail: user.email || `${user.id}@zonacup.pro`,
        playerName: profile?.display_name || user.user_metadata?.full_name || 'Jugador',
      });
    } catch (paymentError) {
      const message = paymentError instanceof Error ? paymentError.message : 'No se pudo crear el checkout de pago';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({
      registrationId: registration.id,
      teamId: resolvedTeamId,
      paymentUrl: preference.init_point,
      sandboxUrl: preference.sandbox_init_point,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno',
    }, { status: 500 });
  }
}
