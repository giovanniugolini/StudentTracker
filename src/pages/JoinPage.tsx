import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useStudentStore } from '@/stores/studentStore'

export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { joinByToken } = useStudentStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Link non valido.')
      return
    }

    joinByToken(token)
      .then(() => navigate('/student', { replace: true }))
      .catch(() =>
        setError('Link non valido o gita non più attiva. Chiedi un nuovo link al professore.'),
      )
  }, [token, joinByToken, navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-3xl">
            ❌
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Link non valido</h2>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-sm text-slate-500">Accesso in corso…</p>
      </div>
    </div>
  )
}
