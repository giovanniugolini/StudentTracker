import { describe, it, expect } from 'vitest'
import { haversineKm } from '@/lib/geo'

describe('haversineKm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineKm(41.9028, 12.4964, 41.9028, 12.4964)).toBe(0)
  })

  it('calculates Rome → Florence (~231 km)', () => {
    const dist = haversineKm(41.9028, 12.4964, 43.7696, 11.2558)
    expect(dist).toBeCloseTo(231, 0)
  })

  it('calculates Milan → Naples (~658 km)', () => {
    const dist = haversineKm(45.4654, 9.1859, 40.8518, 14.2681)
    expect(dist).toBeCloseTo(658, 0)
  })

  it('symmetric: A→B equals B→A', () => {
    const d1 = haversineKm(41.9028, 12.4964, 43.7696, 11.2558)
    const d2 = haversineKm(43.7696, 11.2558, 41.9028, 12.4964)
    expect(d1).toBeCloseTo(d2, 6)
  })

  it('detects movement below 15 m threshold', () => {
    // ~11 m north
    const dist = haversineKm(41.9028, 12.4964, 41.90290, 12.4964)
    expect(dist).toBeLessThan(0.015)
  })

  it('detects movement above 15 m threshold', () => {
    // ~55 m north
    const dist = haversineKm(41.9028, 12.4964, 41.90330, 12.4964)
    expect(dist).toBeGreaterThan(0.015)
  })

  it('handles longitude wrap at 180°', () => {
    // Two points either side of the date line, ~222 km apart
    const dist = haversineKm(0, 179.5, 0, -179.5)
    expect(dist).toBeCloseTo(111.32, 0)
  })

  it('handles equatorial points', () => {
    // 1° longitude on the equator ≈ 111.2 km (Haversine with R=6371)
    const dist = haversineKm(0, 0, 0, 1)
    expect(dist).toBeCloseTo(111.2, 0)
  })

  it('handles polar proximity', () => {
    const dist = haversineKm(89.9, 0, 89.9, 180)
    expect(dist).toBeGreaterThan(0)
    expect(dist).toBeLessThan(30) // very short near pole
  })
})
