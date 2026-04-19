# Zona Cup — Plataforma de Torneos VALORANT LATAM

Plataforma web completa para organizar torneos de VALORANT en Argentina, Chile y Perú. Login con Discord, pagos con Mercado Pago, ranking en tiempo real, panel de administración.

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL) con Realtime
- **Auth:** Discord OAuth via Supabase
- **Pagos:** Mercado Pago SDK
- **Deploy:** Vercel

---

## Setup paso a paso

### 1. Clonar e instalar

```bash
git clone https://github.com/TU-USUARIO/zona-cup.git
cd zona-cup
npm install
```

### 2. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → New Project
2. Elegir nombre: `zona-cup`, región: South America (São Paulo)
3. Guardar la URL y las keys (anon + service role)

### 3. Ejecutar el schema en Supabase

1. En tu dashboard de Supabase → SQL Editor → New Query
2. Copiar TODO el contenido de `src/lib/schema.sql`
3. Click en "Run" — esto crea las tablas, triggers, funciones y views

### 4. Configurar Discord OAuth en Supabase

1. Ir a [discord.com/developers](https://discord.com/developers/applications) → New Application
2. En OAuth2 → Redirects, agregar: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
3. Copiar Client ID y Client Secret
4. En Supabase Dashboard → Authentication → Providers → Discord → Enable
5. Pegar Client ID y Client Secret

### 5. Configurar Mercado Pago

1. Ir a [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers/panel/app) → Crear aplicación
2. Obtener Access Token y Public Key
3. Configurar Webhook URL: `https://TU-DOMINIO.com/api/webhooks/mercadopago`
4. Seleccionar eventos: "Pagos"

### 6. Variables de entorno

```bash
cp .env.example .env.local
```

Completar `.env.local` con:
- `NEXT_PUBLIC_SUPABASE_URL` — URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon key pública
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (privada, solo server)
- `MERCADOPAGO_ACCESS_TOKEN` — Access token de MP
- `MERCADOPAGO_PUBLIC_KEY` — Public key de MP
- `NEXT_PUBLIC_BASE_URL` — URL de tu sitio (ej: `https://zonacup.gg`)

### 7. Ejecutar en local

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

### 8. Hacerte admin

En Supabase Dashboard → Table Editor → profiles → buscar tu usuario → cambiar `is_admin` a `true`. Luego podés acceder a `/admin`.

---

## Deploy en Vercel

### Opción A: Desde GitHub (recomendado)

1. Subir el código a GitHub:
```bash
git init
git add .
git commit -m "Zona Cup v1.0"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/zona-cup.git
git push -u origin main
```

2. Ir a [vercel.com](https://vercel.com) → Import Git Repository
3. Seleccionar el repo `zona-cup`
4. En "Environment Variables", agregar TODAS las variables de `.env.local`
5. Click en Deploy

### Opción B: CLI de Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Dominio personalizado

1. En Vercel Dashboard → tu proyecto → Settings → Domains
2. Agregar tu dominio (ej: `zonacup.gg`)
3. Configurar DNS según las instrucciones de Vercel (CNAME o A record)
4. SSL se configura automáticamente

---

## Estructura del proyecto

```
zona-cup/
├── public/
│   └── logo.png              # Logo de Zona Cup
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (metadata, fonts)
│   │   ├── page.tsx           # Landing page principal
│   │   ├── admin/page.tsx     # Panel admin (crear torneos, gestionar)
│   │   ├── perfil/page.tsx    # Perfil del jugador
│   │   ├── ranking/page.tsx   # Leaderboard en vivo
│   │   ├── torneos/
│   │   │   ├── page.tsx       # Lista de torneos
│   │   │   └── [slug]/page.tsx # Detalle + inscripción + pago
│   │   └── api/
│   │       ├── auth/callback/route.ts      # Discord OAuth callback
│   │       ├── tournaments/route.ts         # CRUD torneos
│   │       ├── registrations/route.ts       # Inscripción + pago MP
│   │       ├── rankings/route.ts            # Leaderboard API
│   │       └── webhooks/mercadopago/route.ts # Webhook de pagos
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── Countdown.tsx
│   │   ├── TournamentCard.tsx
│   │   └── FAQClient.tsx
│   ├── lib/
│   │   ├── supabase-browser.ts  # Cliente Supabase (browser)
│   │   ├── supabase-server.ts   # Cliente Supabase (server + admin)
│   │   ├── mercadopago.ts       # Integración Mercado Pago
│   │   └── schema.sql           # Schema completo de la DB
│   └── styles/
│       └── globals.css          # Tailwind + estilos custom
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

---

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page completa (hero, torneos, ranking, planes, FAQ) |
| `/torneos` | Lista de torneos con filtros y realtime |
| `/torneos/[slug]` | Detalle de torneo + inscripción + pago con Mercado Pago |
| `/ranking` | Leaderboard con filtros por país |
| `/perfil` | Perfil del jugador (Riot ID, rango, país, stats) |
| `/admin` | Panel admin: crear torneos, cambiar estados |

---

## Flujo de inscripción y pago

1. Usuario clickea "Inscribirme" en un torneo
2. Si no está logueado → redirect a Discord OAuth → vuelve logueado
3. Se crea `registration` con status `pending`
4. Se genera Preference de Mercado Pago con redirect URLs
5. Usuario es redirigido al checkout de Mercado Pago
6. Paga con tarjeta, MP saldo, transferencia, etc.
7. Mercado Pago envía webhook a `/api/webhooks/mercadopago`
8. Webhook actualiza `registration.payment_status = 'approved'`
9. Trigger de DB auto-incrementa `tournament.current_slots` y `prize_pool`
10. Usuario vuelve a la web y ve "Pago confirmado"

---

## Notas importantes

- **Testear pagos:** usá las credenciales de sandbox de Mercado Pago primero
- **Primer admin:** manualmente en Supabase cambiá `is_admin = true` en tu profile
- **Realtime:** las tablas tournaments, registrations, matches y rankings tienen realtime habilitado
- **RLS:** Row Level Security está activo en todas las tablas. Los usuarios solo pueden editar sus propios datos
- **Webhook MP:** asegurate de que la URL del webhook en MP apunte a tu dominio de producción

---

## Próximos pasos (v2)

- [ ] Sistema de equipos completo (crear, invitar, gestionar)
- [ ] Bracket propio (reemplazar Challonge)
- [ ] Integración API Riot para validar rango
- [ ] Membresía Pro con Stripe subscriptions
- [ ] Dashboard de stats avanzadas
- [ ] Sistema de check-in automático
- [ ] Bot Discord integrado
- [ ] App mobile (React Native)
