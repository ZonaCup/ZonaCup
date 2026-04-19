import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-fire-core/5">
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Zona Cup" width={30} height={30} className="drop-shadow-[0_0_4px_rgba(255,106,0,0.2)]" />
          <span className="text-[11px] text-ash">© 2026 Zona Cup · AR · CL · PE</span>
        </div>
        <div className="flex gap-5 text-[11px] text-ash">
          <Link href="/reglamento" className="hover:text-fire-core transition-colors">Reglamento</Link>
          <Link href="/terminos" className="hover:text-fire-core transition-colors">Términos</Link>
          <Link href="/privacidad" className="hover:text-fire-core transition-colors">Privacidad</Link>
          <Link href="/fair-play" className="hover:text-fire-core transition-colors">Fair play</Link>
          <Link href="/contacto" className="hover:text-fire-core transition-colors">Contacto</Link>
        </div>
        <p className="text-[10px] text-white/20 max-w-xs text-center md:text-right leading-relaxed">
          Zona Cup es un torneo amateur operado de forma independiente. VALORANT es marca registrada de Riot Games, Inc. No estamos afiliados oficialmente.
        </p>
      </div>
    </footer>
  );
}
