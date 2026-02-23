import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useZoneAlerts } from '@/hooks/useZoneAlerts'
import type { LivePositionMap } from '@/hooks/useTripPositions'

const TEACHER: { lat: number; lng: number } = { lat: 41.9028, lng: 12.4964 }
const RADIUS_KM = 0.1 // 100 m

function makePos(lat: number, lng: number): LivePositionMap {
  return {
    s1: { lat, lng, accuracy: 5, battery_level: 80, updatedAt: new Date() },
  }
}

const STUDENTS = [{ id: 's1', name: 'Mario Rossi' }]

describe('useZoneAlerts', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('starts with no alerts or log entries', () => {
    const { result } = renderHook(() =>
      useZoneAlerts({ students: STUDENTS, positions: {}, teacherPos: TEACHER, radiusKm: RADIUS_KM }),
    )
    expect(result.current.activeAlerts).toHaveLength(0)
    expect(result.current.alertLog).toHaveLength(0)
  })

  it('fires an exit alert when student moves outside radius', () => {
    const { result, rerender } = renderHook(
      ({ positions }) =>
        useZoneAlerts({ students: STUDENTS, positions, teacherPos: TEACHER, radiusKm: RADIUS_KM }),
      { initialProps: { positions: makePos(TEACHER.lat, TEACHER.lng) } },
    )

    // Move student ~300 m north — outside 100 m radius
    act(() => {
      rerender({ positions: makePos(TEACHER.lat + 0.003, TEACHER.lng) })
    })

    expect(result.current.activeAlerts).toHaveLength(1)
    expect(result.current.activeAlerts[0].name).toBe('Mario Rossi')
    expect(result.current.alertLog[0].type).toBe('exit')
  })

  it('auto-dismisses alert when student returns inside radius', () => {
    const { result, rerender } = renderHook(
      ({ positions }) =>
        useZoneAlerts({ students: STUDENTS, positions, teacherPos: TEACHER, radiusKm: RADIUS_KM }),
      { initialProps: { positions: makePos(TEACHER.lat + 0.003, TEACHER.lng) } },
    )

    // Student returns
    act(() => {
      rerender({ positions: makePos(TEACHER.lat, TEACHER.lng) })
    })

    expect(result.current.activeAlerts).toHaveLength(0)
    expect(result.current.alertLog[0].type).toBe('return')
  })

  it('does not fire duplicate exit alerts for same student', () => {
    const { result, rerender } = renderHook(
      ({ positions }) =>
        useZoneAlerts({ students: STUDENTS, positions, teacherPos: TEACHER, radiusKm: RADIUS_KM }),
      { initialProps: { positions: {} } },
    )

    act(() => { rerender({ positions: makePos(TEACHER.lat + 0.003, TEACHER.lng) }) })
    act(() => { rerender({ positions: makePos(TEACHER.lat + 0.004, TEACHER.lng) }) })
    act(() => { rerender({ positions: makePos(TEACHER.lat + 0.005, TEACHER.lng) }) })

    expect(result.current.activeAlerts).toHaveLength(1)
    const exitEntries = result.current.alertLog.filter((e) => e.type === 'exit')
    expect(exitEntries).toHaveLength(1)
  })

  it('dismissAlert removes active alert but keeps log entry', () => {
    const { result, rerender } = renderHook(
      ({ positions }) =>
        useZoneAlerts({ students: STUDENTS, positions, teacherPos: TEACHER, radiusKm: RADIUS_KM }),
      { initialProps: { positions: {} } },
    )

    act(() => { rerender({ positions: makePos(TEACHER.lat + 0.003, TEACHER.lng) }) })
    expect(result.current.activeAlerts).toHaveLength(1)

    act(() => { result.current.dismissAlert('s1') })

    expect(result.current.activeAlerts).toHaveLength(0)
    expect(result.current.alertLog).toHaveLength(1) // log preserved
  })

  it('logs radius_change when radiusKm changes', () => {
    const { result, rerender } = renderHook(
      ({ radiusKm }) =>
        useZoneAlerts({ students: STUDENTS, positions: {}, teacherPos: TEACHER, radiusKm }),
      { initialProps: { radiusKm: 0.1 } },
    )

    act(() => { rerender({ radiusKm: 0.5 }) })

    expect(result.current.alertLog).toHaveLength(1)
    const entry = result.current.alertLog[0]
    expect(entry.type).toBe('radius_change')
    if (entry.type === 'radius_change') {
      expect(entry.oldRadius).toBe(0.1)
      expect(entry.newRadius).toBe(0.5)
    }
  })

  it('does not log radius_change on initial mount', () => {
    const { result } = renderHook(() =>
      useZoneAlerts({ students: STUDENTS, positions: {}, teacherPos: TEACHER, radiusKm: 0.3 }),
    )
    expect(result.current.alertLog).toHaveLength(0)
  })

  it('handles multiple students independently', () => {
    const students = [
      { id: 's1', name: 'Mario' },
      { id: 's2', name: 'Lucia' },
    ]
    const positions: LivePositionMap = {
      s1: { lat: TEACHER.lat + 0.003, lng: TEACHER.lng, accuracy: 5, battery_level: 80, updatedAt: new Date() },
      s2: { lat: TEACHER.lat, lng: TEACHER.lng, accuracy: 5, battery_level: 80, updatedAt: new Date() },
    }

    const { result } = renderHook(() =>
      useZoneAlerts({ students, positions, teacherPos: TEACHER, radiusKm: RADIUS_KM }),
    )

    expect(result.current.activeAlerts).toHaveLength(1)
    expect(result.current.activeAlerts[0].name).toBe('Mario')
  })
})
