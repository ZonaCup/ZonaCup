import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase-server';
import { propagateBracketWinners } from '@/lib/tournament-playoff';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const serverSupabase = await createServerSupabase();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const scoreA = body.scoreA === '' || body.scoreA === null ? null : Number(body.scoreA);
    const scoreB = body.scoreB === '' || body.scoreB === null ? null : Number(body.scoreB);
    const winnerId = body.winnerId || null;
    const status = body.status || (winnerId ? 'finished' : 'pending');

    const supabase = createAdminSupabase();
    const { data: match, error } = await supabase
      .from('matches')
      .update({
        score_a: scoreA,
        score_b: scoreB,
        winner_id: winnerId,
        status,
      })
      .eq('id', id)
      .select('id, tournament_id')
      .single();

    if (error || !match) {
      return NextResponse.json({ error: error?.message || 'Match no encontrado' }, { status: 500 });
    }

    const matches = await propagateBracketWinners(supabase, match.tournament_id);
    return NextResponse.json({ ok: true, matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
