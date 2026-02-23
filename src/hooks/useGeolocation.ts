import { useState, useEffect } from 'react'
import type { LatLng } from '@/lib/geo'

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,   // 15 s before giving up on a single read
  maximumAge: 5_000, // accept cached position up to 5 s old
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Wraps navigator.geolocation.watchPosition.
 * Starts watching on mount, cleans up on unmount.
 * Errors are translated to Italian user-facing strings.
 */
export function useGeolocation(): GeoState {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator

  const [state, setState] = useState<GeoState>({
    position: null,
    accuracy: null,
    error: supported ? null : 'Geolocalizzazione non supportata su questo dispositivo.',
    watching: false,
    supported,
  })

  useEffect(() => {
    if (!supported) return

    setState((s) => ({ ...s, watching: true, error: null }))

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setState((s) => ({
          ...s,
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: Math.round(pos.coords.accuracy),
          error: null,
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
      GEO_OPTIONS,
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      setState((s) => ({ ...s, watching: false }))
    }
  }, [supported])

  return state
}
