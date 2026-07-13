import { useState } from "react";

const DOMAIN = "cce723cc-92a2-4429-893e-b26478f7a821-00-1lh6qw7p1kibt.janeway.replit.dev";

type Body = {
  id: string;
  name: string;
  type: "star" | "planet" | "moon" | "station" | "asteroid";
  x: number;
  y: number;
  radius: number;
  color: string;
  glowColor: string;
  faction?: string;
  description?: string;
};

type FleetMarker = {
  id: string;
  name: string;
  x: number;
  y: number;
  faction: string;
  color: string;
  isCapital?: boolean;
  side: "defense" | "assault";
};

const BODIES: Body[] = [
  { id: "star", name: "Hoth Prime", type: "star", x: 450, y: 360, radius: 52, color: "#ffe4a0", glowColor: "rgba(255,220,100,0.35)", faction: undefined },
  { id: "hoth", name: "Hoth", type: "planet", x: 230, y: 360, radius: 28, color: "#c8e8ff", glowColor: "rgba(150,210,255,0.3)", faction: "Rebel Alliance", description: "Frozen world, Rebel base Delta-One" },
  { id: "moon1", name: "Hoth I", type: "moon", x: 178, y: 330, radius: 9, color: "#aaaacc", glowColor: "rgba(170,170,200,0.2)", faction: undefined },
  { id: "moon2", name: "Hoth II", type: "moon", x: 190, y: 395, radius: 7, color: "#998899", glowColor: "rgba(150,130,150,0.2)", faction: undefined },
  { id: "station", name: "Imperial Relay Station", type: "station", x: 660, y: 240, radius: 13, color: "#ff4444", glowColor: "rgba(255,50,50,0.35)", faction: "Empire" },
  { id: "asteroid1", name: "Ore Belt Alpha", type: "asteroid", x: 380, y: 170, radius: 6, color: "#776655", glowColor: "rgba(100,80,50,0.15)", faction: undefined },
  { id: "asteroid2", name: "Ore Belt Beta", type: "asteroid", x: 340, y: 155, radius: 5, color: "#665544", glowColor: "rgba(100,80,50,0.1)", faction: undefined },
  { id: "asteroid3", name: "Ore Belt Gamma", type: "asteroid", x: 415, y: 150, radius: 7, color: "#887766", glowColor: "rgba(100,80,50,0.12)", faction: undefined },
];

const FLEETS: FleetMarker[] = [
  { id: "f1", name: "Rogue Squadron", x: 185, y: 265, faction: "Rebel Alliance", color: "#f59e0b", isCapital: false, side: "defense" },
  { id: "f2", name: "Echo Base Defense", x: 150, y: 390, faction: "Rebel Alliance", color: "#22c55e", isCapital: false, side: "defense" },
  { id: "f3", name: "Death Squadron", x: 620, y: 280, faction: "Empire", color: "#ef4444", isCapital: true, side: "assault" },
  { id: "f4", name: "Blizzard Force", x: 290, y: 290, faction: "Empire", color: "#ef4444", isCapital: false, side: "assault" },
];

function orbitPath(cx: number, cy: number, rx: number, ry: number) {
  return `M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0`;
}

export function SystemMap() {
  const [selected, setSelected] = useState<string | null>("hoth");
  const [tab, setTab] = useState<"bodies" | "fleets">("bodies");

  const selectedBody = BODIES.find((b) => b.id === selected);
  const selectedFleet = FLEETS.find((f) => f.id === selected);

  const factionColor: Record<string, string> = {
    "Rebel Alliance": "#22c55e",
    Empire: "#ef4444",
    "Hutt Cartel": "#f59e0b",
    Independent: "#94a3b8",
  };

  return (
    <div className="flex h-screen bg-[#04080f] text-white overflow-hidden font-['Rajdhani',sans-serif]" style={{ fontFamily: "'Rajdhani', 'Orbitron', sans-serif" }}>
      {/* Google Fonts */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;600;700&display=swap" />

      {/* LEFT PANEL */}
      <div className="w-72 flex-shrink-0 border-r border-cyan-900/40 flex flex-col bg-[#050c18]/90 backdrop-blur z-10">
        {/* Header */}
        <div className="px-4 py-3 border-b border-cyan-900/40">
          <div className="flex items-center gap-2 mb-1">
            <button className="text-cyan-400/70 hover:text-cyan-300 text-xs tracking-widest uppercase flex items-center gap-1">
              ← Galaxy Map
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] text-red-400 uppercase tracking-widest font-semibold" style={{ fontFamily: "'Orbitron',sans-serif" }}>
              WARZONE ACTIVE
            </span>
          </div>
          <h1 className="text-lg font-bold text-cyan-300 mt-1 uppercase tracking-wider" style={{ fontFamily: "'Orbitron',sans-serif" }}>
            Hoth System
          </h1>
          <p className="text-[10px] text-cyan-500/60 uppercase tracking-widest">Anoat Sector · Outer Rim</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cyan-900/40">
          {(["bodies", "fleets"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-semibold transition-colors ${
                tab === t
                  ? "text-cyan-300 border-b-2 border-cyan-400 bg-cyan-950/30"
                  : "text-cyan-600/60 hover:text-cyan-400"
              }`}
              style={{ fontFamily: "'Orbitron',sans-serif" }}
            >
              {t === "bodies" ? "System Bodies" : "Fleets"}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-1">
          {tab === "bodies"
            ? BODIES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelected(b.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors border-l-2 ${
                    selected === b.id
                      ? "bg-cyan-950/40 border-cyan-400 text-cyan-100"
                      : "border-transparent text-cyan-300/60 hover:bg-cyan-950/20 hover:text-cyan-200"
                  }`}
                >
                  <div
                    className="rounded-full flex-shrink-0"
                    style={{
                      width: b.type === "star" ? 14 : b.type === "planet" ? 11 : b.type === "moon" ? 7 : 9,
                      height: b.type === "star" ? 14 : b.type === "planet" ? 11 : b.type === "moon" ? 7 : 9,
                      background: b.color,
                      boxShadow: `0 0 8px ${b.glowColor}`,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide truncate">{b.name}</div>
                    <div className="text-[9px] text-cyan-500/60 uppercase tracking-widest">{b.type}</div>
                  </div>
                  {b.faction && (
                    <div
                      className="ml-auto text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0"
                      style={{ color: factionColor[b.faction] ?? "#94a3b8", border: `1px solid ${factionColor[b.faction] ?? "#94a3b8"}44` }}
                    >
                      {b.faction === "Rebel Alliance" ? "Rebel" : b.faction}
                    </div>
                  )}
                </button>
              ))
            : FLEETS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelected(f.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors border-l-2 ${
                    selected === f.id
                      ? "bg-cyan-950/40 border-cyan-400 text-cyan-100"
                      : "border-transparent text-cyan-300/60 hover:bg-cyan-950/20 hover:text-cyan-200"
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: f.color, boxShadow: `0 0 6px ${f.color}88` }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide truncate">{f.name}</div>
                    <div className="text-[9px] uppercase tracking-widest" style={{ color: f.color + "99" }}>
                      {f.side === "defense" ? "⚔ Defense" : "⚡ Assault"}
                    </div>
                  </div>
                  {f.isCapital && (
                    <span className="ml-auto text-[8px] text-yellow-400 uppercase tracking-wider flex-shrink-0">Capital</span>
                  )}
                </button>
              ))}
        </div>

        {/* Detail Panel */}
        {(selectedBody || selectedFleet) && (
          <div className="border-t border-cyan-900/40 px-4 py-3 bg-[#060e1a]">
            {selectedBody && (
              <>
                <div className="text-[9px] text-cyan-500/60 uppercase tracking-widest mb-1">{selectedBody.type}</div>
                <div className="text-sm font-bold text-cyan-200 uppercase tracking-wider mb-1">{selectedBody.name}</div>
                {selectedBody.faction && (
                  <div className="text-[10px] mb-2" style={{ color: factionColor[selectedBody.faction] ?? "#94a3b8" }}>
                    {selectedBody.faction}
                  </div>
                )}
                {selectedBody.description && (
                  <p className="text-[10px] text-cyan-300/50 leading-relaxed">{selectedBody.description}</p>
                )}
                {selectedBody.type === "planet" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {[["Status", "Contested"], ["Threat", "High"], ["Pop.", "None"], ["Class", "Ice World"]].map(([k, v]) => (
                      <div key={k} className="bg-cyan-950/30 rounded px-2 py-1">
                        <div className="text-[8px] text-cyan-600/60 uppercase tracking-wider">{k}</div>
                        <div className="text-[10px] text-cyan-300 font-semibold">{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {selectedFleet && !selectedBody && (
              <>
                <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: selectedFleet.color + "99" }}>
                  {selectedFleet.side === "defense" ? "Defense Fleet" : "Assault Fleet"}
                </div>
                <div className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: selectedFleet.color }}>
                  {selectedFleet.name}
                </div>
                <div className="text-[10px] text-cyan-400/60 mb-3">{selectedFleet.faction}</div>
                <div className="grid grid-cols-2 gap-2">
                  {[["Strength", "Full"], ["Status", "Active"], ["Role", selectedFleet.side === "defense" ? "Hold" : "Strike"], ["Comms", "Secure"]].map(([k, v]) => (
                    <div key={k} className="bg-cyan-950/30 rounded px-2 py-1">
                      <div className="text-[8px] text-cyan-600/60 uppercase tracking-wider">{k}</div>
                      <div className="text-[10px] text-cyan-300 font-semibold">{v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* MAP AREA */}
      <div className="flex-1 relative overflow-hidden">
        {/* Starfield */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 50% 50%, #0a1628 0%, #040810 70%)",
        }}>
          {Array.from({ length: 90 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${(i * 137.5) % 100}%`,
                top: `${(i * 97.3) % 100}%`,
                width: i % 7 === 0 ? 2 : 1,
                height: i % 7 === 0 ? 2 : 1,
                background: "white",
                opacity: 0.15 + (i % 5) * 0.08,
              }}
            />
          ))}
        </div>

        {/* SVG system map */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 900 720" preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffe4a0" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffe4a0" stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="softglow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Orbit rings */}
          <ellipse cx="450" cy="360" rx="220" ry="60" fill="none" stroke="rgba(100,180,255,0.06)" strokeWidth="1" strokeDasharray="4,6" />
          <ellipse cx="450" cy="360" rx="320" ry="90" fill="none" stroke="rgba(100,180,255,0.04)" strokeWidth="1" strokeDasharray="3,8" />

          {/* Moon orbits around Hoth */}
          <ellipse cx="230" cy="360" rx="50" ry="18" fill="none" stroke="rgba(100,160,255,0.07)" strokeWidth="0.8" strokeDasharray="2,5" />

          {/* Star glow */}
          <ellipse cx="450" cy="360" rx="90" ry="90" fill="url(#starGlow)" />

          {/* Bodies */}
          {BODIES.map((b) => {
            const isSelected = selected === b.id;
            return (
              <g key={b.id} onClick={() => setSelected(b.id)} style={{ cursor: "pointer" }}>
                {isSelected && (
                  <circle cx={b.x} cy={b.y} r={b.radius + 10} fill="none" stroke="rgba(0,200,255,0.5)" strokeWidth="1.5" strokeDasharray="4,3">
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${b.x} ${b.y}`} to={`360 ${b.x} ${b.y}`} dur="4s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={b.x} cy={b.y} r={b.radius + 4} fill={b.glowColor} />
                <circle
                  cx={b.x} cy={b.y} r={b.radius}
                  fill={b.type === "star"
                    ? "radial-gradient(circle, #fff7d0, #ffcc44)"
                    : b.color}
                  style={{ fill: b.type === "star" ? "#ffe090" : b.color }}
                  stroke={isSelected ? "rgba(0,200,255,0.8)" : "transparent"}
                  strokeWidth="1.5"
                />
                {b.type === "station" && (
                  <rect x={b.x - 3} y={b.y - 14} width={6} height={2} fill="#ff4444" opacity={0.8} />
                )}
                {/* Label */}
                {b.type !== "asteroid" && (
                  <text
                    x={b.x}
                    y={b.y + b.radius + 14}
                    textAnchor="middle"
                    fill={isSelected ? "#67e8f9" : "rgba(150,200,230,0.6)"}
                    fontSize={b.type === "star" ? 11 : b.type === "planet" ? 10 : 8}
                    fontFamily="Rajdhani, sans-serif"
                    fontWeight={isSelected ? "700" : "500"}
                    letterSpacing="1"
                    style={{ textTransform: "uppercase" }}
                  >
                    {b.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Fleet markers */}
          {FLEETS.map((f) => {
            const isSelected = selected === f.id;
            const isMine = f.faction === "Rebel Alliance";
            return (
              <g key={f.id} onClick={() => { setSelected(f.id); setTab("fleets"); }} style={{ cursor: "pointer" }}>
                {isSelected && (
                  <circle cx={f.x} cy={f.y} r={20} fill="none" stroke={f.color + "77"} strokeWidth="1" strokeDasharray="3,2">
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${f.x} ${f.y}`} to={`360 ${f.x} ${f.y}`} dur="3s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Ship icon */}
                <polygon
                  points={isMine
                    ? `${f.x},${f.y - 12} ${f.x - 9},${f.y + 8} ${f.x},${f.y + 3} ${f.x + 9},${f.y + 8}`
                    : `${f.x},${f.y + 12} ${f.x - 9},${f.y - 8} ${f.x},${f.y - 3} ${f.x + 9},${f.y - 8}`}
                  fill={f.color}
                  opacity={isSelected ? 1 : 0.75}
                  stroke={isSelected ? "#fff" : f.color}
                  strokeWidth={isSelected ? 1.5 : 0.5}
                  filter="url(#glow)"
                />
                {f.isCapital && (
                  <text x={f.x} y={f.y + 1} textAnchor="middle" fill="#fff" fontSize={8} fontFamily="Arial" dominantBaseline="middle">★</text>
                )}
                <text
                  x={f.x}
                  y={f.y + (isMine ? 25 : -18)}
                  textAnchor="middle"
                  fill={isSelected ? f.color : f.color + "99"}
                  fontSize={8}
                  fontFamily="Rajdhani, sans-serif"
                  fontWeight="600"
                  letterSpacing="0.5"
                  style={{ textTransform: "uppercase" }}
                >
                  {f.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#04080f] to-transparent flex items-center px-4 gap-4">
          <span className="text-[9px] text-cyan-500/50 uppercase tracking-widest">System Map · Warzone Theater</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[9px] text-green-400/70 uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" /> 2 Defense Fleets
            </span>
            <span className="text-[9px] text-red-400/70 uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block animate-pulse" /> 2 Assault Fleets
            </span>
          </div>
        </div>

        {/* Zoom controls placeholder */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
          {["+", "−"].map((label) => (
            <button key={label} className="w-7 h-7 rounded text-cyan-400 border border-cyan-800/60 bg-[#050c18]/80 text-sm font-bold hover:bg-cyan-950/80 flex items-center justify-center">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — Battle Status */}
      <div className="w-52 flex-shrink-0 border-l border-cyan-900/40 flex flex-col bg-[#050c18]/90 backdrop-blur">
        <div className="px-3 py-3 border-b border-cyan-900/40">
          <div className="text-[9px] text-cyan-500/60 uppercase tracking-widest mb-1" style={{ fontFamily: "'Orbitron',sans-serif" }}>Battle Status</div>
          <div className="text-[10px] text-cyan-300/80 uppercase tracking-wider font-semibold">Battle of Hoth</div>
        </div>

        <div className="flex-1 px-3 py-3 space-y-4">
          {/* Faction strength bars */}
          {[
            { name: "Rebel Alliance", pct: 35, color: "#22c55e", role: "Defending" },
            { name: "Empire", pct: 75, color: "#ef4444", role: "Assaulting" },
          ].map((f) => (
            <div key={f.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] uppercase tracking-widest" style={{ color: f.color + "cc" }}>{f.name}</span>
                <span className="text-[8px]" style={{ color: f.color + "88" }}>{f.role}</span>
              </div>
              <div className="h-1.5 rounded-full bg-cyan-950/60">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${f.pct}%`, background: f.color, boxShadow: `0 0 6px ${f.color}66` }}
                />
              </div>
              <div className="text-[8px] text-right mt-0.5" style={{ color: f.color + "66" }}>{f.pct}% strength</div>
            </div>
          ))}

          <div className="border-t border-cyan-900/30 pt-3 space-y-2">
            <div className="text-[8px] text-cyan-500/50 uppercase tracking-widest mb-2">Objectives</div>
            {[
              { label: "Echo Base", status: "Rebel", done: false, color: "#22c55e" },
              { label: "Power Generator", status: "Contested", done: false, color: "#f59e0b" },
              { label: "Ion Cannon", status: "Rebel", done: false, color: "#22c55e" },
              { label: "Evacuation Route", status: "Open", done: true, color: "#67e8f9" },
            ].map((obj) => (
              <div key={obj.label} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: obj.color, boxShadow: `0 0 4px ${obj.color}88` }} />
                <span className="text-[9px] text-cyan-300/70 flex-1 truncate">{obj.label}</span>
                <span className="text-[8px]" style={{ color: obj.color + "99" }}>{obj.status}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-cyan-900/30 pt-3">
            <div className="text-[8px] text-cyan-500/50 uppercase tracking-widest mb-2">Admin Controls</div>
            <div className="space-y-1.5">
              <button className="w-full text-left text-[9px] px-2 py-1.5 rounded border border-cyan-800/40 text-cyan-400/70 hover:bg-cyan-950/40 hover:text-cyan-300 uppercase tracking-wider transition-colors">
                + Add Body
              </button>
              <button className="w-full text-left text-[9px] px-2 py-1.5 rounded border border-cyan-800/40 text-cyan-400/70 hover:bg-cyan-950/40 hover:text-cyan-300 uppercase tracking-wider transition-colors">
                + Add Fleet
              </button>
              <button className="w-full text-left text-[9px] px-2 py-1.5 rounded border border-red-900/40 text-red-400/60 hover:bg-red-950/30 hover:text-red-300 uppercase tracking-wider transition-colors">
                Clear Warzone
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
