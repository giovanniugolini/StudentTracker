import { useState } from 'react'
import { Navigate } from 'react-router'
import { useStudentStore } from '@/stores/studentStore'
import { useGeolocation } from '@/hooks/useGeolocation'
import { usePositionBroadcast } from '@/hooks/usePositionBroadcast'
import { useStudentRollCall } from '@/hooks/useStudentRollCall'

// ─── GDPR Consent Screen ───────────────────────────────────────────────────────

function ConsentScreen({
  studentName,
  tripName,
  onAccept,
  onDecline,
}: {
  studentName: string
  tripName: string
  onAccept: () => void
  onDecline: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-red-500 text-3xl shadow-lg">
            🔒
          </div>
          <h1 className="text-lg font-bold text-slate-800">Informativa sulla privacy</h1>
          <p className="mt-1 text-xs text-slate-500">
            Ciao <strong>{studentName}</strong> — gita <strong>{tripName}</strong>
          </p>
        </div>

        <div className="mb-5 space-y-3 text-xs text-slate-600">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="mb-1 font-semibold text-slate-700">📊 Dati raccolti</div>
            <ul className="space-y-0.5 text-slate-500">
              <li>• Posizione GPS (aggiornata ogni ~30 secondi)</li>
              <li>• Livello batteria del dispositivo</li>
            </ul>
          </div>

          <div className="rounded-xl bg-blue-50 p-3 ring-1 ring-blue-100">
            <div className="mb-1 font-semibold text-blue-700">🎯 Finalità</div>
            <p className="text-blue-600">
              Monitoraggio della sicurezza durante la gita scolastica. I dati
              sono visibili <strong>solo al tuo insegnante</strong>.
            </p>
          </div>

          <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
            <div className="mb-1 font-semibold text-amber-700">🗓 Conservazione</div>
            <p className="text-amber-600">
              I dati di posizione vengono eliminati automaticamente
              <strong> entro 30 giorni</strong> dalla fine della gita.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="mb-1 font-semibold text-slate-700">⚖️ I tuoi diritti</div>
            <p className="text-slate-500">
              Puoi revocare il consenso in qualsiasi momento uscendo dalla gita.
              Puoi richiedere la cancellazione dei dati al tuo insegnante.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onDecline}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
          >
            Non accetto
          </button>
          <button
            onClick={onAccept}
            className="flex-1 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
          >
            Accetto ✓
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentPage() {
  const { session, leave } = useStudentStore()

  // Consent persisted in localStorage per student — GPS only starts after opt-in
  const consentKey = `gdpr-consent-${session?.student.id ?? ''}`
  const [consented, setConsented] = useState(
    () => localStorage.getItem(consentKey) === 'true',
  )
  const [declined, setDeclined] = useState(false)

  const geo = useGeolocation(consented)

  const { bufferedCount } = usePositionBroadcast({
    studentId: session?.student.id ?? '',
    tripId: session?.trip.id ?? '',
    position: consented ? geo.position : null,
    accuracy: consented ? geo.accuracy : null,
  })

  const studentPos = geo.position ? { lat: geo.position.lat, lng: geo.position.lng } : null

  const { activeRollCallId, timeLeft, responded, responding, respond, distanceKm } =
    useStudentRollCall(session?.trip.id, session?.student.token, studentPos)

  if (!session) return <Navigate to="/login" replace />

  const { student, trip } = session

  const handleAccept = () => {
    localStorage.setItem(consentKey, 'true')
    setConsented(true)
  }

  const handleDecline = () => {
    setDeclined(true)
  }

  // Show consent screen on first visit
  if (!consented && !declined) {
    return (
      <ConsentScreen
        studentName={student.name}
        tripName={trip.name}
        onAccept={handleAccept}
        onDecline={handleDecline}
      />
    )
  }

  const gpsReady = geo.position !== null && geo.error === null
  const gpsWaiting = geo.watching && geo.position === null && geo.error === null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">

      {/* ── Appello overlay ── */}
      {activeRollCallId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
            {responded ? (
              /* Conferma risposta */
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-5xl">
                  ✅
                </div>
                <h2 className="text-xl font-bold text-emerald-800">Presenza confermata</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Il professore ha ricevuto la tua risposta.
                </p>
                <p className="mt-4 font-mono text-xs text-slate-400">
                  Appello in chiusura in {timeLeft}s…
                </p>
              </div>
            ) : (
              /* Richiesta risposta */
              <>
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-4xl">
                    ✋
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Appello!</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Il professore ha avviato un appello. Rispondi subito.
                  </p>
                </div>

                {/* Countdown bar */}
                <div className="mb-6">
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>Tempo rimanente</span>
                    <span className={`font-mono font-bold tabular-nums ${timeLeft <= 10 ? 'animate-pulse text-red-600' : 'text-slate-600'}`}>
                      {timeLeft}s
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500' : 'bg-amber-400'}`}
                      style={{ width: `${(timeLeft / 120) * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={respond}
                  disabled={responding}
                  className="w-full rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white shadow-lg hover:bg-emerald-600 active:scale-95 disabled:opacity-60 transition-transform"
                >
                  {responding ? 'Invio…' : '✋ Sono presente!'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-red-500 text-3xl shadow-lg">
            📍
          </div>
          <h1 className="text-xl font-bold text-slate-800">Student Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">
            {consented
              ? 'La tua posizione è condivisa con il professore'
              : 'Condivisione posizione disattivata'}
          </p>
        </div>

        {/* Student info */}
        <div className="mb-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Studente</div>
          <div className="mt-1 text-base font-semibold text-slate-800">{student.name}</div>
        </div>

        {/* Trip info */}
        <div className="mb-6 rounded-xl bg-blue-50 p-4 ring-1 ring-blue-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-400">Gita</div>
          <div className="mt-1 text-base font-semibold text-blue-800">{trip.name}</div>
          <div className="mt-0.5 text-xs text-blue-500">
            {new Date(trip.date_start).toLocaleDateString('it-IT')} —{' '}
            {new Date(trip.date_end).toLocaleDateString('it-IT')}
          </div>
        </div>

        {/* Indicatore distanza dal docente */}
        {distanceKm !== null && (() => {
          const radiusKm = trip.radius_km
          const outside = distanceKm > radiusKm
          const meters = Math.round(distanceKm * 1000)
          return (
            <div className={`mb-6 rounded-xl p-4 ring-1 ${
              outside
                ? 'bg-red-50 ring-red-200'
                : 'bg-emerald-50 ring-emerald-100'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{outside ? '⚠️' : '✅'}</span>
                <div>
                  <div className={`text-sm font-bold ${outside ? 'text-red-700' : 'text-emerald-700'}`}>
                    {outside ? 'Sei fuori dalla zona sicura' : 'Sei nella zona sicura'}
                  </div>
                  <div className={`text-xs mt-0.5 ${outside ? 'text-red-500' : 'text-emerald-600'}`}>
                    {meters < 1000
                      ? `${meters} m dal docente`
                      : `${distanceKm.toFixed(1)} km dal docente`}
                    {' · '}raggio {Math.round(radiusKm * 1000)} m
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Declined consent notice */}
        {declined && !consented && (
          <div className="mb-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <div className="text-sm font-semibold text-amber-800">⚠ GPS disattivato</div>
            <div className="mt-1 text-xs text-amber-600">
              Hai scelto di non condividere la posizione. Il professore non
              potrà monitorarti sulla mappa.
            </div>
            <button
              onClick={() => setDeclined(false)}
              className="mt-3 w-full rounded-lg bg-amber-100 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-200"
            >
              Rivedi la scelta
            </button>
          </div>
        )}

        {/* GPS status (only when consented) */}
        {consented && (
          <>
            {!geo.supported && (
              <div className="mb-4 rounded-xl bg-slate-100 p-4 ring-1 ring-slate-200">
                <div className="text-sm font-semibold text-slate-600">📵 GPS non supportato</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Questo dispositivo non supporta la geolocalizzazione.
                </div>
              </div>
            )}

            {geo.supported && geo.error && (
              <div className="mb-4 rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
                <div className="text-sm font-semibold text-red-700">⚠ GPS non disponibile</div>
                <div className="mt-0.5 text-xs text-red-600">{geo.error}</div>
              </div>
            )}

            {geo.supported && !geo.error && gpsWaiting && (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <div className="h-3 w-3 animate-pulse rounded-full bg-amber-400" />
                <div>
                  <div className="text-sm font-semibold text-amber-800">Ricerca segnale GPS…</div>
                  <div className="text-xs text-amber-600">Attendi la prima correzione di posizione</div>
                </div>
              </div>
            )}

            {geo.supported && !geo.error && gpsReady && geo.position && (
              <div className="mb-4 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-800">GPS attivo</span>
                  {geo.mode === 'power-save' && (
                    <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      🔋 risparmio energetico
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-xs text-emerald-700">
                  <span className="text-emerald-500">Lat</span>
                  <span>{geo.position.lat.toFixed(6)}</span>
                  <span className="text-emerald-500">Lng</span>
                  <span>{geo.position.lng.toFixed(6)}</span>
                  {geo.accuracy !== null && (
                    <>
                      <span className="text-emerald-500">Precisione</span>
                      <span>±{geo.accuracy} m</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {bufferedCount > 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                <span className="text-base">📡</span>
                <div>
                  <div className="text-xs font-semibold text-amber-800">Offline</div>
                  <div className="text-xs text-amber-600">
                    {bufferedCount}{' '}
                    {bufferedCount === 1 ? 'posizione in coda' : 'posizioni in coda'} — invio al
                    ripristino
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <button
          onClick={leave}
          className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
        >
          Esci dalla gita
        </button>
      </div>
    </div>
  )
}
