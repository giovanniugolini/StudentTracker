import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Teacher } from '@/types/database'

interface AuthState {
  user: User | null
  session: Session | null
  teacher: Teacher | null
  loading: boolean
  // actions
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<() => void>
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  session: null,
  teacher: null,
  loading: true,

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  signUp: async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    if (error) throw error
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, teacher: null })
  },

  initialize: async () => {
    // Load current session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      const teacher = await fetchTeacher(session.user.id)
      set({ session, user: session.user, teacher, loading: false })
    } else {
      set({ loading: false })
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Small delay to allow the trigger to create the teacher row
        await new Promise((r) => setTimeout(r, 500))
        const teacher = await fetchTeacher(session.user.id)
        set({ session, user: session.user, teacher, loading: false })
      } else {
        set({ session: null, user: null, teacher: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  },
}))

async function fetchTeacher(userId: string): Promise<Teacher | null> {
  const { data } = await supabase.from('teachers').select('*').eq('id', userId).single()
  return data
}

// Selector helpers
export const selectIsAuthenticated = (s: AuthState) => !!s.user
export const selectTeacher = (s: AuthState) => s.teacher
