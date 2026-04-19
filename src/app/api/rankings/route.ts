import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// GET /api/rankings - Get leaderboard
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase();
  const url = new URL(request.url);
  const season = url.searchParams.get('season') || '1';
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const country = url.searchParams.get('country');

  let query = supabase
    .from('leaderboard')
    .select('*')
    .eq('season', parseInt(season))
    .order('points', { ascending: false })
    .limit(limit);

  if (country) {
    query = query.eq('country', country);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
