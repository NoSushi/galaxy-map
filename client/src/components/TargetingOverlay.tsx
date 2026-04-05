import React, { useState, useEffect, useRef } from 'react';
import { Planet } from '@/lib/data';

interface Props {
  planet: Planet;
  screenX: number;
  screenY: number;
  containerWidth: number;
  containerHeight: number;
  onZoom: () => void;
  onComplete: () => void;
}

const GAP = 22;
// Phase 1 vertical lines: 1 second travel time (T=0 → T=1.0s)
const H_LINE_TRANSITION = 'top 1.0s linear, box-shadow 0.35s ease';
// Phase 2 horizontal lines: 0.9 second travel time (T=1.8s → T=2.7s)
const V_LINE_TRANSITION = 'left 0.9s linear, box-shadow 0.35s ease';

export const TargetingOverlay: React.FC<Props> = ({
  planet, screenX, screenY, containerWidth, containerHeight, onZoom, onComplete
}) => {
  const [dimOpacity, setDimOpacity] = useState(0);
  const [showV, setShowV] = useState(false);
  const [showH, setShowH] = useState(false);
  const [topY, setTopY] = useState(0);
  const [botY, setBotY] = useState(containerHeight);
  const [leftX, setLeftX] = useState(0);
  const [rightX, setRightX] = useState(containerWidth);
  const [glow, setGlow] = useState(false);
  const [linesOpacity, setLinesOpacity] = useState(1);
  const [showRing, setShowRing] = useState(false);
  const [showCorners, setShowCorners] = useState(false);
  const [showLabel, setShowLabel] = useState(false);
  const [tighten, setTighten] = useState(false);
  const running = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const safe = (fn: () => void) => { if (running.current) fn(); };

  useEffect(() => {
    running.current = true;

    // Play the MP3 immediately at T=0
    try {
      const audio = new Audio('/planet-select.mp3');
      audio.volume = 0.85;
      audio.play().catch(() => {});
      audioRef.current = audio;
    } catch {
      // Audio unavailable
    }

    // T=0: Begin dimming + show vertical lines → transition 1.0s → lands at T=1.0s
    safe(() => setDimOpacity(0.45));
    safe(() => setShowV(true));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        safe(() => {
          setTopY(screenY - GAP);
          setBotY(screenY + GAP);
        });
      });
    });

    // T=1800ms: Horizontal lines in → transition 0.9s → lands at T=2.7s
    const t2 = setTimeout(() => {
      safe(() => setShowH(true));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          safe(() => {
            setLeftX(screenX - GAP);
            setRightX(screenX + GAP);
          });
        });
      });
    }, 1800);

    // T=2900ms: Lock phase — ring, corners, label
    const t3 = setTimeout(() => {
      safe(() => {
        setGlow(true);
        setShowRing(true);
        setShowCorners(true);
        setShowLabel(true);
        setDimOpacity(0.68);
      });
    }, 2900);

    // T=3500ms: Zoom + tighten + fade out
    const t4 = setTimeout(() => {
      safe(() => {
        setTighten(true);
        setLinesOpacity(0);
        setDimOpacity(0);
        setShowLabel(false);
        onZoom();
      });
    }, 3500);

    // T=4000ms: Done
    const t5 = setTimeout(() => {
      safe(() => onComplete());
    }, 4000);

    return () => {
      running.current = false;
      clearTimeout(t2); clearTimeout(t3);
      clearTimeout(t4); clearTimeout(t5);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const tightGap = tighten ? GAP * 0.5 : GAP;
  const lineColor = glow ? '#00f0ff' : '#00d4f0';
  const shadowBase = glow
    ? '0 0 4px #00f0ff, 0 0 14px #00f0ff, 0 0 30px rgba(0,240,255,0.5)'
    : '0 0 3px #00d4f0, 0 0 8px rgba(0,212,240,0.6)';

  const hLineStyle = (top: number): React.CSSProperties => ({
    position: 'absolute',
    left: 0,
    right: 0,
    height: '1px',
    background: `linear-gradient(90deg, transparent 0%, transparent 8%, ${lineColor} 25%, ${lineColor} 75%, transparent 92%, transparent 100%)`,
    boxShadow: shadowBase,
    top: `${tighten ? (top === topY ? screenY - tightGap : screenY + tightGap) : top}px`,
    transition: H_LINE_TRANSITION,
    pointerEvents: 'none',
  });

  const vLineStyle = (left: number): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '1px',
    background: `linear-gradient(180deg, transparent 0%, transparent 8%, ${lineColor} 25%, ${lineColor} 75%, transparent 92%, transparent 100%)`,
    boxShadow: shadowBase,
    left: `${tighten ? (left === leftX ? screenX - tightGap : screenX + tightGap) : left}px`,
    transition: V_LINE_TRANSITION,
    pointerEvents: 'none',
  });

  const cornerSize = 9;
  const cGap = tighten ? tightGap + 2 : GAP + 4;

  return (
    <div className="absolute inset-0 pointer-events-none z-[200]" style={{ overflow: 'hidden' }}>

      {/* Dim overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: `rgba(0, 4, 18, ${dimOpacity})`,
          transition: 'background 0.45s ease',
        }}
      />

      {/* Lines wrapper — fades out during zoom */}
      <div style={{ opacity: linesOpacity, transition: 'opacity 0.5s ease-out' }}>

        {/* Vertical sweep lines (Phase 1) */}
        {showV && <>
          <div style={hLineStyle(topY)} />
          <div style={hLineStyle(botY)} />
        </>}

        {/* Horizontal sweep lines (Phase 2) */}
        {showH && <>
          <div style={vLineStyle(leftX)} />
          <div style={vLineStyle(rightX)} />
        </>}

        {/* Crosshair ring around planet */}
        {showRing && (
          <div style={{
            position: 'absolute',
            left: screenX - 18,
            top: screenY - 18,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: `1px solid ${lineColor}`,
            boxShadow: shadowBase,
            transition: 'box-shadow 0.35s ease',
          }} />
        )}

        {/* Corner brackets */}
        {showCorners && (() => {
          const bStyle: React.CSSProperties = { position: 'absolute', width: cornerSize, height: cornerSize };
          const b = `1px solid ${lineColor}`;
          return <>
            <div style={{ ...bStyle, left: screenX - cGap - cornerSize + 1, top: screenY - cGap - cornerSize + 1, borderTop: b, borderLeft: b }} />
            <div style={{ ...bStyle, left: screenX + cGap - 1, top: screenY - cGap - cornerSize + 1, borderTop: b, borderRight: b }} />
            <div style={{ ...bStyle, left: screenX - cGap - cornerSize + 1, top: screenY + cGap - 1, borderBottom: b, borderLeft: b }} />
            <div style={{ ...bStyle, left: screenX + cGap - 1, top: screenY + cGap - 1, borderBottom: b, borderRight: b }} />
          </>;
        })()}

        {/* Planet label */}
        {showLabel && (
          <div style={{
            position: 'absolute',
            left: screenX + GAP + 16,
            top: screenY - 12,
            color: lineColor,
            fontFamily: "'Rajdhani', 'Orbitron', 'Share Tech Mono', monospace",
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            textShadow: `0 0 6px ${lineColor}`,
            whiteSpace: 'nowrap',
            lineHeight: 1.5,
            opacity: linesOpacity,
            transition: 'opacity 0.5s ease-out',
          }}>
            {planet.name}
            <br />
            <span style={{ fontSize: '8px', opacity: 0.65, letterSpacing: '0.22em' }}>TARGET LOCKED</span>
          </div>
        )}

        {/* Scan line effect during lock phase */}
        {glow && (
          <div style={{
            position: 'absolute',
            left: 0, right: 0,
            height: '60px',
            top: screenY - 30,
            background: `linear-gradient(180deg, transparent, rgba(0,240,255,0.04) 50%, transparent)`,
            pointerEvents: 'none',
          }} />
        )}
      </div>
    </div>
  );
};
