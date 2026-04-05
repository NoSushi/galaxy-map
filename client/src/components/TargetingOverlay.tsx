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
const LINE_TRANSITION = 'top 0.75s linear, left 0.75s linear, box-shadow 0.35s ease';

function playTone(type: 'sweep1' | 'sweep2' | 'lock' | 'zoom') {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const beep = (freq1: number, freq2: number, vol: number, start: number, dur: number, wave: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = wave;
      osc.frequency.setValueAtTime(freq1, start);
      osc.frequency.linearRampToValueAtTime(freq2, start + dur * 0.8);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.04);
      gain.gain.setValueAtTime(vol, start + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0, start + dur);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    };

    if (type === 'sweep1') {
      beep(320, 680, 0.18, now, 0.65);
      beep(320, 680, 0.06, now + 0.05, 0.55, 'square');
    } else if (type === 'sweep2') {
      beep(480, 960, 0.18, now, 0.65);
      beep(480, 960, 0.06, now + 0.05, 0.55, 'square');
    } else if (type === 'lock') {
      beep(880, 880, 0.20, now, 0.10, 'square');
      beep(1320, 1320, 0.18, now + 0.13, 0.12, 'square');
      beep(1760, 1760, 0.15, now + 0.28, 0.15, 'sine');
    } else if (type === 'zoom') {
      beep(90, 280, 0.14, now, 1.1, 'sawtooth');
      beep(160, 60, 0.08, now + 0.2, 0.9, 'sine');
    }

    setTimeout(() => ctx.close(), 3000);
  } catch {
    // Audio unavailable
  }
}

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

  const safe = (fn: () => void) => { if (running.current) fn(); };

  useEffect(() => {
    running.current = true;

    // T=0: Begin dimming
    safe(() => setDimOpacity(0.45));

    // T=120: Vertical lines appear at edges, immediately start sliding in
    const t1 = setTimeout(() => {
      safe(() => {
        playTone('sweep1');
        setShowV(true);
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          safe(() => {
            setTopY(screenY - GAP);
            setBotY(screenY + GAP);
          });
        });
      });
    }, 120);

    // T=120+850: Horizontal lines in
    const t2 = setTimeout(() => {
      safe(() => {
        playTone('sweep2');
        setShowH(true);
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          safe(() => {
            setLeftX(screenX - GAP);
            setRightX(screenX + GAP);
          });
        });
      });
    }, 970);

    // T=970+850: Lock
    const t3 = setTimeout(() => {
      safe(() => {
        playTone('lock');
        setGlow(true);
        setShowRing(true);
        setShowCorners(true);
        setShowLabel(true);
        setDimOpacity(0.68);
      });
    }, 1820);

    // T=1820+450: Zoom begins
    const t4 = setTimeout(() => {
      safe(() => {
        playTone('zoom');
        setTighten(true);
        onZoom();
      });
    }, 2270);

    // T=2270+250: Lines + overlay fade out
    const t5 = setTimeout(() => {
      safe(() => {
        setLinesOpacity(0);
        setDimOpacity(0);
        setShowLabel(false);
      });
    }, 2520);

    // T=2520+800: Done
    const t6 = setTimeout(() => {
      safe(() => onComplete());
    }, 3320);

    return () => {
      running.current = false;
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      clearTimeout(t4); clearTimeout(t5); clearTimeout(t6);
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
    transition: LINE_TRANSITION,
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
    transition: LINE_TRANSITION,
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
      <div style={{ opacity: linesOpacity, transition: 'opacity 0.85s ease-out' }}>

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
            transition: 'opacity 0.85s ease-out',
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
