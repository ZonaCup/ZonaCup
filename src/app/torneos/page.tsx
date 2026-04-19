'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function TorneosPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const supabase = createClient();

  useEffect(() => {
    loadTournaments();
    // Realtime subscription
    const channel = supabase.channel('tournaments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => loadTournaments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadTournaments() {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .in('status', ['upcoming', 'checkin', 'live'])
      .order('date', { ascending: true });
    setTournaments(data || []);
  }

  const filtered = filter === 'all'
    ? tournaments
    : filter === 'major'
    ? tournaments.filter(t => t.is_major)
    : tournaments.filter(t => t.format === filter);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-7xl mx-auto">
        <div className="section-tag">Calendario</div>
        <h1 className="section-title !text-4xl md:!text-5xl mb-8">Próximos torneos</h1>

        <div className="flex gap-1.5 mb-8 flex-wrap">
          {[
            { key: 'all', label: 'Todos' },
            { key: '2v2', label: '2v2' },
            { key: '5v5', label: '5v5' },
            { key: 'major', label: 'Majors' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-sm text-xs font-bold tracking-wider uppercase font-body border transition-all ${filter === f.key ? 'bg-fire-core border-fire-core text-white' : 'border-white/10 text-ash bg-transparent hover:border-fire-core/30'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-ash text-lg">No hay torneos programados en esta categoría.</p>
            <p className="text-sm text-ash/60 mt-2">Seguinos en Discord para enterarte primero.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((t) => {
              const d = new Date(t.date);
              const fillPct = t.max_slots > 0 ? Math.round((t.current_slots / t.max_slots) * 100) : 0;
              return (
                <div
                  key={t.id}
                  className={`card p-4 md:p-5 grid grid-cols-1 md:grid-cols-[65px_1fr_auto_auto_auto] gap-3 md:gap-5 items-center hover:bg-bg-hover ${t.is_major ? 'border-fire-core/40 bg-gradient-to-r from-bg-card to-fire-core/5' : ''}`}
                >
                  <div className="flex md:flex-col md:text-center md:border-r md:border-white/5 md:pr-4 gap-2 md:gap-0 items-baseline md:items-center">
                    <div className="font-display text-[11px] text-fire-core tracking-wider">
                      {d.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()}
                    </div>
                    <div className="font-display text-2xl md:text-[28px] font-bold text-ivory">
                      {String(d.getDate()).padStart(2, '0')}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display text-base text-ivory tracking-wider flex items-center gap-2 flex-wrap mb-1">
                      {t.name}
                      <span className={`text-[9px] px-2 py-0.5 rounded-sm tracking-[1.5px] font-bold uppercase ${
                        t.is_major ? 'bg-fire-core text-white' :
                        t.is_special ? 'bg-green-400/12 text-green-400' :
                        'bg-fire-core/12 text-fire-core'
                      }`}>
                        {t.format} · {t.is_major ? 'Major' : t.is_special ? 'Raro' : 'Open'}
                      </span>
                    </h4>
                    <div className="text-xs text-ash">
                      {d.toLocaleDateString('es-AR', { weekday: 'long' })} · {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ART · {t.current_slots}/{t.max_slots} {t.format === '2v2' ? 'duplas' : 'equipos'} · {fillPct}% lleno
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-2 h-1 w-32 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-fire-deep to-fire-core" style={{ width: `${fillPct}%` }} />
                    </div>
                  </div>

                  <div className="hidden md:block text-right">
                    <div className="text-[9px] text-ash tracking-wider uppercase">Pool</div>
                    <div className="font-display text-[15px] text-ivory font-semibold">USD {t.prize_pool}</div>
                  </div>
                  <div className="hidden md:block text-right">
                    <div className="text-[9px] text-ash tracking-wider uppercase">Entrada</div>
                    <div className="font-display text-[15px] text-ivory font-semibold">USD {t.entry_fee_usd}</div>
                  </div>

                  <Link href={`/torneos/${t.slug}`}>
                    <button className={`${t.status === 'upcoming' ? 'btn-fire' : 'btn-ghost'} !py-2.5 !px-5 !text-xs w-full md:w-auto`}>
                      {t.status === 'live' ? 'Ver en vivo' : t.current_slots >= t.max_slots ? 'Lleno' : 'Inscribirme'}
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
