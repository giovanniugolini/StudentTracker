import { Navigate } from 'react-router'
import { useStudentStore } from '@/stores/studentStore'

export default function StudentPage() {
  const { session, leave } = useStudentStore()

  if (!session) {
    return <Navigate to="/login" replace />
  }

  const { student, trip } = session

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

        {/* GPS status — placeholder, verrà implementato in Sprint 2 */}
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
          <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
          <div>
            <div className="text-sm font-semibold text-emerald-800">Condivisione attiva</div>
            <div className="text-xs text-emerald-600">GPS verrà attivato nella prossima versione</div>
          </div>
        </div>

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
