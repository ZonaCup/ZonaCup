import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// GET /api/tournaments - List upcoming tournaments
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'upcoming';
  const format = url.searchParams.get('format'); // '2v2' or '5v5'

  let query = supabase
    .from('tournaments')
    .select('*')
    .order('date', { ascending: true });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (format) {
    query = query.eq('format', format);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/tournaments - Create tournament (admin only)
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      name: body.name,
      slug: body.slug,
      format: body.format,
      description: body.description,
      date: body.date,
      entry_fee_usd: body.entry_fee_usd,
      entry_fee_ars: body.entry_fee_ars,
      entry_fee_clp: body.entry_fee_clp,
      entry_fee_pen: body.entry_fee_pen,
      max_slots: body.max_slots,
      is_major: body.is_major || false,
      is_special: body.is_special || false,
      special_rules: body.special_rules,
      rank_min: body.rank_min,
      rank_max: body.rank_max,
      points_multiplier: body.points_multiplier || 1.0,
      status: 'upcoming',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
