import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { RollCall } from '@/types/database'

export interface RollCallState {
  rollCall: RollCall | null
  /** Set di student_id che hanno risposto */
  respondedIds: Set<string>
  /** Secondi rimanenti al timeout (0 = chiuso) */
  timeLeft: number
  startRollCall: (timeoutSeconds?: number) => Promise<void>
  closeRollCall: () => Promise<void>
}

export function useRollCall(tripId: string | undefined, teacherId: string | undefined): RollCallState {
  const [rollCall, setRollCall] = useState<RollCall | null>(null)
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set())
  const [timeLeft, setTimeLeft] = useState(0)

  const rollCallRef = useRef<RollCall | null>(null)
  rollCallRef.current = rollCall

  // Canale Realtime sottoscritto — necessario per poter inviare broadcast
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!tripId) return
    const ch = supabase
      .channel(`trip_teacher:${tripId}`, { config: { broadcast: { ack: false } } })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channelRef.current = ch
      })
    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  }, [tripId])

  // ── closeRollCall ──────────────────────────────────────────────────────────
  const closeRollCall = useCallback(async () => {
    const rc = rollCallRef.current
    if (!rc) return

    await supabase.rpc('close_roll_call', { p_roll_call_id: rc.id })

    channelRef.current?.send({
      type: 'broadcast',
      event: 'roll_call_end',
      payload: { roll_call_id: rc.id },
    })

    setRollCall(null)
    setTimeLeft(0)
    setRespondedIds(new Set())
  }, [])

  // ── startRollCall ──────────────────────────────────────────────────────────
  const startRollCall = useCallback(async (timeoutSeconds = 60) => {
    if (!tripId || !teacherId) return

    if (rollCallRef.current) await closeRollCall()

    const { data, error } = await supabase
      .from('roll_calls')
      .insert({ trip_id: tripId, teacher_id: teacherId, timeout_seconds: timeoutSeconds })
      .select()
      .single()

    if (error || !data) throw new Error(error?.message ?? 'Errore avvio appello')

    setRollCall(data)
    setRespondedIds(new Set())
    setTimeLeft(timeoutSeconds)

    channelRef.current?.send({
      type: 'broadcast',
      event: 'roll_call_start',
      payload: { roll_call_id: data.id, timeout_seconds: timeoutSeconds },
    })
  }, [tripId, teacherId, closeRollCall])

  // ── Countdown con auto-close ───────────────────────────────────────────────
  useEffect(() => {
    if (!rollCall || timeLeft <= 0) return

    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          closeRollCall()
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [rollCall?.id, timeLeft > 0, closeRollCall])

  // ── Subscribe alle risposte via Postgres Changes ───────────────────────────
  useEffect(() => {
    if (!rollCall) return

    const channel = supabase
      .channel(`roll_call_responses:${rollCall.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'roll_call_responses',
          filter: `roll_call_id=eq.${rollCall.id}`,
        },
        (payload) => {
          const studentId = (payload.new as { student_id: string }).student_id
          setRespondedIds((prev) => new Set([...prev, studentId]))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [rollCall?.id])

  return { rollCall, respondedIds, timeLeft, startRollCall, closeRollCall }
}
