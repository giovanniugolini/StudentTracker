import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { haversineKm } from '@/lib/geo'

export interface LatLng { lat: number; lng: number }

export interface StudentRollCallState {
  /** ID dell'appello attivo, null se nessun appello in corso */
  activeRollCallId: string | null
  /** Secondi rimanenti (countdown locale ricevuto dal broadcast) */
  timeLeft: number
  /** Lo studente ha già risposto all'appello corrente */
  responded: boolean
  /** Risposta in corso (loading) */
  responding: boolean
  /** Invia la risposta */
  respond: () => Promise<void>
  /** Ultima posizione nota del docente (null finché non arriva il primo broadcast) */
  teacherPos: LatLng | null
  /** Distanza in km dallo studente al docente (null se mancano dati) */
  distanceKm: number | null
}

export function useStudentRollCall(
  tripId: string | undefined,
  studentToken: string | undefined,
  studentPos: LatLng | null,
): StudentRollCallState {
  const [activeRollCallId, setActiveRollCallId] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [responded, setResponded] = useState(false)
  const [responding, setResponding] = useState(false)
  const [teacherPos, setTeacherPos] = useState<LatLng | null>(null)

  const rollCallIdRef = useRef<string | null>(null)
  rollCallIdRef.current = activeRollCallId

  // ── Subscribe al canale gita per ricevere eventi appello e posizione docente
  useEffect(() => {
    if (!tripId) return

    const channel = supabase
      .channel(`trip_teacher:${tripId}`, { config: { broadcast: { ack: false } } })
      .on('broadcast', { event: 'roll_call_start' }, ({ payload }) => {
        setActiveRollCallId(payload.roll_call_id as string)
        setTimeLeft(payload.timeout_seconds as number)
        setResponded(false)
      })
      .on('broadcast', { event: 'roll_call_end' }, () => {
        setActiveRollCallId(null)
        setTimeLeft(0)
        setResponded(false)
      })
      .on('broadcast', { event: 'teacher_position' }, ({ payload }) => {
        setTeacherPos({ lat: payload.lat as number, lng: payload.lng as number })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId])

  // ── Countdown locale ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeRollCallId || timeLeft <= 0) return

    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setActiveRollCallId(null)
          return 0
        }
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
      if (!error) setResponded(true)
    } finally {
      setResponding(false)
    }
  }

  const distanceKm =
    teacherPos && studentPos
      ? haversineKm(studentPos.lat, studentPos.lng, teacherPos.lat, teacherPos.lng)
      : null

  return { activeRollCallId, timeLeft, responded, responding, respond, teacherPos, distanceKm }
}
