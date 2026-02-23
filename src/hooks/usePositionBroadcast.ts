import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { LatLng } from '@/lib/geo'

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
 * Effect 1 — creates the Realtime channel ONCE when studentId/tripId are
 *   available, subscribes, stores a ref. Cleaned up on unmount.
 *
 * Effect 2 — whenever position changes, sends a broadcast on the already-open
 *   channel (no subscribe/unsubscribe on every tick).
 *
 * Effect 3 — DB persistence rate-limited to once per DB_WRITE_INTERVAL_MS.
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
}) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribedRef = useRef(false)
  const pendingRef = useRef<PositionPayload | null>(null)
  const lastDbWrite = useRef<number>(0)

  // ── Effect 1: open channel once ─────────────────────────────────────────────
  useEffect(() => {
    if (!studentId || !tripId) return

    const channel = supabase.channel(`trip:${tripId}`, {
      config: { broadcast: { self: false, ack: false } },
    })

    channel.subscribe((status) => {
      subscribedRef.current = status === 'SUBSCRIBED'
      // Flush any position that arrived before the channel was ready
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

  // ── Effect 2: send on every position update ─────────────────────────────────
  useEffect(() => {
    if (!position) return

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
      // Channel not ready yet — buffer the latest position
      pendingRef.current = payload
    }
  }, [studentId, position, accuracy, batteryLevel])

  // ── Effect 3: DB persistence (rate-limited) ─────────────────────────────────
  useEffect(() => {
    if (!position) return

    const now = Date.now()
    if (now - lastDbWrite.current < DB_WRITE_INTERVAL_MS) return
    lastDbWrite.current = now

    supabase
      .rpc('upsert_position', {
        p_student_id: studentId,
        p_trip_id: tripId,
        p_lat: position.lat,
        p_lng: position.lng,
        p_accuracy: accuracy,
        p_battery: batteryLevel ?? null,
      })
      .then(({ error }) => {
        if (error) console.warn('[usePositionBroadcast] DB write failed:', error.message)
      })
  }, [studentId, tripId, position, accuracy, batteryLevel])
}
