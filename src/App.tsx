import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import JoinPage from '@/pages/JoinPage'
import StudentPage from '@/pages/StudentPage'

function AppRoutes() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    let cleanup: (() => void) | undefined
    initialize().then((fn) => { cleanup = fn })
    return () => cleanup?.()
  }, [initialize])

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/join/:token" element={<JoinPage />} />
      <Route path="/student" element={<StudentPage />} />

      {/* Protected teacher routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
