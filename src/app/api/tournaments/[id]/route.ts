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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (adminCheck.error) {
    return adminCheck.error;
  }

  const { id } = await context.params;
  const body = await request.json();

  const payload = {
    name: body.name,
    slug: body.slug,
    format: body.format,
    description: body.description,
    date: body.date,
    entry_fee_usd: body.entry_fee_usd,
    entry_fee_ars: body.entry_fee_ars,
    entry_fee_clp: body.entry_fee_clp,
    entry_fee_pen: body.entry_fee_pen,
    prize_pool: body.prize_pool,
    max_slots: body.max_slots,
    is_major: body.is_major || false,
    is_special: body.is_special || false,
    special_rules: body.special_rules,
    rank_min: body.rank_min,
    rank_max: body.rank_max,
    points_multiplier: body.points_multiplier || 1.0,
    status: body.status,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await adminCheck.supabase
    .from('tournaments')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
