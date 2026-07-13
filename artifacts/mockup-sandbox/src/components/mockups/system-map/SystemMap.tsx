import { useState, useEffect } from "react";

type Body = {
  id: string;
  name: string;
  type: "star" | "planet" | "moon" | "station" | "asteroid";
  x: number;
  y: number;
  radius: number;
  color: string;
  faction?: string;
  description?: string;
};

type FleetMarker = {
  id: string;
  name: string;
  x: number;
  y: number;
  faction: string;
  isCapital?: boolean;
  side: "defense" | "assault";
};

const BODIES: Body[] = [
  { id: "star",     name: "Hoth Prime",            type: "star",     x: 480, y: 300, radius: 44, color: "#ffcc55", faction: undefined },
  { id: "hoth",     name: "Hoth",                  type: "planet",   x: 255, y: 300, radius: 26, color: "#9dd4f5", faction: "Rebel Alliance", description: "Frozen world — Echo Base Delta-One" },
  { id: "moon1",    name: "Hoth I",                type: "moon",     x: 202, y: 272, radius: 8,  color: "#8899bb", faction: undefined },
  { id: "moon2",    name: "Hoth II",               type: "moon",     x: 214, y: 332, radius: 6,  color: "#776688", faction: undefined },
  { id: "station",  name: "Imperial Relay Station", type: "station",  x: 680, y: 185, radius: 12, color: "#ff3333", faction: "Empire" },
  { id: "ast1",     name: "Ore Belt Alpha",         type: "asteroid", x: 395, y: 142, radius: 5,  color: "#887755", faction: undefined },
  { id: "ast2",     name: "Ore Belt Beta",          type: "asteroid", x: 360, y: 128, radius: 4,  color: "#776644", faction: undefined },
  { id: "ast3",     name: "Ore Belt Gamma",         type: "asteroid", x: 430, y: 136, radius: 6,  color: "#998866", faction: undefined },
];

const FLEETS: FleetMarker[] = [
  { id: "f1", name: "Rogue Squadron",    x: 188, y: 220, faction: "Rebel Alliance", isCapital: false, side: "defense" },
  { id: "f2", name: "Echo Base Defense", x: 150, y: 340, faction: "Rebel Alliance", isCapital: false, side: "defense" },
  { id: "f3", name: "Death Squadron",    x: 635, y: 225, faction: "Empire", isCapital: true,  side: "assault" },
  { id: "f4", name: "Blizzard Force",    x: 298, y: 238, faction: "Empire", isCapital: false, side: "assault" },
];

// HUD corner bracket SVG path
function HudCorner({ size = 14, color = "#ff6600", flip = false }: { size?: number; color?: string; flip?: boolean }) {
  const t = flip ? `scale(-1,1) translate(-${size},0)` : "";
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <g transform={t}>
        <polyline points={`0,${size} 0,0 ${size},0`} fill="none" stroke={color} strokeWidth="2" />
      </g>
    </svg>
  );
}

// Panel with HUD corners
function HudPanel({ children, className = "", color = "#ff6600", label }: {
  children: React.ReactNode;
  className?: string;
  color?: string;
  label?: string;
}) {
  const C = 10;
  return (
    <div className={`relative ${className}`} style={{ borderColor: color + "33" }}>
      {/* Top corners */}
      <div style={{ position: "absolute", top: 0, left: 0 }}>
        <svg width={C + 2} height={C + 2}><polyline points={`0,${C + 2} 0,0 ${C + 2},0`} fill="none" stroke={color} strokeWidth="1.5" /></svg>
      </div>
      <div style={{ position: "absolute", top: 0, right: 0 }}>
        <svg width={C + 2} height={C + 2}><polyline points={`${C + 2},${C + 2} ${C + 2},0 0,0`} fill="none" stroke={color} strokeWidth="1.5" /></svg>
      </div>
      {/* Bottom corners */}
      <div style={{ position: "absolute", bottom: 0, left: 0 }}>
        <svg width={C + 2} height={C + 2}><polyline points={`0,0 0,${C + 2} ${C + 2},${C + 2}`} fill="none" stroke={color} strokeWidth="1.5" /></svg>
      </div>
      <div style={{ position: "absolute", bottom: 0, right: 0 }}>
        <svg width={C + 2} height={C + 2}><polyline points={`${C + 2},0 ${C + 2},${C + 2} 0,${C + 2}`} fill="none" stroke={color} strokeWidth="1.5" /></svg>
      </div>
      {/* Border lines (excluding corners) */}
      <div style={{ position: "absolute", inset: 0, border: `1px solid ${color}22`, pointerEvents: "none" }} />
      {/* Label */}
      {label && (
        <div style={{ position: "absolute", top: -9, left: 10, background: "#000", padding: "0 4px", fontSize: 9, color, letterSpacing: 2, fontFamily: "'Orbitron',sans-serif", textTransform: "uppercase" }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function BlinkDot({ color }: { color: string }) {
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
      background: color, boxShadow: `0 0 6px ${color}`,
      animation: "blink 1.2s step-end infinite",
    }} />
  );
}

export function SystemMap() {
  const [selected, setSelected] = useState<string>("hoth");
  const [tab, setTab] = useState<"bodies" | "fleets">("bodies");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = `${String(Math.floor(tick / 60)).padStart(2, "0")}:${String(tick % 60).padStart(2, "0")}`;

  const selectedBody = BODIES.find(b => b.id === selected);
  const selectedFleet = FLEETS.find(f => f.id === selected);

  const AMBER = "#ff9900";
  const CYAN  = "#00d4ff";
  const RED   = "#ff2222";
  const GREEN = "#00ff66";

  const factionCol: Record<string, string> = {
    "Rebel Alliance": GREEN,
    "Empire": RED,
    "Independent": CYAN,
  };

  // Grid lines for the map
  const gridLines: JSX.Element[] = [];
  const MAP_W = 900, MAP_H = 600;
  const STEP = 50;
  for (let x = 0; x <= MAP_W; x += STEP) {
    gridLines.push(<line key={`gx${x}`} x1={x} y1={0} x2={x} y2={MAP_H} stroke={CYAN} strokeWidth="0.3" opacity="0.18" />);
  }
  for (let y = 0; y <= MAP_H; y += STEP) {
    gridLines.push(<line key={`gy${y}`} x1={0} y1={y} x2={MAP_W} y2={y} stroke={CYAN} strokeWidth="0.3" opacity="0.18" />);
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#000", color: "#ccc", fontFamily: "'Rajdhani','Orbitron',monospace", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;600;700;900&display=swap');
        @keyframes blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .scanlines::after {
          content:'';position:absolute;inset:0;
          background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px);
          pointer-events:none;
        }
        .scanlines { position:relative; }
        .hud-row { display:flex; gap:1px; }
        .seg { flex:1; height:3px; background:#333; }
        .seg.on { background:currentColor; box-shadow:0 0 4px currentColor; }
      `}</style>

      {/* ═══ LEFT PANEL ═══ */}
      <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${AMBER}33`, background: "#050500" }}>
        {/* System Header */}
        <div className="scanlines" style={{ padding: "10px 12px", borderBottom: `1px solid ${AMBER}33`, background: "#0a0700" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <button style={{ fontSize: 9, color: AMBER + "88", letterSpacing: 2, background: "none", border: "none", cursor: "pointer", fontFamily: "'Orbitron',monospace", textTransform: "uppercase" }}>
              ← GALAXY MAP
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <BlinkDot color={RED} />
            <span style={{ fontSize: 9, color: RED, letterSpacing: 3, fontFamily: "'Orbitron',monospace", textTransform: "uppercase" }}>WARZONE ACTIVE</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: AMBER, letterSpacing: 3, fontFamily: "'Orbitron',monospace", textTransform: "uppercase", textShadow: `0 0 12px ${AMBER}66` }}>
            HOTH SYS.
          </div>
          <div style={{ fontSize: 8, color: AMBER + "55", letterSpacing: 2, marginTop: 2, fontFamily: "'Orbitron',monospace" }}>
            ANOAT SECTOR · OUTER RIM
          </div>
          {/* Segment bar */}
          <div style={{ display: "flex", gap: 2, marginTop: 8 }}>
            {Array.from({length: 20}).map((_, i) => (
              <div key={i} className="seg on" style={{ color: AMBER, flex: 1, height: 2 }} />
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${AMBER}33` }}>
          {(["bodies","fleets"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "7px 0", fontSize: 8, letterSpacing: 2,
              fontFamily: "'Orbitron',monospace", textTransform: "uppercase",
              background: tab === t ? `${AMBER}11` : "transparent",
              color: tab === t ? AMBER : AMBER + "44",
              border: "none", borderBottom: tab === t ? `2px solid ${AMBER}` : "2px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}>
              {t === "bodies" ? "SYS BODIES" : "FLEETS"}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {tab === "bodies" ? BODIES.map(b => {
            const isSel = selected === b.id;
            return (
              <button key={b.id} onClick={() => setSelected(b.id)} style={{
                width: "100%", textAlign: "left", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8,
                background: isSel ? `${AMBER}0e` : "transparent",
                borderLeft: isSel ? `2px solid ${AMBER}` : "2px solid transparent",
                border: "none", cursor: "pointer", transition: "all 0.1s",
              }}>
                <div style={{
                  width: b.type === "star" ? 12 : b.type === "planet" ? 10 : 7,
                  height: b.type === "star" ? 12 : b.type === "planet" ? 10 : 7,
                  borderRadius: "50%", flexShrink: 0,
                  background: b.color,
                  boxShadow: isSel ? `0 0 8px ${b.color}` : "none",
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: isSel ? AMBER : "#aaa", letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</div>
                  <div style={{ fontSize: 8, color: AMBER + "44", letterSpacing: 1, textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }}>{b.type}</div>
                </div>
                {b.faction && (
                  <div style={{ marginLeft: "auto", fontSize: 7, color: factionCol[b.faction] ?? "#aaa", border: `1px solid ${factionCol[b.faction] ?? "#aaa"}44`, padding: "1px 4px", letterSpacing: 1, flexShrink: 0, fontFamily: "'Orbitron',monospace" }}>
                    {b.faction === "Rebel Alliance" ? "RBL" : "IMP"}
                  </div>
                )}
              </button>
            );
          }) : FLEETS.map(f => {
            const isSel = selected === f.id;
            const fc = f.faction === "Rebel Alliance" ? GREEN : RED;
            return (
              <button key={f.id} onClick={() => setSelected(f.id)} style={{
                width: "100%", textAlign: "left", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8,
                background: isSel ? `${fc}0e` : "transparent",
                borderLeft: isSel ? `2px solid ${fc}` : "2px solid transparent",
                border: "none", cursor: "pointer", transition: "all 0.1s",
              }}>
                {f.faction === "Rebel Alliance"
                  ? <svg width="10" height="10"><polygon points="5,0 10,10 0,10" fill={fc} opacity={isSel ? 1 : 0.5} /></svg>
                  : <svg width="10" height="10"><polygon points="5,10 10,0 0,0" fill={fc} opacity={isSel ? 1 : 0.5} /></svg>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: isSel ? fc : "#999", letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                  <div style={{ fontSize: 7, color: fc + "88", letterSpacing: 1, fontFamily: "'Orbitron',monospace" }}>{f.side === "defense" ? "⬟ DEFENSE" : "▼ ASSAULT"}</div>
                </div>
                {f.isCapital && <div style={{ marginLeft: "auto", fontSize: 7, color: "#ffdd00", flexShrink: 0, fontFamily: "'Orbitron',monospace", letterSpacing: 1 }}>CAP</div>}
              </button>
            );
          })}
        </div>

        {/* Detail */}
        {(selectedBody || selectedFleet) && (
          <div style={{ borderTop: `1px solid ${AMBER}33`, padding: "10px 12px", background: "#080600" }}>
            {selectedBody && <>
              <div style={{ fontSize: 7, color: AMBER + "55", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Orbitron',monospace", marginBottom: 2 }}>{selectedBody.type} // RECORD</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: AMBER, letterSpacing: 2, textTransform: "uppercase", textShadow: `0 0 8px ${AMBER}44` }}>{selectedBody.name}</div>
              {selectedBody.faction && <div style={{ fontSize: 8, color: factionCol[selectedBody.faction], letterSpacing: 1, marginTop: 2, fontFamily: "'Orbitron',monospace" }}>{selectedBody.faction}</div>}
              {selectedBody.description && <p style={{ fontSize: 9, color: "#666", marginTop: 6, lineHeight: 1.5 }}>{selectedBody.description}</p>}
              {selectedBody.type === "planet" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 8 }}>
                  {[["STATUS","CONTESTED"],["THREAT","HIGH"],["POP.","NONE"],["CLASS","ICE-IV"]].map(([k, v]) => (
                    <div key={k} style={{ background: `${AMBER}08`, border: `1px solid ${AMBER}22`, padding: "4px 6px" }}>
                      <div style={{ fontSize: 7, color: AMBER + "55", letterSpacing: 1, fontFamily: "'Orbitron',monospace" }}>{k}</div>
                      <div style={{ fontSize: 9, color: AMBER, fontWeight: 700, letterSpacing: 1, fontFamily: "'Orbitron',monospace" }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </>}
            {selectedFleet && !selectedBody && <>
              {(() => {
                const fc = selectedFleet.faction === "Rebel Alliance" ? GREEN : RED;
                return <>
                  <div style={{ fontSize: 7, color: fc + "66", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Orbitron',monospace", marginBottom: 2 }}>{selectedFleet.side} // UNIT</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: fc, letterSpacing: 2, textTransform: "uppercase", textShadow: `0 0 8px ${fc}44` }}>{selectedFleet.name}</div>
                  <div style={{ fontSize: 8, color: fc + "88", letterSpacing: 1, marginTop: 2, fontFamily: "'Orbitron',monospace" }}>{selectedFleet.faction}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 8 }}>
                    {[["STRENGTH","FULL"],["STATUS","ACTIVE"],["ROLE",selectedFleet.side === "defense" ? "HOLD" : "STRIKE"],["COMMS","SECURE"]].map(([k, v]) => (
                      <div key={k} style={{ background: `${fc}08`, border: `1px solid ${fc}22`, padding: "4px 6px" }}>
                        <div style={{ fontSize: 7, color: fc + "55", letterSpacing: 1, fontFamily: "'Orbitron',monospace" }}>{k}</div>
                        <div style={{ fontSize: 9, color: fc, fontWeight: 700, letterSpacing: 1, fontFamily: "'Orbitron',monospace" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </>;
              })()}
            </>}
          </div>
        )}
      </div>

      {/* ═══ MAP AREA ═══ */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#000" }}>
        {/* Scanline overlay */}
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)", pointerEvents: "none", zIndex: 10 }} />

        {/* Corner HUD frames */}
        {[["top:0,left:0","tl"],["top:0,right:0","tr"],["bottom:0,left:0","bl"],["bottom:0,right:0","br"]].map(([pos, corner]) => {
          const style: Record<string, string | number> = { position: "absolute", zIndex: 20, width: 40, height: 40 };
          const [t, l] = pos.split(",");
          const [tk, tv] = t.split(":");
          const [lk, lv] = l.split(":");
          style[tk] = Number(tv);
          style[lk] = Number(lv);
          const flipX = lk === "right";
          const flipY = tk === "bottom";
          const tx = flipX ? "scaleX(-1)" : "";
          const ty = flipY ? "scaleY(-1)" : "";
          return (
            <svg key={corner} style={style} width={40} height={40}>
              <polyline
                points={`0,40 0,0 40,0`}
                fill="none" stroke={AMBER} strokeWidth="2"
                transform={`${flipX ? "scale(-1,1) translate(-40,0)" : ""} ${flipY ? "scale(1,-1) translate(0,-40)" : ""}`}
              />
            </svg>
          );
        })}

        {/* Top header bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 36, display: "flex", alignItems: "center", padding: "0 48px", zIndex: 15, borderBottom: `1px solid ${AMBER}22`, background: "linear-gradient(to bottom, #0a0800, transparent)" }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: AMBER, letterSpacing: 4, fontFamily: "'Orbitron',monospace", textShadow: `0 0 20px ${AMBER}88`, textTransform: "uppercase" }}>
            SYSTEM MAP
          </span>
          <span style={{ fontSize: 9, color: AMBER + "55", letterSpacing: 2, fontFamily: "'Orbitron',monospace", marginLeft: 16, marginTop: 2 }}>
            · WARZONE THEATER ·
          </span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BlinkDot color={GREEN} />
              <span style={{ fontSize: 8, color: GREEN + "aa", letterSpacing: 2, fontFamily: "'Orbitron',monospace" }}>02 DEFENSE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BlinkDot color={RED} />
              <span style={{ fontSize: 8, color: RED + "aa", letterSpacing: 2, fontFamily: "'Orbitron',monospace" }}>02 ASSAULT</span>
            </div>
            <div style={{ fontSize: 11, color: AMBER, fontFamily: "'Orbitron',monospace", letterSpacing: 2 }}>
              T+{timeStr}
            </div>
          </div>
        </div>

        {/* SVG map */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="starG" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffee88" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffcc22" stopOpacity="0" />
            </radialGradient>
            <filter id="glow2">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow4">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Grid */}
          {gridLines}

          {/* Range rings from star */}
          <ellipse cx="480" cy="300" rx="230" ry="65" fill="none" stroke={CYAN} strokeWidth="0.5" strokeDasharray="6,8" opacity="0.2" />
          <ellipse cx="480" cy="300" rx="320" ry="90" fill="none" stroke={CYAN} strokeWidth="0.5" strokeDasharray="4,10" opacity="0.12" />

          {/* Moon orbit */}
          <ellipse cx="255" cy="300" rx="52" ry="18" fill="none" stroke={CYAN} strokeWidth="0.5" strokeDasharray="3,5" opacity="0.15" />

          {/* Star radial glow */}
          <ellipse cx="480" cy="300" rx="80" ry="80" fill="url(#starG)" />

          {/* Coordinate grid axis labels */}
          {[0,1,2,3,4,5,6,7,8,9].map(i => (
            <text key={`lx${i}`} x={i * 100 + 4} y={14} fill={CYAN} fontSize={7} opacity={0.25} fontFamily="Orbitron,monospace">{String(i).padStart(2,"0")}</text>
          ))}
          {[0,1,2,3,4,5].map(i => (
            <text key={`ly${i}`} x={4} y={i * 100 + 12} fill={CYAN} fontSize={7} opacity={0.25} fontFamily="Orbitron,monospace">{String(i).padStart(2,"0")}</text>
          ))}

          {/* Bodies */}
          {BODIES.map(b => {
            const isSel = selected === b.id;
            return (
              <g key={b.id} onClick={() => setSelected(b.id)} style={{ cursor: "pointer" }}>
                {/* Targeting reticle when selected */}
                {isSel && <>
                  <circle cx={b.x} cy={b.y} r={b.radius + 18} fill="none" stroke={AMBER} strokeWidth="0.8" strokeDasharray="4,3" opacity={0.7}>
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${b.x} ${b.y}`} to={`360 ${b.x} ${b.y}`} dur="6s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={b.x} cy={b.y} r={b.radius + 24} fill="none" stroke={AMBER} strokeWidth="0.4" opacity={0.3} />
                  {/* Tick marks */}
                  {[0,90,180,270].map(deg => {
                    const rad = (deg * Math.PI) / 180;
                    const r1 = b.radius + 18, r2 = b.radius + 24;
                    return <line key={deg} x1={b.x + r1 * Math.cos(rad)} y1={b.y + r1 * Math.sin(rad)} x2={b.x + r2 * Math.cos(rad)} y2={b.y + r2 * Math.sin(rad)} stroke={AMBER} strokeWidth="1" opacity={0.8} />;
                  })}
                </>}

                {/* Glow */}
                {b.type === "star" && <ellipse cx={b.x} cy={b.y} rx={80} ry={80} fill="url(#starG)" />}

                {/* Body */}
                <circle cx={b.x} cy={b.y} r={b.radius}
                  fill={b.type === "star" ? "#ffdd66" : b.color}
                  stroke={isSel ? AMBER : (b.faction ? factionCol[b.faction] + "66" : "transparent")}
                  strokeWidth={isSel ? 1.5 : 1}
                  filter={b.type === "star" ? "url(#glow4)" : isSel ? "url(#glow2)" : undefined}
                />

                {/* Station cross */}
                {b.type === "station" && <>
                  <line x1={b.x - 18} y1={b.y} x2={b.x - b.radius} y2={b.y} stroke={RED} strokeWidth="1.5" />
                  <line x1={b.x + b.radius} y1={b.y} x2={b.x + 18} y2={b.y} stroke={RED} strokeWidth="1.5" />
                </>}

                {/* Label */}
                {b.type !== "asteroid" && (
                  <text x={b.x} y={b.y + b.radius + 14} textAnchor="middle"
                    fill={isSel ? AMBER : CYAN + "99"}
                    fontSize={b.type === "star" ? 10 : b.type === "planet" ? 9 : 7}
                    fontFamily="Orbitron,monospace" fontWeight={isSel ? "700" : "400"}
                    letterSpacing="1.5" style={{ textTransform: "uppercase" }}>
                    {b.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Fleets */}
          {FLEETS.map(f => {
            const isSel = selected === f.id;
            const fc = f.faction === "Rebel Alliance" ? GREEN : RED;
            const isRebel = f.faction === "Rebel Alliance";
            const pts = isRebel
              ? `${f.x},${f.y - 11} ${f.x - 8},${f.y + 7} ${f.x},${f.y + 2} ${f.x + 8},${f.y + 7}`
              : `${f.x},${f.y + 11} ${f.x - 8},${f.y - 7} ${f.x},${f.y - 2} ${f.x + 8},${f.y - 7}`;
            return (
              <g key={f.id} onClick={() => { setSelected(f.id); setTab("fleets"); }} style={{ cursor: "pointer" }}>
                {isSel && (
                  <circle cx={f.x} cy={f.y} r={22} fill="none" stroke={fc} strokeWidth="1" strokeDasharray="3,2" opacity={0.6}>
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${f.x} ${f.y}`} to={`360 ${f.x} ${f.y}`} dur="2.5s" repeatCount="indefinite" />
                  </circle>
                )}
                <polygon points={pts} fill={fc} opacity={isSel ? 0.95 : 0.6} filter={isSel ? "url(#glow2)" : undefined} stroke={isSel ? "#fff" : "transparent"} strokeWidth="0.8" />
                {f.isCapital && <text x={f.x} y={f.y + 1} textAnchor="middle" fill="#fff" fontSize={7} fontFamily="Arial" dominantBaseline="middle">★</text>}
                <text x={f.x} y={f.y + (isRebel ? 24 : -16)} textAnchor="middle"
                  fill={isSel ? fc : fc + "88"}
                  fontSize={7.5} fontFamily="Orbitron,monospace" fontWeight="600" letterSpacing="1"
                  style={{ textTransform: "uppercase" }}>
                  {f.name}
                </text>
              </g>
            );
          })}

          {/* Bottom HUD bar */}
          <line x1={0} y1={585} x2={900} y2={585} stroke={AMBER} strokeWidth="0.5" opacity="0.3" />
          <text x={20} y={596} fill={AMBER + "55"} fontSize={7} fontFamily="Orbitron,monospace" letterSpacing="1">HOTH SYSTEM · TACTICAL OVERLAY · REF: HG-4401</text>
          <text x={880} y={596} fill={AMBER + "55"} fontSize={7} fontFamily="Orbitron,monospace" textAnchor="end" letterSpacing="1">IMPERIAL SURVEY 0031-ATT</text>
        </svg>

        {/* Bottom corner zoom controls */}
        <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 4, zIndex: 20 }}>
          {["+","−"].map(l => (
            <button key={l} style={{
              width: 28, height: 28, background: "#0a0800", border: `1px solid ${AMBER}44`,
              color: AMBER, fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${AMBER}33`, background: "#050500" }}>
        <div className="scanlines" style={{ padding: "10px 12px", borderBottom: `1px solid ${AMBER}33`, background: "#0a0700" }}>
          <div style={{ fontSize: 8, color: AMBER + "55", letterSpacing: 2, fontFamily: "'Orbitron',monospace", textTransform: "uppercase", marginBottom: 4 }}>BATTLE STATUS</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: AMBER, letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }}>BATTLE OF HOTH</div>
        </div>

        <div style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {/* Faction bars */}
          {[
            { name: "REBEL ALLIANCE", pct: 35, color: GREEN, role: "DEFENDING" },
            { name: "EMPIRE", pct: 78, color: RED, role: "ASSAULTING" },
          ].map(f => (
            <div key={f.name}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 7, color: f.color, letterSpacing: 1, fontFamily: "'Orbitron',monospace" }}>{f.name}</span>
                <span style={{ fontSize: 7, color: f.color + "66", letterSpacing: 1, fontFamily: "'Orbitron',monospace" }}>{f.role}</span>
              </div>
              <div style={{ height: 4, background: f.color + "22", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${f.pct}%`, background: f.color, boxShadow: `0 0 8px ${f.color}88` }} />
              </div>
              <div style={{ fontSize: 8, textAlign: "right", marginTop: 2, color: f.color + "66", fontFamily: "'Orbitron',monospace" }}>{f.pct}%</div>
            </div>
          ))}

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${AMBER}22` }} />

          {/* Objectives */}
          <div>
            <div style={{ fontSize: 7, color: AMBER + "55", letterSpacing: 2, fontFamily: "'Orbitron',monospace", marginBottom: 8 }}>OBJECTIVES</div>
            {[
              { label: "Echo Base",       status: "REBEL",     color: GREEN },
              { label: "Power Generator", status: "CONTESTED", color: AMBER },
              { label: "Ion Cannon",      status: "REBEL",     color: GREEN },
              { label: "Evac Route",      status: "OPEN",      color: CYAN },
            ].map(obj => (
              <div key={obj.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: obj.color, boxShadow: `0 0 5px ${obj.color}`, flexShrink: 0 }} />
                <span style={{ fontSize: 8, color: "#888", flex: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>{obj.label}</span>
                <span style={{ fontSize: 7, color: obj.color + "99", letterSpacing: 1, fontFamily: "'Orbitron',monospace", flexShrink: 0 }}>{obj.status}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${AMBER}22` }} />

          {/* Admin controls */}
          <div>
            <div style={{ fontSize: 7, color: AMBER + "55", letterSpacing: 2, fontFamily: "'Orbitron',monospace", marginBottom: 8 }}>ADMIN CONTROLS</div>
            {[
              { label: "+ ADD BODY",    color: AMBER },
              { label: "+ ADD FLEET",   color: CYAN },
              { label: "CLEAR WARZONE", color: RED },
            ].map(btn => (
              <button key={btn.label} style={{
                width: "100%", textAlign: "left", padding: "6px 8px", marginBottom: 4,
                fontSize: 8, letterSpacing: 1.5, fontFamily: "'Orbitron',monospace",
                background: `${btn.color}08`, border: `1px solid ${btn.color}33`,
                color: btn.color + "aa", cursor: "pointer",
                transition: "all 0.15s", textTransform: "uppercase",
              }}>
                {btn.label}
              </button>
            ))}
          </div>

          {/* Readout */}
          <div style={{ marginTop: "auto", borderTop: `1px solid ${AMBER}22`, paddingTop: 10 }}>
            <div style={{ fontSize: 7, color: AMBER + "33", letterSpacing: 1, fontFamily: "'Orbitron',monospace", lineHeight: 1.8 }}>
              <div>SYS REF: HG-4401</div>
              <div>SECTOR: ANOAT</div>
              <div>COORD: 7G-NAF</div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span>STATUS:</span>
                <BlinkDot color={RED} />
                <span style={{ color: RED + "88" }}>ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
