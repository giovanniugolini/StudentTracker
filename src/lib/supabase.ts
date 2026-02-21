import { createClient } from '@supabase/supabase-js'
import type { Database, Student, Trip } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * Validates a student magic link token and returns student + trip data.
 * Uses a typed wrapper to work around supabase-js rpc generic inference
 * with manually-written (non-generated) Database types.
 */
export async function getStudentByToken(
  token: string,
): Promise<{ student: Student; trip: Trip }> {
  type RpcFn = (
    fn: 'get_student_by_token',
    args: { p_token: string },
  ) => Promise<{ data: { student: Student; trip: Trip } | null; error: { message: string } | null }>

  const { data, error } = await (supabase.rpc as unknown as RpcFn)(
    'get_student_by_token',
    { p_token: token },
  )

  if (error) throw new Error(error.message)
  if (!data) throw new Error('TOKEN_INVALID')
  return data
}
