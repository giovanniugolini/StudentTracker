import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RollCall } from '@/types/database'

export interface RollCallState {
  rollCall: RollCall | null
  respondedIds: Set<string>
  timeLeft: number
  startRollCall: (timeoutSeconds?: number) => Promise<void>
  closeRollCall: () => Promise<void>
}

export function useRollCall(
  tripId: string | undefined,
  teacherId: string | undefined,
): RollCallState {
  const [rollCall, setRollCall] = useState<RollCall | null>(null)
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set())
  const [timeLeft, setTimeLeft] = useState(0)

  const rollCallRef = useRef<RollCall | null>(null)
  rollCallRef.current = rollCall

  // ── Reset immediato + recupera appello attivo quando cambia la gita ────────
  useEffect(() => {
    // Reset sincrono — evita che lo stato della gita precedente sia visibile
    setRollCall(null)
    setTimeLeft(0)
    setRespondedIds(new Set())

    if (!tripId) return
    supabase
      .from('roll_calls')
      .select('*')
      .eq('trip_id', tripId)
      .is('closed_at', null)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const elapsed = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000)
        const remaining = data.timeout_seconds - elapsed
        if (remaining > 0) {
          setRollCall(data)
          setTimeLeft(remaining)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  // ── Polling risposte ogni 2s mentre appello attivo ─────────────────────────
  useEffect(() => {
    if (!rollCall) return
    const poll = async () => {
      const { data } = await supabase
        .from('roll_call_responses')
        .select('student_id')
        .eq('roll_call_id', rollCall.id)
      if (data) setRespondedIds(new Set(data.map((r) => r.student_id as string)))
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [rollCall?.id])

  // ── closeRollCall ──────────────────────────────────────────────────────────
  const closeRollCall = useCallback(async () => {
    const rc = rollCallRef.current
    if (!rc) return
    await supabase.rpc('close_roll_call', { p_roll_call_id: rc.id })
    setRollCall(null)
    setTimeLeft(0)
    setRespondedIds(new Set())
  }, [])

  // ── startRollCall ──────────────────────────────────────────────────────────
  const startRollCall = useCallback(async (timeoutSeconds = 60) => {
    if (!tripId || !teacherId) return
    // Chiude eventuali appelli aperti nel DB prima di crearne uno nuovo
    await supabase
      .from('roll_calls')
      .update({ closed_at: new Date().toISOString() })
      .eq('trip_id', tripId)
      .is('closed_at', null)
    const { data, error } = await supabase
      .from('roll_calls')
      .insert({ trip_id: tripId, teacher_id: teacherId, timeout_seconds: timeoutSeconds })
      .select()
      .single()
    if (error || !data) throw new Error(error?.message ?? 'Errore avvio appello')
    setRollCall(data)
    setRespondedIds(new Set())
    setTimeLeft(timeoutSeconds)
  }, [tripId, teacherId])

  // ── Countdown con auto-close ───────────────────────────────────────────────
  useEffect(() => {
    if (!rollCall || timeLeft <= 0) return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { closeRollCall(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [rollCall?.id, timeLeft > 0, closeRollCall])

  return { rollCall, respondedIds, timeLeft, startRollCall, closeRollCall }
}
