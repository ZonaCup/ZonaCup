'use client';

import Countdown from './Countdown';
import Link from 'next/link';

interface TournamentCardProps {
  tournament?: {
    id: string;
    name: string;
    slug: string;
    format: string;
    date: string;
    entry_fee_usd: number;
    entry_fee_ars: number;
    prize_pool: number;
    max_slots: number;
    current_slots: number;
    is_major: boolean;
  };
}

// Default data for when no tournament is passed (demo/placeholder)
const defaultTournament = {
  id: 'demo',
  name: 'Zona Cup Weekly #12',
  slug: 'weekly-12',
  format: '2v2',
  date: new Date(Date.now() + 6 * 86400000).toISOString(),
  entry_fee_usd: 8,
  entry_fee_ars: 11200,
  prize_pool: 512,
  max_slots: 32,
  current_slots: 23,
  is_major: false,
};

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const t = tournament || defaultTournament;
  const fillPercent = Math.round((t.current_slots / t.max_slots) * 100);
  const formatLabel = t.format === '2v2' ? 'duplas' : 'equipos';

  return (
    <div className="card p-6 relative overflow-hidden border-fire-core/20">
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-fire-core to-transparent" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-[7px] h-[7px] bg-fire-core rounded-full animate-pulse-dot" />
          <span className="text-[10px] tracking-[2px] text-fire-core font-bold uppercase">Próximo torneo</span>
        </div>
        <span className="text-[10px] text-ash tracking-wider">{t.format} · Semanal</span>
      </div>

      <h3 className="font-display text-xl font-bold text-ivory tracking-wide mb-1">{t.name}</h3>
      <p className="text-[13px] text-ash mb-5">
        {new Date(t.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date(t.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ART
      </p>

      <div className="mb-5">
        <Countdown targetDate={t.date} />
      </div>

      <div className="bg-bg-deep rounded p-3.5 mb-3">
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] text-ash tracking-[1.5px] uppercase">Pool de premios</span>
          <span className="text-[10px] text-green-400">+$40 por {t.format === '2v2' ? 'dupla' : 'equipo'}</span>
        </div>
        <div className="font-display text-3xl font-bold text-ivory mb-2.5">USD {t.prize_pool}</div>
        <div className="progress-bar mb-1.5">
          <div className="progress-fill" style={{ width: `${fillPercent}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-ash">
          <span>{t.current_slots} / {t.max_slots} {formatLabel}</span>
          <span className="text-ivory">{fillPercent}% lleno</span>
        </div>
      </div>

      <div className="flex justify-between py-2.5 text-[13px] border-t border-white/5 mt-1.5">
        <span className="text-ash">Entrada por jugador</span>
        <span className="text-ivory font-bold">USD {t.entry_fee_usd} · ${t.entry_fee_ars?.toLocaleString()} ARS</span>
      </div>

      <Link href={`/torneos/${t.slug}`}>
        <button className="btn-fire w-full mt-2.5 !tracking-[1px]">Asegurar mi lugar</button>
      </Link>
    </div>
  );
}
