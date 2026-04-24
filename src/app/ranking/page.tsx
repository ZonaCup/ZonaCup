'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type RankingPlayer = {
  user_id: string;
  season: number;
  points: number;
  tournaments_played: number;
  wins: number;
  division: string;
  display_name: string | null;
  riot_id: string | null;
  riot_tag: string | null;
  country: string | null;
  rank: string | null;
  discord_avatar: string | null;
  position: number;
};

export default function RankingPage() {
  const supabase = useMemo(() => createClient(), []);
  const [players, setPlayers] = useState<RankingPlayer[]>([]);
  const [countryFilter, setCountryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadRanking(countryFilter);

    const channel = supabase
      .channel('ranking-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => void loadRanking(countryFilter))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => void loadRanking(countryFilter))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => void loadRanking(countryFilter))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => void loadRanking(countryFilter))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [countryFilter, supabase]);

  async function loadRanking(country: string) {
    setLoading(true);
    try {
      const countryParam = country === 'all' ? '' : `&country=${country}`;
      const response = await fetch(`/api/rankings?season=1&limit=100${countryParam}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      setPlayers(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

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
              { key: 'AR', label: 'AR' },
              { key: 'CL', label: 'CL' },
              { key: 'PE', label: 'PE' },
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
              {players.length} jugadores reales · campeones de torneos
            </span>
            <span className="text-[11px] text-green-400">• En vivo</span>
          </div>

          <div className="hidden md:grid px-5 py-2 grid-cols-[40px_1fr_100px_80px_80px_80px] gap-3 text-[10px] text-ash tracking-wider uppercase border-b border-white/5">
            <div>#</div>
            <div>Jugador</div>
            <div>Division</div>
            <div className="text-right">Puntos</div>
            <div className="text-right">Titulos</div>
            <div className="text-right">Torneos</div>
          </div>

          {players.length === 0 ? (
            <div className="p-12 text-center text-ash">
              {loading ? 'Cargando ranking real...' : 'No hay campeones cargados todavia. Cuando cierres un torneo y guardes su ganador, aparece aca.'}
            </div>
          ) : (
            players.map((p, i) => (
              <div key={p.user_id} className="px-5 py-3 grid grid-cols-[40px_1fr_auto] md:grid-cols-[40px_1fr_100px_80px_80px_80px] gap-3 items-center border-b border-white/[0.02] hover:bg-fire-core/[0.03] transition-colors">
                <div className={`font-display text-base font-bold ${posClass(i)}`}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <div className="text-sm text-ivory font-semibold">{p.display_name || p.riot_id || 'Anonimo'}</div>
                  <div className="text-[11px] text-ash">
                    {p.country || '-'} · {p.rank || '-'} · {p.wins} titulos
                  </div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-sm tracking-wider uppercase font-bold text-center ${divisionBadge(p.division)}`}>
                  {p.division}
                </span>
                <div className="hidden md:block font-display text-sm text-ivory font-semibold text-right">{p.points}</div>
                <div className="hidden md:block text-sm text-ash text-right">{p.wins}</div>
                <div className="hidden md:block text-sm text-ash text-right">{p.tournaments_played}</div>
              </div>
            ))
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
