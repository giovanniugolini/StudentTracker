import { useState, useEffect, useRef } from 'react'
import { haversineKm } from '@/lib/geo'
import type { LatLng } from '@/lib/geo'
import type { LivePositionMap } from './useTripPositions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZoneAlert {
  id: string
  name: string
  distanceKm: number
  triggeredAt: Date
}

export type AlertLogEntry =
  | { type: 'exit' | 'return'; id: string; name: string; distanceKm: number; triggeredAt: Date }
  | { type: 'radius_change'; oldRadius: number; newRadius: number; triggeredAt: Date }

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Monitors live positions against the safe-zone radius.
 *
 * Log events:
 *   'exit'         — student moved outside radiusKm
 *   'return'       — student came back inside
 *   'radius_change'— teacher changed the safe-zone radius
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

  const outsideRef = useRef<Set<string>>(new Set())
  const prevRadiusRef = useRef<number | null>(null)

  // ── Track radius changes ────────────────────────────────────────────────────
  useEffect(() => {
    if (prevRadiusRef.current !== null && prevRadiusRef.current !== radiusKm) {
      setAlertLog((prev) => [
        { type: 'radius_change', oldRadius: prevRadiusRef.current!, newRadius: radiusKm, triggeredAt: new Date() },
        ...prev,
      ])
    }
    prevRadiusRef.current = radiusKm
  }, [radiusKm])

  // ── Track position changes ──────────────────────────────────────────────────
  useEffect(() => {
    students.forEach((s) => {
      const pos = positions[s.id]
      if (!pos) return

      const dist = haversineKm(teacherPos.lat, teacherPos.lng, pos.lat, pos.lng)
      const isOutside = dist > radiusKm
      const wasOutside = outsideRef.current.has(s.id)

      if (isOutside && !wasOutside) {
        outsideRef.current.add(s.id)
        const alert: ZoneAlert = { id: s.id, name: s.name, distanceKm: dist, triggeredAt: new Date() }
        setActiveAlerts((prev) => [...prev.filter((a) => a.id !== s.id), alert])
        setAlertLog((prev) => [{ type: 'exit', ...alert }, ...prev])
      } else if (!isOutside && wasOutside) {
        outsideRef.current.delete(s.id)
        setActiveAlerts((prev) => prev.filter((a) => a.id !== s.id))
        setAlertLog((prev) => [
          { type: 'return', id: s.id, name: s.name, distanceKm: dist, triggeredAt: new Date() },
          ...prev,
        ])
      }
    })
  }, [students, positions, teacherPos, radiusKm])

  const dismissAlert = (studentId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== studentId))
  }

  return { activeAlerts, alertLog, dismissAlert }
}
