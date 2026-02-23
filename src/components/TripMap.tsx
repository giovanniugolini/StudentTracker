import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import { fixLeafletIcons, teacherIcon, studentIcon } from '@/lib/mapIcons'
import { haversineKm } from '@/lib/geo'
import type { LatLng } from '@/lib/geo'

fixLeafletIcons()

// ─── Auto-fit bounds when markers change ─────────────────────────────────────

function FitBounds({
  teacherPos,
  studentPositions,
}: {
  teacherPos: LatLng
  studentPositions: LatLng[]
}) {
  const map = useMap()
  const didFit = useRef(false)

  useEffect(() => {
    const points = [teacherPos, ...studentPositions]
    if (points.length === 0) return

    // Auto-fit only on first load; after that let the user pan freely
    if (!didFit.current) {
      if (points.length === 1) {
        map.setView([teacherPos.lat, teacherPos.lng], 15)
      } else {
        const lats = points.map((p) => p.lat)
        const lngs = points.map((p) => p.lng)
        map.fitBounds(
          [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)],
          ],
          { padding: [60, 60] },
        )
      }
      didFit.current = true
    }
  }, [map, teacherPos, studentPositions])

  return null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentMarkerData {
  id: string
  name: string
  position: LatLng
  battery_level?: number | null
}

interface Props {
  teacherPos: LatLng
  radiusKm: number
  students: StudentMarkerData[]
  className?: string
}

// ─── Map Component ────────────────────────────────────────────────────────────

export default function TripMap({ teacherPos, radiusKm, students, className = '' }: Props) {
  const studentPositions = students.map((s) => s.position)

  return (
    <MapContainer
      center={[teacherPos.lat, teacherPos.lng]}
      zoom={15}
      className={`h-full w-full rounded-xl ${className}`}
      style={{ minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds teacherPos={teacherPos} studentPositions={studentPositions} />

      {/* Safe zone circle */}
      <Circle
        center={[teacherPos.lat, teacherPos.lng]}
        radius={radiusKm * 1000}
        pathOptions={{
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '8 4',
        }}
      />

      {/* Teacher marker */}
      <Marker position={[teacherPos.lat, teacherPos.lng]} icon={teacherIcon()}>
        <Popup>
          <strong>Professore</strong>
          <br />
          Centro zona sicura · raggio {radiusKm} km
        </Popup>
      </Marker>

      {/* Student markers */}
      {students.map((s, idx) => {
        const dist = haversineKm(teacherPos.lat, teacherPos.lng, s.position.lat, s.position.lng)
        const outside = dist > radiusKm
        return (
          <Marker
            key={s.id}
            position={[s.position.lat, s.position.lng]}
            icon={studentIcon(s.name, idx, outside)}
          >
            <Popup>
              <strong>{s.name}</strong>
              <br />
              {outside ? (
                <span style={{ color: '#ef4444' }}>⚠ Fuori zona — {dist.toFixed(0)}m</span>
              ) : (
                <span style={{ color: '#059669' }}>✓ In zona — {(dist * 1000).toFixed(0)}m</span>
              )}
              {s.battery_level != null && (
                <>
                  <br />
                  🔋 {s.battery_level}%
                </>
              )}
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
