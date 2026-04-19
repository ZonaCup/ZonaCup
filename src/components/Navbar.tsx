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
    <nav className="fixed top-0 left-0 right-0 z-50 px-5 md:px-10 h-16 flex items-center justify-between bg-bg-deep/85 backdrop-blur-xl border-b border-fire-core/10">
      <div className="flex items-center gap-6 md:gap-8">
        <Link href="/">
          <Image src="/logo.png" alt="Zona Cup" width={44} height={44} className="drop-shadow-[0_0_8px_rgba(255,106,0,0.3)]" />
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
        <span className="hidden md:inline text-[11px] text-ash tracking-wider">AR · CL · PE</span>
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
        {/* Mobile menu toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden ml-2 text-bone text-xl">☰</button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-bg-deep border-b border-fire-core/10 p-5 flex flex-col gap-4 md:hidden z-50">
          <Link href="/torneos" className="text-sm font-semibold tracking-wider uppercase text-ash" onClick={() => setMenuOpen(false)}>Torneos</Link>
          <Link href="/ranking" className="text-sm font-semibold tracking-wider uppercase text-ash" onClick={() => setMenuOpen(false)}>Ranking</Link>
          <Link href="/#premios" className="text-sm font-semibold tracking-wider uppercase text-ash" onClick={() => setMenuOpen(false)}>Premios</Link>
          <Link href="/#comunidad" className="text-sm font-semibold tracking-wider uppercase text-ash" onClick={() => setMenuOpen(false)}>Comunidad</Link>
        </div>
      )}
    </nav>
  );
}
