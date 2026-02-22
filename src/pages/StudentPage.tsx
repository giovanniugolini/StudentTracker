import { Navigate } from 'react-router'
import { useStudentStore } from '@/stores/studentStore'
import { useGeolocation } from '@/hooks/useGeolocation'
import { usePositionBroadcast } from '@/hooks/usePositionBroadcast'

export default function StudentPage() {
  const { session, leave } = useStudentStore()
  const geo = useGeolocation()

  usePositionBroadcast({
    studentId: session?.student.id ?? '',
    tripId: session?.trip.id ?? '',
    position: geo.position,
    accuracy: geo.accuracy,
  })

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const { student, trip } = session

  // ── GPS status helpers ──────────────────────────────────────────────────────
  const gpsReady = geo.position !== null && geo.error === null
  const gpsWaiting = geo.watching && geo.position === null && geo.error === null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-red-500 text-3xl shadow-lg">
            📍
          </div>
          <h1 className="text-xl font-bold text-slate-800">Student Tracker</h1>
          <p className="mt-1 text-sm text-slate-500">La tua posizione è condivisa con il professore</p>
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

        {/* GPS status */}
        {!geo.supported && (
          <div className="mb-6 rounded-xl bg-slate-100 p-4 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-slate-600">📵 GPS non supportato</div>
            <div className="mt-0.5 text-xs text-slate-500">
              Questo dispositivo non supporta la geolocalizzazione.
            </div>
          </div>
        )}

        {geo.supported && geo.error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
            <div className="text-sm font-semibold text-red-700">⚠ GPS non disponibile</div>
            <div className="mt-0.5 text-xs text-red-600">{geo.error}</div>
          </div>
        )}

        {geo.supported && !geo.error && gpsWaiting && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-100">
            <div className="h-3 w-3 animate-pulse rounded-full bg-amber-400" />
            <div>
              <div className="text-sm font-semibold text-amber-800">Ricerca segnale GPS…</div>
              <div className="text-xs text-amber-600">Attendi la prima correzione di posizione</div>
            </div>
          </div>
        )}

        {geo.supported && !geo.error && gpsReady && geo.position && (
          <div className="mb-6 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-emerald-800">GPS attivo</span>
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
