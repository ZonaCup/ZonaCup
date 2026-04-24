import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { getValorantPlayerStats } from '@/lib/riot';

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('riot_id, riot_tag')
      .eq('id', user.id)
      .single();

    if (error) {
      throw error;
    }

    if (!profile?.riot_id || !profile?.riot_tag) {
      return NextResponse.json({ error: 'Primero vincula tu cuenta de Riot.' }, { status: 400 });
    }

    const stats = await getValorantPlayerStats(profile.riot_id, profile.riot_tag);
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar las stats de VALORANT';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
