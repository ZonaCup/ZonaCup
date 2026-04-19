'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [riotId, setRiotId] = useState('');
  const [riotTag, setRiotTag] = useState('');
  const [country, setCountry] = useState('AR');
  const [rank, setRank] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        window.location.href = '/';
        return;
      }
      setUser(data.user);
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (p) {
        setProfile(p);
        setRiotId(p.riot_id || '');
        setRiotTag(p.riot_tag || '');
        setCountry(p.country || 'AR');
        setRank(p.rank || '');
      }
    });
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ riot_id: riotId, riot_tag: riotTag, country, rank, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-3xl mx-auto">
        <div className="section-tag">Mi perfil</div>
        <h1 className="section-title !text-4xl mb-8">Configuración</h1>

        <div className="card p-6 md:p-8 space-y-6">
          {/* Discord info */}
          <div className="flex items-center gap-4 pb-6 border-b border-white/5">
            {user.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} alt="" className="w-14 h-14 rounded-full" />
            )}
            <div>
              <div className="text-lg font-semibold text-ivory">{user.user_metadata?.full_name || 'Jugador'}</div>
              <div className="text-sm text-ash">Conectado con Discord</div>
            </div>
          </div>

          {/* Riot ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ash tracking-wider uppercase mb-1.5">Riot ID (nombre)</label>
              <input
                type="text"
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                placeholder="Tu nombre en VALORANT"
                className="w-full bg-bg-deep border border-white/10 rounded px-4 py-2.5 text-sm text-ivory focus:border-fire-core/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-ash tracking-wider uppercase mb-1.5">Tag (#)</label>
              <input
                type="text"
                value={riotTag}
                onChange={(e) => setRiotTag(e.target.value)}
                placeholder="LAN1"
                className="w-full bg-bg-deep border border-white/10 rounded px-4 py-2.5 text-sm text-ivory focus:border-fire-core/50 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs text-ash tracking-wider uppercase mb-1.5">País</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-bg-deep border border-white/10 rounded px-4 py-2.5 text-sm text-ivory focus:border-fire-core/50 focus:outline-none transition-colors"
            >
              <option value="AR">Argentina</option>
              <option value="CL">Chile</option>
              <option value="PE">Perú</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>

          {/* Rank */}
          <div>
            <label className="block text-xs text-ash tracking-wider uppercase mb-1.5">Rango actual en VALORANT</label>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="w-full bg-bg-deep border border-white/10 rounded px-4 py-2.5 text-sm text-ivory focus:border-fire-core/50 focus:outline-none transition-colors"
            >
              <option value="">Seleccioná tu rango</option>
              {['Hierro', 'Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Ascendente', 'Inmortal', 'Radiant'].map(r => (
                <option key={r} value={r.toLowerCase()}>{r}</option>
              ))}
            </select>
          </div>

          <button onClick={handleSave} disabled={saving} className="btn-fire !w-full sm:!w-auto">
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
        </div>

        {/* Stats */}
        {profile && (
          <div className="mt-8">
            <h2 className="font-display text-lg text-ivory tracking-wider uppercase mb-4">Mis estadísticas</h2>
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
                <div className="text-[10px] text-ash tracking-wider uppercase">Membresía</div>
              </div>
              <div className="card p-4 text-center">
                <div className="font-display text-2xl font-bold text-ivory">-</div>
                <div className="text-[10px] text-ash tracking-wider uppercase">Torneos</div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
