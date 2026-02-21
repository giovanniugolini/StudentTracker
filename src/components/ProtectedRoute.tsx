import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '@/stores/authStore'

export default function ProtectedRoute() {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}
