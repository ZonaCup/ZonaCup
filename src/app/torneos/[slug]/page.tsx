'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Countdown from '@/components/Countdown';

type Entrant = {
  id: string;
  created_at: string;
  payment_status: string;
  team: { id: string; name: string; tag?: string | null } | null;
  player: { display_name?: string | null; discord_username?: string | null } | null;
};

type BracketMatch = {
  id: string;
  round: number;
  match_number: number;
  status: string;
  score_a: number | null;
  score_b: number | null;
  team_a: { id: string; name: string; tag?: string | null } | null;
  team_b: { id: string; name: string; tag?: string | null } | null;
  winner: { id: string; name: string; tag?: string | null } | null;
};

export default function TorneoDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [tournament, setTournament] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRegistration, setUserRegistration] = useState<any>(null);
  const [entrants, setEntrants] = useState<Entrant[]>([]);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('payment'));

  const slug = String(params.slug);

  useEffect(() => {
    loadData();
  }, [slug]);

  useEffect(() => {
    if (!tournament?.id) return;

    const tournamentChannel = supabase
      .channel(`tournament-${tournament.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tournament.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `tournament_id=eq.${tournament.id}` }, () => loadEntrantsAndRegistration(tournament.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournament.id}` }, () => loadBracket(tournament.id, tournament.status))
      .subscribe();

    return () => {
      supabase.removeChannel(tournamentChannel);
    };
  }, [tournament?.id, tournament?.status]);

  async function loadData() {
    setLoading(true);

    const { data: tournamentData } = await supabase
      .from('tournaments')
      .select('*')
      .eq('slug', slug)
      .single();

    setTournament(tournamentData);

    const { data: authData } = await supabase.auth.getUser();
    setUser(authData.user);
    setIsAdmin(false);

    if (authData.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', authData.user.id)
        .single();
      setIsAdmin(Boolean(profile?.is_admin));
    }

    if (tournamentData) {
      await Promise.all([
        loadEntrantsAndRegistration(tournamentData.id, authData.user?.id),
        loadBracket(tournamentData.id, tournamentData.status),
      ]);
    } else {
      setEntrants([]);
      setMatches([]);
      setUserRegistration(null);
    }

    setLoading(false);
  }

  async function loadEntrantsAndRegistration(tournamentId: string, userId?: string) {
    const [{ data: registrations }, registrationResult] = await Promise.all([
      supabase
        .from('registrations')
        .select(`
          id,
          created_at,
          payment_status,
          team:teams!registrations_team_id_fkey(id, name, tag),
          player:profiles!registrations_user_id_fkey(display_name, discord_username)
        `)
        .eq('tournament_id', tournamentId)
        .eq('payment_status', 'approved')
        .order('created_at', { ascending: true }),
      userId
        ? supabase
            .from('registrations')
            .select('id, payment_status, payment_id, team_id')
            .eq('tournament_id', tournamentId)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setEntrants(
      ((registrations || []) as any[]).map((registration) => ({
        ...registration,
        team: Array.isArray(registration.team) ? registration.team[0] || null : registration.team,
        player: Array.isArray(registration.player) ? registration.player[0] || null : registration.player,
      })) as Entrant[]
    );
    setUserRegistration(registrationResult?.data || null);
  }

  async function loadBracket(tournamentId: string, status: string) {
    if (status === 'live') {
      const res = await fetch(`/api/tournaments/${tournamentId}/playoff`);
      const data = await res.json();
      setMatches(
        ((data.matches || []) as any[]).map((match) => ({
          ...match,
          team_a: Array.isArray(match.team_a) ? match.team_a[0] || null : match.team_a,
          team_b: Array.isArray(match.team_b) ? match.team_b[0] || null : match.team_b,
          winner: Array.isArray(match.winner) ? match.winner[0] || null : match.winner,
        })) as BracketMatch[]
      );
      return;
    }

    const { data } = await supabase
      .from('matches')
      .select(`
        id,
        round,
        match_number,
        status,
        score_a,
        score_b,
        team_a:teams!matches_team_a_id_fkey(id, name, tag),
        team_b:teams!matches_team_b_id_fkey(id, name, tag),
        winner:teams!matches_winner_id_fkey(id, name, tag)
      `)
      .eq('tournament_id', tournamentId)
      .order('round', { ascending: true })
      .order('match_number', { ascending: true });

    setMatches(
      ((data || []) as any[]).map((match) => ({
        ...match,
        team_a: Array.isArray(match.team_a) ? match.team_a[0] || null : match.team_a,
        team_b: Array.isArray(match.team_b) ? match.team_b[0] || null : match.team_b,
        winner: Array.isArray(match.winner) ? match.winner[0] || null : match.winner,
      })) as BracketMatch[]
    );
  }

  async function handleRegister() {
    if (!user) {
      await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(`/torneos/${slug}`)}`,
        },
      });
      return;
    }

    if (!tournament?.id) return;

    setRegistering(true);
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: tournament.id }),
      });
      const data = await res.json();

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }

      alert(data.error || 'Error al crear inscripcion');
    } catch {
      alert('Error de conexion');
    } finally {
      setRegistering(false);
    }
  }

  async function handleMatchUpdate(matchId: string, payload: { scoreA: number | string; scoreB: number | string; winnerId: string; }) {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scoreA: payload.scoreA,
        scoreB: payload.scoreB,
        winnerId: payload.winnerId,
        status: 'finished',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'No se pudo guardar el resultado');
      return;
    }

    await loadBracket(tournament.id, tournament.status);
  }

  const groupedMatches = useMemo(() => {
    return matches.reduce<Record<number, BracketMatch[]>>((acc, match) => {
      acc[match.round] = acc[match.round] || [];
      acc[match.round].push(match);
      return acc;
    }, {});
  }, [matches]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-20 px-5 md:px-10 max-w-6xl mx-auto text-center">
          <div className="font-display text-lg text-ash animate-pulse">Cargando torneo...</div>
        </main>
      </>
    );
  }

  if (!tournament) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-20 px-5 md:px-10 max-w-5xl mx-auto text-center">
          <h1 className="section-title">Torneo no encontrado</h1>
          <p className="text-ash">Este torneo no existe o fue eliminado.</p>
        </main>
        <Footer />
      </>
    );
  }

  const fillPct = tournament.max_slots > 0 ? Math.round((tournament.current_slots / tournament.max_slots) * 100) : 0;
  const d = new Date(tournament.date);
  const registrationLabel =
    userRegistration?.payment_status === 'approved'
      ? 'Ya estas inscripto'
      : userRegistration?.payment_status === 'pending'
        ? 'Pago pendiente'
        : user
          ? 'Inscribirme y pagar'
          : 'Ingresar con Discord para inscribirme';

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-6xl mx-auto">
        {paymentStatus === 'success' && (
          <div className="mb-6 p-4 rounded bg-green-400/10 border border-green-400/30 text-green-400 text-sm font-semibold text-center">
            Pago confirmado. Tu lugar en el torneo ya quedo registrado.
          </div>
        )}
        {paymentStatus === 'failure' && (
          <div className="mb-6 p-4 rounded bg-red-400/10 border border-red-400/30 text-red-400 text-sm font-semibold text-center">
            El pago fue rechazado. Podes intentar nuevamente desde este torneo.
          </div>
        )}
        {paymentStatus === 'pending' && (
          <div className="mb-6 p-4 rounded bg-gold/10 border border-gold/30 text-gold text-sm font-semibold text-center">
            Pago pendiente. Cuando Mercado Pago lo confirme vas a aparecer como inscripto automaticamente.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-10">
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className={`text-[10px] px-3 py-1 rounded-sm tracking-[1.5px] font-bold uppercase ${
                  tournament.is_major ? 'bg-fire-core text-white' :
                  tournament.is_special ? 'bg-green-400/12 text-green-400' :
                  'bg-fire-core/12 text-fire-core'
                }`}>
                  {tournament.format} · {tournament.is_major ? 'Major' : tournament.is_special ? 'Especial' : 'Open'}
                </span>
                <span className={`text-[10px] px-3 py-1 rounded-sm tracking-[1.5px] font-bold uppercase ${
                  tournament.status === 'live' ? 'bg-green-400/12 text-green-400' :
                  tournament.status === 'upcoming' ? 'bg-fire-core/12 text-fire-core' :
                  'bg-white/5 text-ash'
                }`}>
                  {tournament.status === 'live' ? 'En vivo' : tournament.status === 'upcoming' ? 'Abierto' : tournament.status}
                </span>
              </div>

              <h1 className="font-display text-3xl md:text-5xl font-bold text-ivory tracking-wider uppercase mb-2">
                {tournament.name}
              </h1>
              <p className="text-lg text-smoke mb-6">
                {d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ART
              </p>
              <p className="text-sm text-ash leading-relaxed max-w-3xl">
                {tournament.description || 'Inscripcion con Discord + Mercado Pago. Cada pago aprobado ocupa un lugar real en la base y alimenta el playoff del torneo.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <div className="text-[10px] text-ash tracking-[1.5px] uppercase mb-2">Equipos confirmados</div>
                <div className="font-display text-4xl text-ivory">{entrants.length}</div>
                <div className="text-xs text-ash mt-1">de {tournament.max_slots} lugares</div>
              </div>
              <div className="card p-5">
                <div className="text-[10px] text-ash tracking-[1.5px] uppercase mb-2">Formato</div>
                <div className="font-display text-2xl text-ivory">{tournament.format}</div>
                <div className="text-xs text-ash mt-1">Playoff hasta 8 equipos</div>
              </div>
              <div className="card p-5">
                <div className="text-[10px] text-ash tracking-[1.5px] uppercase mb-2">Pozo actual</div>
                <div className="font-display text-4xl text-ivory">USD {tournament.prize_pool}</div>
                <div className="text-xs text-ash mt-1">Se lee desde la misma DB</div>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <div className="section-tag !mb-1">Inscriptos</div>
                  <h2 className="font-display text-2xl text-ivory tracking-wider uppercase">Equipos y lugares ocupados</h2>
                </div>
                <div className="text-xs text-ash">{entrants.length} confirmados</div>
              </div>

              {entrants.length === 0 ? (
                <div className="card p-6 text-sm text-ash">Todavia no hay pagos aprobados para este torneo.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {entrants.map((entrant, index) => (
                    <div key={entrant.id} className="card p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[10px] tracking-[0.2em] uppercase text-fire-core mb-1">Slot #{String(index + 1).padStart(2, '0')}</div>
                        <div className="font-display text-lg text-ivory tracking-wide uppercase">
                          {entrant.team?.name || entrant.player?.display_name || 'Equipo confirmado'}
                        </div>
                        <div className="text-xs text-ash">
                          Pago aprobado · {new Date(entrant.created_at).toLocaleDateString('es-AR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-ash">Estado</div>
                        <div className="text-sm font-semibold text-green-400">Confirmado</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <div className="section-tag !mb-1">Playoff</div>
                  <h2 className="font-display text-2xl text-ivory tracking-wider uppercase">Bracket automatico</h2>
                </div>
                <div className="text-xs text-ash">
                  {tournament.status === 'live' ? 'Se actualiza desde la DB en tiempo real' : 'Se genera al pasar el torneo a live'}
                </div>
              </div>

              {matches.length === 0 ? (
                <div className="card p-6 text-sm text-ash">
                  {tournament.status === 'live'
                    ? 'Todavia no hay suficientes equipos aprobados para generar el playoff.'
                    : 'El bracket aparecera automaticamente cuando el torneo pase a live.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((round) => (
                    <div key={round} className="card p-4">
                      <div className="text-[10px] tracking-[0.22em] uppercase text-fire-core mb-3">
                        {round === 1 ? 'Cuartos' : round === 2 ? 'Semifinal' : 'Final'}
                      </div>
                      <div className="space-y-3">
                        {(groupedMatches[round] || []).map((match) => (
                          <div key={match.id} className="rounded border border-white/5 bg-bg-deep p-3">
                            <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-ash mb-2">
                              <span>Match {match.match_number}</span>
                              <span>{match.status}</span>
                            </div>
                            <div className={`flex items-center justify-between text-sm py-1 ${match.winner?.id === match.team_a?.id ? 'text-green-400' : 'text-ivory'}`}>
                              <span>{match.team_a?.name || 'Por definir'}</span>
                              <span>{match.score_a ?? '-'}</span>
                            </div>
                            <div className={`flex items-center justify-between text-sm py-1 ${match.winner?.id === match.team_b?.id ? 'text-green-400' : 'text-ivory'}`}>
                              <span>{match.team_b?.name || 'Por definir'}</span>
                              <span>{match.score_b ?? '-'}</span>
                            </div>
                            {isAdmin && tournament.status === 'live' && match.team_a && match.team_b && (
                              <AdminMatchEditor match={match} onSave={handleMatchUpdate} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <div className="card p-6 border-fire-core/20 relative overflow-hidden sticky top-20">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-fire-core to-transparent" />

              {tournament.status !== 'finished' && (
                <div className="mb-5">
                  <Countdown targetDate={tournament.date} />
                </div>
              )}

              <div className="bg-bg-deep rounded p-4 mb-4">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[10px] text-ash tracking-[1.5px] uppercase">Pool de premios</span>
                  <span className="text-[10px] text-green-400">Base de datos viva</span>
                </div>
                <div className="font-display text-3xl font-bold text-ivory mb-3">USD {tournament.prize_pool}</div>
                <div className="progress-bar mb-1.5">
                  <div className="progress-fill" style={{ width: `${fillPct}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-ash">
                  <span>{tournament.current_slots} / {tournament.max_slots} equipos</span>
                  <span className="text-ivory">{fillPct}% lleno</span>
                </div>
              </div>

              <div className="space-y-2 text-[13px] mb-4">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-ash">Formato</span>
                  <span className="text-ivory font-semibold">{tournament.format} · Playoff hasta 8 equipos</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-ash">Entrada</span>
                  <span className="text-ivory font-semibold">USD {tournament.entry_fee_usd}</span>
                </div>
                {tournament.entry_fee_ars && (
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-ash">En ARS</span>
                    <span className="text-ivory font-semibold">${tournament.entry_fee_ars?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-ash">Tu estado</span>
                  <span className={`font-semibold ${
                    userRegistration?.payment_status === 'approved' ? 'text-green-400' :
                    userRegistration?.payment_status === 'pending' ? 'text-gold' :
                    'text-ivory'
                  }`}>
                    {userRegistration?.payment_status === 'approved'
                      ? 'Confirmado'
                      : userRegistration?.payment_status === 'pending'
                        ? 'Pendiente'
                        : 'Sin inscripcion'}
                  </span>
                </div>
              </div>

              {tournament.current_slots < tournament.max_slots && tournament.status !== 'finished' ? (
                <button
                  onClick={handleRegister}
                  disabled={registering || userRegistration?.payment_status === 'approved'}
                  className="btn-fire w-full !tracking-wider disabled:opacity-60"
                >
                  {registering ? 'Procesando...' : registrationLabel}
                </button>
              ) : (
                <button disabled className="btn-ghost w-full opacity-50 cursor-not-allowed">Inscripciones cerradas</button>
              )}

              <p className="text-[11px] text-ash text-center mt-3">
                Si ya estas logueado con Discord, al pagar se te registra automaticamente el pago, el torneo y tu lugar.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function AdminMatchEditor({
  match,
  onSave,
}: {
  match: BracketMatch;
  onSave: (matchId: string, payload: { scoreA: number | string; scoreB: number | string; winnerId: string }) => Promise<void>;
}) {
  const [scoreA, setScoreA] = useState<number | string>(match.score_a ?? '');
  const [scoreB, setScoreB] = useState<number | string>(match.score_b ?? '');
  const [winnerId, setWinnerId] = useState(match.winner?.id || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setScoreA(match.score_a ?? '');
    setScoreB(match.score_b ?? '');
    setWinnerId(match.winner?.id || '');
  }, [match.id, match.score_a, match.score_b, match.winner?.id]);

  return (
    <div className="mt-3 border-t border-white/5 pt-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-fire-core mb-2">Admin</div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <input
          type="number"
          min="0"
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded px-2 py-2 text-sm text-ivory focus:outline-none focus:border-fire-core/50"
          placeholder="Score A"
        />
        <input
          type="number"
          min="0"
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded px-2 py-2 text-sm text-ivory focus:outline-none focus:border-fire-core/50"
          placeholder="Score B"
        />
      </div>
      <select
        value={winnerId}
        onChange={(e) => setWinnerId(e.target.value)}
        className="w-full bg-black/20 border border-white/10 rounded px-2 py-2 text-sm text-ivory focus:outline-none focus:border-fire-core/50 mb-2"
      >
        <option value="">Elegir ganador</option>
        {match.team_a && <option value={match.team_a.id}>{match.team_a.name}</option>}
        {match.team_b && <option value={match.team_b.id}>{match.team_b.name}</option>}
      </select>
      <button
        className="btn-ghost !py-2 !px-4 !text-xs w-full"
        disabled={saving || !winnerId}
        onClick={async () => {
          setSaving(true);
          await onSave(match.id, { scoreA, scoreB, winnerId });
          setSaving(false);
        }}
      >
        {saving ? 'Guardando...' : 'Guardar resultado'}
      </button>
    </div>
  );
}
