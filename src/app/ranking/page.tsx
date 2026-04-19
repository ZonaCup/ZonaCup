'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function RankingPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [countryFilter, setCountryFilter] = useState('all');
  const supabase = createClient();

  useEffect(() => {
    loadRanking();
    const channel = supabase.channel('ranking-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => loadRanking())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadRanking() {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('season', 1)
      .order('points', { ascending: false })
      .limit(100);
    setPlayers(data || []);
  }

  const filtered = countryFilter === 'all' ? players : players.filter(p => p.country === countryFilter);

  const posClass = (i: number) => {
    if (i === 0) return 'text-gold';
    if (i === 1) return 'text-[#b4b2a9]';
    if (i === 2) return 'text-[#d85a30]';
    return 'text-ash';
  };

  const divisionBadge = (div: string) => {
    const map: Record<string, string> = {
      radiant: 'bg-gold/10 text-gold',
      platino: 'bg-purple-400/12 text-purple-300',
      oro: 'bg-green-400/12 text-green-400',
      plata: 'bg-blue-400/12 text-blue-300',
      bronce: 'bg-fire-core/12 text-fire-core',
    };
    return map[div] || map.bronce;
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-5xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="section-tag">Temporada 1</div>
            <h1 className="section-title !text-4xl md:!text-5xl">Ranking oficial</h1>
          </div>
          <div className="flex gap-1.5">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'AR', label: '🇦🇷 AR' },
              { key: 'CL', label: '🇨🇱 CL' },
              { key: 'PE', label: '🇵🇪 PE' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setCountryFilter(f.key)}
                className={`px-3 py-1.5 rounded-sm text-xs font-bold tracking-wider uppercase font-body border transition-all ${countryFilter === f.key ? 'bg-fire-core border-fire-core text-white' : 'border-white/10 text-ash bg-transparent hover:border-fire-core/30'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-white/5 flex justify-between items-center">
            <span className="text-[11px] text-ash tracking-[1.5px] uppercase">
              {filtered.length} jugadores · Temporada 1
            </span>
            <span className="text-[11px] text-green-400">● En vivo</span>
          </div>

          {/* Header row */}
          <div className="hidden md:grid px-5 py-2 grid-cols-[40px_1fr_100px_80px_80px_80px] gap-3 text-[10px] text-ash tracking-wider uppercase border-b border-white/5">
            <div>#</div>
            <div>Jugador</div>
            <div>División</div>
            <div className="text-right">Puntos</div>
            <div className="text-right">Torneos</div>
            <div className="text-right">Wins</div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-12 text-center text-ash">
              No hay jugadores en el ranking todavía. Jugá tu primer torneo para entrar.
            </div>
          ) : (
            filtered.map((p, i) => (
              <div key={p.user_id} className="px-5 py-3 grid grid-cols-[40px_1fr_auto] md:grid-cols-[40px_1fr_100px_80px_80px_80px] gap-3 items-center border-b border-white/[0.02] hover:bg-fire-core/[0.03] transition-colors">
                <div className={`font-display text-base font-bold ${posClass(i)}`}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <div className="text-sm text-ivory font-semibold">{p.display_name || p.riot_id || 'Anónimo'}</div>
                  <div className="text-[11px] text-ash">
                    {p.country || '-'} · {p.rank || '-'} · {p.tournaments_played} torneos
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-sm tracking-wider uppercase font-bold text-center ${divisionBadge(p.division)}`}>
                  {p.division}
                </span>
                <div className="hidden md:block font-display text-sm text-ivory font-semibold text-right">{p.points}</div>
                <div className="hidden md:block text-sm text-ash text-right">{p.tournaments_played}</div>
                <div className="hidden md:block text-sm text-ash text-right">{p.wins}</div>
              </div>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
