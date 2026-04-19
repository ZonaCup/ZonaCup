'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Countdown from '@/components/Countdown';

export default function TorneoDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [tournament, setTournament] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('payment'));

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [params.slug]);

  async function loadData() {
    // Get tournament
    const { data: t } = await supabase
      .from('tournaments')
      .select('*')
      .eq('slug', params.slug)
      .single();
    setTournament(t);

    // Get user
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    setLoading(false);
  }

  async function handleRegister() {
    if (!user) {
      // Redirect to login
      await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: `${window.location.origin}/api/auth/callback` },
      });
      return;
    }

    setRegistering(true);
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: tournament.id }),
      });
      const data = await res.json();

      if (data.paymentUrl) {
        // Redirect to Mercado Pago checkout
        window.location.href = data.paymentUrl;
      } else {
        alert(data.error || 'Error al crear inscripción');
      }
    } catch (err) {
      alert('Error de conexión');
    }
    setRegistering(false);
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="pt-24 pb-20 px-5 md:px-10 max-w-5xl mx-auto text-center">
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

  const fillPct = Math.round((tournament.current_slots / tournament.max_slots) * 100);
  const d = new Date(tournament.date);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-5xl mx-auto">
        {/* Payment status banners */}
        {paymentStatus === 'success' && (
          <div className="mb-6 p-4 rounded bg-green-400/10 border border-green-400/30 text-green-400 text-sm font-semibold text-center">
            ✓ Pago confirmado. Estás inscripto. Te mandamos un DM en Discord con los detalles.
          </div>
        )}
        {paymentStatus === 'failure' && (
          <div className="mb-6 p-4 rounded bg-red-400/10 border border-red-400/30 text-red-400 text-sm font-semibold text-center">
            ✗ El pago fue rechazado. Intentá nuevamente o probá con otro medio de pago.
          </div>
        )}
        {paymentStatus === 'pending' && (
          <div className="mb-6 p-4 rounded bg-gold/10 border border-gold/30 text-gold text-sm font-semibold text-center">
            ⏳ Pago pendiente. Te notificamos por Discord cuando se confirme.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          {/* Left: Info */}
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
                {tournament.status === 'live' ? '● En vivo' : tournament.status === 'upcoming' ? 'Abierto' : tournament.status}
              </span>
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-bold text-ivory tracking-wider uppercase mb-2">
              {tournament.name}
            </h1>
            <p className="text-lg text-smoke mb-8">
              {d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ART
            </p>

            {tournament.description && (
              <div className="mb-8">
                <h2 className="font-display text-sm text-ivory tracking-wider uppercase mb-3">Descripción</h2>
                <p className="text-sm text-ash leading-relaxed">{tournament.description}</p>
              </div>
            )}

            {tournament.special_rules && (
              <div className="mb-8">
                <h2 className="font-display text-sm text-ivory tracking-wider uppercase mb-3">Reglas especiales</h2>
                <p className="text-sm text-ash leading-relaxed">{tournament.special_rules}</p>
              </div>
            )}

            {/* Bracket embed */}
            {tournament.bracket_url && (
              <div className="mb-8">
                <h2 className="font-display text-sm text-ivory tracking-wider uppercase mb-3">Bracket</h2>
                <div className="card p-4">
                  <iframe src={tournament.bracket_url} width="100%" height="500" frameBorder="0" className="rounded" />
                </div>
              </div>
            )}

            {/* Stream embed */}
            {tournament.stream_url && tournament.status === 'live' && (
              <div className="mb-8">
                <h2 className="font-display text-sm text-ivory tracking-wider uppercase mb-3">Stream en vivo</h2>
                <div className="card aspect-video overflow-hidden rounded">
                  <iframe src={tournament.stream_url} width="100%" height="100%" frameBorder="0" allowFullScreen className="rounded" />
                </div>
              </div>
            )}
          </div>

          {/* Right: Registration card */}
          <div className="space-y-4">
            <div className="card p-6 border-fire-core/20 relative overflow-hidden sticky top-20">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-fire-core to-transparent" />

              {tournament.status === 'upcoming' && (
                <div className="mb-5">
                  <Countdown targetDate={tournament.date} />
                </div>
              )}

              <div className="bg-bg-deep rounded p-4 mb-4">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[10px] text-ash tracking-[1.5px] uppercase">Pool de premios</span>
                  <span className="text-[10px] text-green-400">Transparente</span>
                </div>
                <div className="font-display text-3xl font-bold text-ivory mb-3">USD {tournament.prize_pool}</div>
                <div className="progress-bar mb-1.5">
                  <div className="progress-fill" style={{ width: `${fillPct}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-ash">
                  <span>{tournament.current_slots} / {tournament.max_slots} {tournament.format === '2v2' ? 'duplas' : 'equipos'}</span>
                  <span className="text-ivory">{fillPct}% lleno</span>
                </div>
              </div>

              <div className="space-y-2 text-[13px] mb-4">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-ash">Formato</span>
                  <span className="text-ivory font-semibold">{tournament.format} · Single Elimination</span>
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
                {tournament.rank_max && (
                  <div className="flex justify-between py-1.5 border-b border-white/5">
                    <span className="text-ash">Rango máximo</span>
                    <span className="text-ivory font-semibold capitalize">{tournament.rank_max}</span>
                  </div>
                )}
              </div>

              {tournament.status === 'upcoming' && tournament.current_slots < tournament.max_slots ? (
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  className="btn-fire w-full !tracking-wider"
                >
                  {registering ? 'Procesando...' : user ? 'Inscribirme y pagar' : 'Ingresar con Discord para inscribirme'}
                </button>
              ) : tournament.current_slots >= tournament.max_slots ? (
                <button disabled className="btn-ghost w-full opacity-50 cursor-not-allowed">Torneo lleno</button>
              ) : (
                <button disabled className="btn-ghost w-full opacity-50 cursor-not-allowed">Inscripciones cerradas</button>
              )}

              <p className="text-[11px] text-ash text-center mt-3">
                Al inscribirte aceptás el <a href="/reglamento" className="text-fire-core hover:underline">reglamento</a> y los <a href="/terminos" className="text-fire-core hover:underline">términos</a>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
