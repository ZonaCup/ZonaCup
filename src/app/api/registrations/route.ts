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

    // Get tournament details
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single();

    if (tErr || !tournament) {
      return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 });
    }

    if (tournament.status !== 'upcoming') {
      return NextResponse.json({ error: 'El torneo no está abierto para inscripción' }, { status: 400 });
    }

    if (tournament.current_slots >= tournament.max_slots) {
      return NextResponse.json({ error: 'Torneo lleno' }, { status: 400 });
    }

    // Check if already registered
    const { data: existing } = await supabase
      .from('registrations')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .neq('payment_status', 'rejected')
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Ya estás inscripto en este torneo' }, { status: 400 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Create registration (pending payment)
    const { data: registration, error: regErr } = await supabase
      .from('registrations')
      .insert({
        tournament_id: tournamentId,
        team_id: teamId || null,
        user_id: user.id,
        payment_status: 'pending',
        payment_provider: 'mercadopago',
      })
      .select()
      .single();

    if (regErr) {
      return NextResponse.json({ error: 'Error creando inscripción' }, { status: 500 });
    }

    // Create Mercado Pago preference
    const preference = await createTournamentPayment({
      tournamentName: tournament.name,
      tournamentId: tournament.id,
      userId: user.id,
      registrationId: registration.id,
      amount: tournament.entry_fee_ars || tournament.entry_fee_usd * 1400, // fallback conversion
      playerEmail: user.email || '',
      playerName: profile?.display_name || user.user_metadata?.full_name || 'Jugador',
    });

    return NextResponse.json({
      registrationId: registration.id,
      paymentUrl: preference.init_point, // Redirect URL to Mercado Pago
      sandboxUrl: preference.sandbox_init_point, // For testing
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
