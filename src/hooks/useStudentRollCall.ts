import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface StudentRollCallState {
  activeRollCallId: string | null
  timeLeft: number
  responded: boolean
  responding: boolean
  respond: () => Promise<void>
}

export function useStudentRollCall(
  tripId: string | undefined,
  studentToken: string | undefined,
): StudentRollCallState {
  const [activeRollCallId, setActiveRollCallId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [responded, setResponded] = useState(false)
  const [responding, setResponding] = useState(false)

  const rollCallIdRef = useRef<string | null>(null)
  rollCallIdRef.current = activeRollCallId

  // Track IDs already responded — avoids re-showing modal after local countdown ends
  const respondedIdsRef = useRef<Set<string>>(new Set())

  // ── Reset quando cambia la gita ───────────────────────────────────────────
  useEffect(() => {
    setActiveRollCallId(null)
    setTimeLeft(0)
    setResponded(false)
    respondedIdsRef.current = new Set()
  }, [tripId])

  // ── Polling appello attivo ogni 3s ─────────────────────────────────────────
  useEffect(() => {
    if (!tripId) return
    const poll = async () => {
      const { data } = await supabase
        .from('roll_calls')
        .select('id, timeout_seconds, started_at')
        .eq('trip_id', tripId)
        .is('closed_at', null)
        .maybeSingle()

      if (data) {
        const alreadyResponded = respondedIdsRef.current.has(data.id)
        if (data.id !== rollCallIdRef.current && !alreadyResponded) {
          // Nuovo appello rilevato (e non ancora risposto)
          const elapsed = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000)
          const remaining = data.timeout_seconds - elapsed
          if (remaining > 0) {
            setActiveRollCallId(data.id)
            setTimeLeft(remaining)
            setResponded(false)
          }
        }
      } else if (rollCallIdRef.current) {
        // Appello chiuso dal docente
        setActiveRollCallId(null)
        setTimeLeft(0)
        setResponded(false)
      }
    }
    poll()
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [tripId])

  // ── Countdown locale ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeRollCallId || timeLeft <= 0) return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setActiveRollCallId(null); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [activeRollCallId, timeLeft > 0])

  // ── Risposta studente ──────────────────────────────────────────────────────
  const respond = async () => {
    const rcId = rollCallIdRef.current
    if (!rcId || !studentToken || responded || responding) return
    setResponding(true)
    try {
      const { error } = await supabase.rpc('respond_to_roll_call', {
        p_roll_call_id: rcId,
        p_student_token: studentToken,
      })
      if (!error) {
        respondedIdsRef.current.add(rcId)
        setResponded(true)
      }
    } finally {
      setResponding(false)
    }
  }

  return { activeRollCallId, timeLeft, responded, responding, respond }
}
