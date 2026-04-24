import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-server';
import { getRealRankings } from '@/lib/rankings';

// GET /api/rankings - Get leaderboard
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminSupabase();
    const url = new URL(request.url);
    const season = parseInt(url.searchParams.get('season') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const country = url.searchParams.get('country');

    const data = await getRealRankings(supabase, {
      season,
      limit,
      country,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
