import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { MapProvider } from "@/lib/MapProvider";
import { useMap } from "@/lib/data";
import type { Planet, FactionInfo, Fleet, SystemBodyData, ForceEntry } from "@/lib/data";

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const BLUE  = "#00aaff";
const LBLUE = "#33ccff";
const RED   = "#cc0000";
const RRED  = "#ff2222";
const BG    = "#000a14";
const SVG_W = 900;
const SVG_H = 580;
const CX    = SVG_W * 0.52;
const CY    = SVG_H * 0.5;

const BODY_COLORS: Record<string, string> = {
  star: "#ffdd66", gas_giant: "#c47a30", planet: "#9dd4f5",
  moon: "#9999aa", asteroid_belt: "#887766",
};
const BODY_SIZES: Record<string, number> = {
  star: 40, gas_giant: 26, planet: 20, moon: 10, asteroid_belt: 8,
};
const BODY_LABELS: Record<string, string> = {
  star: "⊕ STAR", gas_giant: "⊕ GAS GIANT", planet: "⊕ PLANET",
  moon: "⊕ MOON", asteroid_belt: "⊕ AST. BELT",
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function factionColor(faction: string, factions: FactionInfo[]): string {
  const f = factions.find(f => f.name === faction);
  if (!f) return "#446677";
  const [h, s, l] = f.color.split(" ").map(Number);
  return `hsl(${h},${s}%,${l}%)`;
}
function factionAbbr(name: string) {
  return name.slice(0, 3).toUpperCase();
}

function defaultBodies(planet: Planet): SystemBodyData[] {
  return [
    { id: "star-main", type: "star", name: "System Star", x: CX, y: CY, size: 40, color: "#ffdd66" },
    { id: `body-${planet.id}`, type: "planet", name: planet.name, x: CX - 160, y: CY, size: 22, color: "#9dd4f5", faction: planet.faction },
  ];
}

function svgPoint(e: React.MouseEvent, el: SVGSVGElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.round(((e.clientX - rect.left) / rect.width) * SVG_W),
    y: Math.round(((e.clientY - rect.top) / rect.height) * SVG_H),
  };
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function Dot({ color }: { color: string }) {
  return (
    <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:color,
      boxShadow:`0 0 6px ${color}`, animation:"blink 1.2s step-end infinite" }} />
  );
}

function HudCorners({ color = BLUE }: { color?: string }) {
  return (
    <>
      {(["tl","tr","bl","br"] as const).map(c => {
        const vy = c[0]==="t", vx = c[1]==="l";
        return (
          <svg key={c} style={{ position:"absolute", top:vy?0:undefined, bottom:vy?undefined:0,
            left:vx?0:undefined, right:vx?undefined:0, zIndex:20, pointerEvents:"none" }} width={40} height={40}>
            <polyline points="0,40 0,0 40,0" fill="none" stroke={color} strokeWidth="2"
              transform={`${!vx?"scale(-1,1) translate(-40,0)":""} ${!vy?"scale(1,-1) translate(0,-40)":""}`.trim()} />
          </svg>
        );
      })}
    </>
  );
}

function Panel({ children, label, color=BLUE, style }: {
  children: React.ReactNode; label?: string; color?: string; style?: React.CSSProperties;
}) {
  return (
    <div style={{ position:"relative", border:`1px solid ${color}22`, ...style }}>
      {(["tl","tr","bl","br"] as const).map(c => {
        const vy=c[0]==="t", vx=c[1]==="l", C=12, T=1.5, ox=vx?0:C, oy=vy?0:C, sx=vx?1:-1, sy=vy?1:-1;
        return (
          <div key={c} style={{ position:"absolute", ...(vy?{top:0}:{bottom:0}), ...(vx?{left:0}:{right:0}) }}>
            <svg width={C} height={C}>
              <polyline points={`${ox},${C-oy} ${ox},${oy} ${C-ox},${oy}`} fill="none" stroke={color} strokeWidth={T}
                transform={`scale(${sx},${sy}) translate(${sx<0?-C:0},${sy<0?-C:0})`} />
            </svg>
          </div>
        );
      })}
      {label && (
        <div style={{ position:"absolute", top:-8, left:8, background:BG, padding:"0 5px",
          fontSize:7, color, letterSpacing:2, fontFamily:"'Orbitron',monospace", textTransform:"uppercase" }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

/* ─── Login modal ─────────────────────────────────────────────────────────── */
function AdminLoginModal({ onClose }: { onClose: () => void }) {
  const { setCurrentUser } = useMap();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/auth/login", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ username:user, password:pass }),
      });
      if (!res.ok) { const d = await res.json(); setErr(d.error || "Invalid credentials"); return; }
      const authUser = await res.json();
      setCurrentUser(authUser);
      onClose();
    } catch { setErr("Connection error"); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,6,14,0.85)",
      display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div style={{ border:`1px solid ${BLUE}44`, background:"#000d1a", padding:24, minWidth:280, position:"relative" }}
        onClick={e => e.stopPropagation()}>
        <HudCorners />
        <div style={{ fontSize:8, color:BLUE, letterSpacing:3, fontFamily:"'Orbitron',monospace", marginBottom:12 }}>
          ADMIN ACCESS // AUTHENTICATION
        </div>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <input type="text" placeholder="USERNAME" value={user} onChange={e => setUser(e.target.value)}
            style={{ background:"#000a14", border:`1px solid ${BLUE}44`, color:BLUE, padding:"6px 8px",
              fontSize:10, fontFamily:"'Orbitron',monospace", letterSpacing:1, outline:"none" }} />
          <input type="password" placeholder="PASSWORD" value={pass} onChange={e => setPass(e.target.value)}
            style={{ background:"#000a14", border:`1px solid ${BLUE}44`, color:BLUE, padding:"6px 8px",
              fontSize:10, fontFamily:"'Orbitron',monospace", letterSpacing:1, outline:"none" }} />
          {err && <div style={{ fontSize:8, color:RRED, fontFamily:"'Orbitron',monospace" }}>{err}</div>}
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <button type="submit" disabled={busy} style={{
              flex:1, padding:"6px 0", background:`${BLUE}22`, border:`1px solid ${BLUE}55`,
              color:BLUE, fontSize:8, fontFamily:"'Orbitron',monospace", letterSpacing:2, cursor:"pointer", textTransform:"uppercase",
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

/* ─── Body renderer in SVG ───────────────────────────────────────────────── */
function BodyShape({ body, selected, factions, isAdmin, onSelect, onDragStart }: {
  body: SystemBodyData;
  selected: boolean;
  factions: FactionInfo[];
  isAdmin: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const fc = body.faction ? factionColor(body.faction, factions) : body.color;

  if (body.type === "asteroid_belt") {
    const rx = body.size * 3.5, ry = body.size * 1.4;
    return (
      <g onClick={onSelect} style={{ cursor: isAdmin ? "move" : "pointer" }}
        onMouseDown={isAdmin ? onDragStart : undefined}>
        {selected && <ellipse cx={body.x} cy={body.y} rx={rx+8} ry={ry+4}
          fill="none" stroke={BLUE} strokeWidth="1" strokeDasharray="3,3" opacity="0.7" />}
        {Array.from({ length: 28 }, (_, i) => {
          const angle = (i / 28) * Math.PI * 2 + i * 0.3;
          const spread = 1 + (Math.sin(i * 7.3) * 0.18);
          return (
            <circle key={i}
              cx={body.x + Math.cos(angle) * rx * spread}
              cy={body.y + Math.sin(angle) * ry * spread}
              r={1 + Math.abs(Math.sin(i * 3.1)) * 2}
              fill={body.color} opacity={0.6 + Math.sin(i) * 0.3} />
          );
        })}
        <text x={body.x} y={body.y + ry + 16} textAnchor="middle"
          fill={selected ? LBLUE : BLUE + "66"} fontSize={7}
          fontFamily="Orbitron,monospace" letterSpacing="1"
          style={{ textTransform:"uppercase", pointerEvents:"none" }}>
          {body.name}
        </text>
      </g>
    );
  }

  return (
    <g onClick={onSelect} style={{ cursor: isAdmin ? "move" : "pointer" }}
      onMouseDown={isAdmin ? onDragStart : undefined}>
      {selected && <>
        <circle cx={body.x} cy={body.y} r={body.size + 18}
          fill="none" stroke={BLUE} strokeWidth="0.8" strokeDasharray="4,3" opacity={0.7}>
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${body.x} ${body.y}`} to={`360 ${body.x} ${body.y}`} dur="6s" repeatCount="indefinite" />
        </circle>
        {[0,90,180,270].map(deg => {
          const r1=body.size+18, r2=body.size+24, rad=(deg*Math.PI)/180;
          return <line key={deg}
            x1={body.x+r1*Math.cos(rad)} y1={body.y+r1*Math.sin(rad)}
            x2={body.x+r2*Math.cos(rad)} y2={body.y+r2*Math.sin(rad)}
            stroke={BLUE} strokeWidth="1" opacity={0.7} />;
        })}
      </>}
      {body.type === "star" && (
        <ellipse cx={body.x} cy={body.y} rx={body.size * 2.2} ry={body.size * 2.2} fill="url(#tstarG)">
          <animate attributeName="rx" values={`${body.size*2};${body.size*2.4};${body.size*2}`} dur="3s" repeatCount="indefinite"/>
          <animate attributeName="ry" values={`${body.size*2};${body.size*2.4};${body.size*2}`} dur="3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.3;0.5;0.3" dur="3s" repeatCount="indefinite"/>
        </ellipse>
      )}
      <circle cx={body.x} cy={body.y} r={body.size}
        fill={body.color}
        stroke={selected ? BLUE : body.faction ? fc + "66" : "transparent"}
        strokeWidth={selected ? 1.5 : 1}
      />
      {/* warzone ring for main planet */}
      {body.type === "planet" && body.id.startsWith("body-") && (
        <circle cx={body.x} cy={body.y} r={body.size + 5}
          fill="none" stroke={RED} strokeWidth="1.5" opacity="0.6" strokeDasharray="3,3">
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${body.x} ${body.y}`} to={`360 ${body.x} ${body.y}`} dur="4s" repeatCount="indefinite" />
        </circle>
      )}
      {body.type !== "star" && (
        <text x={body.x} y={body.y + body.size + 13} textAnchor="middle"
          fill={selected ? LBLUE : BLUE + "88"}
          fontSize={body.type === "planet" ? 9 : 7}
          fontFamily="Orbitron,monospace"
          fontWeight={selected ? "700" : "400"}
          letterSpacing="1.5" style={{ textTransform:"uppercase", pointerEvents:"none" }}>
          {body.name}
        </text>
      )}
    </g>
  );
}

/* ─── Fleet marker in SVG ────────────────────────────────────────────────── */
function FleetMarker({ fleet, selected, planetFaction, factions, onSelect, onDragStart, draggable }: {
  fleet: Fleet & { svgX: number; svgY: number };
  selected: boolean;
  planetFaction: string;
  factions: FactionInfo[];
  onSelect: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
  draggable?: boolean;
}) {
  const fc = fleet.color || factionColor(fleet.faction, factions);
  const isAlly = fleet.faction === planetFaction;
  const pts = isAlly
    ? `${fleet.svgX},${fleet.svgY-10} ${fleet.svgX-7},${fleet.svgY+7} ${fleet.svgX},${fleet.svgY+2} ${fleet.svgX+7},${fleet.svgY+7}`
    : `${fleet.svgX},${fleet.svgY+10} ${fleet.svgX-7},${fleet.svgY-7} ${fleet.svgX},${fleet.svgY-2} ${fleet.svgX+7},${fleet.svgY-7}`;
  return (
    <g onClick={onSelect} onMouseDown={draggable ? onDragStart : undefined} style={{ cursor: draggable ? "grab" : "pointer" }}>
      {selected && <circle cx={fleet.svgX} cy={fleet.svgY} r={20}
        fill="none" stroke={fc} strokeWidth="1" strokeDasharray="3,2" opacity={0.6}>
        <animateTransform attributeName="transform" type="rotate"
          from={`0 ${fleet.svgX} ${fleet.svgY}`} to={`360 ${fleet.svgX} ${fleet.svgY}`} dur="2.5s" repeatCount="indefinite"/>
      </circle>}
      <polygon points={pts} fill={fc} opacity={selected?0.95:0.6} stroke={selected?"#fff":"transparent"} strokeWidth="0.8"/>
      {fleet.isCapitalShip && <text x={fleet.svgX} y={fleet.svgY+1} textAnchor="middle" fill="#fff" fontSize={7} fontFamily="Arial" dominantBaseline="middle">★</text>}
      <text x={fleet.svgX} y={fleet.svgY+(isAlly?22:-14)} textAnchor="middle" fill={selected?fc:fc+"88"}
        fontSize={7} fontFamily="Orbitron,monospace" letterSpacing="1" style={{ textTransform:"uppercase" }}>
        {fleet.name.length>12 ? fleet.name.slice(0,11)+"…" : fleet.name}
      </text>
    </g>
  );
}

/* ─── Inner page ─────────────────────────────────────────────────────────── */
function TheatreMapInner({ planetId }: { planetId: string }) {
  const [, navigate] = useLocation();
  const { planets, fleets, factionList, currentUser, updatePlanet, sectors, setCurrentUser, addFleet, updateFleet, deleteFleet } = useMap();

  const planet = planets.find(p => p.id === planetId);
  const isAdmin = !!(currentUser?.isAdmin || currentUser?.canEditPlanets);
  const canFleet = !!(currentUser?.isAdmin || currentUser?.canEditFleets);

  /* ── Warzone editable fields ── */
  const [battleName,  setBattleName]  = useState("");
  const [battlesWon,  setBattlesWon]  = useState(0);
  const [battlesLost, setBattlesLost] = useState(0);
  const [objectives,  setObjectives]  = useState<{ id:string; label:string; faction:string }[]>([]);
  const [editBattles,    setEditBattles]    = useState(false);
  const [editingObj,     setEditingObj]     = useState<string|null>(null);
  const [forces,         setForces]         = useState<ForceEntry[]>([]);
  const [editingForceId, setEditingForceId] = useState<string|null>(null);
  const seedRef = useRef<string | null>(null);

  /* ── System editor state ── */
  const [systemBodies, setSystemBodies] = useState<SystemBodyData[]>([]);
  const [addingType,   setAddingType]   = useState<SystemBodyData["type"]|null>(null);
  const [selectedId,   setSelectedId]   = useState<string|null>(null);
  const [editingBodyId, setEditingBodyId] = useState<string|null>(null);

  /* ── UI state ── */
  const [showLogin, setShowLogin] = useState(false);
  const [tab, setTab] = useState<"bodies"|"fleets">("bodies");

  /* ── Drag state (ref to avoid re-renders mid-drag) ── */
  const dragRef = useRef<{ id: string; ox: number; oy: number; kind: "body" | "fleet" } | null>(null);
  const svgRef  = useRef<SVGSVGElement>(null);

  /* Keep a ref of latest bodies so drag-end can save without setState side effects */
  const systemBodiesRef = useRef<SystemBodyData[]>([]);
  useEffect(() => { systemBodiesRef.current = systemBodies; }, [systemBodies]);

  /* Seed once from planet */
  useEffect(() => {
    if (!planet || seedRef.current === planet.id) return;
    seedRef.current = planet.id;
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
    setSystemBodies(
      planet.warzoneSystemLayout?.bodies?.length
        ? planet.warzoneSystemLayout.bodies
        : defaultBodies(planet)
    );
    setForces(planet.warzoneForces?.length
      ? planet.warzoneForces
      : [
          { id:"force-1", faction: planet.faction,  ships:0, fighters:0, troops:0 },
          { id:"force-2", faction: "Independent",   ships:0, fighters:0, troops:0 },
        ]
    );
  }, [planet]);

  /* Persist helper */
  const saveToDb = useCallback((updates: Partial<{
    battleName: string; battlesWon: number; battlesLost: number;
    objectives: typeof objectives; bodies: SystemBodyData[]; forces: ForceEntry[];
  }>) => {
    if (!planet) return;
    // Send only warzone fields so concurrent galaxy-map edits aren't overwritten
    const changes: Partial<Planet> = {
      warzoneBattleName:    updates.battleName  ?? battleName,
      warzoneBattlesWon:    updates.battlesWon  ?? battlesWon,
      warzoneBattlesLost:   updates.battlesLost ?? battlesLost,
      warzoneObjectives:    updates.objectives  ?? objectives,
      warzoneSystemLayout:  { bodies: updates.bodies ?? systemBodies },
      warzoneForces:        updates.forces ?? forces,
    };
    updatePlanet({ ...planet, ...changes }, changes);
  }, [planet, battleName, battlesWon, battlesLost, objectives, systemBodies, forces, updatePlanet]);

  /* Logout */
  async function logout() {
    await fetch("/api/auth/logout", { method:"POST" }).catch(() => {});
    setCurrentUser(null);
  }

  /* ── Sector planets (for sector control only — not SVG) ── */
  const sectorPlanets = planet?.sectorId
    ? planets.filter(p => p.sectorId === planet.sectorId && p.id !== planet.id)
    : [];

  /* ── Theatre fleets: explicitly assigned to this warzone, plus unassigned nearby ones ── */
  const nearbyFleets = planet
    ? fleets.filter(f =>
        f.warzonePlanetId === planet.id ||
        (!f.warzonePlanetId && Math.hypot(f.x - planet.x, f.y - planet.y) < 600)
      )
    : [];

  /* ── Fleet SVG positions (orbiting the main planet body) ── */
  const mainBody = systemBodies.find(b => b.id === `body-${planetId}`);
  const fleetPositions = nearbyFleets.map((f, i) => {
    // Fleets with a saved theatre position float freely; others get a default orbit slot
    if (f.theatreX != null && f.theatreY != null) {
      return { ...f, svgX: f.theatreX, svgY: f.theatreY };
    }
    const ring  = Math.floor(i / 8); // 8 fleets per orbit ring, then step outward
    const angle = ((i % 8) / Math.min(Math.max(nearbyFleets.length - ring * 8, 1), 8)) * Math.PI * 2 - Math.PI / 2 + ring * 0.4;
    const dist  = 52 + (i % 2) * 28 + ring * 46;
    const bx    = mainBody?.x ?? CX - 160;
    const by    = mainBody?.y ?? CY;
    return { ...f, svgX: bx + Math.cos(angle) * dist, svgY: by + Math.sin(angle) * dist * 0.7 };
  });

  /* ── Grid lines ── */
  const gridLines: React.ReactElement[] = [];
  for (let x=0; x<=SVG_W; x+=50) gridLines.push(<line key={`gx${x}`} x1={x} y1={0} x2={x} y2={SVG_H} stroke={BLUE} strokeWidth="0.25" opacity="0.15"/>);
  for (let y=0; y<=SVG_H; y+=50) gridLines.push(<line key={`gy${y}`} x1={0} y1={y} x2={SVG_W} y2={y} stroke={BLUE} strokeWidth="0.25" opacity="0.15"/>);

  /* ── SVG drag handlers ── */
  function handleBodyMouseDown(id: string, e: React.MouseEvent) {
    if (!isAdmin || !svgRef.current) return;
    e.stopPropagation();
    const pt = svgPoint(e, svgRef.current);
    const body = systemBodies.find(b => b.id === id);
    if (!body) return;
    dragRef.current = { id, ox: pt.x - body.x, oy: pt.y - body.y, kind: "body" };
  }

  function handleFleetMouseDown(id: string, e: React.MouseEvent) {
    if (!canFleet || !svgRef.current) return;
    e.stopPropagation();
    const pt = svgPoint(e, svgRef.current);
    const fp = fleetPositions.find(f => f.id === id);
    if (!fp) return;
    dragRef.current = { id, ox: pt.x - fp.svgX, oy: pt.y - fp.svgY, kind: "fleet" };
  }

  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragRef.current || !svgRef.current) return;
    const pt = svgPoint(e, svgRef.current);
    const nx = Math.max(20, Math.min(SVG_W - 20, pt.x - dragRef.current.ox));
    const ny = Math.max(20, Math.min(SVG_H - 20, pt.y - dragRef.current.oy));
    if (dragRef.current.kind === "fleet") {
      const base = fleets.find(f => f.id === dragRef.current!.id);
      if (base) updateFleet({ ...base, theatreX: Math.round(nx), theatreY: Math.round(ny) });
      return;
    }
    const next = systemBodiesRef.current.map(b => b.id === dragRef.current!.id ? { ...b, x: nx, y: ny } : b);
    systemBodiesRef.current = next;
    setSystemBodies(next);
  }

  function handleSvgMouseUp() {
    if (!dragRef.current) return;
    const wasBody = dragRef.current.kind === "body";
    dragRef.current = null;
    if (wasBody) saveToDb({ bodies: systemBodiesRef.current });
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!addingType || !svgRef.current) return;
    const pt = svgPoint(e, svgRef.current);
    const newBody: SystemBodyData = {
      id: `${addingType}-${Date.now()}`,
      type: addingType,
      name: addingType === "star" ? "Secondary Star" :
            addingType === "planet" ? "New Planet" :
            addingType === "moon" ? "Moon" :
            addingType === "gas_giant" ? "Gas Giant" : "Asteroid Belt",
      x: pt.x, y: pt.y,
      size: BODY_SIZES[addingType],
      color: BODY_COLORS[addingType],
    };
    const updated = [...systemBodies, newBody];
    setSystemBodies(updated);
    saveToDb({ bodies: updated });
    setSelectedId(newBody.id);
    setEditingBodyId(newBody.id);
    setAddingType(null);
  }

  function deleteBody(id: string) {
    const updated = systemBodies.filter(b => b.id !== id);
    setSystemBodies(updated);
    saveToDb({ bodies: updated });
    if (selectedId === id) setSelectedId(null);
    if (editingBodyId === id) setEditingBodyId(null);
  }

  function updateBody(id: string, patch: Partial<SystemBodyData>) {
    const updated = systemBodies.map(b => b.id === id ? { ...b, ...patch } : b);
    setSystemBodies(updated);
    saveToDb({ bodies: updated });
  }

  const sector       = sectors.find(s => s.id === planet?.sectorId);
  const selectedBody = systemBodies.find(b => b.id === selectedId);
  const selectedFleet = fleetPositions.find(f => f.id === selectedId);
  const editingBody  = systemBodies.find(b => b.id === editingBodyId);
  const isMainPlanetBody = (id: string) => id === `body-${planetId}` || id === "star-main";

  if (!planet) {
    return (
      <div style={{ display:"flex", height:"100vh", alignItems:"center", justifyContent:"center",
        background:BG, color:BLUE, fontFamily:"'Orbitron',monospace", fontSize:12 }}>
        PLANET NOT FOUND
      </div>
    );
  }

  return (
    <div style={{ display:"flex", height:"100vh", background:BG, color:"#cce8ff",
      fontFamily:"'Rajdhani','Orbitron',monospace", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;600;700;900&display=swap');
        @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        *::-webkit-scrollbar{width:3px} *::-webkit-scrollbar-track{background:#001122} *::-webkit-scrollbar-thumb{background:${BLUE}33}
        .tm-input{background:#000d1a;color:${BLUE};border:1px solid ${BLUE}44;padding:3px 6px;font-family:'Orbitron',monospace;font-size:9px;outline:none;letter-spacing:1px;width:100%;box-sizing:border-box;}
        .tm-select{background:#000d1a;color:${BLUE};border:1px solid ${BLUE}44;padding:2px 4px;font-family:'Orbitron',monospace;font-size:9px;outline:none;width:100%;box-sizing:border-box;}
        .tm-select option{background:#000d1a;}
        .tm-btn{background:none;border:1px solid ${BLUE}33;color:${BLUE}88;padding:2px 8px;font-family:'Orbitron',monospace;font-size:7px;letter-spacing:1px;cursor:pointer;text-transform:uppercase;}
        .tm-btn:hover{background:${BLUE}11;color:${BLUE};}
        .tm-btn-red{border-color:${RED}44;color:${RED}66;}
        .tm-btn-red:hover{background:${RED}11;color:${RRED};}
        .tm-btn-active{background:${BLUE}22;border-color:${BLUE}88;color:${LBLUE};}
      `}</style>

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} />}

      {/* ══ LEFT PANEL ══ */}
      <div style={{ width:256, flexShrink:0, display:"flex", flexDirection:"column",
        borderRight:`1px solid ${BLUE}22`, background:"#00060f" }}>

        {/* Header */}
        <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${BLUE}22`, background:"#000d1a" }}>
          <button onClick={() => navigate("/")} style={{
            fontSize:8, color:BLUE+"88", letterSpacing:2, background:"none", border:"none",
            cursor:"pointer", fontFamily:"'Orbitron',monospace", padding:0, marginBottom:6,
            display:"flex", alignItems:"center", gap:4,
          }}>← GALAXY MAP</button>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <Dot color={RRED} />
            <span style={{ fontSize:8, color:RRED, letterSpacing:3, fontFamily:"'Orbitron',monospace" }}>WARZONE ACTIVE</span>
          </div>
          <div style={{ fontSize:18, fontWeight:900, color:LBLUE, letterSpacing:3,
            fontFamily:"'Orbitron',monospace", textShadow:`0 0 16px ${BLUE}88` }}>
            {planet.name.toUpperCase()}
          </div>
          <div style={{ fontSize:8, color:BLUE+"44", letterSpacing:2, marginTop:1, fontFamily:"'Orbitron',monospace" }}>
            {sector?.name || "Unknown Sector"} · {planet.oversector || planet.environment?.toUpperCase() || "UNKNOWN"}
          </div>
          <div style={{ display:"flex", gap:2, marginTop:8 }}>
            {Array.from({length:20}).map((_,i) => (
              <div key={i} style={{ flex:1, height:2, background:BLUE, boxShadow:`0 0 3px ${BLUE}` }} />
            ))}
          </div>
        </div>

        {/* Admin strip */}
        <div style={{ padding:"5px 12px", borderBottom:`1px solid ${BLUE}11`,
          display:"flex", alignItems:"center", gap:8, background:"#00040a" }}>
          <span style={{ fontSize:7, color:BLUE+"44", letterSpacing:2, fontFamily:"'Orbitron',monospace", flex:1 }}>
            ADMIN ACCESS
          </span>
          {isAdmin ? (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:7, color:BLUE, letterSpacing:2, fontFamily:"'Orbitron',monospace",
                border:`1px solid ${BLUE}33`, padding:"2px 6px" }}>
                ■ {currentUser!.username.toUpperCase()}
              </span>
              <button onClick={logout} className="tm-btn tm-btn-red" title="Exit admin mode">✕</button>
            </div>
          ) : (
            <button onClick={() => setShowLogin(true)} className="tm-btn">LOGIN</button>
          )}
        </div>

        {/* Admin toolbar — system editor */}
        {isAdmin && (
          <div style={{ padding:"6px 10px", borderBottom:`1px solid ${BLUE}11`, background:"#00040a" }}>
            <div style={{ fontSize:7, color:BLUE+"44", letterSpacing:2, fontFamily:"'Orbitron',monospace", marginBottom:5 }}>
              ADD TO SYSTEM
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
              {(["star","planet","moon","asteroid_belt","gas_giant"] as const).map(type => (
                <button key={type} onClick={() => setAddingType(addingType===type ? null : type)}
                  className={`tm-btn${addingType===type?" tm-btn-active":""}`}
                  title={`Click map to place ${type.replace("_"," ")}`}>
                  {BODY_LABELS[type]}
                </button>
              ))}
            </div>
            {addingType && (
              <div style={{ marginTop:4, fontSize:7, color:LBLUE, letterSpacing:1,
                fontFamily:"'Orbitron',monospace", animation:"blink 1s step-end infinite" }}>
                ▶ CLICK MAP TO PLACE {addingType.replace("_"," ").toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${BLUE}22` }}>
          {(["bodies","fleets"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:"6px 0", fontSize:8, letterSpacing:2,
              fontFamily:"'Orbitron',monospace", textTransform:"uppercase",
              background: tab===t ? `${BLUE}11` : "transparent",
              color: tab===t ? LBLUE : BLUE+"44",
              border:"none", borderBottom: tab===t ? `2px solid ${BLUE}` : "2px solid transparent",
              cursor:"pointer",
            }}>
              {t==="bodies" ? "SYS BODIES" : `FLEETS (${nearbyFleets.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {tab==="bodies" ? systemBodies.map(b => {
            const isSel = selectedId===b.id;
            const fc = b.faction ? factionColor(b.faction, factionList) : b.color;
            return (
              <button key={b.id} onClick={() => { setSelectedId(isSel?null:b.id); setEditingBodyId(null); }}
                style={{
                  width:"100%", textAlign:"left", padding:"7px 12px", display:"flex", alignItems:"center", gap:8,
                  background: isSel ? `${BLUE}0d` : "transparent",
                  borderLeft: isSel ? `2px solid ${BLUE}` : "2px solid transparent",
                  border:"none", cursor:"pointer",
                }}>
                <div style={{
                  width: b.type==="star"?14:b.type==="planet"||b.type==="gas_giant"?10:7,
                  height: b.type==="star"?14:b.type==="planet"||b.type==="gas_giant"?10:7,
                  borderRadius: b.type==="asteroid_belt"?"2px":"50%", flexShrink:0,
                  background: b.type==="asteroid_belt" ? `repeating-linear-gradient(45deg,${b.color},${b.color} 2px,transparent 2px,transparent 4px)` : b.color,
                  border: b.type==="asteroid_belt" ? `1px solid ${b.color}` : "none",
                  boxShadow: isSel ? `0 0 8px ${b.color}` : "none",
                }} />
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:isSel?LBLUE:"#7aaccc", letterSpacing:1,
                    textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {b.name}
                  </div>
                  <div style={{ fontSize:8, color:BLUE+"44", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>
                    {b.type.replace("_"," ")}
                  </div>
                </div>
                {b.faction && (
                  <div style={{ fontSize:7, color:fc, border:`1px solid ${fc}44`, padding:"1px 3px", flexShrink:0, fontFamily:"'Orbitron',monospace" }}>
                    {factionAbbr(b.faction)}
                  </div>
                )}
                {isAdmin && isSel && !isMainPlanetBody(b.id) && (
                  <button onClick={e => { e.stopPropagation(); setEditingBodyId(editingBodyId===b.id?null:b.id); }}
                    style={{ fontSize:8, color:BLUE+"66", background:"none", border:`1px solid ${BLUE}22`,
                      padding:"1px 5px", cursor:"pointer", fontFamily:"'Orbitron',monospace", flexShrink:0 }}>
                    ✎
                  </button>
                )}
              </button>
            );
          }) : fleetPositions.map(f => {
            const isSel = selectedId===f.id;
            const fc = f.color || factionColor(f.faction, factionList);
            const isDefense = Math.hypot(f.x - planet.x, f.y - planet.y) < 200;
            return (
              <button key={f.id} onClick={() => setSelectedId(isSel?null:f.id)} style={{
                width:"100%", textAlign:"left", padding:"7px 12px", display:"flex", alignItems:"center", gap:8,
                background: isSel ? `${fc}11` : "transparent",
                borderLeft: isSel ? `2px solid ${fc}` : "2px solid transparent",
                border:"none", cursor:"pointer",
              }}>
                <svg width={10} height={10}><polygon points={isDefense?"5,0 10,10 0,10":"5,10 10,0 0,0"} fill={fc} opacity={isSel?1:0.6} /></svg>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:isSel?fc:"#7aaccc", letterSpacing:1,
                    textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize:8, color:fc+"88", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>
                    {isDefense?"⬟ DEFENSE":"▼ STRIKE"}
                  </div>
                </div>
                {f.isCapitalShip && <span style={{ marginLeft:"auto", fontSize:7, color:"#ffdd00", flexShrink:0, fontFamily:"'Orbitron',monospace" }}>★</span>}
              </button>
            );
          })}
          {tab==="fleets" && nearbyFleets.length===0 && (
            <div style={{ padding:"20px 12px", fontSize:8, color:BLUE+"33",
              fontFamily:"'Orbitron',monospace", textAlign:"center", letterSpacing:2 }}>
              NO FLEETS IN RANGE
            </div>
          )}
          {tab==="fleets" && canFleet && (
            <div style={{ padding:"8px 12px" }}>
              <button className="tm-btn" onClick={() => {
                const newFleet = {
                  id: `fleet-${Date.now()}`,
                  name: "New Fleet",
                  x: Math.round(planet.x),
                  y: Math.round(planet.y),
                  icon: "default",
                  faction: planet.faction || factionList[0]?.name || "Independent",
                  description: "",
                  markerImage: null,
                  isCapitalShip: false,
                  labelMode: "hover",
                  warzonePlanetId: planet.id,
                  color: null,
                };
                addFleet(newFleet);
                setSelectedId(newFleet.id);
              }}>
                + ADD FLEET
              </button>
            </div>
          )}
        </div>

        {/* Body editor pane */}
        {editingBody && !isMainPlanetBody(editingBody.id) && (
          <div style={{ borderTop:`1px solid ${BLUE}22`, padding:"10px 12px", background:"#000d1a", flexShrink:0 }}>
            <div style={{ fontSize:7, color:BLUE+"44", letterSpacing:2,
              fontFamily:"'Orbitron',monospace", marginBottom:6 }}>
              EDIT // {editingBody.type.replace("_"," ").toUpperCase()}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              <div>
                <div style={{ fontSize:7, color:BLUE+"55", letterSpacing:1, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>NAME</div>
                <input className="tm-input" value={editingBody.name}
                  onChange={e => updateBody(editingBody.id, { name: e.target.value })} />
              </div>
              {editingBody.type !== "asteroid_belt" && (
                <div>
                  <div style={{ fontSize:7, color:BLUE+"55", letterSpacing:1, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>FACTION</div>
                  <select className="tm-select" value={editingBody.faction||""}
                    onChange={e => updateBody(editingBody.id, { faction: e.target.value||undefined })}>
                    <option value="">— None —</option>
                    {factionList.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                    <option value="Independent">Independent</option>
                  </select>
                </div>
              )}
              <div>
                <div style={{ fontSize:7, color:BLUE+"55", letterSpacing:1, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>
                  SIZE — {editingBody.size}px
                </div>
                <input type="range" min={editingBody.type==="asteroid_belt"?20:5} max={editingBody.type==="star"?80:editingBody.type==="asteroid_belt"?160:40}
                  value={editingBody.size}
                  onChange={e => updateBody(editingBody.id, { size: +e.target.value })}
                  style={{ width:"100%", accentColor:BLUE, cursor:"pointer" }} />
              </div>
              <div>
                <div style={{ fontSize:7, color:BLUE+"55", letterSpacing:1, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>COLOR</div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {["#ffdd66","#c47a30","#9dd4f5","#9999aa","#887766","#88cc88","#cc8888","#aaaaff"].map(c => (
                    <div key={c} onClick={() => updateBody(editingBody.id, { color:c })}
                      style={{ width:16, height:16, borderRadius:"50%", background:c, cursor:"pointer",
                        border: editingBody.color===c ? `2px solid #fff` : `1px solid ${c}44` }} />
                  ))}
                </div>
              </div>
              <button className="tm-btn tm-btn-red" style={{ marginTop:2 }}
                onClick={() => deleteBody(editingBody.id)}>
                ✕ DELETE BODY
              </button>
            </div>
          </div>
        )}

        {/* Fleet detail pane */}
        {selectedFleet && !editingBody && (
          <div style={{ borderTop:`1px solid ${BLUE}22`, padding:"10px 12px", background:"#000d1a", flexShrink:0, maxHeight:280, overflowY:"auto" }}>
            {(() => {
              const fc = selectedFleet.color || factionColor(selectedFleet.faction, factionList);
              const baseFleet = fleets.find(fl => fl.id === selectedFleet.id);
              return <>
                <div style={{ fontSize:7, color:fc+"66", letterSpacing:2, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>FLEET // UNIT</div>
                <div style={{ fontSize:13, fontWeight:700, color:fc, letterSpacing:2, textTransform:"uppercase" }}>{selectedFleet.name}</div>
                <div style={{ fontSize:8, color:fc+"88", letterSpacing:1, marginTop:2, fontFamily:"'Orbitron',monospace" }}>{selectedFleet.faction}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginTop:8 }}>
                  {[["STATUS","ACTIVE"],["TYPE",selectedFleet.isCapitalShip?"CAPITAL":"FLEET"],["ICON",selectedFleet.icon||"DEFAULT"],["COMMS","SECURE"]].map(([k,v]) => (
                    <div key={k} style={{ background:`${fc}08`, border:`1px solid ${fc}22`, padding:"4px 6px" }}>
                      <div style={{ fontSize:7, color:fc+"44", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{k}</div>
                      <div style={{ fontSize:9, color:fc, fontWeight:700, letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{v}</div>
                    </div>
                  ))}
                </div>
                {canFleet && baseFleet && (
                  <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:10, paddingTop:8, borderTop:`1px solid ${BLUE}22` }}>
                    <div>
                      <div style={{ fontSize:7, color:BLUE+"55", letterSpacing:1, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>NAME</div>
                      <input className="tm-input" value={baseFleet.name}
                        onChange={e => updateFleet({ ...baseFleet, name: e.target.value })} />
                    </div>
                    <div>
                      <div style={{ fontSize:7, color:BLUE+"55", letterSpacing:1, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>FACTION</div>
                      <select className="tm-select" value={baseFleet.faction}
                        onChange={e => updateFleet({ ...baseFleet, faction: e.target.value })}>
                        {factionList.map(fa => <option key={fa.id} value={fa.name}>{fa.name}</option>)}
                        {!factionList.some(fa => fa.name === "Independent") && <option value="Independent">Independent</option>}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:7, color:BLUE+"55", letterSpacing:1, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>
                        COLOR {baseFleet.color ? "— CUSTOM" : "— FACTION DEFAULT"}
                      </div>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
                        <div onClick={() => updateFleet({ ...baseFleet, color: null })}
                          title="Faction default"
                          style={{ width:16, height:16, borderRadius:"50%", cursor:"pointer",
                            background: factionColor(baseFleet.faction, factionList),
                            border: !baseFleet.color ? `2px solid #fff` : `1px solid ${BLUE}44`,
                            position:"relative" }}>
                          <span style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, color:"#fff" }}>◈</span>
                        </div>
                        {["#00aaff","#cc0000","#ff9900","#00cc66","#aa44ff","#ffdd00","#ff44aa","#44ddee","#888888","#ffffff"].map(c => (
                          <div key={c} onClick={() => updateFleet({ ...baseFleet, color: c })}
                            style={{ width:16, height:16, borderRadius:"50%", background:c, cursor:"pointer",
                              border: baseFleet.color===c ? `2px solid #fff` : `1px solid ${c}44` }} />
                        ))}
                      </div>
                    </div>
                    <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:8, color:BLUE+"88", fontFamily:"'Orbitron',monospace", letterSpacing:1 }}>
                      <input type="checkbox" checked={!!baseFleet.isCapitalShip}
                        onChange={e => updateFleet({ ...baseFleet, isCapitalShip: e.target.checked })}
                        style={{ accentColor:BLUE }} />
                      CAPITAL SHIP ★
                    </label>
                    <button className="tm-btn tm-btn-red" style={{ marginTop:2 }}
                      onClick={() => { deleteFleet(baseFleet.id); setSelectedId(null); }}>
                      ✕ DELETE FLEET
                    </button>
                  </div>
                )}
              </>;
            })()}
          </div>
        )}
      </div>

      {/* ══ MAP AREA ══ */}
      <div style={{ flex:1, position:"relative", overflow:"hidden", background:"#00060e" }}>
        {/* scanlines */}
        <div style={{ position:"absolute", inset:0,
          background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,20,40,0.06) 3px,rgba(0,20,40,0.06) 4px)",
          pointerEvents:"none", zIndex:10 }} />
        <HudCorners />

        {/* Top bar */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:36,
          display:"flex", alignItems:"center", padding:"0 48px", zIndex:15,
          borderBottom:`1px solid ${BLUE}22`, background:`linear-gradient(to bottom,#00060e,transparent)` }}>
          <span style={{ fontSize:18, fontWeight:900, color:LBLUE, letterSpacing:4,
            fontFamily:"'Orbitron',monospace", textShadow:`0 0 20px ${BLUE}88` }}>SYSTEM MAP</span>
          <span style={{ fontSize:9, color:BLUE+"44", letterSpacing:2, fontFamily:"'Orbitron',monospace", marginLeft:14, marginTop:2 }}>
            · WARZONE THEATER ·
          </span>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
            {forces.map(f => {
              const fc = factionColor(f.faction, factionList);
              const total = f.ships + f.fighters + f.troops;
              return (
                <div key={f.id} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:fc, boxShadow:`0 0 4px ${fc}` }} />
                  <span style={{ fontSize:8, color:fc+"cc", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>
                    {factionAbbr(f.faction)}
                  </span>
                  <span style={{ fontSize:8, color:fc+"88", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>
                    {total > 0 ? `${f.ships}S ${f.fighters}F ${f.troops}T` : "—"}
                  </span>
                </div>
              );
            })}
            {isAdmin && (
              <span style={{ fontSize:7, color:BLUE, border:`1px solid ${BLUE}33`, padding:"2px 8px",
                fontFamily:"'Orbitron',monospace", letterSpacing:1 }}>
                EDITOR ACTIVE
              </span>
            )}
          </div>
        </div>

        {/* Add-mode hint overlay */}
        {addingType && (
          <div style={{ position:"absolute", bottom:24, left:"50%", transform:"translateX(-50%)",
            zIndex:30, background:"#00060edd", border:`1px solid ${LBLUE}66`,
            padding:"6px 16px", fontFamily:"'Orbitron',monospace", fontSize:9,
            color:LBLUE, letterSpacing:2, pointerEvents:"none" }}>
            PLACING: {addingType.replace("_"," ").toUpperCase()} — CLICK TO PLACE · ESC TO CANCEL
          </div>
        )}

        {/* SVG */}
        <svg ref={svgRef}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%",
            cursor: addingType ? "crosshair" : dragRef.current ? "grabbing" : "default" }}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onClick={handleSvgClick}
          onKeyDown={e => { if (e.key==="Escape") setAddingType(null); }}
          tabIndex={0}>
          <defs>
            <radialGradient id="tstarG">
              <stop offset="0%" stopColor="#ffee88" stopOpacity="0.45"/>
              <stop offset="100%" stopColor="#ffcc22" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {gridLines}

          {/* Coordinate labels — x-axis across top, y-axis down left (skip 0 to avoid overlap) */}
          {[0,1,2,3,4,5,6,7,8].map(i => (
            <text key={`cx${i}`} x={i*100+4} y={14} fill={BLUE} fontSize={7} opacity={0.2} fontFamily="Orbitron,monospace">
              {String(i).padStart(2,"0")}
            </text>
          ))}
          {[1,2,3,4,5].map(i => (
            <text key={`cy${i}`} x={4} y={i*100+12} fill={BLUE} fontSize={7} opacity={0.2} fontFamily="Orbitron,monospace">
              {String(i).padStart(2,"0")}
            </text>
          ))}

          {/* Fleet markers */}
          {fleetPositions.map(f => (
            <FleetMarker key={f.id}
              fleet={f}
              selected={selectedId===f.id}
              planetFaction={planet.faction}
              factions={factionList}
              onSelect={() => { setSelectedId(selectedId===f.id?null:f.id); setTab("fleets"); setEditingBodyId(null); }}
              draggable={canFleet}
              onDragStart={e => handleFleetMouseDown(f.id, e)}
            />
          ))}

          {/* System bodies */}
          {systemBodies.map(b => (
            <BodyShape key={b.id}
              body={b}
              selected={selectedId===b.id}
              factions={factionList}
              isAdmin={isAdmin}
              onSelect={() => { setSelectedId(selectedId===b.id?null:b.id); setTab("bodies"); setEditingBodyId(null); }}
              onDragStart={e => handleBodyMouseDown(b.id, e)}
            />
          ))}

          {/* Footer */}
          <line x1={0} y1={SVG_H-15} x2={SVG_W} y2={SVG_H-15} stroke={BLUE} strokeWidth="0.4" opacity="0.25"/>
          <text x={20} y={SVG_H-4} fill={BLUE+"44"} fontSize={7} fontFamily="Orbitron,monospace" letterSpacing="1">
            {planet.name.toUpperCase()} SYSTEM · TACTICAL OVERLAY · REF: SW-{planet.id.slice(-6).toUpperCase()}
          </text>
        </svg>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div style={{ width:224, flexShrink:0, display:"flex", flexDirection:"column",
        borderLeft:`1px solid ${BLUE}22`, background:"#00060f" }}>

        {/* Battle Record */}
        <Panel label="BATTLE RECORD" color={BLUE} style={{ margin:"10px 10px 0" }}>
          <div style={{ padding:"10px 10px 8px" }}>
            {editBattles && isAdmin ? (
              <>
                <input className="tm-input" value={battleName} onChange={e => setBattleName(e.target.value)}
                  style={{ marginBottom:6 }} placeholder="Battle name…" />
                <div style={{ display:"flex", gap:6, marginBottom:4 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:7, color:BLUE+"66", fontFamily:"'Orbitron',monospace", letterSpacing:1, marginBottom:2 }}>WINS</div>
                    <input className="tm-input" type="number" value={battlesWon} onChange={e => setBattlesWon(+e.target.value)} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:7, color:RED+"66", fontFamily:"'Orbitron',monospace", letterSpacing:1, marginBottom:2 }}>LOSSES</div>
                    <input className="tm-input" type="number" value={battlesLost} onChange={e => setBattlesLost(+e.target.value)} />
                  </div>
                </div>
                <button className="tm-btn" style={{ width:"100%" }}
                  onClick={() => { setEditBattles(false); saveToDb({ battleName, battlesWon, battlesLost }); }}>
                  CONFIRM & SAVE
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize:10, fontWeight:700, color:LBLUE, letterSpacing:2,
                  fontFamily:"'Orbitron',monospace", marginBottom:8 }}>
                  {battleName || `Battle of ${planet.name}`}
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:28, fontWeight:900, color:BLUE, fontFamily:"'Orbitron',monospace",
                      lineHeight:1, textShadow:`0 0 12px ${BLUE}88` }}>{battlesWon}</div>
                    <div style={{ fontSize:7, color:BLUE+"55", letterSpacing:2, fontFamily:"'Orbitron',monospace" }}>WON</div>
                  </div>
                  <div style={{ color:BLUE+"33", fontSize:20, fontFamily:"'Orbitron',monospace" }}>/</div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:28, fontWeight:900, color:RRED, fontFamily:"'Orbitron',monospace",
                      lineHeight:1, textShadow:`0 0 12px ${RED}88` }}>{battlesLost}</div>
                    <div style={{ fontSize:7, color:RED+"55", letterSpacing:2, fontFamily:"'Orbitron',monospace" }}>LOST</div>
                  </div>
                  {isAdmin && (
                    <button className="tm-btn" style={{ marginLeft:"auto" }} onClick={() => setEditBattles(true)}>EDIT</button>
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
                {editingObj===obj.id && isAdmin ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    <input className="tm-input" value={obj.label}
                      onChange={e => setObjectives(os => os.map(o => o.id===obj.id ? {...o, label:e.target.value} : o))} />
                    <select className="tm-select" value={obj.faction}
                      onChange={e => setObjectives(os => os.map(o => o.id===obj.id ? {...o, faction:e.target.value} : o))}>
                      {factionList.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                      <option value="Independent">Independent</option>
                    </select>
                    <button className="tm-btn" onClick={() => { setEditingObj(null); saveToDb({ objectives }); }}>CONFIRM</button>
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:6, cursor:isAdmin?"pointer":"default" }}
                    onClick={() => isAdmin && setEditingObj(obj.id)}>
                    <div style={{ width:5, height:5, borderRadius:"50%",
                      background:factionColor(obj.faction, factionList),
                      boxShadow:`0 0 5px ${factionColor(obj.faction, factionList)}`, flexShrink:0 }} />
                    <span style={{ fontSize:8, color:"#7aaccc", flex:1, textTransform:"uppercase", letterSpacing:0.5 }}>{obj.label}</span>
                    <span style={{ fontSize:7, color:factionColor(obj.faction, factionList)+"99",
                      letterSpacing:1, fontFamily:"'Orbitron',monospace", flexShrink:0 }}>
                      {factionAbbr(obj.faction)}
                    </span>
                    {isAdmin && <span style={{ fontSize:9, color:BLUE+"44" }}>✎</span>}
                  </div>
                )}
              </div>
            ))}
            {isAdmin && (
              <button className="tm-btn" style={{ width:"100%", marginTop:2 }} onClick={() => {
                const newObj = { id:`o${Date.now()}`, label:"New Objective", faction: planet.faction };
                const updated = [...objectives, newObj];
                setObjectives(updated);
                saveToDb({ objectives: updated });
              }}>+ ADD OBJECTIVE</button>
            )}
          </div>
        </Panel>

        {/* Estimated Forces */}
        <Panel label="EST. FORCES (MIL)" color={BLUE} style={{ margin:"10px 10px 0", flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
          <div style={{ padding:"8px 10px 6px", flex:1, overflowY:"auto" }}>
            {/* Column headers */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 30px 36px 36px 36px", gap:3,
              marginBottom:4, paddingBottom:4, borderBottom:`1px solid ${BLUE}11` }}>
              <div style={{ fontSize:6, color:BLUE+"33", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>FACTION</div>
              {["SHIP","FGTR","TRPS"].map(h => (
                <div key={h} style={{ fontSize:6, color:BLUE+"33", letterSpacing:1, fontFamily:"'Orbitron',monospace", textAlign:"center" }}>{h}</div>
              ))}
              <div/>
            </div>

            {forces.map(entry => {
              const fc = factionColor(entry.faction, factionList);
              const isEditing = editingForceId === entry.id;
              return (
                <div key={entry.id} style={{ marginBottom:6 }}>
                  {isEditing && isAdmin ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:4,
                      background:`${BLUE}06`, border:`1px solid ${BLUE}22`, padding:"6px 6px" }}>
                      <select className="tm-select" value={entry.faction}
                        onChange={e => setForces(fs => fs.map(f => f.id===entry.id ? {...f, faction:e.target.value} : f))}>
                        {factionList.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                        <option value="Independent">Independent</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4 }}>
                        {(["ships","fighters","troops"] as const).map(field => (
                          <div key={field}>
                            <div style={{ fontSize:6, color:fc+"66", fontFamily:"'Orbitron',monospace", letterSpacing:1, marginBottom:2, textTransform:"uppercase" }}>
                              {field === "ships" ? "Ships (mil)" : field === "fighters" ? "Fgtrs (mil)" : "Troops (mil)"}
                            </div>
                            <input className="tm-input" type="number" min={0}
                              value={entry[field]}
                              onChange={e => setForces(fs => fs.map(f => f.id===entry.id ? {...f, [field]: Math.max(0, +e.target.value)} : f))} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display:"flex", gap:4 }}>
                        <button className="tm-btn" style={{ flex:1 }}
                          onClick={() => { setEditingForceId(null); saveToDb({ forces }); }}>
                          CONFIRM
                        </button>
                        <button className="tm-btn tm-btn-red"
                          onClick={() => { const upd=forces.filter(f=>f.id!==entry.id); setForces(upd); setEditingForceId(null); saveToDb({forces:upd}); }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 30px 36px 36px 36px", gap:3,
                      alignItems:"center", cursor: isAdmin?"pointer":"default",
                      padding:"3px 0", borderBottom:`1px solid ${BLUE}08` }}
                      onClick={() => isAdmin && setEditingForceId(entry.id)}>
                      <div style={{ display:"flex", alignItems:"center", gap:4, minWidth:0 }}>
                        <div style={{ width:5, height:5, borderRadius:"50%", background:fc, flexShrink:0, boxShadow:`0 0 4px ${fc}` }} />
                        <span style={{ fontSize:8, color:fc+"cc", textTransform:"uppercase", letterSpacing:0.5,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {entry.faction}
                        </span>
                      </div>
                      {isAdmin && <span style={{ fontSize:8, color:BLUE+"33", textAlign:"center" }}>✎</span>}
                      {(["ships","fighters","troops"] as const).map(field => (
                        <div key={field} style={{ textAlign:"center" }}>
                          <div style={{ fontSize:11, fontWeight:700, color: entry[field]>0 ? fc : BLUE+"22",
                            fontFamily:"'Orbitron',monospace", lineHeight:1 }}>
                            {entry[field] > 0 ? entry[field].toLocaleString() : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Totals row */}
            {forces.length > 1 && (() => {
              const totShips    = forces.reduce((a,f)=>a+f.ships,0);
              const totFighters = forces.reduce((a,f)=>a+f.fighters,0);
              const totTroops   = forces.reduce((a,f)=>a+f.troops,0);
              return (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 30px 36px 36px 36px", gap:3,
                  marginTop:4, paddingTop:4, borderTop:`1px solid ${BLUE}22` }}>
                  <div style={{ fontSize:6, color:BLUE+"44", fontFamily:"'Orbitron',monospace", letterSpacing:1 }}>TOTAL</div>
                  <div/>
                  {[totShips, totFighters, totTroops].map((v,i) => (
                    <div key={i} style={{ textAlign:"center", fontSize:9, fontWeight:700,
                      color:BLUE+"88", fontFamily:"'Orbitron',monospace" }}>
                      {v > 0 ? v.toLocaleString() : "—"}
                    </div>
                  ))}
                </div>
              );
            })()}

            {isAdmin && (
              <button className="tm-btn" style={{ width:"100%", marginTop:6 }} onClick={() => {
                const newEntry: ForceEntry = { id:`force-${Date.now()}`, faction:"Independent", ships:0, fighters:0, troops:0 };
                const upd = [...forces, newEntry];
                setForces(upd);
                setEditingForceId(newEntry.id);
                saveToDb({ forces: upd });
              }}>+ ADD FORCE ENTRY</button>
            )}
          </div>
        </Panel>

        {/* Footer */}
        <div style={{ padding:"8px 10px", fontSize:7, color:BLUE+"22", letterSpacing:1,
          fontFamily:"'Orbitron',monospace", lineHeight:1.8, borderTop:`1px solid ${BLUE}11` }}>
          <div>SYS REF: SW-{planet.id.slice(-6).toUpperCase()}</div>
          <div style={{ display:"flex", gap:4 }}>
            <span>STATUS:</span><Dot color={RRED} />
            <span style={{ color:RRED+"66" }}>ACTIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page wrapper ──────────────────────────────────────────────────────── */
export default function TheatreMap() {
  const params = useParams<{ planetId: string }>();
  return (
    <MapProvider>
      <TheatreMapInner planetId={params.planetId} />
    </MapProvider>
  );
}
