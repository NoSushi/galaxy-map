import { useState } from "react";

type Body = {
  id: string; name: string; type: "star"|"planet"|"moon"|"station"|"asteroid";
  x: number; y: number; radius: number; color: string; faction?: string; description?: string;
};
type FleetMarker = {
  id: string; name: string; x: number; y: number; faction: string;
  isCapital?: boolean; side: "defense"|"assault";
};
type Objective = { id: string; label: string; faction: string; };
type SectorPlanet = { id: string; name: string; faction: string; };

const FACTIONS = ["Galactic Republic","Empire","Hutt Cartel","Chiss Ascendancy","Rebel Alliance","Independent"];
const FACTION_COL: Record<string,string> = {
  "Galactic Republic":"#3399ff","Empire":"#ff2222","Hutt Cartel":"#ff9900",
  "Chiss Ascendancy":"#0088ff","Rebel Alliance":"#ff4444","Independent":"#5588aa",
};

const BODIES: Body[] = [
  { id:"star",    name:"Hoth Prime",            type:"star",     x:480, y:300, radius:44, color:"#ffdd66" },
  { id:"hoth",    name:"Hoth",                  type:"planet",   x:255, y:300, radius:26, color:"#9dd4f5", faction:"Rebel Alliance", description:"Frozen world — Echo Base Delta-One" },
  { id:"moon1",   name:"Hoth I",                type:"moon",     x:202, y:272, radius:8,  color:"#8899bb" },
  { id:"moon2",   name:"Hoth II",               type:"moon",     x:214, y:332, radius:6,  color:"#776688" },
  { id:"station", name:"Imperial Relay Station", type:"station",  x:680, y:185, radius:12, color:"#ff3333", faction:"Empire" },
  { id:"ast1",    name:"Ore Belt Alpha",         type:"asteroid", x:395, y:142, radius:5,  color:"#887755" },
];
const FLEETS: FleetMarker[] = [
  { id:"f1", name:"Rogue Squadron",    x:188, y:220, faction:"Rebel Alliance", side:"defense" },
  { id:"f2", name:"Echo Base Defense", x:150, y:340, faction:"Rebel Alliance", side:"defense" },
  { id:"f3", name:"Death Squadron",    x:635, y:225, faction:"Empire", isCapital:true,  side:"assault" },
  { id:"f4", name:"Blizzard Force",    x:298, y:238, faction:"Empire", side:"assault" },
];

const BLUE  = "#00aaff";
const LBLUE = "#33ccff";
const RED   = "#ff2222";
const DIM   = "#003355";
const BG    = "#000a14";

function HudBrackets({ color = BLUE }: { color?: string }) {
  const C = 14, T = 2;
  return <>
    {([["tl","0,0"],["tr",`${C},0`],["bl",`0,${C}`],["br",`${C},${C}`]] as [string,[string]][]).map(([pos]) => {
      const [vy,vx] = pos.split("");
      const ox = vx==="r" ? C : 0, oy = vy==="b" ? C : 0;
      const sx = vx==="r" ? -1 : 1, sy = vy==="b" ? -1 : 1;
      return (
        <div key={pos} style={{ position:"absolute", ...(vy==="t"?{top:0}:{bottom:0}), ...(vx==="l"?{left:0}:{right:0}) }}>
          <svg width={C} height={C}>
            <polyline points={`${ox},${C-oy} ${ox},${oy} ${C-ox},${oy}`}
              fill="none" stroke={color} strokeWidth={T}
              transform={`scale(${sx},${sy}) translate(${sx<0?-C:0},${sy<0?-C:0})`} />
          </svg>
        </div>
      );
    })}
  </>;
}

function Panel({ children, label, color=BLUE, className="" }: { children:React.ReactNode; label?:string; color?:string; className?:string }) {
  return (
    <div className={className} style={{ position:"relative", border:`1px solid ${color}22` }}>
      <HudBrackets color={color} />
      {label && <div style={{ position:"absolute", top:-9, left:10, background:BG, padding:"0 5px", fontSize:8, color, letterSpacing:2, fontFamily:"'Orbitron',monospace", textTransform:"uppercase" }}>{label}</div>}
      {children}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:color, boxShadow:`0 0 6px ${color}`, animation:"blink 1.2s step-end infinite" }} />;
}

export function SystemMap() {
  const [selected,    setSelected]    = useState<string>("hoth");
  const [tab,         setTab]         = useState<"bodies"|"fleets">("bodies");
  const [isAdmin]                     = useState(true); // simulating admin mode
  const [editingObj,  setEditingObj]  = useState<string|null>(null);
  const [objectives,  setObjectives]  = useState<Objective[]>([
    { id:"o1", label:"Echo Base",       faction:"Rebel Alliance" },
    { id:"o2", label:"Power Generator", faction:"Empire" },
    { id:"o3", label:"Ion Cannon",      faction:"Rebel Alliance" },
    { id:"o4", label:"Evac Route",      faction:"Independent" },
  ]);
  const [sectorPlanets, setSectorPlanets] = useState<SectorPlanet[]>([
    { id:"p1", name:"Hoth",          faction:"Rebel Alliance" },
    { id:"p2", name:"Bespin",        faction:"Empire" },
    { id:"p3", name:"Ord Mantell",   faction:"Empire" },
    { id:"p4", name:"Toola",         faction:"Independent" },
    { id:"p5", name:"Anoat",         faction:"Independent" },
  ]);
  const [editingPlanet, setEditingPlanet] = useState<string|null>(null);
  const [battles, setBattles] = useState({ won: 3, lost: 2 });
  const [editingBattles, setEditingBattles] = useState(false);

  const selectedBody  = BODIES.find(b => b.id === selected);
  const selectedFleet = FLEETS.find(f => f.id === selected);

  const gridLines: React.ReactElement[] = [];
  for (let x = 0; x <= 900; x += 50) gridLines.push(<line key={`gx${x}`} x1={x} y1={0} x2={x} y2={600} stroke={BLUE} strokeWidth="0.25" opacity="0.15" />);
  for (let y = 0; y <= 600; y += 50) gridLines.push(<line key={`gy${y}`} x1={0} y1={y} x2={900} y2={y} stroke={BLUE} strokeWidth="0.25" opacity="0.15" />);

  return (
    <div style={{ display:"flex", height:"100vh", background:BG, color:"#cce8ff", fontFamily:"'Rajdhani','Orbitron',monospace", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;600;700;900&display=swap');
        @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        select,input{background:#000d1a;color:#00aaff;border:1px solid #00aaff44;padding:2px 4px;font-family:'Orbitron',monospace;font-size:9px;outline:none;letter-spacing:1px;}
        select option{background:#000d1a;}
        *::-webkit-scrollbar{width:3px} *::-webkit-scrollbar-track{background:#001122} *::-webkit-scrollbar-thumb{background:#00aaff33}
      `}</style>

      {/* ══ LEFT PANEL ══ */}
      <div style={{ width:242, flexShrink:0, display:"flex", flexDirection:"column", borderRight:`1px solid ${BLUE}22`, background:"#00060f" }}>
        {/* Header */}
        <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${BLUE}22`, background:"#000d1a" }}>
          <button style={{ fontSize:8, color:BLUE+"88", letterSpacing:2, background:"none", border:"none", cursor:"pointer", fontFamily:"'Orbitron',monospace", padding:0, marginBottom:6 }}>
            ← GALAXY MAP
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <Dot color={RED} />
            <span style={{ fontSize:8, color:RED, letterSpacing:3, fontFamily:"'Orbitron',monospace" }}>WARZONE ACTIVE</span>
          </div>
          <div style={{ fontSize:18, fontWeight:900, color:LBLUE, letterSpacing:3, fontFamily:"'Orbitron',monospace", textShadow:`0 0 16px ${BLUE}88` }}>HOTH SYS.</div>
          <div style={{ fontSize:8, color:BLUE+"44", letterSpacing:2, marginTop:1, fontFamily:"'Orbitron',monospace" }}>ANOAT SECTOR · OUTER RIM</div>
          <div style={{ display:"flex", gap:2, marginTop:8 }}>
            {Array.from({length:20}).map((_,i) => <div key={i} style={{ flex:1, height:2, background:BLUE, boxShadow:`0 0 3px ${BLUE}` }} />)}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${BLUE}22` }}>
          {(["bodies","fleets"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:"7px 0", fontSize:8, letterSpacing:2, fontFamily:"'Orbitron',monospace", textTransform:"uppercase",
              background: tab===t ? `${BLUE}11` : "transparent",
              color: tab===t ? LBLUE : BLUE+"44",
              border:"none", borderBottom: tab===t ? `2px solid ${BLUE}` : "2px solid transparent",
              cursor:"pointer",
            }}>
              {t === "bodies" ? "SYS BODIES" : "FLEETS"}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {tab==="bodies" ? BODIES.map(b => {
            const isSel = selected===b.id;
            return (
              <button key={b.id} onClick={() => setSelected(b.id)} style={{
                width:"100%", textAlign:"left", padding:"7px 12px", display:"flex", alignItems:"center", gap:8,
                background: isSel ? `${BLUE}0d` : "transparent",
                borderLeft: isSel ? `2px solid ${BLUE}` : "2px solid transparent",
                border:"none", cursor:"pointer",
              }}>
                <div style={{ width:b.type==="star"?12:b.type==="planet"?10:7, height:b.type==="star"?12:b.type==="planet"?10:7, borderRadius:"50%", flexShrink:0, background:b.color, boxShadow:isSel?`0 0 8px ${b.color}`:"none" }} />
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:isSel?LBLUE:"#7aaccc", letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.name}</div>
                  <div style={{ fontSize:8, color:BLUE+"44", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{b.type}</div>
                </div>
                {b.faction && <div style={{ marginLeft:"auto", fontSize:7, color:FACTION_COL[b.faction]??"#aaa", border:`1px solid ${FACTION_COL[b.faction]??"#aaa"}44`, padding:"1px 4px", flexShrink:0, fontFamily:"'Orbitron',monospace" }}>{b.faction==="Rebel Alliance"?"RBL":b.faction==="Empire"?"IMP":b.faction.slice(0,3).toUpperCase()}</div>}
              </button>
            );
          }) : FLEETS.map(f => {
            const isSel = selected===f.id;
            const fc = f.faction==="Rebel Alliance" ? BLUE : RED;
            return (
              <button key={f.id} onClick={() => setSelected(f.id)} style={{
                width:"100%", textAlign:"left", padding:"7px 12px", display:"flex", alignItems:"center", gap:8,
                background: isSel ? `${fc}0d` : "transparent",
                borderLeft: isSel ? `2px solid ${fc}` : "2px solid transparent",
                border:"none", cursor:"pointer",
              }}>
                <svg width={10} height={10}><polygon points={f.faction==="Rebel Alliance"?"5,0 10,10 0,10":"5,10 10,0 0,0"} fill={fc} opacity={isSel?1:0.5} /></svg>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:isSel?fc:"#7aaccc", letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{f.name}</div>
                  <div style={{ fontSize:7, color:fc+"88", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{f.side==="defense"?"⬟ DEFENSE":"▼ ASSAULT"}</div>
                </div>
                {f.isCapital && <span style={{ marginLeft:"auto", fontSize:7, color:"#ffdd00", flexShrink:0, fontFamily:"'Orbitron',monospace" }}>CAP</span>}
              </button>
            );
          })}
        </div>

        {/* Detail pane */}
        {(selectedBody || selectedFleet) && (
          <div style={{ borderTop:`1px solid ${BLUE}22`, padding:"10px 12px", background:"#000d1a" }}>
            {selectedBody && <>
              <div style={{ fontSize:7, color:BLUE+"44", letterSpacing:2, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>{selectedBody.type} // RECORD</div>
              <div style={{ fontSize:13, fontWeight:700, color:LBLUE, letterSpacing:2, textTransform:"uppercase", textShadow:`0 0 8px ${BLUE}44` }}>{selectedBody.name}</div>
              {selectedBody.faction && <div style={{ fontSize:8, color:FACTION_COL[selectedBody.faction], letterSpacing:1, marginTop:2, fontFamily:"'Orbitron',monospace" }}>{selectedBody.faction}</div>}
              {selectedBody.description && <p style={{ fontSize:9, color:"#446688", marginTop:6, lineHeight:1.5 }}>{selectedBody.description}</p>}
              {selectedBody.type==="planet" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginTop:8 }}>
                  {[["STATUS","CONTESTED"],["THREAT","HIGH"],["POP.","NONE"],["CLASS","ICE-IV"]].map(([k,v]) => (
                    <div key={k} style={{ background:`${BLUE}08`, border:`1px solid ${BLUE}22`, padding:"4px 6px" }}>
                      <div style={{ fontSize:7, color:BLUE+"44", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{k}</div>
                      <div style={{ fontSize:9, color:BLUE, fontWeight:700, letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
            </>}
            {selectedFleet && !selectedBody && (() => {
              const fc = selectedFleet.faction==="Rebel Alliance" ? BLUE : RED;
              return <>
                <div style={{ fontSize:7, color:fc+"66", letterSpacing:2, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>{selectedFleet.side} // UNIT</div>
                <div style={{ fontSize:13, fontWeight:700, color:fc, letterSpacing:2, textTransform:"uppercase" }}>{selectedFleet.name}</div>
                <div style={{ fontSize:8, color:fc+"88", letterSpacing:1, marginTop:2, fontFamily:"'Orbitron',monospace" }}>{selectedFleet.faction}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, marginTop:8 }}>
                  {[["STRENGTH","FULL"],["STATUS","ACTIVE"],["ROLE",selectedFleet.side==="defense"?"HOLD":"STRIKE"],["COMMS","SECURE"]].map(([k,v]) => (
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
        {/* HUD corner brackets */}
        {(["tl","tr","bl","br"] as const).map(c => {
          const vy = c[0]==="t", vx = c[1]==="l";
          return (
            <svg key={c} style={{ position:"absolute", top:vy?0:undefined, bottom:vy?undefined:0, left:vx?0:undefined, right:vx?undefined:0, zIndex:20 }} width={40} height={40}>
              <polyline points={`0,40 0,0 40,0`} fill="none" stroke={BLUE} strokeWidth="2"
                transform={`${!vx?"scale(-1,1) translate(-40,0)":""} ${!vy?"scale(1,-1) translate(0,-40)":""}`.trim()} />
            </svg>
          );
        })}

        {/* Top bar */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:36, display:"flex", alignItems:"center", padding:"0 48px", zIndex:15, borderBottom:`1px solid ${BLUE}22`, background:`linear-gradient(to bottom,#00060e,transparent)` }}>
          <span style={{ fontSize:18, fontWeight:900, color:LBLUE, letterSpacing:4, fontFamily:"'Orbitron',monospace", textShadow:`0 0 20px ${BLUE}88` }}>SYSTEM MAP</span>
          <span style={{ fontSize:9, color:BLUE+"44", letterSpacing:2, fontFamily:"'Orbitron',monospace", marginLeft:14, marginTop:2 }}>· WARZONE THEATER ·</span>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}><Dot color={BLUE} /><span style={{ fontSize:8, color:BLUE+"aa", letterSpacing:2, fontFamily:"'Orbitron',monospace" }}>02 DEFENSE</span></div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}><Dot color={RED} /><span style={{ fontSize:8, color:RED+"aa", letterSpacing:2, fontFamily:"'Orbitron',monospace" }}>02 ASSAULT</span></div>
          </div>
        </div>

        {/* SVG */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="starG2"><stop offset="0%" stopColor="#ffee88" stopOpacity="0.45" /><stop offset="100%" stopColor="#ffcc22" stopOpacity="0" /></radialGradient>
            <filter id="g2"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="g4"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {gridLines}
          <ellipse cx="480" cy="300" rx="230" ry="65" fill="none" stroke={BLUE} strokeWidth="0.5" strokeDasharray="6,8" opacity="0.18" />
          <ellipse cx="480" cy="300" rx="320" ry="90" fill="none" stroke={BLUE} strokeWidth="0.4" strokeDasharray="4,10" opacity="0.1" />
          <ellipse cx="255" cy="300" rx="52" ry="18" fill="none" stroke={BLUE} strokeWidth="0.4" strokeDasharray="3,5" opacity="0.12" />
          <ellipse cx="480" cy="300" rx="80" ry="80" fill="url(#starG2)" />
          {[0,1,2,3,4,5,6,7,8,9].map(i => <text key={i} x={i*100+4} y={14} fill={BLUE} fontSize={7} opacity={0.2} fontFamily="Orbitron,monospace">{String(i).padStart(2,"0")}</text>)}
          {[0,1,2,3,4,5].map(i => <text key={i} x={4} y={i*100+12} fill={BLUE} fontSize={7} opacity={0.2} fontFamily="Orbitron,monospace">{String(i).padStart(2,"0")}</text>)}

          {BODIES.map(b => {
            const isSel = selected===b.id;
            return (
              <g key={b.id} onClick={() => setSelected(b.id)} style={{ cursor:"pointer" }}>
                {isSel && <>
                  <circle cx={b.x} cy={b.y} r={b.radius+18} fill="none" stroke={BLUE} strokeWidth="0.8" strokeDasharray="4,3" opacity={0.7}>
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${b.x} ${b.y}`} to={`360 ${b.x} ${b.y}`} dur="6s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={b.x} cy={b.y} r={b.radius+24} fill="none" stroke={BLUE} strokeWidth="0.4" opacity={0.25} />
                  {[0,90,180,270].map(deg => { const r1=b.radius+18,r2=b.radius+24,rad=(deg*Math.PI)/180; return <line key={deg} x1={b.x+r1*Math.cos(rad)} y1={b.y+r1*Math.sin(rad)} x2={b.x+r2*Math.cos(rad)} y2={b.y+r2*Math.sin(rad)} stroke={BLUE} strokeWidth="1" opacity={0.7} />; })}
                </>}
                {b.type==="star" && <ellipse cx={b.x} cy={b.y} rx={80} ry={80} fill="url(#starG2)" />}
                <circle cx={b.x} cy={b.y} r={b.radius} fill={b.type==="star"?"#ffdd66":b.color}
                  stroke={isSel?BLUE:b.faction?FACTION_COL[b.faction]+"55":"transparent"} strokeWidth={isSel?1.5:1}
                  filter={b.type==="star"?"url(#g4)":isSel?"url(#g2)":undefined} />
                {b.type==="station" && <><line x1={b.x-18} y1={b.y} x2={b.x-b.radius} y2={b.y} stroke={RED} strokeWidth="1.5"/><line x1={b.x+b.radius} y1={b.y} x2={b.x+18} y2={b.y} stroke={RED} strokeWidth="1.5"/></>}
                {b.type!=="asteroid" && <text x={b.x} y={b.y+b.radius+14} textAnchor="middle" fill={isSel?LBLUE:BLUE+"88"} fontSize={b.type==="star"?10:b.type==="planet"?9:7} fontFamily="Orbitron,monospace" fontWeight={isSel?"700":"400"} letterSpacing="1.5" style={{ textTransform:"uppercase" }}>{b.name}</text>}
              </g>
            );
          })}

          {FLEETS.map(f => {
            const isSel = selected===f.id;
            const isRbl = f.faction==="Rebel Alliance";
            const fc = isRbl ? BLUE : RED;
            const pts = isRbl ? `${f.x},${f.y-11} ${f.x-8},${f.y+7} ${f.x},${f.y+2} ${f.x+8},${f.y+7}` : `${f.x},${f.y+11} ${f.x-8},${f.y-7} ${f.x},${f.y-2} ${f.x+8},${f.y-7}`;
            return (
              <g key={f.id} onClick={() => { setSelected(f.id); setTab("fleets"); }} style={{ cursor:"pointer" }}>
                {isSel && <circle cx={f.x} cy={f.y} r={22} fill="none" stroke={fc} strokeWidth="1" strokeDasharray="3,2" opacity={0.6}><animateTransform attributeName="transform" type="rotate" from={`0 ${f.x} ${f.y}`} to={`360 ${f.x} ${f.y}`} dur="2.5s" repeatCount="indefinite"/></circle>}
                <polygon points={pts} fill={fc} opacity={isSel?0.95:0.6} filter={isSel?"url(#g2)":undefined} stroke={isSel?"#fff":"transparent"} strokeWidth="0.8"/>
                {f.isCapital && <text x={f.x} y={f.y+1} textAnchor="middle" fill="#fff" fontSize={7} fontFamily="Arial" dominantBaseline="middle">★</text>}
                <text x={f.x} y={f.y+(isRbl?24:-16)} textAnchor="middle" fill={isSel?fc:fc+"88"} fontSize={7.5} fontFamily="Orbitron,monospace" fontWeight="600" letterSpacing="1" style={{ textTransform:"uppercase" }}>{f.name}</text>
              </g>
            );
          })}

          <line x1={0} y1={585} x2={900} y2={585} stroke={BLUE} strokeWidth="0.4" opacity="0.25" />
          <text x={20} y={596} fill={BLUE+"44"} fontSize={7} fontFamily="Orbitron,monospace" letterSpacing="1">HOTH SYSTEM · TACTICAL OVERLAY · REF: HG-4401</text>
          <text x={880} y={596} fill={BLUE+"44"} fontSize={7} fontFamily="Orbitron,monospace" textAnchor="end" letterSpacing="1">IMPERIAL SURVEY 0031-ATT</text>
        </svg>

        <div style={{ position:"absolute", bottom:16, right:16, display:"flex", flexDirection:"column", gap:4, zIndex:20 }}>
          {["+","−"].map(l => <button key={l} style={{ width:28, height:28, background:"#00060e", border:`1px solid ${BLUE}44`, color:BLUE, fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>{l}</button>)}
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div style={{ width:210, flexShrink:0, display:"flex", flexDirection:"column", borderLeft:`1px solid ${BLUE}22`, background:"#00060f" }}>
        {/* Battle record */}
        <Panel label="BATTLE RECORD" color={BLUE} style={{ margin:"10px 10px 0" } as React.CSSProperties}>
          <div style={{ padding:"10px 10px 8px" }}>
            <div style={{ fontSize:10, fontWeight:700, color:LBLUE, letterSpacing:2, fontFamily:"'Orbitron',monospace", marginBottom:8 }}>BATTLE OF HOTH</div>
            {editingBattles && isAdmin ? (
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:8, color:BLUE+"88", fontFamily:"'Orbitron',monospace" }}>W</span>
                <input type="number" value={battles.won} onChange={e => setBattles(b => ({...b, won: Number(e.target.value)}))} style={{ width:36 }} />
                <span style={{ fontSize:8, color:BLUE+"88", fontFamily:"'Orbitron',monospace" }}>L</span>
                <input type="number" value={battles.lost} onChange={e => setBattles(b => ({...b, lost: Number(e.target.value)}))} style={{ width:36 }} />
                <button onClick={() => setEditingBattles(false)} style={{ fontSize:7, color:BLUE, background:"none", border:`1px solid ${BLUE}44`, padding:"1px 5px", cursor:"pointer", fontFamily:"'Orbitron',monospace" }}>SAVE</button>
              </div>
            ) : (
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:26, fontWeight:900, color:BLUE, fontFamily:"'Orbitron',monospace", lineHeight:1, textShadow:`0 0 12px ${BLUE}88` }}>{battles.won}</div>
                  <div style={{ fontSize:7, color:BLUE+"55", letterSpacing:2, fontFamily:"'Orbitron',monospace" }}>WON</div>
                </div>
                <div style={{ color:BLUE+"33", fontSize:18, fontFamily:"'Orbitron',monospace" }}>/</div>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:26, fontWeight:900, color:RED, fontFamily:"'Orbitron',monospace", lineHeight:1, textShadow:`0 0 12px ${RED}88` }}>{battles.lost}</div>
                  <div style={{ fontSize:7, color:RED+"55", letterSpacing:2, fontFamily:"'Orbitron',monospace" }}>LOST</div>
                </div>
                {isAdmin && <button onClick={() => setEditingBattles(true)} style={{ marginLeft:"auto", fontSize:7, color:BLUE+"66", background:"none", border:`1px solid ${BLUE}22`, padding:"2px 6px", cursor:"pointer", fontFamily:"'Orbitron',monospace" }}>EDIT</button>}
              </div>
            )}
          </div>
        </Panel>

        {/* Objectives */}
        <Panel label="OBJECTIVES" color={BLUE} style={{ margin:"10px 10px 0", flex:"none" } as React.CSSProperties}>
          <div style={{ padding:"10px 10px 8px" }}>
            {objectives.map(obj => (
              <div key={obj.id} style={{ marginBottom:7 }}>
                {editingObj===obj.id && isAdmin ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                    <input defaultValue={obj.label} onChange={e => setObjectives(os => os.map(o => o.id===obj.id ? {...o, label:e.target.value} : o))} style={{ width:"100%" }} />
                    <select value={obj.faction} onChange={e => { setObjectives(os => os.map(o => o.id===obj.id ? {...o, faction:e.target.value} : o)); setEditingObj(null); }}>
                      {FACTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <button onClick={() => setEditingObj(null)} style={{ fontSize:7, color:BLUE, background:"none", border:`1px solid ${BLUE}44`, cursor:"pointer", fontFamily:"'Orbitron',monospace", padding:"2px" }}>CONFIRM</button>
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:6 }} onClick={() => isAdmin && setEditingObj(obj.id)}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:FACTION_COL[obj.faction]??BLUE, boxShadow:`0 0 5px ${FACTION_COL[obj.faction]??BLUE}`, flexShrink:0 }} />
                    <span style={{ fontSize:8, color:"#7aaccc", flex:1, textTransform:"uppercase", letterSpacing:0.5, cursor:isAdmin?"pointer":"default" }}>{obj.label}</span>
                    <span style={{ fontSize:7, color:(FACTION_COL[obj.faction]??BLUE)+"99", letterSpacing:1, fontFamily:"'Orbitron',monospace", flexShrink:0 }}>
                      {obj.faction==="Rebel Alliance"?"RBL":obj.faction==="Empire"?"IMP":obj.faction.slice(0,3).toUpperCase()}
                    </span>
                    {isAdmin && <span style={{ fontSize:8, color:BLUE+"44", cursor:"pointer" }}>✎</span>}
                  </div>
                )}
              </div>
            ))}
            {isAdmin && <button onClick={() => setObjectives(os => [...os, {id:`o${Date.now()}`,label:"New Objective",faction:"Independent"}])} style={{ width:"100%", marginTop:2, fontSize:7, color:BLUE+"66", background:"none", border:`1px solid ${BLUE}22`, padding:"3px 0", cursor:"pointer", fontFamily:"'Orbitron',monospace", letterSpacing:1 }}>+ ADD OBJECTIVE</button>}
          </div>
        </Panel>

        {/* Sector Control */}
        <Panel label="SECTOR CONTROL" color={BLUE} style={{ margin:"10px 10px 0", flex:1, display:"flex", flexDirection:"column" } as React.CSSProperties}>
          <div style={{ padding:"10px 10px 8px", flex:1, overflowY:"auto" }}>
            {sectorPlanets.map(p => (
              <div key={p.id} style={{ marginBottom:6 }}>
                {editingPlanet===p.id && isAdmin ? (
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    <span style={{ fontSize:8, color:BLUE+"88", flex:1, textTransform:"uppercase" }}>{p.name}</span>
                    <select value={p.faction} onChange={e => { setSectorPlanets(ps => ps.map(sp => sp.id===p.id ? {...sp, faction:e.target.value} : sp)); setEditingPlanet(null); }}>
                      {FACTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", gap:6 }} onClick={() => isAdmin && setEditingPlanet(p.id)}>
                    <div style={{ width:4, height:4, borderRadius:"50%", background:FACTION_COL[p.faction]??BLUE, flexShrink:0 }} />
                    <span style={{ fontSize:8, color:"#7aaccc", flex:1, textTransform:"uppercase", letterSpacing:0.5 }}>{p.name}</span>
                    <span style={{ fontSize:7, color:(FACTION_COL[p.faction]??BLUE)+"cc", letterSpacing:1, fontFamily:"'Orbitron',monospace" }}>
                      {p.faction==="Rebel Alliance"?"RBL":p.faction==="Empire"?"IMP":p.faction.slice(0,3).toUpperCase()}
                    </span>
                    {isAdmin && <span style={{ fontSize:8, color:BLUE+"44", cursor:"pointer" }}>✎</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        {/* Admin controls */}
        {isAdmin && (
          <div style={{ padding:"10px 10px", borderTop:`1px solid ${BLUE}22`, display:"flex", flexDirection:"column", gap:4 }}>
            <div style={{ fontSize:7, color:BLUE+"44", letterSpacing:2, fontFamily:"'Orbitron',monospace", marginBottom:2 }}>ADMIN CONTROLS</div>
            {[{label:"+ ADD BODY", color:BLUE},{label:"+ ADD FLEET", color:LBLUE},{label:"CLEAR WARZONE", color:RED}].map(btn => (
              <button key={btn.label} style={{ width:"100%", textAlign:"left", padding:"5px 8px", fontSize:7, letterSpacing:1.5, fontFamily:"'Orbitron',monospace", background:`${btn.color}08`, border:`1px solid ${btn.color}33`, color:btn.color+"aa", cursor:"pointer", textTransform:"uppercase" }}>
                {btn.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding:"0 10px 10px", fontSize:7, color:BLUE+"22", letterSpacing:1, fontFamily:"'Orbitron',monospace", lineHeight:1.8 }}>
          <div>SYS REF: HG-4401</div>
          <div style={{ display:"flex", gap:4 }}><span>STATUS:</span><Dot color={RED} /><span style={{ color:RED+"66" }}>ACTIVE</span></div>
        </div>
      </div>
    </div>
  );
}
