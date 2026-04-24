'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type Invite = {
  id: string;
  status: string;
  team?: { id: string; name: string } | null;
  invited_by?: {
    id: string;
    display_name?: string | null;
    discord_username?: string | null;
    discord_avatar?: string | null;
  } | null;
  tournament?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type RiotStats = {
  account: {
    puuid: string;
    gameName: string;
    tagLine: string;
  };
  summary: {
    matches: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    score: number;
    headshots: number;
    bodyshots: number;
    legshots: number;
    winRate: number;
    kd: number;
    hsRate: number;
    averageKills: number;
    averageScore: number;
  };
  topAgents: Array<{
    agentId: string;
    agentName: string;
    matches: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    score: number;
    winRate: number;
    kd: number;
    hsRate: number;
    averageKills: number;
    averageScore: number;
  }>;
  recentMatches: Array<{
    matchId: string | null;
    map: string | null;
    startedAt: number | null;
    mode: string | null;
    agentId: string;
    agentName: string;
    won: boolean;
    kills: number;
    deaths: number;
    assists: number;
    score: number;
  }>;
};

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [riotId, setRiotId] = useState('');
  const [riotTag, setRiotTag] = useState('');
  const [country, setCountry] = useState('AR');
  const [rank, setRank] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);
  const [activatingPro, setActivatingPro] = useState(false);
  const [proPaymentStatus, setProPaymentStatus] = useState<string | null>(null);
  const [riotStatus, setRiotStatus] = useState<string | null>(null);
  const [riotMessage, setRiotMessage] = useState<string | null>(null);
  const [riotConfigured, setRiotConfigured] = useState(false);
  const [loadingRiotConfig, setLoadingRiotConfig] = useState(true);
  const [riotStats, setRiotStats] = useState<RiotStats | null>(null);
  const [loadingRiotStats, setLoadingRiotStats] = useState(false);
  const [riotStatsError, setRiotStatsError] = useState<string | null>(null);
  const [disconnectingRiot, setDisconnectingRiot] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // rastrea si hay cambios sin guardar

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProPaymentStatus(params.get('pro'));
    setRiotStatus(params.get('riot'));
    setRiotMessage(params.get('message'));
  }, []);

  useEffect(() => {
    fetch('/api/riot/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setRiotConfigured(Boolean(data.configured)))
      .catch(() => setRiotConfigured(false))
      .finally(() => setLoadingRiotConfig(false));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        window.location.href = '/';
        return;
      }
      setUser(data.user);

      const [profileResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single(),
        loadInvites(data.user.id),
      ]);

      const p = profileResult.data;
      if (p) {
        setProfile(p);
        setRiotId(p.riot_id || '');
        setRiotTag(p.riot_tag || '');
        setCountry(p.country || 'AR');
        setRank(p.rank || '');

        if (p.riot_id && p.riot_tag) {
          void loadRiotStats();
        }
      }
    });
  }, [supabase]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-invites-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_invites', filter: `invited_user_id=eq.${user.id}` }, () => {
        void loadInvites(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user?.id]);

  async function loadInvites(userId: string) {
    const { data } = await supabase
      .from('team_invites')
      .select(`
        id,
        status,
        team:teams!team_invites_team_id_fkey(id, name),
        invited_by:profiles!team_invites_invited_by_user_id_fkey(id, display_name, discord_username, discord_avatar),
        tournament:tournaments!team_invites_tournament_id_fkey(id, name, slug)
      `)
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setInvites(
      ((data || []) as any[]).map((invite) => ({
        ...invite,
        team: Array.isArray(invite.team) ? invite.team[0] || null : invite.team,
        invited_by: Array.isArray(invite.invited_by) ? invite.invited_by[0] || null : invite.invited_by,
        tournament: Array.isArray(invite.tournament) ? invite.tournament[0] || null : invite.tournament,
      }))
    );
  }

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ riot_id: riotId, riot_tag: riotTag, country, rank, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => {setSaving(false); setSaved(false); setIsDirty(false);}, 1000);
  };

  async function loadRiotStats() {
    setLoadingRiotStats(true);
    setRiotStatsError(null);

    try {
      const response = await fetch('/api/riot/stats', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar las stats');
      }

      setRiotStats(data);
    } catch (error) {
      setRiotStats(null);
      setRiotStatsError(error instanceof Error ? error.message : 'No se pudieron cargar las stats');
    } finally {
      setLoadingRiotStats(false);
    }
  }

  function handleConnectRiot() {
    window.location.href = '/api/riot/connect';
  }

  async function handleDisconnectRiot() {
    if (disconnectingRiot) return;

    setDisconnectingRiot(true);
    try {
      const response = await fetch('/api/riot/disconnect', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo desvincular la cuenta Riot');
      }

      setRiotId('');
      setRiotTag('');
      setRiotStats(null);
      setRiotStatsError(null);
      setProfile((current: any) => current ? { ...current, riot_id: null, riot_tag: null } : current);
      setRiotStatus('disconnected');
      setRiotMessage(null);
    } catch (error) {
      setRiotStatsError(error instanceof Error ? error.message : 'No se pudo desvincular la cuenta Riot');
    } finally {
      setDisconnectingRiot(false);
    }
  }

  async function handleInviteResponse(inviteId: string, action: 'accept' | 'reject') {
    setRespondingInviteId(inviteId);
    const res = await fetch(`/api/team-invites/${inviteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setRespondingInviteId(null);
    if (!res.ok) {
      alert(data.error || 'No se pudo responder la invitacion');
      return;
    }
    if (user) {
      await loadInvites(user.id);
    }
  }

  function handleActivatePro() {
    if (activatingPro) return;
    setActivatingPro(true);
    window.location.href = '/api/pro-membership';
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-3xl mx-auto">
        <div className="section-tag">Mi perfil</div>
        <h1 className="section-title !text-4xl mb-8">Configuracion</h1>

        {proPaymentStatus === 'success' && (
          <div className="mb-8 rounded border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm text-green-300">
            Pago aprobado. Tu membresia PRO se va a activar automaticamente en unos segundos.
          </div>
        )}

        {proPaymentStatus === 'pending' && (
          <div className="mb-8 rounded border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
            Tu pago quedo pendiente. Apenas Mercado Pago lo confirme, activamos tu membresia PRO.
          </div>
        )}

        {proPaymentStatus === 'failure' && (
          <div className="mb-8 rounded border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            El pago no se completo. Si queres, podes volver a intentarlo ahora.
          </div>
        )}

        {riotStatus === 'connected' && (
          <div className="mb-8 rounded border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm text-green-300">
            Cuenta de Riot vinculada correctamente. Tu Riot ID verificado ya quedo asociado al perfil.
          </div>
        )}

        {riotStatus && riotStatus !== 'connected' && (
          <div className="mb-8 rounded border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
            {riotMessage || 'La vinculacion con Riot necesita revision. Revisemos la configuracion y lo dejamos fino.'}
          </div>
        )}

        {invites.length > 0 && (
          <div className="card p-6 md:p-8 space-y-4 mb-8">
            <div>
              <h2 className="font-display text-lg text-ivory tracking-wider uppercase mb-1">Invitaciones pendientes</h2>
              <p className="text-sm text-ash">Acepta o rechaza invitaciones para que el equipo quede listo y aparezca en el playoff.</p>
            </div>
            {invites.map((invite) => (
              <div key={invite.id} className="rounded border border-white/8 bg-bg-deep p-4">
                <div className="flex items-center gap-3 mb-3">
                  {invite.invited_by?.discord_avatar ? (
                    <img src={invite.invited_by.discord_avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-white/10" />
                  )}
                  <div>
                    <div className="text-sm text-ivory font-semibold">
                      {invite.invited_by?.display_name || invite.invited_by?.discord_username || 'Jugador'}
                    </div>
                    <div className="text-xs text-ash">
                      Te invito a {invite.team?.name || 'un equipo'} para {invite.tournament?.name || 'un torneo'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleInviteResponse(invite.id, 'accept')}
                    disabled={respondingInviteId === invite.id}
                    className="btn-fire !py-2 !px-4 !text-xs"
                  >
                    {respondingInviteId === invite.id ? 'Procesando...' : 'Aceptar'}
                  </button>
                  <button
                    onClick={() => handleInviteResponse(invite.id, 'reject')}
                    disabled={respondingInviteId === invite.id}
                    className="btn-ghost !py-2 !px-4 !text-xs"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-white/5">
            {user.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} alt="" className="w-14 h-14 rounded-full" />
            )}
            <div>
              <div className="text-lg font-semibold text-ivory">{user.user_metadata?.full_name || 'Jugador'}</div>
              <div className="text-sm text-ash">Conectado con Discord</div>
            </div>
          </div>

          <div className="rounded border border-white/8 bg-bg-deep p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-ivory">Vinculacion Riot oficial</div>
                <div className="text-xs text-ash mt-1">
                  Solo VALORANT. El jugador autoriza compartir su cuenta para mostrar stats y verificar identidad competitiva.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleConnectRiot}
                  disabled={!riotConfigured || loadingRiotConfig}
                  className="btn-fire !py-2.5 !px-4 !text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {riotId && riotTag ? 'Actualizar desde Riot' : 'Vincular cuenta Riot'}
                </button>
                {(riotId || riotTag) && (
                  <button
                    onClick={handleDisconnectRiot}
                    disabled={disconnectingRiot}
                    className="btn-ghost !py-2.5 !px-4 !text-xs"
                  >
                    {disconnectingRiot ? 'Desvinculando...' : 'Desvincular'}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 text-xs text-ash">
              {!riotConfigured && !loadingRiotConfig ? (
                <>Falta terminar la configuracion segura de Riot en el servidor antes de habilitar esta vinculacion.</>
              ) : riotId && riotTag ? (
                <>Cuenta actual: <span className="text-ivory">{riotId}#{riotTag}</span></>
              ) : (
                <>Todavia no hay una cuenta Riot vinculada. Mientras tanto, podes seguir cargando datos manualmente.</>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ash tracking-wider uppercase mb-1.5">Riot ID (nombre)</label>
              <input
                type="text"
                value={riotId}
                onChange={(e) => {setRiotId(e.target.value); setIsDirty(true);}}
                placeholder="Tu nombre en VALORANT"
                className="w-full bg-bg-deep border border-white/10 rounded px-4 py-2.5 text-sm text-ivory focus:border-fire-core/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-ash tracking-wider uppercase mb-1.5">Tag (#)</label>
              <input
                type="text"
                value={riotTag}
                onChange={(e) => {setRiotTag(e.target.value); setIsDirty(true);}}
                placeholder="LAN1"
                className="w-full bg-bg-deep border border-white/10 rounded px-4 py-2.5 text-sm text-ivory focus:border-fire-core/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-ash tracking-wider uppercase mb-1.5">Pais</label>
            <select
              value={country}
              onChange={(e) => {setCountry(e.target.value); setIsDirty(true);}}
              className="w-full bg-bg-deep border border-white/10 rounded px-4 py-2.5 text-sm text-ivory focus:border-fire-core/50 focus:outline-none transition-colors"
            >
              <option value="AR">Argentina</option>
              <option value="CL">Chile</option>
              <option value="PE">Peru</option>
              <option value="UY">Uruguay</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-ash tracking-wider uppercase mb-1.5">Rango actual en VALORANT</label>
            <select
              value={rank}
              onChange={(e) => {setRank(e.target.value); setIsDirty(true);}}
              className="w-full bg-bg-deep border border-white/10 rounded px-4 py-2.5 text-sm text-ivory focus:border-fire-core/50 focus:outline-none transition-colors"
            >
              <option value="">Selecciona tu rango</option>
              {['Hierro', 'Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Ascendente', 'Inmortal', 'Radiant'].map(r => (
                <option key={r} value={r.toLowerCase()}>{r}</option>
              ))}
            </select>
          </div>
          
            <button onClick={handleSave} disabled={saving || !isDirty} className="btn-fire !w-full sm:!w-auto"
            >
            {!isDirty && !saving && !saved ? 'Sin cambios' : saving ? 'Guardando...' : saved && !isDirty ? 'Guardado' : 'Guardar cambios'}
            </button>
        </div>

        {profile && (
          <div className="mt-8">
            <h2 className="font-display text-lg text-ivory tracking-wider uppercase mb-4">Mis estadisticas</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card p-4 text-center">
                <div className="font-display text-2xl font-bold text-ivory">{profile.points || 0}</div>
                <div className="text-[10px] text-ash tracking-wider uppercase">Puntos</div>
              </div>
              <div className="card p-4 text-center">
                <div className="font-display text-2xl font-bold text-ivory">{profile.integrity_score || 100}</div>
                <div className="text-[10px] text-ash tracking-wider uppercase">Integridad</div>
              </div>
              <div className="card p-4 text-center">
                <div className="font-display text-2xl font-bold text-ivory">{profile.is_pro ? 'PRO' : 'FREE'}</div>
                <div className="text-[10px] text-ash tracking-wider uppercase">Membresia</div>
              </div>
              <div className="card p-4 text-center">
                <div className="font-display text-2xl font-bold text-ivory">-</div>
                <div className="text-[10px] text-ash tracking-wider uppercase">Torneos</div>
              </div>
            </div>
            {!profile.is_pro && (
              <button
                onClick={handleActivatePro}
                disabled={activatingPro}
                className="btn-fire mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {activatingPro ? 'Redirigiendo...' : 'Activar Pro con Mercado Pago'}
              </button>
            )}
          </div>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-lg text-ivory tracking-wider uppercase">VALORANT oficial</h2>
            {(riotId && riotTag) && (
              <button onClick={loadRiotStats} disabled={loadingRiotStats} className="btn-ghost !py-2 !px-4 !text-xs">
                {loadingRiotStats ? 'Actualizando...' : 'Actualizar stats'}
              </button>
            )}
          </div>

          {!riotId || !riotTag ? (
            <div className="card p-6 text-sm text-ash">
              {riotConfigured
                ? 'Vincula tu cuenta Riot para ver tu cuenta verificada y stats oficiales de VALORANT.'
                : 'La capa de UI ya esta lista, pero faltan las credenciales seguras de Riot en el servidor para habilitar la vinculacion oficial.'}
            </div>
          ) : loadingRiotStats ? (
            <div className="card p-6 text-sm text-ash">Cargando stats oficiales de VALORANT...</div>
          ) : riotStatsError ? (
            <div className="card p-6 text-sm text-gold">{riotStatsError}</div>
          ) : riotStats ? (
            <div className="space-y-6">
              <div className="card p-6 md:p-8">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="section-tag !mb-2">Cuenta verificada</div>
                    <div className="text-2xl font-display text-ivory">
                      {riotStats.account.gameName}#{riotStats.account.tagLine}
                    </div>
                    <div className="text-xs text-ash mt-2">Resumen calculado sobre tus ultimas {riotStats.summary.matches} partidas encontradas.</div>
                  </div>
                  <div className="text-xs text-ash">
                    K/D {riotStats.summary.kd.toFixed(2)} · HS {riotStats.summary.hsRate.toFixed(1)}% · Winrate {riotStats.summary.winRate.toFixed(1)}%
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                  <div className="rounded border border-white/8 bg-bg-deep p-4">
                    <div className="font-display text-2xl text-ivory">{riotStats.summary.matches}</div>
                    <div className="text-[10px] text-ash tracking-wider uppercase">Partidas</div>
                  </div>
                  <div className="rounded border border-white/8 bg-bg-deep p-4">
                    <div className="font-display text-2xl text-ivory">{riotStats.summary.wins}</div>
                    <div className="text-[10px] text-ash tracking-wider uppercase">Victorias</div>
                  </div>
                  <div className="rounded border border-white/8 bg-bg-deep p-4">
                    <div className="font-display text-2xl text-ivory">{riotStats.summary.averageKills.toFixed(1)}</div>
                    <div className="text-[10px] text-ash tracking-wider uppercase">Kills promedio</div>
                  </div>
                  <div className="rounded border border-white/8 bg-bg-deep p-4">
                    <div className="font-display text-2xl text-ivory">{riotStats.summary.hsRate.toFixed(1)}%</div>
                    <div className="text-[10px] text-ash tracking-wider uppercase">Headshot rate</div>
                  </div>
                </div>
              </div>

              <div className="card p-6 md:p-8">
                <div className="text-sm font-semibold text-ivory mb-4">Agentes mas jugados</div>
                <div className="space-y-3">
                  {riotStats.topAgents.length === 0 ? (
                    <div className="text-sm text-ash">Todavia no encontramos agentes para mostrar.</div>
                  ) : riotStats.topAgents.map((agent) => (
                    <div key={agent.agentId} className="rounded border border-white/8 bg-bg-deep p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-ivory">{agent.agentName}</div>
                          <div className="text-xs text-ash mt-1">
                            {agent.matches} partidas · {agent.winRate.toFixed(1)}% WR · K/D {agent.kd.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right text-xs text-ash">
                          <div>{agent.averageKills.toFixed(1)} kills</div>
                          <div>{agent.hsRate.toFixed(1)}% HS</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6 md:p-8">
                <div className="text-sm font-semibold text-ivory mb-4">Partidas recientes</div>
                <div className="space-y-3">
                  {riotStats.recentMatches.length === 0 ? (
                    <div className="text-sm text-ash">No hay partidas recientes para mostrar.</div>
                  ) : riotStats.recentMatches.slice(0, 5).map((match) => (
                    <div key={match.matchId || `${match.agentId}-${match.startedAt}`} className="rounded border border-white/8 bg-bg-deep p-4 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-ivory">
                          {match.agentName} · {match.map || 'Mapa'}
                        </div>
                        <div className="text-xs text-ash mt-1">
                          {match.won ? 'Victoria' : 'Derrota'} · {match.kills}/{match.deaths}/{match.assists}
                        </div>
                      </div>
                      <div className="text-xs text-ash text-right">
                        <div>Score {match.score}</div>
                        <div>{match.mode || 'Modo'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-6 text-sm text-ash">
              Vincula tu cuenta Riot y apretá actualizar para traer stats oficiales de VALORANT.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
