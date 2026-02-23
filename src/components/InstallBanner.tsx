import { useInstallPrompt } from '@/hooks/useInstallPrompt'

export default function InstallBanner() {
  const { state, install, dismiss } = useInstallPrompt()

  // Già installata o non supportata → niente da mostrare
  if (state === 'installed' || state === 'unsupported') return null

  // iOS: istruzioni manuali (no evento nativo)
  if (state === 'ios') {
    return (
      <div className="fixed bottom-4 inset-x-4 z-50 flex items-start gap-3 rounded-2xl border border-blue-200 bg-white px-4 py-3 shadow-xl ring-1 ring-blue-100">
        <span className="mt-0.5 text-2xl">📍</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Installa Student Tracker</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Tocca <strong>Condividi</strong> <span className="font-mono">⎙</span> poi{' '}
            <strong>"Aggiungi a schermata Home"</strong>
          </p>
        </div>
        <button
          onClick={dismiss}
          className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Chiudi"
        >
          ✕
        </button>
      </div>
    )
  }

  // Android / Chrome: prompt nativo disponibile
  return (
    <div className="fixed bottom-4 inset-x-4 z-50 flex items-center gap-3 rounded-2xl border border-blue-200 bg-white px-4 py-3 shadow-xl ring-1 ring-blue-100">
      <span className="text-2xl">📍</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">Installa Student Tracker</p>
        <p className="mt-0.5 text-xs text-slate-500">Aggiungila alla schermata Home per accesso rapido</p>
      </div>
      <div className="flex flex-shrink-0 gap-2">
        <button
          onClick={dismiss}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          Dopo
        </button>
        <button
          onClick={install}
          className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
        >
          Installa
        </button>
      </div>
    </div>
  )
}
