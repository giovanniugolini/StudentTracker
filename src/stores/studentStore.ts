import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getStudentByToken } from '@/lib/supabase'
import type { Student, Trip } from '@/types/database'

interface StudentSession {
  student: Student
  trip: Trip
}

interface StudentState {
  session: StudentSession | null
  loading: boolean
  joinByToken: (token: string) => Promise<void>
  leave: () => void
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set) => ({
      session: null,
      loading: false,

      joinByToken: async (token: string) => {
        set({ loading: true })
        try {
          const session = await getStudentByToken(token)
          set({ session, loading: false })
        } catch (err) {
          set({ loading: false })
          throw err
        }
      },

      leave: () => set({ session: null }),
    }),
    {
      name: 'student-session',
      // Only persist the session, not the loading state
      partialize: (state) => ({ session: state.session }),
    },
  ),
)

export const selectStudentSession = (s: StudentState) => s.session
