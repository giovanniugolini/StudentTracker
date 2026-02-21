import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  studentName: string
  tripName: string
  token: string
  onClose: () => void
}

export default function QrCodeModal({ studentName, tripName, token, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const magicLink = `${window.location.origin}/join/${token}`

  const handleDownload = () => {
    const svg = printRef.current?.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    const size = 400
    canvas.width = size
    canvas.height = size

    img.onload = () => {
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      const a = document.createElement('a')
      a.download = `qr-${studentName.replace(/\s+/g, '-').toLowerCase()}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank', 'width=400,height=500')
    if (!win) return
    win.document.write(`
      <html><head><title>QR – ${studentName}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 24px; }
        h2 { font-size: 18px; margin: 0 0 4px; }
        p  { font-size: 13px; color: #555; margin: 0 0 16px; }
        svg { display: block; margin: 0 auto; }
        small { display:block; margin-top:12px; font-size:10px; color:#999; word-break:break-all; }
      </style></head><body>
      <h2>${studentName}</h2>
      <p>${tripName}</p>
      ${content.querySelector('svg')?.outerHTML ?? ''}
      <small>${magicLink}</small>
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">{studentName}</h2>
            <p className="text-xs text-slate-400">{tripName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center px-6 py-8">
          <div
            ref={printRef}
            className="rounded-2xl bg-white p-4 shadow-inner ring-1 ring-slate-100"
          >
            <QRCodeSVG
              value={magicLink}
              size={220}
              level="M"
              includeMargin={false}
              fgColor="#1e293b"
            />
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Lo studente inquadra il QR con la fotocamera
            <br />
            per accedere alla gita senza password.
          </p>

          <div className="mt-2 w-full rounded-lg bg-slate-50 px-3 py-2 text-center font-mono text-xs text-slate-400 ring-1 ring-slate-100">
            {magicLink}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={handleDownload}
            className="flex-1 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
          >
            ⬇ Scarica PNG
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            🖨 Stampa
          </button>
        </div>
      </div>
    </div>
  )
}
