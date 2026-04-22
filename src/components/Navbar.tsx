'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import CurrencySwitcher from '@/components/CurrencySwitcher';

const NAV_LOGO_SRC = 'https://pub-2fdbbbf47ae84eda92735b336535455e.r2.dev/IMAGENES/ChatGPT%20Image%2021%20abr%202026%2C%2009_43_08%20p.m..png';

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
    <nav className="fixed top-0 left-0 right-0 z-50 px-5 md:px-10 h-20 flex items-center justify-between bg-bg-deep/70 backdrop-blur-xl border-b border-fire-core/15 overflow-visible">
      <div className="flex items-center gap-6 md:gap-8">
        <Link href="/" className="flex items-center group">
          <div className="relative">
            <div className="absolute inset-[-18px] rounded-full bg-fire-core/30 blur-[42px] group-hover:bg-fire-core/40 transition-colors" />
            <Image
              src={NAV_LOGO_SRC}
              alt="Zona Cup"
              width={320}
              height={320}
              className="relative h-32 w-auto md:h-40 object-contain drop-shadow-[0_0_34px_rgba(255,106,0,0.5)]"
              priority
            />
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
        <CurrencySwitcher />
        <span className="hidden lg:inline text-[11px] text-ash tracking-[0.28em] uppercase">AR · CL · PE · UY</span>
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
