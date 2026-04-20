'use client';

import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import TournamentCard from '@/components/TournamentCard';
import Footer from '@/components/Footer';
import Image from 'next/image';
import Link from 'next/link';

const FAQClient = dynamic(() => import('@/components/FAQClient'), { ssr: false });

export default function Home() {
  return (
    <>
      <Navbar />

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center px-5 md:px-10 pt-28 pb-16 overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/fire-particles-background.mov" type="video/quicktime" />
          <source src="/fire-particles-background.mov" type="video/mp4" />
        </video>
        <div className="absolute inset-0 video-vignette" />
        <div className="absolute inset-0 hero-grid opacity-40" />
        <div className="absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-fire-core/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-deep to-transparent z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_520px] gap-12 lg:gap-16 max-w-7xl mx-auto w-full relative z-20">
          <div>
            <div className="inline-flex items-center gap-2 glass-panel px-3.5 py-1.5 rounded-sm mb-7 animate-flicker-soft">
              <div className="w-[7px] h-[7px] bg-fire-core rounded-full animate-pulse-dot" />
              <span className="text-[11px] tracking-[3px] text-fire-core font-bold uppercase">Inscripciones abiertas</span>
            </div>

            <div className="mb-8">
              <Image
                src="/zona-cup-home-logo.png"
                alt="Zona Cup"
                width={360}
                height={360}
                className="w-[190px] md:w-[250px] lg:w-[290px] h-auto object-contain animate-logo-float drop-shadow-[0_0_34px_rgba(255,106,0,0.3)]"
                priority
              />
            </div>

            <h1 className="font-display text-4xl md:text-[58px] leading-[1.02] font-extrabold text-ivory tracking-wide uppercase mb-5">
              Torneos de<br /><span className="fire-text">VALORANT</span><br />solo LAS
            </h1>

            <p className="text-[17px] leading-relaxed text-smoke mb-9 max-w-xl">
              Torneos 2v2 y 5v5 todas las semanas.<br/>
              Premios pagados en el Acto.<br/>Ranking de los mejores USER temporada tras temporada.
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              <Link href="/torneos"><button className="btn-fire">Inscribirme al pr&oacute;ximo torneo</button></Link>
              <a href="#como"><button className="btn-ghost">C&oacute;mo funciona</button></a>
            </div>

            <div className="flex flex-wrap gap-8 md:gap-10 pt-7 border-t border-fire-core/10">
              {[
                ['1.247', 'Jugadores activos'],
                ['45', 'Torneos corridos'],
                ['$32K', 'USD repartidos'],
                ['0', 'Premios impagos'],
              ].map(([num, label]) => (
                <div key={label}>
                  <div className="font-display text-2xl md:text-[28px] font-bold text-ivory">{num}</div>
                  <div className="text-[11px] text-ash tracking-[2px] uppercase mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-[520px] mx-auto lg:mx-0 lg:pt-2 self-stretch">
            <TournamentCard />
          </div>
        </div>
      </section>

      {/* ===== POR QUÃ‰ ZONA CUP ===== */}
      <section className="bg-bg-dark" id="porque">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-20">
          <div className="section-tag">Por quÃ© Zona Cup</div>
          <h2 className="section-title">DejÃ¡ de jugar<br />torneos improvisados.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-12">
            {[
              {
                icon: <path d="M12 2L14 8L20 9L15.5 13L17 19L12 16L7 19L8.5 13L4 9L10 8Z" />,
                title: 'Premios en 48hs',
                desc: 'Publicamos el pool antes del torneo y lo pagamos el lunes. Mercado Pago, transferencia o PayPal. Sin excusas.',
              },
              {
                icon: <path d="M3 20V10M9 20V4M15 20V14M21 20V8" />,
                title: 'Ranking oficial',
                desc: 'Cada torneo suma puntos. Top 50 accede a premios exclusivos e invitaciÃ³n a los Majors trimestrales.',
              },
              {
                icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7V12L15 15" /></>,
                title: 'OperaciÃ³n real',
                desc: 'Web propia, bracket en tiempo real, Ã¡rbitros dedicados, reglas claras. Ya sea tu primer torneo o el #100.',
              },
              {
                icon: <path d="M12 2L2 7V12C2 17 6 21 12 22C18 21 22 17 22 12V7L12 2Z" />,
                title: 'Anti-cheat serio',
                desc: 'VOD review desde Top 8. Ban permanente y pÃºblico con evidencia. Este circuito protege al que juega limpio.',
              },
            ].map((p) => (
              <div key={p.title} className="card p-6 hover:border-fire-core/30 hover:-translate-y-1 group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-fire-core opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-10 h-10 bg-fire-core/10 rounded flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff6a00" strokeWidth="2">{p.icon}</svg>
                </div>
                <h3 className="font-display text-sm font-bold text-ivory tracking-wider uppercase mb-2">{p.title}</h3>
                <p className="text-[13px] text-ash leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CÃ“MO FUNCIONA ===== */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 py-20" id="como">
        <div className="section-tag">CÃ³mo funciona</div>
        <h2 className="section-title">De cero a jugando<br />en 4 pasos.</h2>
        <p className="text-[15px] text-smoke max-w-xl leading-relaxed">Todo pasa en la web. Sin planillas, sin DMs, sin caos.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-12">
          {[
            ['01', 'Registrate', 'Un click con Discord. CompletÃ¡ tu Riot ID y tu rango. 60 segundos.'],
            ['02', 'ArmÃ¡ tu equipo', 'InvitÃ¡ con cÃ³digo, buscÃ¡ compaÃ±ero en Discord, o entrÃ¡ al matchmaking.'],
            ['03', 'PagÃ¡ tu entrada', 'Cada uno paga lo suyo. Mercado Pago, tarjeta o transferencia segÃºn tu paÃ­s.'],
            ['04', 'A jugar.', 'Bracket en vivo, lobbies automÃ¡ticos. Premios en tu cuenta en 48 horas.'],
          ].map(([num, title, desc]) => (
            <div key={num} className={`card p-6 ${num === '04' ? 'border-fire-core/40' : ''}`}>
              <div className={`font-display text-5xl font-black leading-none mb-2.5 ${num === '04' ? 'text-fire-core' : 'text-fire-core/15'}`}>
                {num}
              </div>
              <h3 className="font-display text-sm text-ivory tracking-wider uppercase mb-2">{title}</h3>
              <p className="text-[13px] text-ash leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CALENDARIO ===== */}
      <section className="bg-bg-dark" id="torneos">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-20">
          <div className="section-tag">Calendario</div>
          <h2 className="section-title">PrÃ³ximos torneos.</h2>

          <div className="flex gap-1.5 mb-7 flex-wrap">
            {['Todos', '2v2', '5v5', 'Majors'].map((f, i) => (
              <button key={f} className={`px-4 py-1.5 rounded-sm text-xs font-bold tracking-wider uppercase font-body border transition-all ${i === 0 ? 'bg-fire-core border-fire-core text-white' : 'border-white/10 text-ash bg-transparent hover:border-fire-core/30'}`}>
                {f}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              { month: 'ABR', day: '25', name: 'Zona Cup Weekly #12', badge: '2V2 Â· Open', badgeClass: 'bg-fire-core/12 text-fire-core', detail: 'SÃ¡bado Â· 20:00 ART Â· 23/32 duplas Â· Single elim', pool: 'USD 512', entry: 'USD 8', cta: 'Inscribirme', major: false },
              { month: 'MAY', day: '02', name: 'Zona Cup Weekly #13', badge: '2V2 Â· Open', badgeClass: 'bg-fire-core/12 text-fire-core', detail: 'SÃ¡bado Â· 20:00 ART Â· 5/32 duplas Â· Single elim', pool: 'USD 512', entry: 'USD 8', cta: 'Inscribirme', major: false },
              { month: 'MAY', day: '10', name: 'Clash 5v5 Â· Main Event', badge: '5V5 Â· Major', badgeClass: 'bg-fire-core text-white', detail: 'SÃ¡bado Â· 18:00 ART Â· 16 equipos Â· BO3 playoffs Â· Streamed', pool: 'USD 960', entry: 'USD 12', cta: 'Pre-registro', major: true },
              { month: 'MAY', day: '16', name: 'Underdog Night', badge: '2V2 Â· Raro', badgeClass: 'bg-green-400/12 text-green-400', detail: 'Viernes Â· 21:00 ART Â· Solo duelistas Â· Rango mÃ¡x: Platino', pool: 'USD 280', entry: 'USD 5', cta: 'Pre-registro', major: false },
            ].map((t) => (
              <div key={t.name} className={`card p-4 md:p-5 grid grid-cols-1 md:grid-cols-[65px_1fr_auto_auto_auto] gap-3 md:gap-5 items-center hover:bg-bg-hover ${t.major ? 'border-fire-core/40 bg-gradient-to-r from-bg-card to-fire-core/5' : ''}`}>
                <div className="flex md:flex-col md:text-center md:border-r md:border-white/5 md:pr-4 gap-2 md:gap-0 items-baseline md:items-center">
                  <div className="font-display text-[11px] text-fire-core tracking-wider">{t.month}</div>
                  <div className="font-display text-2xl md:text-[28px] font-bold text-ivory">{t.day}</div>
                </div>
                <div>
                  <h4 className="font-display text-base text-ivory tracking-wider flex items-center gap-2 flex-wrap mb-1">
                    {t.name}
                    <span className={`text-[9px] px-2 py-0.5 rounded-sm tracking-[1.5px] font-bold uppercase ${t.badgeClass}`}>{t.badge}</span>
                  </h4>
                  <div className="text-xs text-ash">{t.detail}</div>
                </div>
                <div className="hidden md:block text-right">
                  <div className="text-[9px] text-ash tracking-wider uppercase">Pool</div>
                  <div className="font-display text-[15px] text-ivory font-semibold">{t.pool}</div>
                </div>
                <div className="hidden md:block text-right">
                  <div className="text-[9px] text-ash tracking-wider uppercase">Entrada</div>
                  <div className="font-display text-[15px] text-ivory font-semibold">{t.entry}</div>
                </div>
                <Link href="/torneos">
                  <button className={`${t.major || t.cta === 'Inscribirme' ? 'btn-fire' : 'btn-ghost'} !py-2.5 !px-5 !text-xs w-full md:w-auto`}>
                    {t.cta}
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== RANKING ===== */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 py-20" id="ranking">
        <div className="section-tag">Ranking en vivo</div>
        <h2 className="section-title">Temporada 1.<br />Cada punto cuenta.</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-12">
          <div>
            <p className="text-[15px] text-smoke leading-relaxed max-w-lg mb-6">
              Cada torneo suma puntos al ranking. El Top 50 de la temporada accede a los Majors trimestrales con pool de USD 5.000 y premios exclusivos en skins.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="card p-4"><div className="font-display text-2xl font-bold text-ivory">32</div><div className="text-[10px] text-ash tracking-[1.5px] uppercase mt-0.5">DÃ­as restantes</div></div>
              <div className="card p-4"><div className="font-display text-2xl font-bold text-ivory">USD 5K</div><div className="text-[10px] text-ash tracking-[1.5px] uppercase mt-0.5">Pool del Major</div></div>
            </div>
            <Link href="/ranking"><button className="btn-ghost">Ver ranking completo â†’</button></Link>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5 flex justify-between items-center">
              <span className="text-[11px] text-ash tracking-[1.5px] uppercase">Top jugadores Â· Temporada 1</span>
              <span className="text-[11px] text-green-400">â— En vivo</span>
            </div>
            {[
              { pos: '01', posClass: 'text-gold', name: 'xPerseo', sub: 'AR Â· Radiant Â· 12 torneos', badge: 'Radiant', badgeClass: 'bg-gold/10 text-gold', pts: '2.840' },
              { pos: '02', posClass: 'text-[#b4b2a9]', name: 'MaloSiempre', sub: 'CL Â· Inmortal Â· 11 torneos', badge: 'Radiant', badgeClass: 'bg-gold/10 text-gold', pts: '2.715' },
              { pos: '03', posClass: 'text-[#d85a30]', name: 'cholo_aim', sub: 'PE Â· Inmortal Â· 10 torneos', badge: 'Platino', badgeClass: 'bg-purple-400/12 text-purple-300', pts: '2.580' },
              { pos: '04', posClass: 'text-ash', name: 'Nocturna', sub: 'AR Â· Diamante Â· 9 torneos', badge: 'Platino', badgeClass: 'bg-purple-400/12 text-purple-300', pts: '2.340' },
              { pos: '05', posClass: 'text-ash', name: '7pesos', sub: 'AR Â· Ascendente Â· 11 torneos', badge: 'Oro', badgeClass: 'bg-green-400/12 text-green-400', pts: '2.180' },
            ].map((r) => (
              <div key={r.pos} className="px-5 py-3 grid grid-cols-[32px_1fr_auto_auto] gap-3.5 items-center border-b border-white/[0.02] hover:bg-fire-core/[0.03] transition-colors">
                <div className={`font-display text-base font-bold ${r.posClass}`}>{r.pos}</div>
                <div>
                  <div className="text-sm text-ivory font-semibold">{r.name}</div>
                  <div className="text-[11px] text-ash">{r.sub}</div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-sm tracking-wider uppercase font-bold ${r.badgeClass}`}>{r.badge}</span>
                <div className="font-display text-sm text-ivory font-semibold">{r.pts}</div>
              </div>
            ))}
            <div className="px-5 py-3.5 text-center text-xs text-ash">Mostrando 5 de 1.247 jugadores</div>
          </div>
        </div>
      </section>

      {/* ===== PLANES ===== */}
      <section className="bg-bg-dark" id="pro">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-20 text-center">
          <div className="section-tag">Zona Cup Pro</div>
          <h2 className="section-title">Si vas en serio,<br />acÃ¡ hay mÃ¡s.</h2>
          <p className="text-[15px] text-smoke mx-auto max-w-md">MembresÃ­a mensual. CancelÃ¡s cuando quieras.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl mx-auto mt-12">
            <div className="card p-7 text-left">
              <div className="font-display text-xs tracking-[3px] text-ash uppercase mb-2">Free</div>
              <div className="font-display text-4xl font-bold text-ivory mb-1">USD 0 <span className="text-sm font-normal text-ash">/mes</span></div>
              <div className="flex flex-col gap-2.5 mt-5 text-[13px] text-smoke">
                {['Acceso a todos los torneos Open', 'Ranking oficial de temporada', 'Comunidad en Discord', 'Stats bÃ¡sicas de tu perfil'].map(f => (
                  <div key={f} className="flex gap-2"><span className="text-green-400 font-bold shrink-0">âœ“</span> {f}</div>
                ))}
              </div>
            </div>

            <div className="card p-7 text-left !border-2 !border-fire-core relative">
              <div className="absolute -top-3 left-6 bg-fire-core text-white text-[9px] px-3 py-1 rounded-sm tracking-[2px] font-bold uppercase">Recomendado</div>
              <div className="font-display text-xs tracking-[3px] text-fire-core uppercase mb-2">Pro</div>
              <div className="font-display text-4xl font-bold text-ivory mb-1">USD 6 <span className="text-sm font-normal text-ash">/mes</span></div>
              <div className="flex flex-col gap-2.5 mt-5 text-[13px] text-bone">
                {['Todo lo de Free', '20% OFF en inscripciones', 'Torneo exclusivo Pro mensual', 'Scouting Report mensual', 'Sorteo mensual de skin', 'Rol VIP en Discord'].map(f => (
                  <div key={f} className="flex gap-2"><span className="text-fire-core font-bold shrink-0">âœ“</span> {f}</div>
                ))}
              </div>
              <button className="btn-fire w-full mt-5">Activar Pro</button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRANSPARENCIA ===== */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 py-20 text-center" id="premios">
        <div className="section-tag">Transparencia</div>
        <h2 className="section-title">Cero vueltas<br />con los premios.</h2>
        <p className="text-[15px] text-smoke mx-auto max-w-md mb-2">AsÃ­ se reparte cada peso en un torneo Weekly.</p>

        <div className="max-w-2xl mx-auto card p-8 mt-10 text-left">
          <div className="flex justify-between items-baseline mb-5">
            <span className="text-[13px] text-ash">2v2 Â· 32 duplas Â· 64 jugadores</span>
            <span className="font-display text-2xl font-bold text-ivory">USD 512</span>
          </div>
          <div className="h-2.5 bg-bg-deep rounded-full overflow-hidden flex gap-0.5 mb-5">
            <div className="rounded-full" style={{ flex: 40, background: '#ff6a00' }} />
            <div className="rounded-full" style={{ flex: 20, background: '#c23a0a' }} />
            <div className="rounded-full" style={{ flex: 10, background: '#f0997b' }} />
            <div className="rounded-full" style={{ flex: 10, background: '#f0997b' }} />
            <div className="rounded-full" style={{ flex: 5, background: '#afa9ec' }} />
            <div className="rounded-full" style={{ flex: 15, background: '#5f5e5a' }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[13px]">
            {[
              ['#ff6a00', '1Â° lugar', 'USD 205'],
              ['#c23a0a', '2Â° lugar', 'USD 102'],
              ['#f0997b', '3Â° / 4Â° lugar', 'USD 51 c/u'],
              ['#afa9ec', 'MVP (skin)', 'USD 25'],
            ].map(([color, name, val]) => (
              <div key={name} className="flex justify-between py-2 border-b border-white/[0.03]">
                <span className="flex items-center gap-2 text-bone"><span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />{name}</span>
                <span className="text-ivory font-bold">{val}</span>
              </div>
            ))}
            <div className="sm:col-span-2 flex justify-between py-2">
              <span className="flex items-center gap-2 text-ash"><span className="w-2 h-2 rounded-sm bg-[#5f5e5a] shrink-0" />OperaciÃ³n, staff, producciÃ³n</span>
              <span className="text-ash font-bold">USD 78 Â· 15%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DISCORD ===== */}
      <section className="bg-bg-dark" id="comunidad">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-20 text-center">
          <div className="w-14 h-14 bg-discord/10 rounded-lg flex items-center justify-center mx-auto mb-5">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#5865f2"><path d="M20.3 4.4a19.8 19.8 0 0 0-4.9-1.5l-.2.5a18 18 0 0 0-5.3 0l-.2-.5A19.8 19.8 0 0 0 4.7 4.4 20.3 20.3 0 0 0 1.1 15a20 20 0 0 0 6 3 14.6 14.6 0 0 0 1.3-2 13 13 0 0 1-2-1l.5-.4a14.3 14.3 0 0 0 12.2 0l.5.4a13 13 0 0 1-2 1 14.6 14.6 0 0 0 1.3 2 20 20 0 0 0 6-3 20.3 20.3 0 0 0-3.6-10.6zM8.5 13.1c-1.2 0-2.2-1.1-2.2-2.4 0-1.4 1-2.5 2.2-2.5s2.2 1.1 2.2 2.5-1 2.4-2.2 2.4zm7 0c-1.2 0-2.2-1.1-2.2-2.4 0-1.4 1-2.5 2.2-2.5s2.2 1.1 2.2 2.5-1 2.4-2.2 2.4z"/></svg>
          </div>
          <h2 className="section-title">La comunidad vive<br />en Discord.</h2>
          <p className="text-[15px] text-smoke max-w-md mx-auto leading-relaxed mb-6">
            BuscÃ¡s dÃºo, ves el bracket en vivo, recibÃ­s los cÃ³digos de lobby y te enterÃ¡s primero. Todo pasa ahÃ­.
          </p>
          <div className="flex gap-9 justify-center mb-8">
            <div><div className="font-display text-xl font-bold text-ivory">3.420</div><div className="text-[10px] text-ash tracking-[1.5px] uppercase">Miembros</div></div>
            <div><div className="font-display text-xl font-bold text-green-400">â— 847</div><div className="text-[10px] text-ash tracking-[1.5px] uppercase">Online</div></div>
            <div><div className="font-display text-xl font-bold text-ivory">28</div><div className="text-[10px] text-ash tracking-[1.5px] uppercase">Canales</div></div>
          </div>
          <a href="https://discord.gg/HPGKVqb6" target="_blank" rel="noopener noreferrer">
            <button className="btn-discord !px-8 !py-3.5 !text-sm">Unirme al Discord</button>
          </a>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="max-w-7xl mx-auto px-5 md:px-10 py-20 text-center" id="faq">
        <div className="section-tag">FAQ</div>
        <h2 className="section-title">Lo que te estÃ¡s<br />preguntando.</h2>
        <FAQ />
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="relative py-24 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-fire-core opacity-[0.06] rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 max-w-xl mx-auto px-5">
          <div className="section-tag">PrÃ³ximo torneo Â· 25 ABR</div>
          <h2 className="section-title !text-[42px] md:!text-[52px]">Los cupos se<br />llenan rÃ¡pido.</h2>
          <p className="text-base text-smoke mb-8">23 de 32 duplas inscriptas. Quedan 9 lugares.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/torneos"><button className="btn-fire !py-4 !px-9 !text-[15px]">Inscribirme ahora</button></Link>
            <Link href="/reglamento"><button className="btn-ghost !py-4 !px-7 !text-[15px]">Ver reglamento</button></Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function FAQ() {
  return <FAQClient />;
}
