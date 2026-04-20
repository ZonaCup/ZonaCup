import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createTournamentPayment } from '@/lib/mercadopago';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { tournamentId, teamId } = await request.json();

    const { data: tournament, error: tournamentError } = await supabase
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

    const { data: existingRegistration } = await supabase
      .from('registrations')
      .select('id, payment_status, team_id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .neq('payment_status', 'rejected')
      .maybeSingle();

    if (existingRegistration?.payment_status === 'approved') {
      return NextResponse.json({ error: 'Ya estas inscripto en este torneo' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    let resolvedTeamId = teamId || existingRegistration?.team_id || null;

    if (!resolvedTeamId) {
      const displayName =
        profile?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Jugador';

      const { data: existingTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('captain_id', user.id)
        .maybeSingle();

      if (existingTeam?.id) {
        resolvedTeamId = existingTeam.id;
      } else {
        const { data: createdTeam, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: `${displayName} Team`,
            captain_id: user.id,
          })
          .select('id')
          .single();

        if (teamError || !createdTeam) {
          return NextResponse.json({ error: 'No pudimos crear tu equipo' }, { status: 500 });
        }

        resolvedTeamId = createdTeam.id;

        await supabase.from('team_members').upsert(
          {
            team_id: resolvedTeamId,
            user_id: user.id,
            role: 'captain',
          },
          { onConflict: 'team_id,user_id' }
        );
      }
    }

    let registration = existingRegistration;

    if (!registration) {
      const { data: createdRegistration, error: registrationError } = await supabase
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
    } else if (!registration.team_id && resolvedTeamId) {
      const { data: updatedRegistration, error: updateError } = await supabase
        .from('registrations')
        .update({ team_id: resolvedTeamId })
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

    const preference = await createTournamentPayment({
      tournamentName: tournament.name,
      tournamentId: tournament.id,
      tournamentSlug: tournament.slug,
      userId: user.id,
      registrationId: registration.id,
      amount: tournament.entry_fee_ars || tournament.entry_fee_usd * 1400,
      playerEmail: user.email || '',
      playerName: profile?.display_name || user.user_metadata?.full_name || 'Jugador',
    });

    return NextResponse.json({
      registrationId: registration.id,
      teamId: resolvedTeamId,
      paymentUrl: preference.init_point,
      sandboxUrl: preference.sandbox_init_point,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
