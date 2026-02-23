import { useState, useEffect, useCallback, useRef } from "react";

const INITIAL_CENTER = { lat: 43.7696, lng: 11.2558 }; // Florence

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function randomOffset(range) {
  return (Math.random() - 0.5) * range;
}

const STUDENT_COLORS = [
  "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed",
  "#db2777", "#0891b2", "#65a30d", "#ea580c", "#6366f1",
  "#be185d", "#0d9488", "#b45309", "#4f46e5", "#c026d3",
];

const AVATARS = "🧑‍🎓👩‍🎓👨‍🎓🧑‍💻👩‍💻👨‍💻🧑‍🔬👩‍🔬👨‍🔬🧑‍🎨👩‍🎨👨‍🎨🧑‍🏫👩‍🏫👨‍🏫".match(/./gu);

function MapView({ center, students, radiusKm, zoom, onMapClick, teacherPos }) {
  const svgRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [currentOffset, setCurrentOffset] = useState({ x: 0, y: 0 });

  const scale = Math.pow(2, zoom) * 200;

  const toScreen = useCallback(
    (lat, lng) => {
      const x = (lng - center.lng) * scale * Math.cos((center.lat * Math.PI) / 180) + 400 + currentOffset.x;
      const y = (center.lat - lat) * scale + 300 + currentOffset.y;
      return { x, y };
    },
    [center, scale, currentOffset]
  );

  const radiusPixels = radiusKm * scale * (1 / 111.32);

  const handleMouseDown = (e) => {
    if (e.target.closest('.student-marker')) return;
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!dragStart) return;
    setCurrentOffset({
      x: offset.x + (e.clientX - dragStart.x),
      y: offset.y + (e.clientY - dragStart.y),
    });
  };

  const handleMouseUp = () => {
    if (dragStart) {
      setOffset(currentOffset);
      setDragStart(null);
    }
  };

  const teacherScreen = toScreen(teacherPos.lat, teacherPos.lng);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 600"
      style={{ width: "100%", height: "100%", cursor: dragStart ? "grabbing" : "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <defs>
        <radialGradient id="safeZone" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
          <stop offset="70%" stopColor="#10b981" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.15" />
        </radialGradient>
        <radialGradient id="teacherGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
        </filter>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.5" />
        </pattern>
      </defs>

      <rect width="800" height="600" fill="#f0f4f8" />
      <rect width="800" height="600" fill="url(#grid)" />

      {/* Safe zone circle */}
      <circle
        cx={teacherScreen.x}
        cy={teacherScreen.y}
        r={radiusPixels}
        fill="url(#safeZone)"
        stroke="#10b981"
        strokeWidth="2"
        strokeDasharray="8 4"
        opacity="0.8"
      />
      <text
        x={teacherScreen.x}
        y={teacherScreen.y - radiusPixels - 8}
        textAnchor="middle"
        fill="#059669"
        fontSize="11"
        fontWeight="600"
        fontFamily="'DM Sans', sans-serif"
      >
        Zona Sicura — {radiusKm} km
      </text>

      {/* Teacher marker */}
      <circle cx={teacherScreen.x} cy={teacherScreen.y} r="20" fill="url(#teacherGlow)" />
      <circle
        cx={teacherScreen.x}
        cy={teacherScreen.y}
        r="14"
        fill="#f59e0b"
        stroke="#fff"
        strokeWidth="3"
        filter="url(#shadow)"
      />
      <text
        x={teacherScreen.x}
        y={teacherScreen.y + 5}
        textAnchor="middle"
        fontSize="14"
        fill="#fff"
        fontWeight="bold"
      >
        P
      </text>
      <text
        x={teacherScreen.x}
        y={teacherScreen.y + 28}
        textAnchor="middle"
        fill="#92400e"
        fontSize="10"
        fontWeight="600"
        fontFamily="'DM Sans', sans-serif"
      >
        PROF
      </text>

      {/* Student markers */}
      {students.map((s, i) => {
        if (!s.location) return null;
        const pos = toScreen(s.location.lat, s.location.lng);
        const dist = haversineDistance(
          teacherPos.lat, teacherPos.lng,
          s.location.lat, s.location.lng
        );
        const isOutside = dist > radiusKm;

        return (
          <g key={s.id} className="student-marker" style={{ cursor: "pointer" }}>
            {isOutside && (
              <>
                <line
                  x1={teacherScreen.x} y1={teacherScreen.y}
                  x2={pos.x} y2={pos.y}
                  stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 3" opacity="0.6"
                />
                <circle cx={pos.x} cy={pos.y} r="22" fill="none" stroke="#ef4444" strokeWidth="2">
                  <animate attributeName="r" values="18;26;18" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </>
            )}
            <circle
              cx={pos.x} cy={pos.y} r="15"
              fill={isOutside ? "#ef4444" : s.color}
              stroke="#fff" strokeWidth="2.5"
              filter="url(#shadow)"
            />
            <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="central" fontSize="13">
              {s.avatar}
            </text>
            <text
              x={pos.x} y={pos.y + 28}
              textAnchor="middle" fill={isOutside ? "#dc2626" : "#334155"}
              fontSize="10" fontWeight="600"
              fontFamily="'DM Sans', sans-serif"
            >
              {s.name}
            </text>
            {isOutside && (
              <text
                x={pos.x} y={pos.y + 40}
                textAnchor="middle" fill="#dc2626"
                fontSize="9" fontWeight="700"
                fontFamily="'DM Sans', sans-serif"
              >
                ⚠ {dist.toFixed(2)} km
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function AlertBanner({ alerts, onDismiss }) {
  if (alerts.length === 0) return null;
  return (
    <div style={{
      position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
      zIndex: 100, display: "flex", flexDirection: "column", gap: 6, maxWidth: 420, width: "90%"
    }}>
      {alerts.map((a) => (
        <div
          key={a.id}
          style={{
            background: "linear-gradient(135deg, #fef2f2, #fee2e2)",
            border: "1px solid #fca5a5",
            borderRadius: 12, padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 4px 20px rgba(239,68,68,0.2)",
            animation: "slideDown 0.3s ease-out",
          }}
        >
          <span style={{ fontSize: 22 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#991b1b", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              ALLERTA
            </div>
            <div style={{ color: "#b91c1c", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              <strong>{a.name}</strong> si è allontanato/a! ({a.distance} km)
            </div>
          </div>
          <button
            onClick={() => onDismiss(a.id)}
            style={{
              background: "none", border: "none", color: "#dc2626",
              cursor: "pointer", fontSize: 18, padding: 4,
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [students, setStudents] = useState([]);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [radiusKm, setRadiusKm] = useState(0.5);
  const [zoom, setZoom] = useState(14);
  const [alerts, setAlerts] = useState([]);
  const [alertLog, setAlertLog] = useState([]);
  const [showPanel, setShowPanel] = useState(true);
  const [tab, setTab] = useState("students");
  const [simulation, setSimulation] = useState(false);
  const [teacherPos] = useState(INITIAL_CENTER);
  const alertedRef = useRef(new Set());

  const addStudent = () => {
    if (!newName.trim()) return;
    const id = Date.now();
    const color = STUDENT_COLORS[students.length % STUDENT_COLORS.length];
    const avatar = AVATARS[students.length % AVATARS.length];
    setStudents((prev) => [
      ...prev,
      {
        id, name: newName.trim(), phone: newPhone.trim(),
        color, avatar, location: null, connected: false,
      },
    ]);
    setNewName("");
    setNewPhone("");
  };

  const removeStudent = (id) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    alertedRef.current.delete(id);
  };

  const toggleSimulation = () => {
    if (!simulation) {
      setStudents((prev) =>
        prev.map((s) => ({
          ...s,
          connected: true,
          location: {
            lat: teacherPos.lat + randomOffset(0.006),
            lng: teacherPos.lng + randomOffset(0.008),
          },
        }))
      );
      alertedRef.current.clear();
    } else {
      setStudents((prev) =>
        prev.map((s) => ({ ...s, connected: false, location: null }))
      );
      setAlerts([]);
      alertedRef.current.clear();
    }
    setSimulation(!simulation);
  };

  // Simulate movement
  useEffect(() => {
    if (!simulation) return;
    const interval = setInterval(() => {
      setStudents((prev) =>
        prev.map((s) => {
          if (!s.location) return s;
          const wanderChance = Math.random();
          let drift = 0.0003;
          if (wanderChance > 0.92) drift = 0.004; // someone wanders off
          return {
            ...s,
            location: {
              lat: s.location.lat + randomOffset(drift),
              lng: s.location.lng + randomOffset(drift),
            },
          };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, [simulation]);

  // Check distances and trigger alerts
  useEffect(() => {
    students.forEach((s) => {
      if (!s.location) return;
      const dist = haversineDistance(
        teacherPos.lat, teacherPos.lng,
        s.location.lat, s.location.lng
      );
      if (dist > radiusKm && !alertedRef.current.has(s.id)) {
        alertedRef.current.add(s.id);
        const alertObj = {
          id: s.id,
          name: s.name,
          distance: dist.toFixed(2),
          time: new Date().toLocaleTimeString("it-IT"),
        };
        setAlerts((prev) => [...prev, alertObj]);
        setAlertLog((prev) => [alertObj, ...prev]);
      }
      if (dist <= radiusKm && alertedRef.current.has(s.id)) {
        alertedRef.current.delete(s.id);
        setAlerts((prev) => prev.filter((a) => a.id !== s.id));
      }
    });
  }, [students, radiusKm, teacherPos]);

  const dismissAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const connectedCount = students.filter((s) => s.connected).length;
  const outsideCount = students.filter((s) => {
    if (!s.location) return false;
    return haversineDistance(teacherPos.lat, teacherPos.lng, s.location.lat, s.location.lng) > radiusKm;
  }).length;

  return (
    <div style={{
      width: "100vw", height: "100vh", position: "relative", overflow: "hidden",
      fontFamily: "'DM Sans', sans-serif", background: "#f0f4f8",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap');
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        input:focus { outline: none; border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 50,
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        padding: "10px 16px", display: "flex", alignItems: "center", gap: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #f59e0b, #ef4444)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20,
        }}>
          📍
        </div>
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>
            GitaTracker
          </div>
          <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 500 }}>
            Monitoraggio studenti in tempo reale
          </div>
        </div>
        <div style={{ flex: 1 }} />

        {/* Stats pills */}
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{
            background: "rgba(16,185,129,0.15)", color: "#34d399",
            padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          }}>
            ● {connectedCount} online
          </div>
          {outsideCount > 0 && (
            <div style={{
              background: "rgba(239,68,68,0.15)", color: "#f87171",
              padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              animation: "pulse 1s infinite",
            }}>
              ⚠ {outsideCount} fuori zona
            </div>
          )}
        </div>

        <button
          onClick={() => setShowPanel(!showPanel)}
          style={{
            background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
            width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 18,
          }}
        >
          {showPanel ? "✕" : "☰"}
        </button>
      </div>

      {/* Map */}
      <div style={{ position: "absolute", top: 56, left: 0, right: 0, bottom: 0 }}>
        <MapView
          center={INITIAL_CENTER}
          students={students}
          radiusKm={radiusKm}
          zoom={zoom}
          teacherPos={teacherPos}
        />

        {/* Zoom controls */}
        <div style={{
          position: "absolute", bottom: 20, right: 16,
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <button onClick={() => setZoom((z) => Math.min(z + 1, 18))} style={zoomBtnStyle}>+</button>
          <button onClick={() => setZoom((z) => Math.max(z - 1, 10))} style={zoomBtnStyle}>−</button>
        </div>

        <AlertBanner alerts={alerts} onDismiss={dismissAlert} />
      </div>

      {/* Side Panel */}
      {showPanel && (
        <div style={{
          position: "absolute", top: 56, right: 0, bottom: 0, width: 340,
          background: "#fff", borderLeft: "1px solid #e2e8f0",
          boxShadow: "-4px 0 30px rgba(0,0,0,0.08)",
          display: "flex", flexDirection: "column", zIndex: 40,
          overflowY: "auto",
        }}>
          {/* Tabs */}
          <div style={{
            display: "flex", borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}>
            {[
              { id: "students", label: "👥 Studenti", count: students.length },
              { id: "settings", label: "⚙️ Impostazioni" },
              { id: "log", label: "📋 Log", count: alertLog.length },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, padding: "12px 8px", border: "none",
                  background: tab === t.id ? "#fff" : "transparent",
                  borderBottom: tab === t.id ? "2px solid #3b82f6" : "2px solid transparent",
                  color: tab === t.id ? "#1e293b" : "#94a3b8",
                  fontWeight: 600, fontSize: 12, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  transition: "all 0.2s",
                }}
              >
                {t.label} {t.count !== undefined && <span style={{
                  background: tab === t.id ? "#3b82f6" : "#cbd5e1",
                  color: "#fff", borderRadius: 10, padding: "1px 6px",
                  fontSize: 10, marginLeft: 3,
                }}>{t.count}</span>}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {/* Students Tab */}
            {tab === "students" && (
              <>
                {/* Add student form */}
                <div style={{
                  background: "#f8fafc", borderRadius: 12, padding: 14,
                  marginBottom: 16, border: "1px solid #e2e8f0",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#334155", marginBottom: 10 }}>
                    ➕ Aggiungi Studente
                  </div>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome e cognome"
                    onKeyDown={(e) => e.key === "Enter" && addStudent()}
                    style={inputStyle}
                  />
                  <input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Numero telefono (opzionale)"
                    style={{ ...inputStyle, marginTop: 8 }}
                  />
                  <button onClick={addStudent} style={primaryBtnStyle}>
                    Aggiungi alla classe
                  </button>
                </div>

                {/* Simulation button */}
                <button onClick={toggleSimulation} style={{
                  ...primaryBtnStyle,
                  background: simulation
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #10b981, #059669)",
                  marginBottom: 16,
                }}>
                  {simulation ? "⏹ Ferma Simulazione" : "▶ Avvia Simulazione GPS"}
                </button>

                {/* Student list */}
                {students.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: 30, color: "#94a3b8",
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Nessuno studente</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Aggiungi studenti per iniziare</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {students.map((s) => {
                      const dist = s.location
                        ? haversineDistance(teacherPos.lat, teacherPos.lng, s.location.lat, s.location.lng)
                        : null;
                      const isOutside = dist !== null && dist > radiusKm;

                      return (
                        <div
                          key={s.id}
                          style={{
                            background: isOutside
                              ? "linear-gradient(135deg, #fef2f2, #fff)"
                              : "#fff",
                            border: `1px solid ${isOutside ? "#fca5a5" : "#e2e8f0"}`,
                            borderRadius: 12, padding: "10px 12px",
                            display: "flex", alignItems: "center", gap: 10,
                            transition: "all 0.3s",
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: isOutside
                              ? "linear-gradient(135deg, #ef4444, #dc2626)"
                              : `linear-gradient(135deg, ${s.color}, ${s.color}dd)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, flexShrink: 0,
                          }}>
                            {s.avatar}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontWeight: 600, fontSize: 13, color: "#1e293b",
                              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                              {s.phone && <span>{s.phone} • </span>}
                              {s.connected ? (
                                <span style={{ color: isOutside ? "#dc2626" : "#10b981" }}>
                                  {isOutside ? `⚠ ${dist.toFixed(2)} km` : `● ${dist ? dist.toFixed(2) + " km" : "Connesso"}`}
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>○ Non connesso</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeStudent(s.id)}
                            style={{
                              background: "none", border: "none", color: "#cbd5e1",
                              cursor: "pointer", fontSize: 16, padding: 4,
                              transition: "color 0.2s",
                            }}
                            onMouseEnter={(e) => (e.target.style.color = "#ef4444")}
                            onMouseLeave={(e) => (e.target.style.color = "#cbd5e1")}
                          >
                            🗑
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Settings Tab */}
            {tab === "settings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#334155", marginBottom: 4 }}>
                    📏 Raggio Zona Sicura
                  </div>
                  <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>
                    Distanza massima consentita dal professore
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="range"
                      min="0.1" max="5" step="0.1"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: "#3b82f6" }}
                    />
                    <div style={{
                      background: "#f1f5f9", padding: "6px 12px", borderRadius: 8,
                      fontWeight: 700, fontSize: 14, color: "#1e293b", minWidth: 60,
                      textAlign: "center",
                    }}>
                      {radiusKm.toFixed(1)} km
                    </div>
                  </div>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    color: "#94a3b8", fontSize: 10, marginTop: 4, padding: "0 4px",
                  }}>
                    <span>100m</span>
                    <span>5 km</span>
                  </div>
                </div>

                <div style={{
                  background: "#f8fafc", borderRadius: 12, padding: 14,
                  border: "1px solid #e2e8f0",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#334155", marginBottom: 8 }}>
                    🔗 Condivisione Posizione
                  </div>
                  <div style={{ color: "#64748b", fontSize: 11, lineHeight: 1.6 }}>
                    Ogni studente riceverà un link da aprire sul proprio telefono.
                    Il link attiverà la condivisione della posizione GPS in tempo reale
                    con il dispositivo del professore.
                  </div>
                  <div style={{
                    background: "#e0f2fe", borderRadius: 8, padding: 10, marginTop: 10,
                    fontSize: 11, color: "#0369a1", lineHeight: 1.5,
                  }}>
                    💡 <strong>Nota:</strong> In produzione, questa app utilizzerebbe
                    la Geolocation API del browser e WebSocket per la comunicazione
                    in tempo reale tra i dispositivi.
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#334155", marginBottom: 8 }}>
                    🗺️ Zoom Mappa
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input
                      type="range"
                      min="10" max="18" step="1"
                      value={zoom}
                      onChange={(e) => setZoom(parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: "#3b82f6" }}
                    />
                    <div style={{
                      background: "#f1f5f9", padding: "6px 12px", borderRadius: 8,
                      fontWeight: 700, fontSize: 14, color: "#1e293b", minWidth: 40,
                      textAlign: "center",
                    }}>
                      {zoom}x
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Log Tab */}
            {tab === "log" && (
              <>
                {alertLog.length === 0 ? (
                  <div style={{
                    textAlign: "center", padding: 30, color: "#94a3b8",
                  }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Nessun evento</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      Gli avvisi appariranno qui
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {alertLog.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#fef2f2", borderRadius: 8, padding: "8px 12px",
                          border: "1px solid #fecaca", fontSize: 11,
                        }}
                      >
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center",
                        }}>
                          <span style={{ fontWeight: 600, color: "#991b1b" }}>
                            🚨 {a.name}
                          </span>
                          <span style={{ color: "#b91c1c", fontSize: 10 }}>
                            {a.time}
                          </span>
                        </div>
                        <div style={{ color: "#dc2626", marginTop: 2 }}>
                          Allontanamento: {a.distance} km dal punto base
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid #e2e8f0", fontSize: 13,
  fontFamily: "'DM Sans', sans-serif", color: "#334155",
  transition: "all 0.2s",
};

const primaryBtnStyle = {
  width: "100%", padding: "10px 16px", borderRadius: 10, border: "none",
  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
  color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif", marginTop: 10,
  transition: "all 0.2s",
};

const zoomBtnStyle = {
  width: 36, height: 36, borderRadius: 8,
  background: "#fff", border: "1px solid #e2e8f0",
  fontSize: 18, cursor: "pointer", color: "#334155",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  display: "flex", alignItems: "center", justifyContent: "center",
};
