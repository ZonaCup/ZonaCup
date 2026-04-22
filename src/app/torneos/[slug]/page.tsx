'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Countdown from '@/components/Countdown';
import { useCurrency } from '@/components/CurrencyProvider';
import { formatCurrencyAmount, getTournamentEntryAmount, getTournamentPrizePoolAmount } from '@/lib/currency';

type TeamBoardEntry = {
  registrationId: string;
  createdAt: string;
  paymentStatus: string;
  isPaid: boolean;
  isReady: boolean;
  acceptedCount: number;
  pendingCount: number;
  rejectedCount: number;
  team: { id: string; name: string; tag?: string | null } | null;
  captain: {
    id: string;
    display_name?: string | null;
    discord_username?: string | null;
    discord_avatar?: string | null;
    riot_id?: string | null;
    riot_tag?: string | null;
    rank?: string | null;
  } | null;
  members: Array<{
    id: string;
    role: string;
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
  invites: Array<{
    id: string;
    status: string;
    invited_user_id: string;
    invited: PlayerOption | null;
  }>;
};

type PlayerOption = {
  id: string;
  display_name?: string | null;
  discord_username?: string | null;
  discord_avatar?: string | null;
  riot_id?: string | null;
  riot_tag?: string | null;
  rank?: string | null;
};

type TeamInvite = {
  id: string;
  status: string;
  team_id: string;
  team?: { id: string; name: string } | null;
  invited?: PlayerOption | null;
  invited_by?: PlayerOption | null;
  tournament?: { id: string; name: string; slug: string } | null;
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
  const { currency, rates } = useCurrency();

  const [tournament, setTournament] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRegistration, setUserRegistration] = useState<any>(null);
  const [teamBoard, setTeamBoard] = useState<TeamBoardEntry[]>([]);
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('payment'));
  const [teammateQuery, setTeammateQuery] = useState('');
  const [teamName, setTeamName] = useState('');
  const [playerOptions, setPlayerOptions] = useState<PlayerOption[]>([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerOption[]>([]);
  const [captainInvites, setCaptainInvites] = useState<TeamInvite[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<TeamInvite[]>([]);
  const [creatingInvites, setCreatingInvites] = useState(false);

  const slug = String(params.slug);

  useEffect(() => {
    loadData();
  }, [slug]);

  useEffect(() => {
    if (!user || !tournament) return;
    const delay = setTimeout(() => {
      void searchPlayers(teammateQuery);
    }, 250);
    return () => clearTimeout(delay);
  }, [teammateQuery, user?.id, tournament?.id, selectedPlayers.length, captainInvites.length]);

  useEffect(() => {
    if (!tournament?.id) return;

    const tournamentChannel = supabase
      .channel(`tournament-${tournament.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tournament.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `tournament_id=eq.${tournament.id}` }, () => loadTeamBoardAndRegistration(tournament.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invites', filter: `tournament_id=eq.${tournament.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => loadData())
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
        loadTeamBoardAndRegistration(tournamentData.id, authData.user?.id),
        loadBracket(tournamentData.id, tournamentData.status),
        loadInviteState(tournamentData.id, authData.user?.id),
      ]);
    } else {
      setTeamBoard([]);
      setMatches([]);
      setUserRegistration(null);
      setCaptainInvites([]);
      setIncomingInvites([]);
    }

    setLoading(false);
  }

  async function loadInviteState(tournamentId: string, userId?: string) {
    if (!userId) {
      setCaptainInvites([]);
      setIncomingInvites([]);
      return;
    }

    const [captainResult, incomingResult] = await Promise.all([
      supabase
        .from('team_invites')
        .select(`
          id,
          status,
          team_id,
          team:teams!team_invites_team_id_fkey(id, name),
          invited:profiles!team_invites_invited_user_id_fkey(id, display_name, discord_username, discord_avatar, riot_id, riot_tag)
        `)
        .eq('tournament_id', tournamentId)
        .eq('invited_by_user_id', userId)
        .order('created_at', { ascending: true }),
      supabase
        .from('team_invites')
        .select(`
          id,
          status,
          team_id,
          team:teams!team_invites_team_id_fkey(id, name),
          invited_by:profiles!team_invites_invited_by_user_id_fkey(id, display_name, discord_username, discord_avatar, riot_id, riot_tag),
          tournament:tournaments!team_invites_tournament_id_fkey(id, name, slug)
        `)
        .eq('tournament_id', tournamentId)
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    setCaptainInvites(
      ((captainResult.data || []) as any[]).map((invite) => ({
        ...invite,
        team: Array.isArray(invite.team) ? invite.team[0] || null : invite.team,
        invited: Array.isArray(invite.invited) ? invite.invited[0] || null : invite.invited,
      }))
    );
    setIncomingInvites(
      ((incomingResult.data || []) as any[]).map((invite) => ({
        ...invite,
        team: Array.isArray(invite.team) ? invite.team[0] || null : invite.team,
        invited_by: Array.isArray(invite.invited_by) ? invite.invited_by[0] || null : invite.invited_by,
        tournament: Array.isArray(invite.tournament) ? invite.tournament[0] || null : invite.tournament,
      }))
    );
  }

  async function loadTeamBoardAndRegistration(tournamentId: string, userId?: string) {
    const [teamBoardResult, registrationResult] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}/teams`).then((res) => res.json()),
      userId
        ? (async () => {
            const { data: memberships } = await supabase
              .from('team_members')
              .select('team_id')
              .eq('user_id', userId);

            const teamIds = (memberships || []).map((membership) => membership.team_id);
            if (teamIds.length === 0) return { data: null };

            return supabase
              .from('registrations')
              .select('id, payment_status, payment_id, team_id')
              .eq('tournament_id', tournamentId)
              .in('team_id', teamIds)
              .neq('payment_status', 'rejected')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
          })()
        : Promise.resolve({ data: null }),
    ]);

    setTeamBoard(((teamBoardResult.entries || []) as TeamBoardEntry[]));
    setUserRegistration(registrationResult?.data || null);
  }

  async function searchPlayers(query: string) {
    if (!user || !tournament) return;

    const requiredTeammates = tournament.format === '5v5' ? 4 : 1;
    if (selectedPlayers.length >= requiredTeammates) {
      setPlayerOptions([]);
      return;
    }

    if (!query.trim()) {
      setPlayerOptions([]);
      return;
    }

    setSearchingPlayers(true);
    const normalized = query.trim();
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, discord_username, discord_avatar, riot_id, riot_tag, rank')
      .or(`display_name.ilike.%${normalized}%,discord_username.ilike.%${normalized}%,riot_id.ilike.%${normalized}%`)
      .neq('id', user.id)
      .limit(8);

    const excludedIds = new Set(selectedPlayers.map((player) => player.id));
    setPlayerOptions(((data || []) as PlayerOption[]).filter((player) => !excludedIds.has(player.id)));
    setSearchingPlayers(false);
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
        body: JSON.stringify({
          tournamentId: tournament.id,
          teamId: captainInvites[0]?.team_id,
        }),
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

  async function handleCreateInvites() {
    if (!tournament?.id || !user) return;

    setCreatingInvites(true);
    try {
      const res = await fetch('/api/team-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: String(tournament.id || ''),
          tournamentSlug: slug,
          teammateIds: selectedPlayers.map((player) => player.id),
          teamName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'No se pudieron enviar las invitaciones');
        return;
      }

      setSelectedPlayers([]);
      setTeammateQuery('');
      setTeamName('');
      setPlayerOptions([]);
      await loadInviteState(tournament.id, user.id);
    } finally {
      setCreatingInvites(false);
    }
  }

  async function handleInviteResponse(inviteId: string, action: 'accept' | 'reject') {
    const res = await fetch(`/api/team-invites/${inviteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'No se pudo responder la invitacion');
      return;
    }
    await loadData();
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
  const requiredTeammates = tournament.format === '5v5' ? 4 : 1;
  const teamReadyForPayment = captainInvites.length === requiredTeammates;
  const canCreateInvites = selectedPlayers.length === requiredTeammates && captainInvites.length === 0;
  const canRetryPayment = userRegistration?.payment_status === 'pending' && paymentStatus === 'failure';
  const effectivePaymentState = canRetryPayment ? 'retryable' : userRegistration?.payment_status || null;
  const canManageTeam = Boolean(user) && effectivePaymentState !== 'approved';
  const readyTeams = teamBoard.filter((entry) => entry.isReady);
  const paidTeams = teamBoard.filter((entry) => entry.isPaid);
  const currentTeamStatus = userRegistration?.team_id
    ? teamBoard.find((entry) => entry.team?.id === userRegistration.team_id) || null
      : null;
  const registrationLabel =
    effectivePaymentState === 'approved'
      ? 'Ya estas inscripto'
      : effectivePaymentState === 'retryable'
        ? 'Reintentar pago'
        : effectivePaymentState === 'pending'
          ? 'Pago pendiente'
        : user
          ? 'Inscribirme y pagar'
          : 'Ingresar con Discord para inscribirme';
  const localizedEntry = formatCurrencyAmount(getTournamentEntryAmount(tournament, currency, rates), currency);
  const localizedPool = formatCurrencyAmount(getTournamentPrizePoolAmount(tournament, currency, rates), currency);

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
                <div className="text-[10px] text-ash tracking-[1.5px] uppercase mb-2">Equipos listos</div>
                <div className="font-display text-4xl text-ivory">{readyTeams.length}</div>
                <div className="text-xs text-ash mt-1">pagados y aceptados completos</div>
              </div>
              <div className="card p-5">
                <div className="text-[10px] text-ash tracking-[1.5px] uppercase mb-2">Formato</div>
                <div className="font-display text-2xl text-ivory">{tournament.format}</div>
                <div className="text-xs text-ash mt-1">Playoff hasta 8 equipos</div>
              </div>
              <div className="card p-5">
                <div className="text-[10px] text-ash tracking-[1.5px] uppercase mb-2">Pozo actual</div>
                <div className="font-display text-4xl text-ivory">{localizedPool}</div>
                <div className="text-xs text-ash mt-1">Se lee desde la misma DB</div>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <div className="section-tag !mb-1">Playoff</div>
                  <h2 className="font-display text-2xl text-ivory tracking-wider uppercase">Bracket automatico</h2>
                </div>
                <div className="text-xs text-ash">
                  {tournament.status === 'live' ? 'Se actualiza desde la DB en tiempo real' : 'Preview vivo con equipos listos para entrar'}
                </div>
              </div>

              {matches.length === 0 ? (
                <BracketPreview teams={readyTeams} />
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
                <div className="font-display text-3xl font-bold text-ivory mb-3">{localizedPool}</div>
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
                  <span className="text-ivory font-semibold">{localizedEntry}</span>
                </div>
                {currency !== 'USD' && (
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-ash">Base USD</span>
                    <span className="text-ivory font-semibold">{formatCurrencyAmount(Number(tournament.entry_fee_usd || 0), 'USD')}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-ash">Tu estado</span>
                  <span className={`font-semibold ${
                    effectivePaymentState === 'approved' ? 'text-green-400' :
                    effectivePaymentState === 'retryable' ? 'text-red-400' :
                    effectivePaymentState === 'pending' ? 'text-gold' :
                    'text-ivory'
                  }`}>
                    {effectivePaymentState === 'approved'
                      ? 'Confirmado'
                      : effectivePaymentState === 'retryable'
                        ? 'Pago rechazado'
                      : effectivePaymentState === 'pending'
                        ? 'Pendiente'
                        : 'Sin inscripcion'}
                  </span>
                </div>
                {currentTeamStatus && (
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-ash">Equipo</span>
                    <span className={`font-semibold ${currentTeamStatus.isReady ? 'text-green-400' : 'text-gold'}`}>
                      {currentTeamStatus.isReady ? 'Listo para bracket' : 'Esperando aceptaciones'}
                    </span>
                  </div>
                )}
              </div>

              {canManageTeam && (
                <div className="mb-4 rounded border border-white/8 bg-bg-deep p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-fire-core mb-3">
                    {tournament.format === '5v5' ? 'Arma tu roster' : 'Elegi tu duo'}
                  </div>
                  <div className="text-xs text-ash mb-3">
                    {tournament.format === '5v5'
                      ? 'Selecciona 4 jugadores ya registrados en la web. Un solo pago inscribe al equipo completo.'
                      : 'Selecciona 1 jugador ya registrado en la web. Un solo pago inscribe a ambos.'}
                  </div>

                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    maxLength={32}
                    placeholder="Nombre del equipo"
                    className="w-full mb-3 bg-black/20 border border-white/10 rounded px-3 py-2.5 text-sm text-ivory focus:outline-none focus:border-fire-core/50"
                  />

                  <input
                    type="text"
                    value={teammateQuery}
                    onChange={(e) => setTeammateQuery(e.target.value)}
                    placeholder="Buscar por Discord, Riot o nombre"
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2.5 text-sm text-ivory focus:outline-none focus:border-fire-core/50"
                  />

                  {selectedPlayers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedPlayers.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => setSelectedPlayers((current) => current.filter((item) => item.id !== player.id))}
                          className="rounded-full border border-fire-core/30 bg-fire-core/10 px-3 py-1.5 text-xs text-fire-core"
                        >
                          {(player.display_name || player.discord_username || player.riot_id || 'Jugador')} ×
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    {searchingPlayers && <div className="text-xs text-ash">Buscando jugadores...</div>}
                    {!searchingPlayers && playerOptions.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlayers((current) => [...current, player]);
                          setTeammateQuery('');
                          setPlayerOptions([]);
                        }}
                        className="w-full text-left rounded border border-white/8 bg-black/20 px-3 py-2 hover:border-fire-core/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {player.discord_avatar ? (
                            <img src={player.discord_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-white/10" />
                          )}
                          <div>
                            <div className="text-sm text-ivory">
                              {player.display_name || player.discord_username || player.riot_id || 'Jugador'}
                            </div>
                            <div className="text-[11px] text-ash">
                              {player.discord_username || 'Sin Discord visible'}
                              {player.riot_id ? ` · ${player.riot_id}${player.riot_tag ? `#${player.riot_tag}` : ''}` : ''}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 text-xs text-ash">
                    {selectedPlayers.length}/{requiredTeammates} companeros seleccionados
                  </div>

                  {captainInvites.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-fire-core">Invitaciones enviadas</div>
                      {captainInvites.map((invite) => (
                        <div key={invite.id} className="flex items-center justify-between gap-3 rounded border border-white/8 bg-black/20 px-3 py-2">
                          <div className="flex items-center gap-3">
                            {invite.invited?.discord_avatar ? (
                              <img src={invite.invited.discord_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-white/10" />
                            )}
                            <div>
                              <div className="text-sm text-ivory">
                                {invite.invited?.display_name || invite.invited?.discord_username || invite.invited?.riot_id || 'Jugador'}
                              </div>
                              <div className="text-[11px] text-ash">
                                {invite.invited?.discord_username || 'Sin Discord visible'}
                              </div>
                            </div>
                          </div>
                          <div className={`text-xs font-semibold ${
                            invite.status === 'accepted' ? 'text-green-400' :
                            invite.status === 'rejected' ? 'text-red-400' :
                            'text-gold'
                          }`}>
                            {invite.status === 'accepted' ? 'Aceptado' : invite.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {incomingInvites.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-fire-core">Te invitaron</div>
                      {incomingInvites.map((invite) => (
                        <div key={invite.id} className="rounded border border-white/8 bg-black/20 px-3 py-3">
                          <div className="text-sm text-ivory mb-1">
                            {invite.invited_by?.display_name || invite.invited_by?.discord_username || 'Jugador'} te invito a {invite.team?.name || 'un equipo'}
                          </div>
                          <div className="text-[11px] text-ash mb-3">
                            Acepta para que el equipo quede listo y aparezca en la grilla/playoff del torneo.
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleInviteResponse(invite.id, 'accept')} className="btn-fire !py-2 !px-4 !text-xs">Aceptar</button>
                            <button onClick={() => handleInviteResponse(invite.id, 'reject')} className="btn-ghost !py-2 !px-4 !text-xs">Rechazar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {canManageTeam && captainInvites.length === 0 && (
                <button
                  onClick={handleCreateInvites}
                  disabled={creatingInvites || !canCreateInvites}
                  className="btn-ghost w-full !tracking-wider disabled:opacity-60 mb-3"
                >
                  {creatingInvites ? 'Enviando invitaciones...' : 'Enviar invitaciones al equipo'}
                </button>
              )}

              {tournament.current_slots < tournament.max_slots && tournament.status !== 'finished' ? (
                <button
                  onClick={handleRegister}
                  disabled={registering || effectivePaymentState === 'approved' || (user ? !teamReadyForPayment : false)}
                  className="btn-fire w-full !tracking-wider disabled:opacity-60"
                >
                  {registering ? 'Procesando...' : registrationLabel}
                </button>
              ) : (
                <button disabled className="btn-ghost w-full opacity-50 cursor-not-allowed">Inscripciones cerradas</button>
              )}

              <p className="text-[11px] text-ash text-center mt-3">
                El capitan puede pagar apenas arma el equipo. El roster entra a la grilla y al playoff recien cuando todos aceptan.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function BracketPreview({ teams }: { teams: TeamBoardEntry[] }) {
  const slots = Array.from({ length: 8 }, (_, index) => teams[index] || null);
  const leftSlots = slots.slice(0, 4);
  const rightSlots = slots.slice(4, 8);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-sm text-ivory font-semibold">Preview de playoff 8 equipos</div>
        <div className="text-xs text-ash">Solo aparecen equipos pagos y aceptados completos</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[leftSlots, rightSlots].map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-3">
            {column.map((entry, index) => (
              <div
                key={`${columnIndex}-${index}`}
                className={`rounded border px-4 py-3 ${
                  entry
                    ? 'border-green-400/30 bg-green-400/10'
                    : 'border-dashed border-white/10 bg-black/20'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-fire-core mb-1">
                      {columnIndex === 0 ? 'Lado izquierdo' : 'Lado derecho'} · Seed {columnIndex * 4 + index + 1}
                    </div>
                    <div className={`font-display text-base tracking-wide uppercase ${entry ? 'text-green-400' : 'text-ash'}`}>
                      {entry?.team?.name || 'Slot disponible'}
                    </div>
                  </div>
                  <div className={`text-xs font-semibold ${entry ? 'text-green-400' : 'text-ash'}`}>
                    {entry ? 'Listo' : 'Vacante'}
                  </div>
                </div>
                {entry && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.members.map((member) => (
                      <div key={member.id} className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-black/20 px-2.5 py-1">
                        {member.profile?.discord_avatar ? (
                          <img src={member.profile.discord_avatar} alt="" className="w-4 h-4 rounded-full" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-white/10" />
                        )}
                        <span className="text-[11px] text-ivory">
                          {member.profile?.display_name || member.profile?.discord_username || member.profile?.riot_id || 'Jugador'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
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

