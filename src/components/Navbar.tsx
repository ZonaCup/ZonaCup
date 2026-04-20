'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-5 md:px-10 h-20 flex items-center justify-between bg-bg-deep/70 backdrop-blur-xl border-b border-fire-core/15">
      <div className="flex items-center gap-6 md:gap-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-fire-core/25 blur-xl group-hover:bg-fire-core/35 transition-colors" />
            <Image
              src="/zona-cup-logo-gaming.png"
              alt="Zona Cup"
              width={72}
              height={72}
              className="relative h-14 w-14 md:h-[4.5rem] md:w-[4.5rem] object-contain drop-shadow-[0_0_18px_rgba(255,106,0,0.4)]"
              priority
            />
          </div>
          <div className="leading-none">
            <div className="font-display text-xl md:text-3xl tracking-[0.3em] uppercase text-ivory group-hover:text-fire-core transition-colors">Zona Cup</div>
            <div className="text-[10px] tracking-[0.35em] uppercase text-fire-core">Live Gaming Circuit</div>
          </div>
        </Link>

        <div className="hidden md:flex gap-6 text-sm font-semibold tracking-widest uppercase">
          <Link href="/torneos" className="text-ash hover:text-fire-core transition-colors">Torneos</Link>
          <Link href="/ranking" className="text-ash hover:text-fire-core transition-colors">Ranking</Link>
          <Link href="/#premios" className="text-ash hover:text-fire-core transition-colors">Premios</Link>
          <Link href="/#pro" className="text-ash hover:text-fire-core transition-colors">Pro</Link>
          <Link href="/#comunidad" className="text-ash hover:text-fire-core transition-colors">Comunidad</Link>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <span className="hidden lg:inline text-[11px] text-ash tracking-[0.28em] uppercase">AR · CL · PE</span>
        {user ? (
          <div className="flex items-center gap-3">
            <Link href="/perfil" className="btn-ghost !py-2 !px-4 !text-xs">
              {user.user_metadata?.full_name || 'Mi perfil'}
            </Link>
            <button onClick={handleLogout} className="text-xs text-ash hover:text-fire-core transition-colors">
              Salir
            </button>
          </div>
        ) : (
          <>
            <button onClick={handleLogin} className="btn-ghost !py-2 !px-4 !text-xs">
              Ingresar con Discord
            </button>
            <button onClick={handleLogin} className="btn-fire !py-2 !px-4 !text-xs">
              Inscribirme
            </button>
          </>
        )}

        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden ml-2 text-bone p-2" aria-label="Abrir menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6H21" />
            <path d="M3 12H21" />
            <path d="M3 18H21" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="absolute top-20 left-0 right-0 glass-panel border-b border-fire-core/15 p-5 flex flex-col gap-4 md:hidden z-50">
          <Link href="/torneos" className="text-sm font-semibold tracking-wider uppercase text-ash" onClick={() => setMenuOpen(false)}>Torneos</Link>
          <Link href="/ranking" className="text-sm font-semibold tracking-wider uppercase text-ash" onClick={() => setMenuOpen(false)}>Ranking</Link>
          <Link href="/#premios" className="text-sm font-semibold tracking-wider uppercase text-ash" onClick={() => setMenuOpen(false)}>Premios</Link>
          <Link href="/#comunidad" className="text-sm font-semibold tracking-wider uppercase text-ash" onClick={() => setMenuOpen(false)}>Comunidad</Link>
        </div>
      )}
    </nav>
  );
}
