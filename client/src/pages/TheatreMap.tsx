import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { MapProvider } from "@/lib/MapProvider";
import { useMap } from "@/lib/data";
import type { Planet, FactionInfo, Fleet } from "@/lib/data";

/* ─── Palette ─────────────────────────────────────────────────────────────── */
const BLUE  = "#00aaff";
const LBLUE = "#33ccff";
const RED   = "#cc0000";
const RRED  = "#ff2222";
const BG    = "#000a14";

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function factionColor(faction: string, factions: FactionInfo[]): string {
  const f = factions.find(f => f.name === faction);
  if (!f) return "#446677";
  const [h, s, l] = f.color.split(" ").map(Number);
  return `hsl(${h},${s}%,${l}%)`;
}

function factionAbbr(name: string) {
  if (name === "Empire") return "IMP";
  if (name === "Galactic Republic") return "REP";
  if (name === "Rebel Alliance") return "RBL";
  if (name === "Hutt Cartel") return "HUT";
  if (name === "Chiss Ascendancy") return "CHI";
  if (name === "Mandalorian Clans") return "MAN";
  return name.slice(0, 3).toUpperCase();
}

function Dot({ color }: { color: string }) {
  return (
    <span style={{
      display: "inline-block", width: 6, height: 6, borderRadius: "50%",
      background: color, boxShadow: `0 0 6px ${color}`,
      animation: "blink 1.2s step-end infinite",
    }} />
  );
}

function HudCorners({ color = BLUE }: { color?: string }) {
  return (
    <>
      {(["tl","tr","bl","br"] as const).map(c => {
        const vy = c[0] === "t", vx = c[1] === "l";
        return (
          <svg key={c} style={{
            position:"absolute",
            top: vy ? 0 : undefined, bottom: vy ? undefined : 0,
            left: vx ? 0 : undefined, right: vx ? undefined : 0,
            zIndex: 20, pointerEvents: "none",
          }} width={40} height={40}>
            <polyline points="0,40 0,0 40,0" fill="none" stroke={color} strokeWidth="2"
              transform={`${!vx ? "scale(-1,1) translate(-40,0)" : ""} ${!vy ? "scale(1,-1) translate(0,-40)" : ""}`.trim()} />
          </svg>
        );
      })}
    </>
  );
}

function Panel({ children, label, color = BLUE, style }: {
  children: React.ReactNode; label?: string; color?: string; style?: React.CSSProperties;
}) {
  return (
    <div style={{ position:"relative", border:`1px solid ${color}22`, ...style }}>
      {/* corner brackets */}
      {(["tl","tr","bl","br"] as const).map(c => {
        const vy = c[0]==="t", vx = c[1]==="l";
        const C = 12, T = 1.5;
        const ox = vx ? 0 : C, oy = vy ? 0 : C;
        const sx = vx ? 1 : -1, sy = vy ? 1 : -1;
        return (
          <div key={c} style={{ position:"absolute", ...(vy?{top:0}:{bottom:0}), ...(vx?{left:0}:{right:0}) }}>
            <svg width={C} height={C}>
              <polyline points={`${ox},${C-oy} ${ox},${oy} ${C-ox},${oy}`}
                fill="none" stroke={color} strokeWidth={T}
                transform={`scale(${sx},${sy}) translate(${sx<0?-C:0},${sy<0?-C:0})`} />
            </svg>
          </div>
        );
      })}
      {label && (
        <div style={{
          position:"absolute", top:-8, left:8, background:BG,
          padding:"0 5px", fontSize:7, color, letterSpacing:2,
          fontFamily:"'Orbitron',monospace", textTransform:"uppercase",
        }}>{label}</div>
      )}
      {children}
    </div>
  );
}

/* ─── Login modal ─────────────────────────────────────────────────────────── */
function AdminLoginModal({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const { currentUser } = useMap();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error || "Invalid credentials"); return; }
      onLogin();
      onClose();
    } catch { setErr("Connection error"); }
    finally { setBusy(false); }
  }

  if (currentUser) return null;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      background:"rgba(0,6,14,0.85)", display:"flex", alignItems:"center", justifyContent:"center",
    }} onClick={onClose}>
      <div style={{
        border:`1px solid ${BLUE}44`, background:"#000d1a", padding:24, minWidth:280, position:"relative",
      }} onClick={e => e.stopPropagation()}>
        <HudCorners />
        <div style={{ fontSize:8, color:BLUE, letterSpacing:3, fontFamily:"'Orbitron',monospace", marginBottom:12 }}>
          ADMIN ACCESS // AUTHENTICATION
        </div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <input
            type="text" placeholder="USERNAME" value={user} onChange={e => setUser(e.target.value)}
            style={{ background:"#000a14", border:`1px solid ${BLUE}44`, color:BLUE, padding:"6px 8px", fontSize:10, fontFamily:"'Orbitron',monospace", letterSpacing:1, outline:"none" }}
          />
          <input
            type="password" placeholder="PASSWORD" value={pass} onChange={e => setPass(e.target.value)}
            style={{ background:"#000a14", border:`1px solid ${BLUE}44`, color:BLUE, padding:"6px 8px", fontSize:10, fontFamily:"'Orbitron',monospace", letterSpacing:1, outline:"none" }}
          />
          {err && <div style={{ fontSize:8, color:RRED, fontFamily:"'Orbitron',monospace" }}>{err}</div>}
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <button type="submit" disabled={busy} style={{
              flex:1, padding:"6px 0", background:`${BLUE}22`, border:`1px solid ${BLUE}55`,
              color:BLUE, fontSize:8, fontFamily:"'Orbitron',monospace", letterSpacing:2,
              cursor:"pointer", textTransform:"uppercase",
            }}>{busy ? "..." : "AUTHENTICATE"}</button>
            <button type="button" onClick={onClose} style={{
              padding:"6px 12px", background:"none", border:`1px solid ${BLUE}22`,
              color:BLUE+"55", fontSize:8, fontFamily:"'Orbitron',monospace", cursor:"pointer",
            }}>✕</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Inner page (needs MapProvider context) ──────────────────────────────── */
function TheatreMapInner({ planetId }: { planetId: string }) {
  const [, navigate] = useLocation();
  const { planets, fleets, factionList, currentUser, updatePlanet, sectors } = useMap();

  const planet = planets.find(p => p.id === planetId);
  const isAdmin = !!(currentUser?.isAdmin || currentUser?.canEditPlanets);

  /* warzone editable state — seeded from planet fields */
  const [battleName,    setBattleName]    = useState("");
  const [battlesWon,    setBattlesWon]    = useState(0);
  const [battlesLost,   setBattlesLost]   = useState(0);
  const [objectives,    setObjectives]    = useState<{ id:string; label:string; faction:string }[]>([]);
  const [editBattles,   setEditBattles]   = useState(false);
  const [editingObj,    setEditingObj]    = useState<string|null>(null);
  const [showLogin,     setShowLogin]     = useState(false);
  const [tab,           setTab]           = useState<"bodies"|"fleets">("bodies");
  const [selectedId,    setSelectedId]    = useState<string|null>(null);
  const seedRef = useRef(false);

  useEffect(() => {
    if (!planet || seedRef.current) return;
    seedRef.current = true;
    setBattleName(planet.warzoneBattleName || `Battle of ${planet.name}`);
    setBattlesWon(planet.warzoneBattlesWon ?? 0);
    setBattlesLost(planet.warzoneBattlesLost ?? 0);
    setObjectives(planet.warzoneObjectives?.length
      ? planet.warzoneObjectives
      : [
          { id:"o1", label:`Control ${planet.name}`, faction: planet.faction },
          { id:"o2", label:"Destroy Enemy Forces",   faction: "Independent" },
        ]
    );
  }, [planet]);

  /* persist changes back to DB */
  function saveWarzone(updates: Partial<{ battleName:string; battlesWon:number; battlesLost:number; objectives:typeof objectives }>) {
    if (!planet) return;
    updatePlanet({
      ...planet,
      warzoneBattleName:  updates.battleName  ?? battleName,
      warzoneBattlesWon:  updates.battlesWon  ?? battlesWon,
      warzoneBattlesLost: updates.battlesLost ?? battlesLost,
      warzoneObjectives:  updates.objectives  ?? objectives,
    });
  }

  /* sector planets */
  const sectorPlanets = planet?.sectorId
    ? planets.filter(p => p.sectorId === planet.sectorId && p.id !== planet.id)
    : [];

  /* nearby fleets (within 600px of the warzone planet) */
  const nearbyFleets = planet
    ? fleets.filter(f => Math.hypot(f.x - planet.x, f.y - planet.y) < 600)
    : fleets.slice(0, 6);

  /* SVG system map data */
  const svgW = 900, svgH = 580;
  const cx = svgW * 0.52, cy = svgH * 0.5;
  const orbitR = 160;

  const systemBodies = [
    { id: "star",  name: "System Star", type: "star"   as const, svgX: cx,              svgY: cy,              r: 40, color: "#ffdd66" },
    { id: planet?.id ?? "planet", name: planet?.name ?? "—", type: "planet" as const, svgX: cx - orbitR,     svgY: cy,              r: 22, color: "#9dd4f5", faction: planet?.faction },
    ...sectorPlanets.slice(0, 4).map((p, i) => ({
      id: p.id, name: p.name, type: "sector" as const,
      svgX: cx + Math.cos((i * Math.PI * 2) / 4 + 0.8) * (orbitR + 90 + i * 40),
      svgY: cy + Math.sin((i * Math.PI * 2) / 4 + 0.8) * (orbitR + 90 + i * 40) * 0.35,
      r: 10, color: "#668899", faction: p.faction,
    })),
  ];

  /* fleet SVG positions */
  const fleetPositions = nearbyFleets.slice(0, 6).map((f, i) => {
    const angle = (i * Math.PI * 2) / Math.max(nearbyFleets.length, 1) - Math.PI / 2;
    const dist = 55 + (i % 2) * 30;
    return {
      ...f,
      svgX: (cx - orbitR) + Math.cos(angle) * dist,
      svgY: cy + Math.sin(angle) * dist * 0.6,
    };
  });

  /* grid lines */
  const gridLines: React.ReactElement[] = [];
  for (let x = 0; x <= svgW; x += 50) gridLines.push(<line key={`gx${x}`} x1={x} y1={0} x2={x} y2={svgH} stroke={BLUE} strokeWidth="0.25" opacity="0.15"/>);
  for (let y = 0; y <= svgH; y += 50) gridLines.push(<line key={`gy${y}`} x1={0} y1={y} x2={svgW} y2={y} stroke={BLUE} strokeWidth="0.25" opacity="0.15"/>);

  const selectedBody  = systemBodies.find(b => b.id === selectedId);
  const selectedFleet = fleetPositions.find(f => f.id === selectedId);

  if (!planet) {
    return (
      <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center", background:BG, color:BLUE, fontFamily:"'Orbitron',monospace", fontSize:12 }}>
        PLANET NOT FOUND
      </div>
    );
  }

  const sector = sectors.find(s => s.id === planet.sectorId);

  return (
    <div style={{ display:"flex", height:"100vh", background:BG, color:"#cce8ff", fontFamily:"'Rajdhani','Orbitron',monospace", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;600;700;900&display=swap');
        @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes theatrespin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        *::-webkit-scrollbar{width:3px} *::-webkit-scrollbar-track{background:#001122} *::-webkit-scrollbar-thumb{background:${BLUE}33}
        input[type=text],input[type=number],textarea{background:#000d1a;color:${BLUE};border:1px solid ${BLUE}44;padding:3px 6px;font-family:'Orbitron',monospace;font-size:9px;outline:none;letter-spacing:1px;width:100%;box-sizing:border-box;}
        select{background:#000d1a;color:${BLUE};border:1px solid ${BLUE}44;padding:2px 4px;font-family:'Orbitron',monospace;font-size:9px;outline:none;}
        select option{background:#000d1a;}
      `}</style>

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} onLogin={() => setShowLogin(false)} />}

      {/* ══ LEFT PANEL ══ */}
      <div style={{ width:248, flexShrink:0, display:"flex", flexDirection:"column", borderRight:`1px solid ${BLUE}22`, background:"#00060f" }}>
        {/* Header */}
        <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${BLUE}22`, background:"#000d1a" }}>
          <button
            onClick={() => navigate("/")}
            style={{ fontSize:8, color:BLUE+"88", letterSpacing:2, background:"none", border:"none", cursor:"pointer", fontFamily:"'Orbitron',monospace", padding:0, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}
          >
            ← GALAXY MAP
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <Dot color={RRED} />
            <span style={{ fontSize:8, color:RRED, letterSpacing:3, fontFamily:"'Orbitron',monospace" }}>WARZONE ACTIVE</span>
          </div>
          <div style={{ fontSize:18, fontWeight:900, color:LBLUE, letterSpacing:3, fontFamily:"'Orbitron',monospace", textShadow:`0 0 16px ${BLUE}88` }}>
            {planet.name.toUpperCase()}
          </div>
          <div style={{ fontSize:8, color:BLUE+"44", letterSpacing:2, marginTop:1, fontFamily:"'Orbitron',monospace" }}>
            {sector?.name || "Unknown Sector"} · {planet.oversector || planet.environment?.toUpperCase() || "UNKNOWN"}
          </div>
          <div style={{ display:"flex", gap:2, marginTop:8 }}>
            {Array.from({length:20}).map((_,i) => <div key={i} style={{ flex:1, height:2, background:BLUE, boxShadow:`0 0 3px ${BLUE}` }} />)}
          </div>
        </div>

        {/* Admin strip */}
        <div style={{ padding:"5px 12px", borderBottom:`1px solid ${BLUE}11`, display:"flex", alignItems:"center", gap:8, background:"#00040a" }}>
          <span style={{ fontSize:7, color:BLUE+"44", letterSpacing:2, fontFamily:"'Orbitron',monospace", flex:1 }}>ADMIN ACCESS</span>
          {isAdmin ? (
            <span style={{ fontSize:7, color:BLUE, letterSpacing:2, fontFamily:"'Orbitron',monospace", border:`1px solid ${BLUE}33`, padding:"2px 6px" }}>
              ■ {currentUser!.username.toUpperCase()}
            </span>
          ) : (
            <button onClick={() => setShowLogin(true)} style={{
              fontSize:7, letterSpacing:1.5, fontFamily:"'Orbitron',monospace", padding:"2px 8px",
              background:`${BLUE}11`, border:`1px solid ${BLUE}22`, color:BLUE+"55", cursor:"pointer",
            }}>LOGIN</button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${BLUE}22` }}>
          {(["bodies","fleets"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:"6px 0", fontSize:8, letterSpacing:2, fontFamily:"'Orbitron',monospace", textTransform:"uppercase",
              background: tab===t ? `${BLUE}11` : "transparent",
              color: tab===t ? LBLUE : BLUE+"44",
              border:"none", borderBottom: tab===t ? `2px solid ${BLUE}` : "2px solid transparent",
              cursor:"pointer",
            }}>
              {t === "bodies" ? "SYS BODIES" : `FLEETS (${nearbyFleets.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {tab === "bodies" ? systemBodies.map(b => {
            const isSel = selectedId === b.id;
            const fc = b.faction ? factionColor(b.faction, factionList) : BLUE;
            return (
              <button key={b.id} onClick={() => setSelectedId(isSel ? null : b.id)} style={{
                width:"100%", textAlign:"left", padding:"7px 12px", display:"flex", alignItems:"center", gap:8,
                background: isSel ? `${BLUE}0d` : "transparent",
                borderLeft: isSel ? `2px solid ${BLUE}` : "2px solid transparent",
                border:"none", cursor:"pointer",
              }}>
                <div style={{ width: b.type==="star"?14:b.type==="planet"?10:7, height: b.type==="star"?14:b.type==="planet"?10:7, borderRadius:"50%", flexShrink:0, background:b.color, boxShadow:isSel?`0 0 8px ${b.color}`:"none" }} />
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:isSel?LBLUE:"#7aaccc", letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.name}</div>
                  <div style={{ fontSize:8, color:BLUE+"44", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{b.type}</div>
                </div>
                {b.faction && <div style={{ marginLeft:"auto", fontSize:7, color:fc, border:`1px solid ${fc}44`, padding:"1px 3px", flexShrink:0, fontFamily:"'Orbitron',monospace" }}>
                  {factionAbbr(b.faction)}
                </div>}
              </button>
            );
          }) : fleetPositions.map(f => {
            const isSel = selectedId === f.id;
            const fc = factionColor(f.faction, factionList);
            const isDefense = Math.hypot(f.x - planet.x, f.y - planet.y) < 200;
            return (
              <button key={f.id} onClick={() => setSelectedId(isSel ? null : f.id)} style={{
                width:"100%", textAlign:"left", padding:"7px 12px", display:"flex", alignItems:"center", gap:8,
                background: isSel ? `${fc}11` : "transparent",
                borderLeft: isSel ? `2px solid ${fc}` : "2px solid transparent",
                border:"none", cursor:"pointer",
              }}>
                <svg width={10} height={10}><polygon points={isDefense?"5,0 10,10 0,10":"5,10 10,0 0,0"} fill={fc} opacity={isSel?1:0.6} /></svg>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:isSel?fc:"#7aaccc", letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.name}</div>
                  <div style={{ fontSize:8, color:fc+"88", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{isDefense?"⬟ DEFENSE":"▼ STRIKE"}</div>
                </div>
                {f.isCapitalShip && <span style={{ marginLeft:"auto", fontSize:7, color:"#ffdd00", flexShrink:0, fontFamily:"'Orbitron',monospace" }}>★</span>}
              </button>
            );
          })}
          {tab === "fleets" && nearbyFleets.length === 0 && (
            <div style={{ padding:"20px 12px", fontSize:8, color:BLUE+"33", fontFamily:"'Orbitron',monospace", textAlign:"center", letterSpacing:2 }}>
              NO FLEETS IN RANGE
            </div>
          )}
        </div>

        {/* Detail pane */}
        {(selectedBody || selectedFleet) && (
          <div style={{ borderTop:`1px solid ${BLUE}22`, padding:"10px 12px", background:"#000d1a", flexShrink:0 }}>
            {selectedBody && <>
              <div style={{ fontSize:7, color:BLUE+"44", letterSpacing:2, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>{selectedBody.type} // RECORD</div>
              <div style={{ fontSize:13, fontWeight:700, color:LBLUE, letterSpacing:2, textTransform:"uppercase" }}>{selectedBody.name}</div>
              {selectedBody.faction && <div style={{ fontSize:8, marginTop:2, fontFamily:"'Orbitron',monospace", color: factionColor(selectedBody.faction, factionList) }}>{selectedBody.faction}</div>}
            </>}
            {selectedFleet && !selectedBody && (() => {
              const fc = factionColor(selectedFleet.faction, factionList);
              return <>
                <div style={{ fontSize:7, color:fc+"66", letterSpacing:2, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>FLEET // UNIT</div>
                <div style={{ fontSize:13, fontWeight:700, color:fc, letterSpacing:2, textTransform:"uppercase" }}>{selectedFleet.name}</div>
                <div style={{ fontSize:8, color:fc+"88", letterSpacing:1, marginTop:2, fontFamily:"'Orbitron',monospace" }}>{selectedFleet.faction}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginTop:8 }}>
                  {[["STATUS","ACTIVE"],["TYPE", selectedFleet.isCapitalShip?"CAPITAL":"FLEET"],["ICON", selectedFleet.icon||"DEFAULT"],["COMMS","SECURE"]].map(([k,v]) => (
                    <div key={k} style={{ background:`${fc}08`, border:`1px solid ${fc}22`, padding:"4px 6px" }}>
                      <div style={{ fontSize:7, color:fc+"44", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{k}</div>
                      <div style={{ fontSize:9, color:fc, fontWeight:700, letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </>;
            })()}
          </div>
        )}
      </div>

      {/* ══ MAP AREA ══ */}
      <div style={{ flex:1, position:"relative", overflow:"hidden", background:"#00060e" }}>
        <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,20,40,0.06) 3px,rgba(0,20,40,0.06) 4px)", pointerEvents:"none", zIndex:10 }} />
        <HudCorners />

        {/* Top bar */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:36, display:"flex", alignItems:"center", padding:"0 48px", zIndex:15, borderBottom:`1px solid ${BLUE}22`, background:`linear-gradient(to bottom,#00060e,transparent)` }}>
          <span style={{ fontSize:18, fontWeight:900, color:LBLUE, letterSpacing:4, fontFamily:"'Orbitron',monospace", textShadow:`0 0 20px ${BLUE}88` }}>SYSTEM MAP</span>
          <span style={{ fontSize:9, color:BLUE+"44", letterSpacing:2, fontFamily:"'Orbitron',monospace", marginLeft:14, marginTop:2 }}>· WARZONE THEATER ·</span>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Dot color={BLUE} />
              <span style={{ fontSize:8, color:BLUE+"aa", letterSpacing:2, fontFamily:"'Orbitron',monospace" }}>
                {nearbyFleets.filter(f => f.faction === planet.faction).length} ALLIED
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Dot color={RRED} />
              <span style={{ fontSize:8, color:RRED+"aa", letterSpacing:2, fontFamily:"'Orbitron',monospace" }}>
                {nearbyFleets.filter(f => f.faction !== planet.faction).length} HOSTILE
              </span>
            </div>
          </div>
        </div>

        {/* SVG */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="tstarG"><stop offset="0%" stopColor="#ffee88" stopOpacity="0.5"/><stop offset="100%" stopColor="#ffcc22" stopOpacity="0"/></radialGradient>
            <filter id="tg2"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="tg4"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {gridLines}

          {/* Orbit rings */}
          <ellipse cx={cx} cy={cy} rx={orbitR} ry={orbitR * 0.38} fill="none" stroke={BLUE} strokeWidth="0.5" strokeDasharray="6,8" opacity="0.2"/>
          {sectorPlanets.slice(0,4).map((_,i) => (
            <ellipse key={i} cx={cx} cy={cy} rx={orbitR+90+i*40} ry={(orbitR+90+i*40)*0.38} fill="none" stroke={BLUE} strokeWidth="0.3" strokeDasharray="3,10" opacity="0.1"/>
          ))}

          {/* Star glow */}
          <ellipse cx={cx} cy={cy} rx={80} ry={80} fill="url(#tstarG)"/>

          {/* Coordinate labels */}
          {[0,1,2,3,4,5,6,7,8].map(i => <text key={i} x={i*100+4} y={14} fill={BLUE} fontSize={7} opacity={0.2} fontFamily="Orbitron,monospace">{String(i).padStart(2,"0")}</text>)}
          {[0,1,2,3,4,5].map(i => <text key={i} x={4} y={i*100+12} fill={BLUE} fontSize={7} opacity={0.2} fontFamily="Orbitron,monospace">{String(i).padStart(2,"0")}</text>)}

          {/* System bodies */}
          {systemBodies.map(b => {
            const isSel = selectedId === b.id;
            return (
              <g key={b.id} onClick={() => setSelectedId(isSel ? null : b.id)} style={{ cursor:"pointer" }}>
                {isSel && <>
                  <circle cx={b.svgX} cy={b.svgY} r={b.r+18} fill="none" stroke={BLUE} strokeWidth="0.8" strokeDasharray="4,3" opacity={0.7}>
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${b.svgX} ${b.svgY}`} to={`360 ${b.svgX} ${b.svgY}`} dur="6s" repeatCount="indefinite"/>
                  </circle>
                  {[0,90,180,270].map(deg => {
                    const r1=b.r+18, r2=b.r+24, rad=(deg*Math.PI)/180;
                    return <line key={deg} x1={b.svgX+r1*Math.cos(rad)} y1={b.svgY+r1*Math.sin(rad)} x2={b.svgX+r2*Math.cos(rad)} y2={b.svgY+r2*Math.sin(rad)} stroke={BLUE} strokeWidth="1" opacity={0.7}/>;
                  })}
                </>}
                {b.type==="star" && <ellipse cx={b.svgX} cy={b.svgY} rx={80} ry={80} fill="url(#tstarG)"/>}
                <circle cx={b.svgX} cy={b.svgY} r={b.r}
                  fill={b.type==="star" ? "#ffdd66" : b.color}
                  stroke={isSel ? BLUE : b.faction ? factionColor(b.faction, factionList)+"55" : "transparent"}
                  strokeWidth={isSel ? 1.5 : 1}
                  filter={b.type==="star" ? "url(#tg4)" : isSel ? "url(#tg2)" : undefined}
                />
                {b.type !== "star" && (
                  <text x={b.svgX} y={b.svgY+b.r+13} textAnchor="middle" fill={isSel?LBLUE:BLUE+"88"}
                    fontSize={b.type==="planet"?9:7} fontFamily="Orbitron,monospace"
                    fontWeight={isSel?"700":"400"} letterSpacing="1.5" style={{ textTransform:"uppercase" }}>
                    {b.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Fleet markers */}
          {fleetPositions.map(f => {
            const isSel = selectedId === f.id;
            const fc = factionColor(f.faction, factionList);
            const isAlly = f.faction === planet.faction;
            const pts = isAlly
              ? `${f.svgX},${f.svgY-10} ${f.svgX-7},${f.svgY+7} ${f.svgX},${f.svgY+2} ${f.svgX+7},${f.svgY+7}`
              : `${f.svgX},${f.svgY+10} ${f.svgX-7},${f.svgY-7} ${f.svgX},${f.svgY-2} ${f.svgX+7},${f.svgY-7}`;
            return (
              <g key={f.id} onClick={() => { setSelectedId(isSel ? null : f.id); setTab("fleets"); }} style={{ cursor:"pointer" }}>
                {isSel && <circle cx={f.svgX} cy={f.svgY} r={20} fill="none" stroke={fc} strokeWidth="1" strokeDasharray="3,2" opacity={0.6}>
                  <animateTransform attributeName="transform" type="rotate" from={`0 ${f.svgX} ${f.svgY}`} to={`360 ${f.svgX} ${f.svgY}`} dur="2.5s" repeatCount="indefinite"/>
                </circle>}
                <polygon points={pts} fill={fc} opacity={isSel?0.95:0.6} filter={isSel?"url(#tg2)":undefined} stroke={isSel?"#fff":"transparent"} strokeWidth="0.8"/>
                {f.isCapitalShip && <text x={f.svgX} y={f.svgY+1} textAnchor="middle" fill="#fff" fontSize={7} fontFamily="Arial" dominantBaseline="middle">★</text>}
                <text x={f.svgX} y={f.svgY+(isAlly?22:-14)} textAnchor="middle" fill={isSel?fc:fc+"88"}
                  fontSize={7} fontFamily="Orbitron,monospace" letterSpacing="1" style={{ textTransform:"uppercase" }}>
                  {f.name.length > 12 ? f.name.slice(0,11)+"…" : f.name}
                </text>
              </g>
            );
          })}

          {/* Footer rule */}
          <line x1={0} y1={svgH-15} x2={svgW} y2={svgH-15} stroke={BLUE} strokeWidth="0.4" opacity="0.25"/>
          <text x={20} y={svgH-4} fill={BLUE+"44"} fontSize={7} fontFamily="Orbitron,monospace" letterSpacing="1">
            {planet.name.toUpperCase()} SYSTEM · TACTICAL OVERLAY · REF: SW-{planet.id.slice(-6).toUpperCase()}
          </text>
        </svg>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div style={{ width:224, flexShrink:0, display:"flex", flexDirection:"column", borderLeft:`1px solid ${BLUE}22`, background:"#00060f" }}>

        {/* Battle Record */}
        <Panel label="BATTLE RECORD" color={BLUE} style={{ margin:"10px 10px 0" }}>
          <div style={{ padding:"10px 10px 8px" }}>
            {editBattles && isAdmin ? (
              <>
                <input type="text" value={battleName} onChange={e => setBattleName(e.target.value)} style={{ marginBottom:6 }} placeholder="Battle name…" />
                <div style={{ display:"flex", gap:6, marginBottom:4 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:7, color:BLUE+"66", fontFamily:"'Orbitron',monospace", letterSpacing:1, marginBottom:2 }}>WINS</div>
                    <input type="number" value={battlesWon} onChange={e => setBattlesWon(+e.target.value)} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:7, color:RED+"66", fontFamily:"'Orbitron',monospace", letterSpacing:1, marginBottom:2 }}>LOSSES</div>
                    <input type="number" value={battlesLost} onChange={e => setBattlesLost(+e.target.value)} />
                  </div>
                </div>
                <button onClick={() => { setEditBattles(false); saveWarzone({ battleName, battlesWon, battlesLost }); }} style={{
                  width:"100%", padding:"4px 0", fontSize:7, color:BLUE, background:"none", border:`1px solid ${BLUE}44`,
                  cursor:"pointer", fontFamily:"'Orbitron',monospace", letterSpacing:1,
                }}>CONFIRM & SAVE</button>
              </>
            ) : (
              <>
                <div style={{ fontSize:10, fontWeight:700, color:LBLUE, letterSpacing:2, fontFamily:"'Orbitron',monospace", marginBottom:8 }}>
                  {battleName || `Battle of ${planet.name}`}
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:28, fontWeight:900, color:BLUE, fontFamily:"'Orbitron',monospace", lineHeight:1, textShadow:`0 0 12px ${BLUE}88` }}>{battlesWon}</div>
                    <div style={{ fontSize:7, color:BLUE+"55", letterSpacing:2, fontFamily:"'Orbitron',monospace" }}>WON</div>
                  </div>
                  <div style={{ color:BLUE+"33", fontSize:20, fontFamily:"'Orbitron',monospace" }}>/</div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:28, fontWeight:900, color:RRED, fontFamily:"'Orbitron',monospace", lineHeight:1, textShadow:`0 0 12px ${RED}88` }}>{battlesLost}</div>
                    <div style={{ fontSize:7, color:RED+"55", letterSpacing:2, fontFamily:"'Orbitron',monospace" }}>LOST</div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => setEditBattles(true)} style={{ marginLeft:"auto", fontSize:7, color:BLUE+"66", background:"none", border:`1px solid ${BLUE}22`, padding:"2px 6px", cursor:"pointer", fontFamily:"'Orbitron',monospace" }}>EDIT</button>
                  )}
                </div>
              </>
            )}
          </div>
        </Panel>

        {/* Objectives */}
        <Panel label="OBJECTIVES" color={BLUE} style={{ margin:"10px 10px 0" }}>
          <div style={{ padding:"10px 10px 8px" }}>
            {objectives.map(obj => (
              <div key={obj.id} style={{ marginBottom:7 }}>
                {editingObj === obj.id && isAdmin ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    <input type="text" value={obj.label} onChange={e => setObjectives(os => os.map(o => o.id===obj.id ? {...o, label:e.target.value} : o))} />
                    <select value={obj.faction} onChange={e => setObjectives(os => os.map(o => o.id===obj.id ? {...o, faction:e.target.value} : o))}>
                      {factionList.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                      <option value="Independent">Independent</option>
                    </select>
                    <button onClick={() => { setEditingObj(null); saveWarzone({ objectives }); }} style={{ fontSize:7, color:BLUE, background:"none", border:`1px solid ${BLUE}44`, cursor:"pointer", fontFamily:"'Orbitron',monospace", padding:"2px" }}>CONFIRM</button>
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:6, cursor: isAdmin ? "pointer" : "default" }} onClick={() => isAdmin && setEditingObj(obj.id)}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:factionColor(obj.faction, factionList), boxShadow:`0 0 5px ${factionColor(obj.faction, factionList)}`, flexShrink:0 }} />
                    <span style={{ fontSize:8, color:"#7aaccc", flex:1, textTransform:"uppercase", letterSpacing:0.5 }}>{obj.label}</span>
                    <span style={{ fontSize:7, color:factionColor(obj.faction, factionList)+"99", letterSpacing:1, fontFamily:"'Orbitron',monospace", flexShrink:0 }}>{factionAbbr(obj.faction)}</span>
                    {isAdmin && <span style={{ fontSize:9, color:BLUE+"44" }}>✎</span>}
                  </div>
                )}
              </div>
            ))}
            {isAdmin && (
              <button onClick={() => {
                const newObj = { id:`o${Date.now()}`, label:"New Objective", faction: planet.faction };
                const updated = [...objectives, newObj];
                setObjectives(updated);
                saveWarzone({ objectives: updated });
              }} style={{ width:"100%", marginTop:2, fontSize:7, color:BLUE+"66", background:"none", border:`1px solid ${BLUE}22`, padding:"3px 0", cursor:"pointer", fontFamily:"'Orbitron',monospace", letterSpacing:1 }}>
                + ADD OBJECTIVE
              </button>
            )}
          </div>
        </Panel>

        {/* Sector Control */}
        <Panel label="SECTOR CONTROL" color={BLUE} style={{ margin:"10px 10px 0", flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
          <div style={{ padding:"10px 10px 8px", flex:1, overflowY:"auto" }}>
            {/* Current planet */}
            {[planet, ...sectorPlanets].map(p => (
              <div key={p.id} style={{ marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:factionColor(p.faction, factionList), flexShrink:0, boxShadow: p.id===planet.id ? `0 0 5px ${factionColor(p.faction, factionList)}` : undefined }} />
                <span style={{ fontSize:8, color: p.id===planet.id ? LBLUE : "#7aaccc", flex:1, textTransform:"uppercase", letterSpacing:0.5, fontWeight: p.id===planet.id ? 700 : 400 }}>{p.name}</span>
                <span style={{ fontSize:7, color:factionColor(p.faction, factionList)+"cc", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{factionAbbr(p.faction)}</span>
              </div>
            ))}
            {sectorPlanets.length === 0 && (
              <div style={{ fontSize:8, color:BLUE+"33", fontFamily:"'Orbitron',monospace", letterSpacing:1, textAlign:"center", marginTop:8 }}>NO SECTOR DATA</div>
            )}
          </div>
        </Panel>

        {/* Footer */}
        <div style={{ padding:"8px 10px", fontSize:7, color:BLUE+"22", letterSpacing:1, fontFamily:"'Orbitron',monospace", lineHeight:1.8, borderTop:`1px solid ${BLUE}11` }}>
          <div>SYS REF: SW-{planet.id.slice(-6).toUpperCase()}</div>
          <div style={{ display:"flex", gap:4 }}><span>STATUS:</span><Dot color={RRED} /><span style={{ color:RRED+"66" }}>ACTIVE</span></div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page wrapper with MapProvider ──────────────────────────────────────── */
export default function TheatreMap() {
  const params = useParams<{ planetId: string }>();
  return (
    <MapProvider>
      <TheatreMapInner planetId={params.planetId} />
    </MapProvider>
  );
}
