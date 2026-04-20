'use client';

import { useEffect, useMemo, useState } from 'react';
import Countdown from './Countdown';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

interface Tournament {
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
}

interface TournamentCardProps {
  tournament?: Tournament;
}

const defaultTournament: Tournament = {
  id: '1RO',
  name: 'TORNEO #1 / MAYO',
  slug: 'torneo-1-mayo',
  format: '2v2',
  date: '2026-05-02T23:50:00-03:00',
  entry_fee_usd: 8,
  entry_fee_ars: 11200,
  prize_pool: 512,
  max_slots: 8,
  current_slots: 0,
  is_major: false,
};

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const [liveTournament, setLiveTournament] = useState<Tournament | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (tournament) return;

    async function loadTournament() {
      const { data } = await supabase
        .from('tournaments')
        .select('id,name,slug,format,date,entry_fee_usd,entry_fee_ars,prize_pool,max_slots,current_slots,is_major')
        .in('status', ['upcoming', 'checkin', 'live'])
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        setLiveTournament(data as Tournament);
      }
    }

    loadTournament();
  }, [tournament]);

  const t = tournament || liveTournament || defaultTournament;
  const fillPercent = t.max_slots > 0 ? Math.round((t.current_slots / t.max_slots) * 100) : 0;
  const formatLabel = t.format === '2v2' ? 'duplas' : 'equipos';

  return (
    <div className="card p-7 md:p-8 relative overflow-hidden border-fire-core/20 min-h-[580px] md:min-h-[650px] flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-fire-core to-transparent" />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-1.5">
          <div className="w-[7px] h-[7px] bg-fire-core rounded-full animate-pulse-dot" />
          <span className="text-[10px] tracking-[2px] text-fire-core font-bold uppercase">Proximo torneo</span>
        </div>
        <span className="text-[10px] text-ash tracking-wider">{t.format} · Semanal</span>
      </div>

      <h3 className="font-display text-[32px] md:text-[38px] leading-none font-bold text-ivory tracking-wide mb-2">{t.name}</h3>
      <p className="text-[14px] text-ash mb-7">
        {new Date(t.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date(t.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ART
      </p>

      <div className="mb-7">
        <Countdown targetDate={t.date} />
      </div>

      <div className="bg-bg-deep rounded p-4 md:p-5 mb-4">
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] text-ash tracking-[1.5px] uppercase">Pool de premios</span>
          <span className="text-[10px] text-green-400">+$40 por {t.format === '2v2' ? 'dupla' : 'equipo'}</span>
        </div>
        <div className="font-display text-4xl md:text-5xl font-bold text-ivory mb-4">USD {t.prize_pool}</div>
        <div className="progress-bar mb-2">
          <div className="progress-fill" style={{ width: `${fillPercent}%` }} />
        </div>
        <div className="flex justify-between text-[11px] text-ash">
          <span>{t.current_slots} / {t.max_slots} {formatLabel}</span>
          <span className="text-ivory">{fillPercent}% lleno</span>
        </div>
      </div>

      <div className="flex justify-between py-4 text-[14px] border-t border-white/5 mt-auto">
        <span className="text-ash">Entrada por jugador</span>
        <span className="text-ivory font-bold">USD {t.entry_fee_usd} · ${t.entry_fee_ars?.toLocaleString()} ARS</span>
      </div>

      <Link href={`/torneos/${t.slug}`}>
        <button className="btn-fire w-full mt-3 !tracking-[1px] !py-4 !text-base">Asegurar mi lugar</button>
      </Link>
    </div>
  );
}
