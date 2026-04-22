import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-server';
import { getTournamentTeamState } from '@/lib/tournament-team-state';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = createAdminSupabase();
    const { requiredTeamSize, entries } = await getTournamentTeamState(supabase, id);

    return NextResponse.json({
      requiredTeamSize,
      entries,
      readyEntries: entries.filter((entry) => entry.isReady),
      paidEntries: entries.filter((entry) => entry.paymentStatus === 'approved'),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
