import { useState, useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { LatLng } from '@/lib/geo'
import { bufferPosition, flushBuffer, countBuffered } from '@/lib/positionBuffer'

const DB_WRITE_INTERVAL_MS = 30_000

// ─── Broadcast payload (matches what useTripPositions expects) ────────────────

export interface PositionPayload {
  student_id: string
  lat: number
  lng: number
  accuracy: number | null
  battery_level: number | null
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Student side.
 *
 * Effect 1 — creates the Realtime channel ONCE, subscribes.
 * Effect 2 — broadcasts position on every update (skipped while offline).
 * Effect 3 — DB persistence: online → rate-limited RPC; offline → IndexedDB buffer.
 * Effect 4 — on reconnection, flush buffered positions via RPC.
 * Effect 5 — online/offline state tracking.
 *
 * Returns bufferedCount so the UI can warn the user.
 */
export function usePositionBroadcast({
  studentId,
  tripId,
  position,
  accuracy,
  batteryLevel = null,
}: {
  studentId: string
  tripId: string
  position: LatLng | null
  accuracy: number | null
  batteryLevel?: number | null
}): { bufferedCount: number } {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)
  const pendingRef = useRef<PositionPayload | null>(null)
  const lastDbWrite = useRef<number>(0)

  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [bufferedCount, setBufferedCount] = useState(0)
  const prevOnlineRef = useRef(navigator.onLine)

  // ── Effect 1: open channel once ─────────────────────────────────────────────
  useEffect(() => {
    if (!studentId || !tripId) return

    const channel = supabase.channel(`trip:${tripId}`, {
      config: { broadcast: { self: false, ack: false } },
    })

    channel.subscribe((status) => {
      subscribedRef.current = status === 'SUBSCRIBED'
      if (status === 'SUBSCRIBED' && pendingRef.current) {
        channel.send({ type: 'broadcast', event: 'position', payload: pendingRef.current })
        pendingRef.current = null
      }
    })

    channelRef.current = channel

    return () => {
      subscribedRef.current = false
      channelRef.current = null
      pendingRef.current = null
      supabase.removeChannel(channel)
    }
  }, [studentId, tripId])

  // ── Effect 2: broadcast on every position update (online only) ──────────────
  useEffect(() => {
    if (!position || !isOnline) return

    const payload: PositionPayload = {
      student_id: studentId,
      lat: position.lat,
      lng: position.lng,
      accuracy,
      battery_level: batteryLevel,
    }

    if (channelRef.current && subscribedRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'position', payload })
    } else {
      pendingRef.current = payload
    }
  }, [studentId, position, accuracy, batteryLevel, isOnline])

  // ── Effect 3: DB persistence ─────────────────────────────────────────────────
  useEffect(() => {
    if (!position) return

    const now = Date.now()
    if (now - lastDbWrite.current < DB_WRITE_INTERVAL_MS) return
    lastDbWrite.current = now

    if (!isOnline) {
      // Offline: buffer to IndexedDB
      bufferPosition({
        student_id: studentId,
        trip_id: tripId,
        lat: position.lat,
        lng: position.lng,
        accuracy,
        battery_level: batteryLevel ?? null,
        recorded_at: new Date().toISOString(),
      }).then(() => setBufferedCount((c) => c + 1))
      return
    }

    // Online: write to DB
    supabase
      .rpc('upsert_position', {
        p_student_id: studentId,
        p_trip_id: tripId,
        p_lat: position.lat,
        p_lng: position.lng,
        p_accuracy: accuracy ?? undefined,
        p_battery: batteryLevel ?? undefined,
      })
      .then(({ error }) => {
        if (error) console.warn('[usePositionBroadcast] DB write failed:', error.message)
      })
  }, [studentId, tripId, position, accuracy, batteryLevel, isOnline])

  // ── Effect 4: flush buffer when back online ──────────────────────────────────
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current
    prevOnlineRef.current = isOnline

    if (!isOnline || !wasOffline || !studentId || !tripId) return

    flushBuffer(async (pos) => {
      const { error } = await supabase.rpc('upsert_position', {
        p_student_id: pos.student_id,
        p_trip_id: pos.trip_id,
        p_lat: pos.lat,
        p_lng: pos.lng,
        p_accuracy: pos.accuracy ?? undefined,
        p_battery: pos.battery_level ?? undefined,
      })
      if (error) throw new Error(error.message)
    }).then(({ sent, remaining }) => {
      console.info(`[offline-buffer] flushed ${sent}, remaining ${remaining}`)
      setBufferedCount(remaining)
    })
  }, [isOnline, studentId, tripId])

  // ── Effect 5: online/offline listeners ──────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // ── Init: load existing buffer count from previous session ───────────────────
  useEffect(() => {
    countBuffered().then(setBufferedCount)
  }, [])

  return { bufferedCount }
}
