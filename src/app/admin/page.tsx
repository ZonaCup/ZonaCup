'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Navbar from '@/components/Navbar';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', slug: '', format: '2v2', description: '', date: '',
    entry_fee_usd: 8, entry_fee_ars: 11200, max_slots: 32,
    is_major: false, is_special: false, special_rules: '', rank_max: '',
  });

  const supabase = createClient();

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/'; return; }
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) { window.location.href = '/'; return; }
    setIsAdmin(true);
    setLoading(false);
    loadTournaments();
  }

  async function loadTournaments() {
    const { data } = await supabase.from('tournaments').select('*').order('date', { ascending: false }).limit(20);
    setTournaments(data || []);
  }

  async function createTournament() {
    const res = await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ name: '', slug: '', format: '2v2', description: '', date: '', entry_fee_usd: 8, entry_fee_ars: 11200, max_slots: 32, is_major: false, is_special: false, special_rules: '', rank_max: '' });
      loadTournaments();
    } else {
      const err = await res.json();
      alert(err.error || 'Error');
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/tournaments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || 'No se pudo actualizar el estado');
    }

    loadTournaments();
  }

  if (loading) return <div className="min-h-screen bg-bg-deep" />;
  if (!isAdmin) return null;

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="section-tag">Admin</div>
            <h1 className="section-title !text-3xl">Panel de administración</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-fire">
            {showForm ? 'Cancelar' : '+ Crear torneo'}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card p-6 mb-8 space-y-4">
            <h2 className="font-display text-sm text-ivory tracking-wider uppercase mb-2">Nuevo torneo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-ash tracking-wider uppercase mb-1">Nombre</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-bg-deep border border-white/10 rounded px-3 py-2 text-sm text-ivory focus:border-fire-core/50 focus:outline-none" placeholder="Zona Cup Weekly #14" />
              </div>
              <div>
                <label className="block text-[10px] text-ash tracking-wider uppercase mb-1">Slug (URL)</label>
                <input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full bg-bg-deep border border-white/10 rounded px-3 py-2 text-sm text-ivory focus:border-fire-core/50 focus:outline-none" placeholder="weekly-14" />
              </div>
              <div>
                <label className="block text-[10px] text-ash tracking-wider uppercase mb-1">Formato</label>
                <select value={form.format} onChange={e => setForm({...form, format: e.target.value})} className="w-full bg-bg-deep border border-white/10 rounded px-3 py-2 text-sm text-ivory focus:border-fire-core/50 focus:outline-none">
                  <option value="2v2">2v2</option>
                  <option value="5v5">5v5</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-ash tracking-wider uppercase mb-1">Fecha y hora</label>
                <input type="datetime-local" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-bg-deep border border-white/10 rounded px-3 py-2 text-sm text-ivory focus:border-fire-core/50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-ash tracking-wider uppercase mb-1">Entrada USD</label>
                <input type="number" value={form.entry_fee_usd} onChange={e => setForm({...form, entry_fee_usd: +e.target.value})} className="w-full bg-bg-deep border border-white/10 rounded px-3 py-2 text-sm text-ivory focus:border-fire-core/50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-ash tracking-wider uppercase mb-1">Entrada ARS</label>
                <input type="number" value={form.entry_fee_ars} onChange={e => setForm({...form, entry_fee_ars: +e.target.value})} className="w-full bg-bg-deep border border-white/10 rounded px-3 py-2 text-sm text-ivory focus:border-fire-core/50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-ash tracking-wider uppercase mb-1">Máx slots</label>
                <input type="number" value={form.max_slots} onChange={e => setForm({...form, max_slots: +e.target.value})} className="w-full bg-bg-deep border border-white/10 rounded px-3 py-2 text-sm text-ivory focus:border-fire-core/50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-ash tracking-wider uppercase mb-1">Rango máximo</label>
                <input value={form.rank_max} onChange={e => setForm({...form, rank_max: e.target.value})} className="w-full bg-bg-deep border border-white/10 rounded px-3 py-2 text-sm text-ivory focus:border-fire-core/50 focus:outline-none" placeholder="Ej: platino (vacío = sin límite)" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-ash tracking-wider uppercase mb-1">Descripción</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-bg-deep border border-white/10 rounded px-3 py-2 text-sm text-ivory focus:border-fire-core/50 focus:outline-none h-20 resize-none" />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-ash cursor-pointer">
                <input type="checkbox" checked={form.is_major} onChange={e => setForm({...form, is_major: e.target.checked})} className="accent-fire-core" /> Major
              </label>
              <label className="flex items-center gap-2 text-sm text-ash cursor-pointer">
                <input type="checkbox" checked={form.is_special} onChange={e => setForm({...form, is_special: e.target.checked})} className="accent-fire-core" /> Especial / Raro
              </label>
            </div>
            <button onClick={createTournament} className="btn-fire">Crear torneo</button>
          </div>
        )}

        {/* Tournaments list */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <span className="text-[11px] text-ash tracking-[1.5px] uppercase">Torneos · {tournaments.length} total</span>
          </div>
          {tournaments.map(t => (
            <div key={t.id} className="px-5 py-3 flex items-center justify-between border-b border-white/[0.02] hover:bg-bg-hover transition-colors flex-wrap gap-2">
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm text-ivory font-semibold">{t.name}</div>
                <div className="text-[11px] text-ash">
                  {new Date(t.date).toLocaleDateString('es-AR')} · {t.format} · {t.current_slots}/{t.max_slots} · USD {t.prize_pool}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] px-2 py-0.5 rounded-sm tracking-wider uppercase font-bold ${
                  t.status === 'live' ? 'bg-green-400/12 text-green-400' :
                  t.status === 'upcoming' ? 'bg-fire-core/12 text-fire-core' :
                  t.status === 'finished' ? 'bg-white/5 text-ash' :
                  'bg-gold/10 text-gold'
                }`}>{t.status}</span>

                <select
                  value={t.status}
                  onChange={(e) => updateStatus(t.id, e.target.value)}
                  className="bg-bg-deep border border-white/10 rounded px-2 py-1 text-[11px] text-ivory focus:outline-none"
                >
                  {['draft', 'upcoming', 'checkin', 'live', 'finished', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
