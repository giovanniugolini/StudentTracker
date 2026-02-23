import { useState, useEffect, useRef } from 'react'
import { haversineKm } from '@/lib/geo'
import type { LatLng } from '@/lib/geo'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeoMode = 'high' | 'power-save'

export interface GeoState {
  /** Current lat/lng, or null while waiting for first fix */
  position: LatLng | null
  /** Accuracy in metres reported by the device */
  accuracy: number | null
  /** Human-readable error message, null when all is well */
  error: string | null
  /** True while watchPosition is active */
  watching: boolean
  /** False if the browser / device doesn't support Geolocation API */
  supported: boolean
  /**
   * 'high'       — full accuracy, frequent updates (default)
   * 'power-save' — lower accuracy after 60 s stationary or battery < 20 %
   */
  mode: GeoMode
}

// ─── Battery API (partial typing — not in standard TS DOM lib) ────────────────

interface BatteryManager extends EventTarget {
  readonly charging: boolean
  readonly level: number
}

interface NavigatorWithBattery extends Navigator {
  getBattery(): Promise<BatteryManager>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HIGH_ACCURACY: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 5_000,
}

const POWER_SAVE: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 30_000,
  maximumAge: 30_000,
}

/** Switch to power-save after this long without significant movement */
const STATIONARY_MS = 60_000
/** Minimum displacement to count as "moved" */
const MOVEMENT_KM = 0.015 // 15 m
/** Battery level below which power-save is forced (when not charging) */
const LOW_BATTERY_LEVEL = 0.2

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Wraps navigator.geolocation.watchPosition with adaptive power management.
 *
 * Mode transitions:
 *   high → power-save  after STATIONARY_MS without ≥ MOVEMENT_KM displacement,
 *                       or immediately when battery < LOW_BATTERY_LEVEL (and not charging)
 *   power-save → high   on first position update with ≥ MOVEMENT_KM displacement
 */
export function useGeolocation(enabled = true): GeoState {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator

  const [mode, setMode] = useState<GeoMode>('high')
  const [state, setState] = useState<GeoState>({
    position: null,
    accuracy: null,
    error: supported ? null : 'Geolocalizzazione non supportata su questo dispositivo.',
    watching: false,
    supported,
    mode: 'high',
  })

  // Refs for adaptive mode tracking
  const prevPosRef = useRef<LatLng | null>(null)
  const lastMovedRef = useRef<number>(Date.now())
  const stationaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Effect 1: GPS watch — restarts whenever mode or enabled changes ─────────
  useEffect(() => {
    if (!supported || !enabled) return

    const opts = mode === 'high' ? HIGH_ACCURACY : POWER_SAVE
    setState((s) => ({ ...s, watching: true, error: null, mode }))

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState((s) => ({
          ...s,
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: Math.round(pos.coords.accuracy),
          error: null,
          mode,
        }))
      },
      (err) => {
        let msg: string
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Accesso al GPS negato. Abilita la posizione nelle impostazioni del browser.'
            break
          case err.POSITION_UNAVAILABLE:
            msg = 'Posizione non disponibile. Verifica il segnale GPS.'
            break
          case err.TIMEOUT:
            msg = 'Timeout nella lettura GPS. Riprovo…'
            break
          default:
            msg = `Errore GPS (codice ${err.code}).`
        }
        setState((s) => ({ ...s, error: msg, watching: false }))
      },
      opts,
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      setState((s) => ({ ...s, watching: false }))
    }
  }, [supported, mode, enabled])

  // ── Effect 2: adaptive mode based on movement ────────────────────────────────
  useEffect(() => {
    if (!state.position) return

    const cur = state.position
    const prev = prevPosRef.current

    const moved = prev ? haversineKm(prev.lat, prev.lng, cur.lat, cur.lng) >= MOVEMENT_KM : true

    if (moved) {
      lastMovedRef.current = Date.now()
      prevPosRef.current = cur

      // Movement detected while in power-save → restore high accuracy
      if (mode === 'power-save') {
        if (stationaryTimerRef.current) clearTimeout(stationaryTimerRef.current)
        setMode('high')
        return
      }
    } else if (!prev) {
      // First position — initialise ref without triggering mode change
      prevPosRef.current = cur
    }

    // In high mode: (re)schedule the power-save transition timer
    if (mode === 'high') {
      if (stationaryTimerRef.current) clearTimeout(stationaryTimerRef.current)
      const remaining = STATIONARY_MS - (Date.now() - lastMovedRef.current)
      stationaryTimerRef.current = setTimeout(
        () => setMode('power-save'),
        Math.max(0, remaining),
      )
    }

    return () => {
      if (stationaryTimerRef.current) clearTimeout(stationaryTimerRef.current)
    }
  }, [state.position, mode])

  // ── Effect 3: Battery API — force power-save on low battery ─────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return

    let mounted = true

    ;(navigator as NavigatorWithBattery)
      .getBattery()
      .then((bat) => {
        const check = () => {
          if (mounted && !bat.charging && bat.level < LOW_BATTERY_LEVEL) {
            setMode('power-save')
          }
        }
        check()
        bat.addEventListener('levelchange', check)
        bat.addEventListener('chargingchange', check)
      })
      .catch(() => {
        /* Battery API not available — ignore */
      })

    return () => {
      mounted = false
    }
  }, [])

  return state
}
