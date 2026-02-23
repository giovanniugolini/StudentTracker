import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTrips, validateTrip, STATUS_LABELS, STATUS_COLORS } from '@/hooks/useTrips'
import { useStudents } from '@/hooks/useStudents'
import { useTripPositions } from '@/hooks/useTripPositions'
import { useGeolocation } from '@/hooks/useGeolocation'
import CsvImport from '@/components/CsvImport'
import QrCodeModal from '@/components/QrCodeModal'
import TripMap from '@/components/TripMap'
import type { StudentMarkerData } from '@/components/TripMap'
import type { TripWithCount } from '@/hooks/useTrips'
import type { TripFormData } from '@/hooks/useTrips'
import type { StudentFormData } from '@/hooks/useStudents'
import { EMPTY_STUDENT_FORM } from '@/hooks/useStudents'
import type { TripStatus } from '@/types/database'
import type { GeoState } from '@/hooks/useGeolocation'

type PanelTab = 'students' | 'map'

// ─── Teacher GPS status bar ────────────────────────────────────────────────────

function TeacherGpsBar({ geo }: { geo: GeoState }) {
  if (!geo.supported) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">
        <span>📵</span>
        <span>GPS non supportato — posizione docente non disponibile</span>
      </div>
    )
  }

  if (geo.error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 ring-1 ring-red-200">
        <span>⚠</span>
        <span>{geo.error}</span>
      </div>
    )
  }

  if (!geo.position) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-100">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        <span>Ricerca segnale GPS docente…</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 ring-1 ring-emerald-100">
      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      <span className="font-medium">Docente</span>
      <span className="font-mono">
        {geo.position.lat.toFixed(5)}, {geo.position.lng.toFixed(5)}
      </span>
      {geo.accuracy !== null && (
        <span className="ml-auto text-emerald-500">±{geo.accuracy} m</span>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Trip Form (create + edit) ────────────────────────────────────────────────

function TripForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Crea gita',
}: {
  initial?: TripFormData
  onSubmit: (data: TripFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}) {
  const now = new Date().toISOString().slice(0, 16)
  const [form, setForm] = useState<TripFormData>(
    initial ?? { name: '', date_start: now, date_end: now, radius_km: 0.5 },
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof TripFormData, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ve = validateTrip(form)
    if (ve) { setError(ve); return }
    setError(null)
    setSubmitting(true)
    try { await onSubmit(form) }
    catch (err) { setError(err instanceof Error ? err.message : 'Errore') }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Nome gita *</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)}
          placeholder="Es. Gita a Firenze"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Inizio *</label>
          <input type="datetime-local" value={form.date_start}
            onChange={(e) => set('date_start', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Fine *</label>
          <input type="datetime-local" value={form.date_end}
            onChange={(e) => set('date_end', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Raggio zona sicura — <strong>{form.radius_km} km</strong>
        </label>
        <input type="range" min="0.1" max="5" step="0.1" value={form.radius_km}
          onChange={(e) => set('radius_km', parseFloat(e.target.value))}
          className="w-full accent-blue-500" />
        <div className="flex justify-between text-xs text-slate-400"><span>100m</span><span>5 km</span></div>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">{error}</div>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={submitting}
          className="flex-1 rounded-lg bg-blue-500 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60">
          {submitting ? 'Salvataggio…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
          Annulla
        </button>
      </div>
    </form>
  )
}

// ─── Student Form ─────────────────────────────────────────────────────────────

function StudentForm({
  initial, onSubmit, onCancel, submitLabel,
}: {
  initial?: StudentFormData
  onSubmit: (data: StudentFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}) {
  const [form, setForm] = useState<StudentFormData>(initial ?? EMPTY_STUDENT_FORM)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof StudentFormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try { await onSubmit(form) }
    catch (err) { setError(err instanceof Error ? err.message : 'Errore') }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Nome e cognome *</label>
        <input value={form.name} onChange={(e) => set('name', e.target.value)}
          placeholder="Es. Mario Rossi"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Telefono</label>
        <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
          placeholder="Es. 333 1234567"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Contatto emergenza</label>
        <input value={form.emergency_contact} onChange={(e) => set('emergency_contact', e.target.value)}
          placeholder="Es. Genitore: 333 7654321"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={form.consent_signed}
          onChange={(e) => set('consent_signed', e.target.checked)}
          className="h-4 w-4 accent-blue-500" />
        Consenso genitori firmato
      </label>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">{error}</div>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={submitting}
          className="flex-1 rounded-lg bg-blue-500 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60">
          {submitting ? 'Salvataggio…' : (submitLabel ?? 'Aggiungi')}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
          Annulla
        </button>
      </div>
    </form>
  )
}

// ─── Student Row ──────────────────────────────────────────────────────────────

function StudentRow({ student, onDelete, onEdit, onQr }: {
  student: { id: string; name: string; phone: string | null; consent_signed: boolean; token: string }
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onQr: (id: string) => void
}) {
  const magicLink = `${window.location.origin}/join/${student.token}`
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
        {student.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{student.name}</span>
          {student.consent_signed && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              consenso ✓
            </span>
          )}
        </div>
        {student.phone && <div className="text-xs text-slate-400">{student.phone}</div>}
      </div>
      <div className="flex gap-1">
        <button onClick={() => onQr(student.id)} title="QR code"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">▦</button>
        <button onClick={() => navigator.clipboard.writeText(magicLink)} title="Copia link"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600">🔗</button>
        <button onClick={() => onEdit(student.id)} title="Modifica"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">✏️</button>
        <button onClick={() => onDelete(student.id)} title="Rimuovi"
          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500">🗑</button>
      </div>
    </div>
  )
}

// ─── Consent Progress Bar ─────────────────────────────────────────────────────

function ConsentBar({ signed, total }: { signed: number; total: number }) {
  if (total === 0) return null
  const pct = Math.round((signed / total) * 100)
  return (
    <div className="mb-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">Consensi firmati</span>
        <span className="font-bold text-slate-700">{signed}/{total} ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct < 100 && (
        <p className="mt-1.5 text-xs text-amber-600">
          ⚠ {total - signed} {total - signed === 1 ? 'studente senza' : 'studenti senza'} consenso
        </p>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { teacher, signOut } = useAuthStore()
  const { trips, loading: tripsLoading, createTrip, updateTrip, deleteTrip } = useTrips(teacher?.id)

  const [selectedTrip, setSelectedTrip] = useState<TripWithCount | null>(null)
  const [showTripForm, setShowTripForm] = useState(false)
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [showStudentForm, setShowStudentForm] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [qrStudentId, setQrStudentId] = useState<string | null>(null)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [panelTab, setPanelTab] = useState<PanelTab>('students')

  const { students, loading: studentsLoading, addStudent, updateStudent, removeStudent } =
    useStudents(selectedTrip?.id)

  // Keep selectedTrip in sync when trips list updates
  const syncedTrip = trips.find((t) => t.id === selectedTrip?.id) ?? null

  // Live GPS positions broadcast by students via Realtime
  const livePositions = useTripPositions(syncedTrip?.id)

  // Teacher's real GPS position (T2.7)
  const teacherGeo = useGeolocation()

  const handleCreateTrip = async (data: TripFormData) => {
    const trip = await createTrip(data)
    setShowTripForm(false)
    setSelectedTrip(trip)
  }

  const handleEditTrip = async (data: TripFormData) => {
    if (!editingTripId) return
    await updateTrip(editingTripId, data)
    setEditingTripId(null)
  }

  const handleStatusChange = async (newStatus: TripStatus) => {
    if (!syncedTrip) return
    setStatusLoading(true)
    try {
      await updateTrip(syncedTrip.id, { status: newStatus })
      setSelectedTrip((prev) => prev ? { ...prev, status: newStatus } : null)
    } finally {
      setStatusLoading(false)
    }
  }

  const handleAddStudent = async (data: StudentFormData) => {
    await addStudent(data)
    setShowStudentForm(false)
  }

  const handleCsvImport = async (rows: StudentFormData[]) => {
    for (const row of rows) await addStudent(row)
  }

  const handleUpdateStudent = async (data: StudentFormData) => {
    if (!editingStudentId) return
    await updateStudent(editingStudentId, data)
    setEditingStudentId(null)
  }

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Rimuovere questo studente dalla gita?')) return
    await removeStudent(id)
  }

  const editingStudent = students.find((s) => s.id === editingStudentId)
  const editingTrip = trips.find((t) => t.id === editingTripId)

  const consentCount = students.filter((s) => s.consent_signed).length

  // Build map markers from students that have a live position
  const mapStudents: StudentMarkerData[] = students
    .filter((s) => s.id in livePositions)
    .map((s) => ({
      id: s.id,
      name: s.name,
      position: { lat: livePositions[s.id].lat, lng: livePositions[s.id].lng },
      battery_level: livePositions[s.id].battery_level,
    }))

  // Teacher position: real GPS if available, fallback to Rome for initial render
  const teacherPos = teacherGeo.position ?? { lat: 41.9028, lng: 12.4964 }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Modals */}
      {showCsvImport && syncedTrip && (
        <CsvImport onImport={handleCsvImport} onClose={() => setShowCsvImport(false)} />
      )}
      {qrStudentId && syncedTrip && (() => {
        const s = students.find((s) => s.id === qrStudentId)
        if (!s) return null
        return <QrCodeModal studentName={s.name} tripName={syncedTrip.name}
          token={s.token} onClose={() => setQrStudentId(null)} />
      })()}

      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-red-500 text-xl">📍</div>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-800">Student Tracker</h1>
            <p className="text-xs text-slate-400">{teacher?.name ?? teacher?.email}</p>
          </div>
          <button onClick={signOut}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
            Esci
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

          {/* ── Trips sidebar ── */}
          <div className="md:col-span-1">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700">🗺 Le mie gite</h2>
                {!showTripForm && (
                  <button onClick={() => setShowTripForm(true)}
                    className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600">
                    + Nuova
                  </button>
                )}
              </div>

              {/* Create form */}
              {showTripForm && (
                <div className="mb-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="mb-3 text-xs font-semibold text-slate-600">Nuova gita</p>
                  <TripForm onSubmit={handleCreateTrip} onCancel={() => setShowTripForm(false)} />
                </div>
              )}

              {/* Edit form */}
              {editingTripId && editingTrip && (
                <div className="mb-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                  <p className="mb-3 text-xs font-semibold text-amber-700">Modifica gita</p>
                  <TripForm
                    initial={{ name: editingTrip.name, date_start: editingTrip.date_start.slice(0, 16),
                      date_end: editingTrip.date_end.slice(0, 16), radius_km: editingTrip.radius_km }}
                    onSubmit={handleEditTrip}
                    onCancel={() => setEditingTripId(null)}
                    submitLabel="Salva modifiche"
                  />
                </div>
              )}

              {tripsLoading ? (
                <div className="py-6 text-center text-sm text-slate-400">Caricamento…</div>
              ) : trips.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="text-3xl">🗺</div>
                  <p className="mt-2 text-xs text-slate-400">Nessuna gita ancora</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trips.map((trip) => (
                    <div key={trip.id}
                      onClick={() => { setSelectedTrip(trip); setEditingTripId(null) }}
                      className={`cursor-pointer rounded-xl px-4 py-3 transition ${
                        selectedTrip?.id === trip.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-slate-50 hover:bg-slate-100'
                      }`}>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-800">{trip.name}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                            <span>{fmt(trip.date_start)}</span>
                            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-slate-600">
                              {trip.student_count} studenti
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[trip.status]}`}>
                            {STATUS_LABELS[trip.status]}
                          </span>
                          <button
                            onClick={() => setEditingTripId(editingTripId === trip.id ? null : trip.id)}
                            className="text-xs text-slate-400 hover:text-slate-600">
                            ✏️ modifica
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Students panel ── */}
          <div className="md:col-span-2">
            {!syncedTrip ? (
              <div className="flex h-full min-h-48 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="text-center">
                  <div className="text-4xl">👈</div>
                  <p className="mt-2 text-sm text-slate-400">Seleziona una gita</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                {/* Trip header */}
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-800">{syncedTrip.name}</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[syncedTrip.status]}`}>
                        {STATUS_LABELS[syncedTrip.status]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {fmt(syncedTrip.date_start)} → {fmt(syncedTrip.date_end)} · raggio {syncedTrip.radius_km} km
                    </p>
                  </div>
                  {/* Status actions */}
                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    {syncedTrip.status === 'draft' && (
                      <button onClick={() => handleStatusChange('active')} disabled={statusLoading}
                        className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
                        ▶ Attiva
                      </button>
                    )}
                    {syncedTrip.status === 'active' && (
                      <button onClick={() => handleStatusChange('completed')} disabled={statusLoading}
                        className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60">
                        ✓ Completa
                      </button>
                    )}
                    {(syncedTrip.status === 'draft' || syncedTrip.status === 'active') && (
                      <button onClick={() => handleStatusChange('cancelled')} disabled={statusLoading}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200 disabled:opacity-60">
                        Annulla
                      </button>
                    )}
                    <button onClick={() => {
                      if (confirm('Eliminare questa gita e tutti i suoi studenti?'))
                        deleteTrip(syncedTrip.id).then(() => setSelectedTrip(null))
                    }} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100">
                      🗑
                    </button>
                  </div>
                </div>

                {/* Consent progress bar */}
                {!studentsLoading && <ConsentBar signed={consentCount} total={students.length} />}

                {/* Tab switcher */}
                <div className="mb-4 flex rounded-lg bg-slate-100 p-0.5">
                  <button
                    onClick={() => setPanelTab('students')}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                      panelTab === 'students'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    👥 Studenti ({students.length})
                  </button>
                  <button
                    onClick={() => setPanelTab('map')}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                      panelTab === 'map'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    🗺 Mappa
                    {mapStudents.length > 0 && (
                      <span className="ml-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] text-white">
                        {mapStudents.length}
                      </span>
                    )}
                  </button>
                </div>

                {panelTab === 'students' && (
                  <>
                    {/* Add student toolbar */}
                    <div className="mb-4 flex gap-2">
                      <button onClick={() => setShowStudentForm(true)}
                        className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600">
                        + Studente
                      </button>
                      <button onClick={() => setShowCsvImport(true)}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                        📥 CSV
                      </button>
                    </div>

                    {/* Add/Edit student form */}
                    {(showStudentForm || editingStudentId) && (
                      <div className="mb-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <h3 className="mb-3 text-sm font-semibold text-slate-700">
                          {editingStudentId ? 'Modifica studente' : 'Aggiungi studente'}
                        </h3>
                        <StudentForm
                          initial={editingStudent ? {
                            name: editingStudent.name,
                            phone: editingStudent.phone ?? '',
                            emergency_contact: editingStudent.emergency_contact ?? '',
                            consent_signed: editingStudent.consent_signed,
                          } : undefined}
                          onSubmit={editingStudentId ? handleUpdateStudent : handleAddStudent}
                          onCancel={() => { setShowStudentForm(false); setEditingStudentId(null) }}
                          submitLabel={editingStudentId ? 'Salva modifiche' : 'Aggiungi'}
                        />
                      </div>
                    )}

                    {/* Students list */}
                    {studentsLoading ? (
                      <div className="py-8 text-center text-sm text-slate-400">Caricamento…</div>
                    ) : students.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="text-4xl">👥</div>
                        <p className="mt-2 text-sm font-medium text-slate-500">Nessuno studente</p>
                        <p className="mt-1 text-xs text-slate-400">Aggiungi studenti con i pulsanti qui sopra</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {students.map((s) => (
                          <StudentRow key={s.id} student={s}
                            onDelete={handleDeleteStudent}
                            onEdit={setEditingStudentId}
                            onQr={setQrStudentId}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {panelTab === 'map' && (
                  <div className="space-y-3">
                    {/* Teacher GPS status bar */}
                    <TeacherGpsBar geo={teacherGeo} />

                    <div className="relative overflow-hidden rounded-xl" style={{ height: '460px' }}>
                      {mapStudents.length === 0 && (
                        <div className="pointer-events-none absolute left-1/2 z-10 mt-3 -translate-x-1/2 rounded-lg bg-white/90 px-3 py-1.5 text-xs text-slate-500 shadow ring-1 ring-slate-200">
                          In attesa delle posizioni GPS degli studenti…
                        </div>
                      )}
                      <TripMap
                        teacherPos={teacherPos}
                        radiusKm={syncedTrip.radius_km}
                        students={mapStudents}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
