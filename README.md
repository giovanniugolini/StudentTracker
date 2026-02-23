# StudentTracker — README per sviluppatori

Applicazione web (PWA) per il tracciamento GPS degli studenti durante le gite scolastiche.
Il docente vede la posizione di tutti gli studenti in tempo reale su una mappa; gli studenti aprono
un link (magic link / QR code) e condividono la propria posizione.

---

## Stack tecnico

| Layer | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript 5 + Vite 7 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`, niente config file) |
| Backend | Supabase (Auth, Realtime, PostgreSQL, Edge Functions) |
| Mappe | Leaflet 1.9 + React-Leaflet 5 |
| Push | Firebase Cloud Messaging (FCM) — pianificato Sprint 3+ |
| Deploy | PWA installabile da browser (niente App Store / Play Store) |

---

## Prerequisiti

- Node.js ≥ 20
- [Supabase CLI](https://supabase.com/docs/guides/cli) installato globalmente
- Docker (per Supabase locale)
- Un file `.env.local` con le variabili di ambiente (vedi sotto)

---

## Setup locale

```bash
# 1. Dipendenze
npm install

# 2. Avvia Supabase locale (Docker)
supabase start

# 3. Applica le migrazioni
supabase db push

# 4. Genera i tipi TypeScript dal DB
npm run generate:types

# 5. Dev server
npm run dev
```

### Variabili d'ambiente

Crea `.env.local` nella root del progetto:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key mostrata da `supabase start`>
```

> Dopo ogni `supabase db reset` i dati auth vengono persi — registrare di nuovo il docente.

---

## Script npm

| Comando | Descrizione |
|---|---|
| `npm run dev` | Dev server Vite su `http://localhost:5173` |
| `npm run build` | Compilazione TypeScript + bundle Vite |
| `npm run preview` | Anteprima del build di produzione |
| `npm run lint` | ESLint su tutto il progetto |
| `npm run format` | Prettier su `src/**/*.{ts,tsx,css}` |
| `npm run test` | Vitest (run once) |
| `npm run test:watch` | Vitest in modalità watch |
| `npm run test:ui` | Vitest con interfaccia grafica |
| `npm run generate:types` | Rigenera `src/types/database.ts` dal DB locale |

> Dopo `generate:types` il file viene sovrascritto — il blocco di alias manuali in fondo al file
> viene perso. Se hai modificato gli alias, ri-appendili (oppure eseguilo solo quando cambia lo
> schema).

---

## Struttura cartelle

```
src/
  components/        # Componenti riusabili (TripMap, AlertBanner, …)
  pages/             # Pagine / route (DashboardPage, StudentPage, …)
  hooks/             # Custom hooks React
    useGeolocation        # watchPosition adattivo + Battery API
    usePositionBroadcast  # Broadcast Supabase + buffer offline IndexedDB
    useTripPositions      # Subscribe Realtime (lato docente)
    useZoneAlerts         # Logica allerte zona sicura
  lib/               # Utility pure
    geo.ts                # haversineKm()
    mapIcons.ts           # Icone Leaflet (docente + studenti)
    positionBuffer.ts     # CRUD IndexedDB per buffer offline
    supabase.ts           # Client Supabase tipizzato
  stores/            # Stato globale Zustand (se necessario)
  types/
    database.ts           # Tipi generati + alias manuali
  __tests__/         # Test Vitest
supabase/
  migrations/        # Migration SQL (applicate in ordine cronologico)
```

---

## Architettura GPS

```
StudentPage                       DashboardPage
    │                                  │
useGeolocation (watchPosition)    useTripPositions (Realtime subscribe)
    │                                  │
usePositionBroadcast               LivePositionMap
    ├── online  → upsert_position RPC  │
    └── offline → positionBuffer       useZoneAlerts
                    (IndexedDB)            ├── activeAlerts
                    flush on reconnect     └── alertLog
```

### Modalità GPS adattiva

- **HIGH**: `enableHighAccuracy: true`, timeout 15 s, maxAge 5 s — default
- **POWER_SAVE**: `enableHighAccuracy: false`, timeout 30 s, maxAge 30 s

Passa a POWER_SAVE automaticamente dopo 60 s senza movimento ≥ 15 m,
oppure se la batteria scende sotto il 20% (Battery Status API).

### Buffer offline

Le posizioni vengono scritte su IndexedDB (`student-tracker` DB, store `positions`)
quando la connessione è assente. Al ripristino della connettività, `flushBuffer`
le invia in ordine FIFO tramite `upsert_position` RPC.

---

## Realtime (Supabase Broadcast)

Lo studente invia la posizione sul canale `trip:<trip_id>` con evento `position`.
Il docente si iscrive allo stesso canale e aggiorna `LivePositionMap` in memoria.
Le posizioni non vengono lette dalla tabella `positions` in tempo reale, solo scritte
tramite RPC per la persistenza / storico.

---

## GDPR

- Prima dell'attivazione del GPS lo studente vede una `ConsentScreen` con l'informativa completa.
- Il consenso viene salvato in `localStorage` con chiave `gdpr-consent-<student_id>`.
- Se l'utente rifiuta o revoca il consenso, il GPS si disattiva immediatamente.
- Il docente può eliminare le posizioni di una gita tramite il pulsante "🗑 pos." in dashboard
  (chiama la RPC `delete_trip_positions` — solo il docente proprietario della gita può eseguirla).
- La RPC `cleanup_old_positions` elimina posizioni più vecchie di 30 giorni (da schedulare via
  pg_cron o Edge Function).

---

## Test

```bash
npm run test
```

Suite attuali:

| File | Cosa testa |
|---|---|
| `geo.test.ts` | `haversineKm` — distanze, simmetria, dateline, polo |
| `positionBuffer.test.ts` | CRUD IndexedDB offline buffer (con `fake-indexeddb`) |
| `useZoneAlerts.test.ts` | Hook allerte — exit, return, deduplicazione, radius_change |

---

## Simulazione posizioni (sviluppo)

In `DashboardPage`, il pulsante **"Simula posizioni studenti"** attiva una modalità di test
che genera posizioni casuali per gli studenti con piccolo drift ogni 2 s.
Il primo studente esce occasionalmente dalla zona sicura per testare il sistema di allerte.
Le posizioni simulate vengono sovrascritte da quelle reali se presenti.

---

## Migrazioni DB (ordine)

| File | Contenuto |
|---|---|
| `20260201_…` | Schema iniziale (students, trips, teachers, positions, alerts) |
| `20260210_…` | Magic link + RLS |
| `20260215_…` | `get_student_by_token` RPC |
| `20260222_…` | `upsert_position` RPC (upsert con dedup) |
| `20260223_…` | `delete_trip_positions` + `cleanup_old_positions` RPC |

---

## Roadmap

- [x] Sprint 1 — Fondamenta (auth, CRUD studenti, QR, CSV)
- [x] Sprint 2 — Core GPS & Mappa (Leaflet, Realtime, buffer offline, batteria)
- [x] Sprint 3 — Allerte & UX (zona sicura, log eventi, distanze live)
- [x] Sprint 4 — Testing & GDPR (Vitest, ConsentScreen, data management)
- [ ] Sprint 5 — PWA & Deploy (`vite-plugin-pwa`, manifest, HTTPS, Vercel/Netlify)
