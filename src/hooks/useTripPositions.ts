import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { PositionPayload } from './usePositionBroadcast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LivePosition {
  lat: number
  lng: number
  accuracy: number | null
  battery_level: number | null
  /** When this position was last received */
  updatedAt: Date
}

/** Maps studentId → latest live position */
export type LivePositionMap = Record<string, LivePosition>

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Teacher side.
 * Subscribes to Realtime broadcasts on channel `trip:{tripId}` and
 * maintains the latest position for every student that has sent one.
 * Returns an empty map while tripId is undefined.
 */
export function useTripPositions(tripId: string | undefined): LivePositionMap {
  const [positions, setPositions] = useState<LivePositionMap>({})

  useEffect(() => {
    if (!tripId) return

    // Clear stale positions when trip changes
    setPositions({})

    const channel = supabase.channel(`trip:${tripId}`, {
      config: { broadcast: { ack: false } },
    })

    channel
      .on('broadcast', { event: 'position' }, ({ payload }: { payload: PositionPayload }) => {
        console.debug('[useTripPositions] position received', payload)
        setPositions((prev) => ({
          ...prev,
          [payload.student_id]: {
            lat: payload.lat,
            lng: payload.lng,
            accuracy: payload.accuracy,
            battery_level: payload.battery_level,
            updatedAt: new Date(),
          },
        }))
      })
      .subscribe((status) => {
        console.debug('[useTripPositions] channel status', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId])

  return positions
}
