import { useAuthStore } from '@/stores/authStore'

export default function DashboardPage() {
  const { teacher, signOut } = useAuthStore()

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Benvenuto, {teacher?.name ?? 'Docente'}</h1>
        <p className="mt-1 text-sm text-slate-500">Dashboard in costruzione — Sprint 1 in corso</p>
        <button
          onClick={signOut}
          className="mt-6 rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
        >
          Esci
        </button>
      </div>
    </div>
  )
}
