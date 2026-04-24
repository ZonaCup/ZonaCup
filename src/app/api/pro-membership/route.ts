import { NextResponse } from 'next/server';
import { createProMembershipPayment } from '@/lib/mercadopago';
import { fetchExchangeRates } from '@/lib/currency';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase-server';

function getProMembershipPriceUsd() {
  return Number(process.env.PRO_MEMBERSHIP_PRICE_USD || 6);
}

function getProMembershipPriceArsFallback() {
  return Number(process.env.PRO_MEMBERSHIP_PRICE_ARS || getProMembershipPriceUsd() * 1400);
}

export async function GET() {
  try {
    const serverSupabase = await createServerSupabase();
    const adminSupabase = createAdminSupabase();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL));
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    let amount = getProMembershipPriceArsFallback();

    try {
      const exchange = await fetchExchangeRates();
      amount = Number((getProMembershipPriceUsd() * exchange.rates.ARS).toFixed(2));
    } catch {
      amount = getProMembershipPriceArsFallback();
    }

    const preference = await createProMembershipPayment({
      userId: user.id,
      amount,
      playerEmail: user.email || `${user.id}@zonacup.pro`,
      playerName: profile?.display_name || user.user_metadata?.full_name || 'Jugador',
    });

    if (!preference.init_point) {
      return NextResponse.json({ error: 'No se pudo crear el checkout de Mercado Pago' }, { status: 500 });
    }

    return NextResponse.redirect(preference.init_point);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error interno',
    }, { status: 500 });
  }
}
