import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  name: string
  phone: string
  emergency_contact: string
  consent_signed: boolean
  error: string | null
}

interface Props {
  onImport: (rows: Omit<ParsedRow, 'error'>[]) => Promise<void>
  onClose: () => void
}

// ─── Column mapping ───────────────────────────────────────────────────────────

const FIELD_ALIASES: Record<string, string> = {
  // name
  nome: 'name', 'nome e cognome': 'name', 'nome_cognome': 'name',
  name: 'name', 'full name': 'name', 'full_name': 'name', studente: 'name',
  // surname (merged into name)
  cognome: 'surname', surname: 'surname', 'last name': 'surname', last_name: 'surname',
  // phone
  telefono: 'phone', tel: 'phone', cellulare: 'phone', phone: 'phone', mobile: 'phone',
  // emergency
  'contatto emergenza': 'emergency_contact', emergenza: 'emergency_contact',
  genitore: 'emergency_contact', 'contatto_emergenza': 'emergency_contact',
  emergency: 'emergency_contact', emergency_contact: 'emergency_contact',
  // consent
  consenso: 'consent_signed', consent: 'consent_signed', firma: 'consent_signed',
  firmato: 'consent_signed', signed: 'consent_signed', autorizzazione: 'consent_signed',
}

function mapHeader(header: string): string | null {
  return FIELD_ALIASES[header.toLowerCase().trim()] ?? null
}

function isTruthy(val: string): boolean {
  return ['si', 'sì', 's', 'yes', 'y', '1', 'true', 'x', '✓', 'vero'].includes(
    val.toLowerCase().trim(),
  )
}

function parseRows(raw: Record<string, string>[]): ParsedRow[] {
  if (raw.length === 0) return []

  // Build column → field map from headers of first row
  const headers = Object.keys(raw[0])
  const colMap: Record<string, string> = {}
  headers.forEach((h) => {
    const field = mapHeader(h)
    if (field) colMap[h] = field
  })

  return raw.map((row) => {
    const mapped: Record<string, string> = {}
    headers.forEach((h) => {
      if (colMap[h]) mapped[colMap[h]] = (row[h] ?? '').trim()
    })

    // Merge surname into name if present
    if (mapped.surname) {
      mapped.name = `${mapped.name ?? ''} ${mapped.surname}`.trim()
    }

    const name = mapped.name?.trim() ?? ''
    const phone = mapped.phone?.trim() ?? ''
    const emergency_contact = mapped.emergency_contact?.trim() ?? ''
    const consent_signed = mapped.consent_signed ? isTruthy(mapped.consent_signed) : false

    // Validate
    let error: string | null = null
    if (!name) {
      error = 'Nome mancante'
    } else if (name.split(' ').filter(Boolean).length < 2) {
      error = 'Serve nome e cognome'
    } else if (phone && !/^[+\d\s\-()\\.]{6,20}$/.test(phone)) {
      error = 'Telefono non valido'
    }

    return { name, phone, emergency_contact, consent_signed, error }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CsvImport({ onImport, onClose }: Props) {
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const validRows = rows.filter((r) => !r.error)
  const errorRows = rows.filter((r) => r.error)

  const handleFile = useCallback((file: File) => {
    setFileName(file.name)
    setRows([])
    setDone(false)
    setImportError(null)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length && result.data.length === 0) {
          setImportError('File non valido o vuoto.')
          return
        }
        setRows(parseRows(result.data))
      },
      error: () => setImportError('Impossibile leggere il file.'),
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleImport = async () => {
    if (validRows.length === 0) return
    setImporting(true)
    setImportError(null)
    try {
      await onImport(validRows.map(({ error: _e, ...r }) => r))
      setImportedCount(validRows.length)
      setDone(true)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Errore durante l'importazione")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">📥 Importa studenti da CSV</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {done ? (
            /* ── Success ── */
            <div className="py-8 text-center">
              <div className="text-5xl">✅</div>
              <p className="mt-3 text-lg font-bold text-slate-800">
                {importedCount} studenti importati!
              </p>
              <button
                onClick={onClose}
                className="mt-6 rounded-xl bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
              >
                Chiudi
              </button>
            </div>
          ) : (
            <>
              {/* ── Drop zone ── */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="mb-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 transition hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="text-3xl">📂</span>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  {fileName ?? 'Trascina un file CSV o clicca per selezionarlo'}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Colonne supportate: Nome, Cognome, Telefono, Contatto Emergenza, Consenso
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>

              {/* ── Format hint ── */}
              {rows.length === 0 && !importError && (
                <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700 ring-1 ring-blue-100">
                  <strong>Formato CSV di esempio:</strong>
                  <pre className="mt-1 font-mono">
                    {`Nome,Cognome,Telefono,Contatto Emergenza,Consenso\nMario,Rossi,333123456,Genitore 333987654,Si\nLucia,Bianchi,,,No`}
                  </pre>
                  <p className="mt-1">
                    Oppure usa una colonna <em>Nome e Cognome</em> unificata.
                  </p>
                </div>
              )}

              {/* ── Parse error ── */}
              {importError && (
                <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
                  {importError}
                </div>
              )}

              {/* ── Preview table ── */}
              {rows.length > 0 && (
                <>
                  <div className="mb-3 flex items-center gap-3 text-sm">
                    <span className="font-semibold text-slate-700">
                      {rows.length} righe trovate
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      ✓ {validRows.length} valide
                    </span>
                    {errorRows.length > 0 && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
                        ✗ {errorRows.length} con errori
                      </span>
                    )}
                  </div>

                  <div className="mb-5 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Nome</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Telefono</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Consenso</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-500">Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr
                            key={i}
                            className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                          >
                            <td className={`px-3 py-2 font-medium ${row.error ? 'text-red-600' : 'text-slate-800'}`}>
                              {row.name || <span className="italic text-slate-400">—</span>}
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {row.phone || <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-3 py-2">
                              {row.consent_signed ? (
                                <span className="text-emerald-600">✓</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.error ? (
                                <span className="text-red-500">{row.error}</span>
                              ) : (
                                <span className="text-emerald-600">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* ── Actions ── */}
              <div className="flex gap-3">
                {validRows.length > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex-1 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                  >
                    {importing
                      ? 'Importazione…'
                      : `Importa ${validRows.length} student${validRows.length === 1 ? 'e' : 'i'}`}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
                >
                  Annulla
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
