import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useTrips } from '@/hooks/useTrips'
import { useStudents } from '@/hooks/useStudents'
import CsvImport from '@/components/CsvImport'
import QrCodeModal from '@/components/QrCodeModal'
import type { Trip } from '@/types/database'
import type { TripFormData } from '@/hooks/useTrips'
import type { StudentFormData } from '@/hooks/useStudents'
import { EMPTY_STUDENT_FORM } from '@/hooks/useStudents'

// ─── Trip Form ────────────────────────────────────────────────────────────────

function TripForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: TripFormData) => Promise<void>
  onCancel: () => void
}) {
  const today = new Date().toISOString().slice(0, 16)
  const [form, setForm] = useState<TripFormData>({
    name: '',
    date_start: today,
    date_end: today,
    radius_km: 0.5,
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof TripFormData, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Nome gita *</label>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Es. Gita a Firenze"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Inizio *</label>
          <input
            type="datetime-local"
            value={form.date_start}
            onChange={(e) => set('date_start', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Fine *</label>
          <input
            type="datetime-local"
            value={form.date_end}
            onChange={(e) => set('date_end', e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Raggio zona sicura: <strong>{form.radius_km} km</strong>
        </label>
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          value={form.radius_km}
          onChange={(e) => set('radius_km', parseFloat(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>100m</span>
          <span>5 km</span>
        </div>
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-blue-500 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
        >
          {submitting ? 'Salvataggio…' : 'Crea gita'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
        >
          Annulla
        </button>
      </div>
    </form>
  )
}

// ─── Student Form ─────────────────────────────────────────────────────────────

function StudentForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
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
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Nome e cognome *</label>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Es. Mario Rossi"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Telefono</label>
        <input
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="Es. 333 1234567"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Contatto emergenza
        </label>
        <input
          value={form.emergency_contact}
          onChange={(e) => set('emergency_contact', e.target.value)}
          placeholder="Es. Genitore: 333 7654321"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={form.consent_signed}
          onChange={(e) => set('consent_signed', e.target.checked)}
          className="h-4 w-4 accent-blue-500"
        />
        Consenso genitori firmato
      </label>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-200">
          {error}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-blue-500 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
        >
          {submitting ? 'Salvataggio…' : (submitLabel ?? 'Aggiungi')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
        >
          Annulla
        </button>
      </div>
    </form>
  )
}

// ─── Student Row ──────────────────────────────────────────────────────────────

function StudentRow({
  student,
  onDelete,
  onEdit,
  onQr,
}: {
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
        <button
          onClick={() => onQr(student.id)}
          title="Mostra QR code"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ▦
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(magicLink)}
          title="Copia link studente"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
        >
          🔗
        </button>
        <button
          onClick={() => onEdit(student.id)}
          title="Modifica"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(student.id)}
          title="Rimuovi"
          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
        >
          🗑
        </button>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { teacher, signOut } = useAuthStore()
  const { trips, loading: tripsLoading, createTrip, deleteTrip } = useTrips(teacher?.id)

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [showTripForm, setShowTripForm] = useState(false)
  const [showStudentForm, setShowStudentForm] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [qrStudentId, setQrStudentId] = useState<string | null>(null)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)

  const { students, loading: studentsLoading, addStudent, updateStudent, removeStudent } =
    useStudents(selectedTrip?.id)

  const handleCreateTrip = async (data: TripFormData) => {
    const trip = await createTrip(data)
    setShowTripForm(false)
    setSelectedTrip(trip)
  }

  const handleAddStudent = async (data: StudentFormData) => {
    await addStudent(data)
    setShowStudentForm(false)
  }

  const handleCsvImport = async (rows: StudentFormData[]) => {
    for (const row of rows) {
      await addStudent(row)
    }
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

  return (
    <div className="min-h-screen bg-slate-100">
      {/* CSV Import modal */}
      {showCsvImport && selectedTrip && (
        <CsvImport
          onImport={handleCsvImport}
          onClose={() => setShowCsvImport(false)}
        />
      )}

      {/* QR Code modal */}
      {qrStudentId && selectedTrip && (() => {
        const s = students.find((s) => s.id === qrStudentId)
        if (!s) return null
        return (
          <QrCodeModal
            studentName={s.name}
            tripName={selectedTrip.name}
            token={s.token}
            onClose={() => setQrStudentId(null)}
          />
        )
      })()}

      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-red-500 text-xl">
            📍
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-800">Student Tracker</h1>
            <p className="text-xs text-slate-400">{teacher?.name ?? teacher?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
          >
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
                <button
                  onClick={() => setShowTripForm(true)}
                  className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                >
                  + Nuova
                </button>
              </div>

              {showTripForm && (
                <div className="mb-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <TripForm
                    onSubmit={handleCreateTrip}
                    onCancel={() => setShowTripForm(false)}
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
                    <div
                      key={trip.id}
                      onClick={() => setSelectedTrip(trip)}
                      className={`cursor-pointer rounded-xl px-4 py-3 transition ${
                        selectedTrip?.id === trip.id
                          ? 'bg-blue-50 ring-1 ring-blue-200'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-800">
                            {trip.name}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-400">
                            {new Date(trip.date_start).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                        <span
                          className={`mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            trip.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : trip.status === 'draft'
                                ? 'bg-slate-200 text-slate-600'
                                : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {trip.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Students panel ── */}
          <div className="md:col-span-2">
            {!selectedTrip ? (
              <div className="flex h-full min-h-48 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="text-center">
                  <div className="text-4xl">👈</div>
                  <p className="mt-2 text-sm text-slate-400">Seleziona una gita</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                {/* Trip header */}
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">{selectedTrip.name}</h2>
                    <p className="text-xs text-slate-400">
                      {new Date(selectedTrip.date_start).toLocaleDateString('it-IT')} —{' '}
                      {new Date(selectedTrip.date_end).toLocaleDateString('it-IT')} · raggio{' '}
                      {selectedTrip.radius_km} km
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowStudentForm(true)}
                      className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
                    >
                      + Studente
                    </button>
                    <button
                      onClick={() => setShowCsvImport(true)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    >
                      📥 CSV
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Eliminare questa gita e tutti i suoi studenti?'))
                          deleteTrip(selectedTrip.id).then(() => setSelectedTrip(null))
                      }}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-100"
                    >
                      Elimina gita
                    </button>
                  </div>
                </div>

                {/* Add/Edit student form */}
                {(showStudentForm || editingStudentId) && (
                  <div className="mb-5 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700">
                      {editingStudentId ? 'Modifica studente' : 'Aggiungi studente'}
                    </h3>
                    <StudentForm
                      initial={
                        editingStudent
                          ? {
                              name: editingStudent.name,
                              phone: editingStudent.phone ?? '',
                              emergency_contact: editingStudent.emergency_contact ?? '',
                              consent_signed: editingStudent.consent_signed,
                            }
                          : undefined
                      }
                      onSubmit={editingStudentId ? handleUpdateStudent : handleAddStudent}
                      onCancel={() => {
                        setShowStudentForm(false)
                        setEditingStudentId(null)
                      }}
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
                    <p className="mt-2 text-sm text-slate-500 font-medium">Nessuno studente</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Aggiungi studenti con il pulsante qui sopra
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        {students.length} studenti · 🔗 = copia magic link
                      </span>
                      <span className="text-xs text-slate-400">
                        {students.filter((s) => s.consent_signed).length} consensi firmati
                      </span>
                    </div>
                    <div className="space-y-2">
                      {students.map((s) => (
                        <StudentRow
                          key={s.id}
                          student={s}
                          onDelete={handleDeleteStudent}
                          onEdit={setEditingStudentId}
                          onQr={setQrStudentId}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
