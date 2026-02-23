import { useState, useEffect, useRef } from 'react'
import { haversineKm } from '@/lib/geo'
import type { LatLng } from '@/lib/geo'
import type { LivePositionMap } from './useTripPositions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZoneAlert {
  /** Student id (used as key) */
  id: string
  name: string
  distanceKm: number
  triggeredAt: Date
}

export interface AlertLogEntry extends ZoneAlert {
  type: 'exit' | 'return'
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Monitors live positions against the safe-zone radius.
 *
 * - Generates an alert the first time a student moves outside radiusKm.
 * - Auto-dismisses the alert when they return inside.
 * - Keeps a full chronological log (exit + return events).
 * - dismissAlert() lets the teacher manually hide a banner mid-absence.
 */
export function useZoneAlerts({
  students,
  positions,
  teacherPos,
  radiusKm,
}: {
  students: { id: string; name: string }[]
  positions: LivePositionMap
  teacherPos: LatLng
  radiusKm: number
}) {
  const [activeAlerts, setActiveAlerts] = useState<ZoneAlert[]>([])
  const [alertLog, setAlertLog] = useState<AlertLogEntry[]>([])

  // Track which students are currently outside — avoids re-firing on every render
  const outsideRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    students.forEach((s) => {
      const pos = positions[s.id]
      if (!pos) return

      const dist = haversineKm(teacherPos.lat, teacherPos.lng, pos.lat, pos.lng)
      const isOutside = dist > radiusKm
      const wasOutside = outsideRef.current.has(s.id)

      if (isOutside && !wasOutside) {
        // Transition: inside → outside
        outsideRef.current.add(s.id)
        const alert: ZoneAlert = { id: s.id, name: s.name, distanceKm: dist, triggeredAt: new Date() }
        setActiveAlerts((prev) => [...prev.filter((a) => a.id !== s.id), alert])
        setAlertLog((prev) => [{ ...alert, type: 'exit' }, ...prev])
      } else if (!isOutside && wasOutside) {
        // Transition: outside → inside
        outsideRef.current.delete(s.id)
        setActiveAlerts((prev) => prev.filter((a) => a.id !== s.id))
        setAlertLog((prev) => [
          { id: s.id, name: s.name, distanceKm: dist, triggeredAt: new Date(), type: 'return' },
          ...prev,
        ])
      }
    })
  }, [students, positions, teacherPos, radiusKm])

  /** Manually hide an active alert (student stays outside, teacher acknowledged). */
  const dismissAlert = (studentId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== studentId))
  }

  return { activeAlerts, alertLog, dismissAlert }
}
