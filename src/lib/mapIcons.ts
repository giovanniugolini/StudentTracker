import L from 'leaflet'

/**
 * Fix Leaflet default icon broken in Vite/webpack builds.
 * Must be called once before using any Leaflet map.
 */
export function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

/** Teacher marker — gold pin */
export function teacherIcon() {
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:linear-gradient(135deg,#f59e0b,#ef4444);
        border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
        font-size:18px;line-height:1;
      ">📍</div>`,
  })
}

const STUDENT_COLORS = [
  '#2563eb','#dc2626','#059669','#d97706','#7c3aed',
  '#db2777','#0891b2','#65a30d','#ea580c','#6366f1',
]

/** Student marker — colored circle with initial */
export function studentIcon(name: string, index: number, outside: boolean) {
  const color = outside ? '#ef4444' : STUDENT_COLORS[index % STUDENT_COLORS.length]
  const initial = name.charAt(0).toUpperCase()
  const pulse = outside
    ? `<div style="
        position:absolute;inset:-6px;border-radius:50%;
        border:2px solid #ef4444;opacity:0.6;
        animation:leaflet-pulse 1.5s ease-out infinite;
      "></div>`
    : ''
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    html: `
      <div style="position:relative;width:32px;height:32px;">
        ${pulse}
        <div style="
          width:32px;height:32px;border-radius:50%;
          background:${color};
          border:2.5px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,0.2);
          display:flex;align-items:center;justify-content:center;
          font-size:13px;font-weight:700;color:#fff;
          font-family:sans-serif;
        ">${initial}</div>
      </div>`,
  })
}
