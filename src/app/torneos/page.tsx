'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { useCurrency } from '@/components/CurrencyProvider';
import { formatCurrencyAmount, getTournamentEntryAmount, getTournamentPrizePoolAmount } from '@/lib/currency';

type TournamentPreviewEntry = {
  registrationId: string;
  isReady: boolean;
  isPaid: boolean;
  team: { id: string; name: string; tag?: string | null } | null;
  members: Array<{
    id: string;
    profile: {
      id: string;
      display_name?: string | null;
      discord_username?: string | null;
      discord_avatar?: string | null;
      riot_id?: string | null;
      riot_tag?: string | null;
      rank?: string | null;
    } | null;
  }>;
};

export default function TorneosPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teamBoards, setTeamBoards] = useState<Record<string, TournamentPreviewEntry[]>>({});
  const [filter, setFilter] = useState('all');
  const supabase = createClient();
  const { currency } = useCurrency();

  useEffect(() => {
    loadTournaments();
    const channel = supabase.channel('tournaments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => loadTournaments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, () => loadTournaments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invites' }, () => loadTournaments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => loadTournaments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadTournaments() {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .in('status', ['upcoming', 'checkin', 'live'])
      .order('date', { ascending: true });

    const tournamentList = data || [];
    setTournaments(tournamentList);

    const previewEntries = await Promise.all(
      tournamentList.map(async (tournament) => {
        try {
          const response = await fetch(`/api/tournaments/${tournament.id}/teams`);
          const payload = await response.json();
          return [tournament.id, (payload.readyEntries || []) as TournamentPreviewEntry[]] as const;
        } catch {
          return [tournament.id, []] as const;
        }
      })
    );

    setTeamBoards(Object.fromEntries(previewEntries));
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
              const readyTeams = teamBoards[t.id] || [];
              const localizedPool = formatCurrencyAmount(getTournamentPrizePoolAmount(t, currency), currency);
              const localizedEntry = formatCurrencyAmount(getTournamentEntryAmount(t, currency), currency);
              return (
                <div key={t.id} className="space-y-3">
                  <div
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
                      <div className="mt-1 text-[11px] text-green-400">{readyTeams.length} equipos listos para playoff</div>
                      <div className="mt-2 h-1 w-32 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-fire-deep to-fire-core" style={{ width: `${fillPct}%` }} />
                      </div>
                    </div>
                    <div className="hidden md:block text-right">
                      <div className="text-[9px] text-ash tracking-wider uppercase">Pool</div>
                      <div className="font-display text-[15px] text-ivory font-semibold">{localizedPool}</div>
                    </div>
                    <div className="hidden md:block text-right">
                      <div className="text-[9px] text-ash tracking-wider uppercase">Entrada</div>
                      <div className="font-display text-[15px] text-ivory font-semibold">{localizedEntry}</div>
                    </div>

                    <Link href={`/torneos/${t.slug}`}>
                      <button className={`${t.status === 'upcoming' ? 'btn-fire' : 'btn-ghost'} !py-2.5 !px-5 !text-xs w-full md:w-auto`}>
                        {t.status === 'live' ? 'Ver en vivo' : t.current_slots >= t.max_slots ? 'Lleno' : 'Inscribirme'}
                      </button>
                    </Link>
                  </div>

                  <div className="card p-4">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-fire-core">Preview playoff 8 equipos</div>
                      <div className="text-[11px] text-ash">Verde = equipo listo y aceptado</div>
                    </div>
                    <TournamentBracketPreview teams={readyTeams} />
                  </div>
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

function TournamentBracketPreview({ teams }: { teams: TournamentPreviewEntry[] }) {
  const slots = Array.from({ length: 8 }, (_, index) => teams[index] || null);
  const sideAFirst = [slots[0], slots[1]];
  const sideASecond = [slots[2], slots[3]];
  const sideBFirst = [slots[4], slots[5]];
  const sideBSecond = [slots[6], slots[7]];

  return (
    <div className="tournament-bracket-board">
      <BracketSide title="Lado A">
        <BracketPair title="Cruce 1" entries={sideAFirst} />
        <BracketPair title="Cruce 2" entries={sideASecond} />
      </BracketSide>

      <div className="tournament-bracket-center">
        <div className="tournament-bracket-logo">
          <Image
            src="/zona-cup-home-logo.png"
            alt="Zona Cup"
            width={220}
            height={220}
            className="h-20 md:h-24 w-auto object-contain"
            priority={false}
          />
        </div>
        <div className="tournament-bracket-finals">
          <BracketTeamChip entry={null} label="Semi lado A" compact />
          <BracketTeamChip entry={null} label="Semi lado B" compact />
          <BracketTeamChip entry={null} label="Final" final />
        </div>
      </div>

      <BracketSide title="Lado B" align="right">
        <BracketPair title="Cruce 3" entries={sideBFirst} align="right" />
        <BracketPair title="Cruce 4" entries={sideBSecond} align="right" />
      </BracketSide>
    </div>
  );
}

function BracketSide({
  title,
  align = 'left',
  children,
}: {
  title: string;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  return (
    <div className={`tournament-bracket-side ${align === 'right' ? 'items-end' : ''}`}>
      <div className={`tournament-bracket-side-title ${align === 'right' ? 'text-right' : ''}`}>{title}</div>
      {children}
    </div>
  );
}

function BracketPair({
  title,
  entries,
  align = 'left',
}: {
  title: string;
  entries: Array<TournamentPreviewEntry | null>;
  align?: 'left' | 'right';
}) {
  return (
    <div className={`tournament-bracket-pair ${align === 'right' ? 'items-end' : ''}`}>
      <div className={`tournament-bracket-label ${align === 'right' ? 'text-right' : ''}`}>{title}</div>
      <div className="space-y-3 w-full">
        {entries.map((entry, index) => (
          <BracketTeamChip
            key={`${title}-${index}`}
            entry={entry}
            label={`Seed ${index + 1}`}
            align={align}
          />
        ))}
      </div>
    </div>
  );
}

function BracketTeamChip({
  entry,
  label,
  align = 'left',
  compact = false,
  final = false,
}: {
  entry: TournamentPreviewEntry | null;
  label: string;
  align?: 'left' | 'right';
  compact?: boolean;
  final?: boolean;
}) {
  const members = entry?.members || [];

  return (
    <div className={`group relative ${align === 'right' ? 'ml-auto' : ''}`}>
      <div className={`team-chip ${entry ? 'team-chip-ready' : 'team-chip-empty'} ${compact ? 'team-chip-compact' : ''} ${final ? 'team-chip-final' : ''}`}>
        <div className="team-chip-text">
          <span className="team-chip-name">{entry?.team?.name || 'OPEN SLOT'}</span>
          <span className="team-chip-state">{entry ? 'READY' : label.toUpperCase()}</span>
        </div>
      </div>
      {entry && members.length > 0 && (
        <div className={`team-tooltip ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="team-tooltip-title">{entry.team?.name}</div>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="team-tooltip-row">
                {member.profile?.discord_avatar ? (
                  <img src={member.profile.discord_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10" />
                )}
                <div>
                  <div className="text-xs text-ivory">
                    {member.profile?.display_name || member.profile?.discord_username || 'Jugador'}
                  </div>
                  <div className="text-[10px] text-ash">
                    {member.profile?.riot_id
                      ? `${member.profile.riot_id}${member.profile.riot_tag ? `#${member.profile.riot_tag}` : ''}`
                      : 'Riot sin configurar'}
                    {member.profile?.rank ? ` · ${member.profile.rank}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
