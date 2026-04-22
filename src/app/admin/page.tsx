'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useCurrency } from '@/components/CurrencyProvider';
import { createClient } from '@/lib/supabase-browser';
import { buildTournamentCurrencyPreview, formatCurrencyAmount } from '@/lib/currency';

type Tournament = {
  id: string;
  name: string;
  slug: string;
  format: '2v2' | '5v5';
  description?: string | null;
  date: string;
  status: string;
  entry_fee_usd: number;
  entry_fee_ars?: number | null;
  entry_fee_clp?: number | null;
  entry_fee_pen?: number | null;
  prize_pool?: number | null;
  max_slots: number;
  current_slots: number;
  is_major?: boolean;
  is_special?: boolean;
  special_rules?: string | null;
  rank_min?: string | null;
  rank_max?: string | null;
  points_multiplier?: number | null;
};

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
    riot_id?: string | null;
    riot_tag?: string | null;
  } | null;
  members: Array<{
    id: string;
    role: string;
    profile: {
      id: string;
      display_name?: string | null;
      discord_username?: string | null;
      riot_id?: string | null;
      riot_tag?: string | null;
      rank?: string | null;
    } | null;
  }>;
};

type Match = {
  id: string;
  round: number;
  match_number: number;
  status: string;
  score_a: number | null;
  score_b: number | null;
  team_a: { id: string; name: string } | null;
  team_b: { id: string; name: string } | null;
  winner: { id: string; name: string } | null;
};

const emptyForm = {
  name: '',
  slug: '',
  format: '2v2',
  description: '',
  date: '',
  entry_fee_usd: 8,
  entry_fee_ars: 11200,
  entry_fee_clp: 7600,
  entry_fee_pen: 30,
  prize_pool: 100000,
  max_slots: 8,
  is_major: false,
  is_special: false,
  special_rules: '',
  rank_min: '',
  rank_max: '',
  points_multiplier: 1,
  status: 'upcoming',
};

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const { rates } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [teamBoard, setTeamBoard] = useState<TeamBoardEntry[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [savingForm, setSavingForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const selectedTournament = tournaments.find((tournament) => tournament.id === selectedTournamentId) || null;

  useEffect(() => {
    void checkAdmin();
  }, []);

  useEffect(() => {
    if (!selectedTournamentId) return;
    void loadTournamentOps(selectedTournamentId);
  }, [selectedTournamentId]);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/';
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      window.location.href = '/';
      return;
    }

    setIsAdmin(true);
    await loadTournaments();
    setLoading(false);
  }

  async function loadTournaments() {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('date', { ascending: false })
      .limit(50);

    const nextTournaments = (data || []) as Tournament[];
    setTournaments(nextTournaments);

    if (!selectedTournamentId && nextTournaments[0]?.id) {
      setSelectedTournamentId(nextTournaments[0].id);
    }
  }

  async function loadTournamentOps(tournamentId: string) {
    const [teamsResponse, matchesResponse] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}/teams`),
      fetch(`/api/tournaments/${tournamentId}/playoff`),
    ]);

    const teamsPayload = await teamsResponse.json();
    const matchesPayload = await matchesResponse.json();

    setTeamBoard((teamsPayload.entries || []) as TeamBoardEntry[]);
    setMatches(((matchesPayload.matches || []) as any[]).map((match) => ({
      ...match,
      team_a: Array.isArray(match.team_a) ? match.team_a[0] || null : match.team_a,
      team_b: Array.isArray(match.team_b) ? match.team_b[0] || null : match.team_b,
      winner: Array.isArray(match.winner) ? match.winner[0] || null : match.winner,
    })));
  }

  function startCreate() {
    setFormMode('create');
    setForm(emptyForm);
    setShowCreateForm(true);
  }

  function startEdit(tournament: Tournament) {
    setFormMode('edit');
    setForm({
      name: tournament.name,
      slug: tournament.slug,
      format: tournament.format,
      description: tournament.description || '',
      date: tournament.date ? new Date(tournament.date).toISOString().slice(0, 16) : '',
      entry_fee_usd: tournament.entry_fee_usd,
      entry_fee_ars: Number(tournament.entry_fee_ars || 0),
      entry_fee_clp: Number(tournament.entry_fee_clp || 0),
      entry_fee_pen: Number(tournament.entry_fee_pen || 0),
      prize_pool: Number(tournament.prize_pool || 0),
      max_slots: tournament.max_slots,
      is_major: Boolean(tournament.is_major),
      is_special: Boolean(tournament.is_special),
      special_rules: tournament.special_rules || '',
      rank_min: tournament.rank_min || '',
      rank_max: tournament.rank_max || '',
      points_multiplier: Number(tournament.points_multiplier || 1),
      status: tournament.status,
    });
    setShowCreateForm(true);
  }

  async function submitTournament() {
    setSavingForm(true);
    const endpoint = formMode === 'create'
      ? '/api/tournaments'
      : `/api/tournaments/${selectedTournamentId}`;
    const method = formMode === 'create' ? 'POST' : 'PATCH';

    const derivedFees = buildTournamentCurrencyPreview(Number(form.entry_fee_usd || 0), rates);

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        entry_fee_ars: derivedFees.ARS,
        entry_fee_clp: derivedFees.CLP,
        entry_fee_pen: derivedFees.PEN,
      }),
    });

    const payload = await response.json();
    setSavingForm(false);

    if (!response.ok) {
      alert(payload.error || 'No se pudo guardar el torneo');
      return;
    }

    setShowCreateForm(false);
    setForm(emptyForm);
    await loadTournaments();
    if (payload.id) {
      setSelectedTournamentId(payload.id);
    }
  }

  async function updateStatus(id: string, status: string) {
    const response = await fetch(`/api/tournaments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json();

    if (!response.ok) {
      alert(payload.error || 'No se pudo actualizar el estado');
      return;
    }

    await loadTournaments();
    if (id === selectedTournamentId) {
      await loadTournamentOps(id);
    }
  }

  async function saveMatch(matchId: string, payload: { scoreA: number | string; scoreB: number | string; winnerId: string }) {
    const response = await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scoreA: payload.scoreA,
        scoreB: payload.scoreB,
        winnerId: payload.winnerId,
        status: 'finished',
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || 'No se pudo guardar el resultado');
      return;
    }
    await loadTournamentOps(selectedTournamentId);
  }

  if (loading) {
    return <div className="min-h-screen bg-bg-deep" />;
  }

  if (!isAdmin) {
    return null;
  }

  const paidTeams = teamBoard.filter((entry) => entry.isPaid);
  const readyTeams = teamBoard.filter((entry) => entry.isReady);
  const pendingAcceptance = paidTeams.filter((entry) => !entry.isReady);
  const currencyPreview = buildTournamentCurrencyPreview(Number(form.entry_fee_usd || 0), rates);
  const groupedMatches = matches.reduce<Record<number, Match[]>>((acc, match) => {
    acc[match.round] = acc[match.round] || [];
    acc[match.round].push(match);
    return acc;
  }, {});

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="section-tag">Superadmin</div>
            <h1 className="section-title !text-3xl">Centro de operaciones</h1>
            <p className="text-sm text-ash max-w-2xl">
              Desde aca podes crear torneos, publicarlos, controlar equipos listos y cargar ganadores para que el playoff avance automaticamente.
            </p>
          </div>
          <button onClick={startCreate} className="btn-fire">
            + Nuevo torneo
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <aside className="space-y-4">
            <div className="card p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-fire-core mb-3">Resumen</div>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Torneos" value={String(tournaments.length)} />
                <StatCard label="Live" value={String(tournaments.filter((item) => item.status === 'live').length)} />
                <StatCard label="Abiertos" value={String(tournaments.filter((item) => ['upcoming', 'checkin'].includes(item.status)).length)} />
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 text-[10px] uppercase tracking-[0.22em] text-fire-core">
                Torneos
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {tournaments.map((tournament) => (
                  <button
                    key={tournament.id}
                    type="button"
                    onClick={() => setSelectedTournamentId(tournament.id)}
                    className={`w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors ${
                      selectedTournamentId === tournament.id ? 'bg-fire-core/10' : 'hover:bg-bg-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-sm text-ivory font-semibold">{tournament.name}</div>
                      <span className="text-[9px] uppercase tracking-[0.16em] text-ash">{tournament.status}</span>
                    </div>
                    <div className="text-[11px] text-ash">
                      {new Date(tournament.date).toLocaleDateString('es-AR')} · {tournament.format} · {tournament.current_slots}/{tournament.max_slots}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            {showCreateForm && (
              <div className="card p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-fire-core mb-1">
                      {formMode === 'create' ? 'Publicar torneo' : 'Editar torneo'}
                    </div>
                    <div className="font-display text-xl text-ivory tracking-wide uppercase">
                      {formMode === 'create' ? 'Nuevo torneo' : selectedTournament?.name || 'Editar'}
                    </div>
                  </div>
                  <button onClick={() => setShowCreateForm(false)} className="btn-ghost !py-2 !px-4 !text-xs">
                    Cerrar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nombre">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="admin-input" />
                  </Field>
                  <Field label="Slug">
                    <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="admin-input" />
                  </Field>
                  <Field label="Formato">
                    <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as '2v2' | '5v5' })} className="admin-input">
                      <option value="2v2">2v2</option>
                      <option value="5v5">5v5</option>
                    </select>
                  </Field>
                  <Field label="Fecha y hora">
                    <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="admin-input" />
                  </Field>
                  <Field label="Entrada base USD">
                    <input type="number" value={form.entry_fee_usd} onChange={(e) => setForm({ ...form, entry_fee_usd: Number(e.target.value) })} className="admin-input" />
                  </Field>
                  <Field label="Vista por moneda">
                    <div className="rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-ivory">
                      {formatCurrencyAmount(currencyPreview.ARS, 'ARS')} · {formatCurrencyAmount(currencyPreview.CLP, 'CLP')} · {formatCurrencyAmount(currencyPreview.PEN, 'PEN')} · {formatCurrencyAmount(currencyPreview.UYU, 'UYU')}
                    </div>
                  </Field>
                  <Field label="Pozo base">
                    <input type="number" value={form.prize_pool} onChange={(e) => setForm({ ...form, prize_pool: Number(e.target.value) })} className="admin-input" />
                  </Field>
                  <Field label="Max equipos">
                    <input type="number" value={form.max_slots} onChange={(e) => setForm({ ...form, max_slots: Number(e.target.value) })} className="admin-input" />
                  </Field>
                  <Field label="Rango minimo">
                    <input value={form.rank_min} onChange={(e) => setForm({ ...form, rank_min: e.target.value })} className="admin-input" />
                  </Field>
                  <Field label="Rango maximo">
                    <input value={form.rank_max} onChange={(e) => setForm({ ...form, rank_max: e.target.value })} className="admin-input" />
                  </Field>
                  <Field label="Multiplicador de puntos">
                    <input type="number" step="0.1" value={form.points_multiplier} onChange={(e) => setForm({ ...form, points_multiplier: Number(e.target.value) })} className="admin-input" />
                  </Field>
                  <Field label="Estado">
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="admin-input">
                      {['draft', 'upcoming', 'checkin', 'live', 'finished', 'cancelled'].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Descripcion">
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="admin-input min-h-[92px]" />
                </Field>

                <Field label="Reglas especiales">
                  <textarea value={form.special_rules} onChange={(e) => setForm({ ...form, special_rules: e.target.value })} className="admin-input min-h-[92px]" />
                </Field>

                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center gap-2 text-sm text-ash">
                    <input type="checkbox" checked={form.is_major} onChange={(e) => setForm({ ...form, is_major: e.target.checked })} />
                    Major
                  </label>
                  <label className="flex items-center gap-2 text-sm text-ash">
                    <input type="checkbox" checked={form.is_special} onChange={(e) => setForm({ ...form, is_special: e.target.checked })} />
                    Especial
                  </label>
                </div>

                <button onClick={submitTournament} disabled={savingForm} className="btn-fire">
                  {savingForm ? 'Guardando...' : formMode === 'create' ? 'Crear y publicar' : 'Guardar cambios'}
                </button>
              </div>
            )}

            {selectedTournament && (
              <>
                <div className="card p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="section-tag !mb-1">Torneo seleccionado</div>
                      <h2 className="font-display text-2xl text-ivory tracking-wider uppercase">{selectedTournament.name}</h2>
                      <div className="text-sm text-ash">
                        {new Date(selectedTournament.date).toLocaleString('es-AR')} · {selectedTournament.format} · {selectedTournament.current_slots}/{selectedTournament.max_slots}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => startEdit(selectedTournament)} className="btn-ghost !py-2 !px-4 !text-xs">
                        Editar
                      </button>
                      <select
                        value={selectedTournament.status}
                        onChange={(e) => void updateStatus(selectedTournament.id, e.target.value)}
                        className="admin-input !w-auto"
                      >
                        {['draft', 'upcoming', 'checkin', 'live', 'finished', 'cancelled'].map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
                    <StatCard label="Pagados" value={String(paidTeams.length)} />
                    <StatCard label="Listos" value={String(readyTeams.length)} />
                    <StatCard label="Pendientes" value={String(pendingAcceptance.length)} />
                    <StatCard label="Pozo" value={`$${Number(selectedTournament.prize_pool || 0).toLocaleString('es-AR')}`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                  <div className="card p-6">
                    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                      <div>
                        <div className="section-tag !mb-1">Equipos</div>
                        <h3 className="font-display text-xl text-ivory tracking-wider uppercase">Estado de inscripcion</h3>
                      </div>
                      <div className="text-xs text-ash">Verde = listo para entrar al playoff</div>
                    </div>

                    <div className="space-y-3">
                      {teamBoard.length === 0 ? (
                        <div className="text-sm text-ash">Todavia no hay equipos en este torneo.</div>
                      ) : (
                        teamBoard.map((entry, index) => (
                          <div
                            key={entry.registrationId}
                            className={`rounded-md border px-4 py-4 ${
                              entry.isReady ? 'border-green-400/30 bg-green-400/5' : entry.isPaid ? 'border-gold/20 bg-gold/5' : 'border-white/8 bg-bg-deep'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-fire-core mb-1">Slot #{String(index + 1).padStart(2, '0')}</div>
                                <div className="font-display text-lg text-ivory tracking-wide uppercase">{entry.team?.name || 'Equipo'}</div>
                                <div className="text-xs text-ash">
                                  {entry.paymentStatus === 'approved' ? 'Pago aprobado' : 'Pago pendiente'} · aceptados {entry.acceptedCount} · pendientes {entry.pendingCount}
                                </div>
                              </div>
                              <div className={`text-sm font-semibold ${entry.isReady ? 'text-green-400' : entry.isPaid ? 'text-gold' : 'text-ash'}`}>
                                {entry.isReady ? 'Listo' : entry.isPaid ? 'Faltan aceptaciones' : 'Pendiente de pago'}
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {entry.members.map((member) => (
                                <div key={member.id} className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-3 py-1.5">
                                  <span className="text-[11px] text-ivory">
                                    {member.profile?.display_name || member.profile?.discord_username || 'Jugador'}
                                  </span>
                                  <span className="text-[10px] text-ash">
                                    {member.profile?.riot_id
                                      ? `${member.profile.riot_id}${member.profile?.riot_tag ? `#${member.profile.riot_tag}` : ''}`
                                      : 'sin Riot'}
                                    {member.profile?.rank ? ` · ${member.profile.rank}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="card p-6">
                    <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                      <div>
                        <div className="section-tag !mb-1">Playoff</div>
                        <h3 className="font-display text-xl text-ivory tracking-wider uppercase">Carga de resultados</h3>
                      </div>
                      <div className="text-xs text-ash">Solo visible para admins</div>
                    </div>

                    {matches.length === 0 ? (
                      <div className="text-sm text-ash">
                        Cuando el torneo pase a <span className="text-ivory">live</span> y haya equipos listos, el cuadro se genera automatico.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[1, 2, 3].map((round) => (
                          <div key={round} className="space-y-3">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-fire-core">
                              {round === 1 ? 'Cuartos' : round === 2 ? 'Semifinales' : 'Final'}
                            </div>
                            {(groupedMatches[round] || []).map((match) => (
                              <AdminMatchCard key={match.id} match={match} onSave={saveMatch} />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-ash tracking-[0.18em] uppercase mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/8 bg-bg-deep px-3 py-4">
      <div className="font-display text-2xl text-ivory">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-ash mt-1">{label}</div>
    </div>
  );
}

function AdminMatchCard({
  match,
  onSave,
}: {
  match: Match;
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
    <div className="rounded-md border border-white/8 bg-bg-deep p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-[10px] uppercase tracking-[0.18em] text-ash">Match {match.match_number}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-fire-core">{match.status}</div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-sm text-ivory">
          <span>{match.team_a?.name || 'Por definir'}</span>
          <span>{match.score_a ?? '-'}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-ivory">
          <span>{match.team_b?.name || 'Por definir'}</span>
          <span>{match.score_b ?? '-'}</span>
        </div>
      </div>

      {match.team_a && match.team_b ? (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="number"
              min="0"
              value={scoreA}
              onChange={(e) => setScoreA(e.target.value)}
              className="admin-input"
              placeholder="Score A"
            />
            <input
              type="number"
              min="0"
              value={scoreB}
              onChange={(e) => setScoreB(e.target.value)}
              className="admin-input"
              placeholder="Score B"
            />
          </div>
          <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} className="admin-input mb-2">
            <option value="">Elegir ganador</option>
            <option value={match.team_a.id}>{match.team_a.name}</option>
            <option value={match.team_b.id}>{match.team_b.name}</option>
          </select>
          <button
            className="btn-fire w-full !py-2 !px-4 !text-xs"
            disabled={saving || !winnerId}
            onClick={async () => {
              setSaving(true);
              await onSave(match.id, { scoreA, scoreB, winnerId });
              setSaving(false);
            }}
          >
            {saving ? 'Guardando...' : 'Guardar ganador'}
          </button>
        </>
      ) : (
        <div className="text-xs text-ash">Este match se completa solo cuando lleguen los ganadores anteriores.</div>
      )}
    </div>
  );
}
