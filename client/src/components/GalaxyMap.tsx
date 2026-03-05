import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useMap, Planet, Fleet, HyperspaceLane, Sector } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Crown, Ship, Plus, Pencil } from 'lucide-react';

const FACTION_COLORS: Record<string, string> = {
  'Galactic Republic': '210 80% 55%',
  'Empire': '0 75% 50%',
  'Hutt Cartel': '45 80% 50%',
  'Chiss Ascendancy': '240 70% 55%',
  'Independent': '160 40% 50%',
};

export const GalaxyMap = () => {
  const { 
    planets, sectors, lanes, fleets,
    showLanes, showSectors, showLabels, showOverlay,
    selectedPlanet, setSelectedPlanet,
    selectedSector, setSelectedSector,
    selectedLane, setSelectedLane,
    selectedFleet, setSelectedFleet,
    editMode, updatePlanet, updateSectorPoints, updateFleet, addLane, updateLanePathPoints,
    laneDrawMode, setLaneDrawMode,
    searchQuery, filters
  } = useMap();

  const mapWidth = 5000;
  const mapHeight = 5000; 
  
  const [draggingPlanet, setDraggingPlanet] = useState<string | null>(null);
  const [draggingSectorPoint, setDraggingSectorPoint] = useState<{sectorId: string, pointIndex: number} | null>(null);
  const [draggingFleet, setDraggingFleet] = useState<string | null>(null);
  const [draggingLanePoint, setDraggingLanePoint] = useState<{laneId: string, pointIndex: number} | null>(null);
  
  const [drawingMode, setDrawingMode] = useState<'sector' | 'lane' | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [laneDrawStartPlanet, setLaneDrawStartPlanet] = useState<string | null>(null);
  const [laneDrawPoints, setLaneDrawPoints] = useState<[number, number][]>([]);
  const [isLaneDrawing, setIsLaneDrawing] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);

  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (transformRef.current) {
        transformRef.current.centerView(0.2, 0);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
      if (e.key === 'Escape') {
        setLaneDrawMode(false);
        setLaneDrawStartPlanet(null);
        setLaneDrawPoints([]);
        setIsLaneDrawing(false);
        setIsDrawing(false);
        setDrawingMode(null);
        setDrawingPoints([]);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const filteredPlanets = planets.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFaction = filters.faction === 'All' || p.faction === filters.faction;
    const matchesHabitable = filters.habitable === 'All' || 
                             (filters.habitable === 'Yes' ? p.habitable : !p.habitable);
    const matchesEnv = filters.environment === 'All' || p.environment === filters.environment;
    
    return matchesSearch && matchesFaction && matchesHabitable && matchesEnv;
  });

  const pad = 500;
  const totalWidth = mapWidth + pad * 2;
  const totalHeight = mapHeight + pad * 2;

  const getMapCoords = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * totalWidth;
    const rawY = ((e.clientY - rect.top) / rect.height) * totalHeight;
    const x = Math.round(rawX - pad);
    const y = Math.round(rawY - pad);
    return { x, y };
  };

  const isInLaneCreation = laneDrawMode || laneDrawStartPlanet !== null || isLaneDrawing;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editMode) return;
    const { x, y } = getMapCoords(e);

    if (isLaneDrawing) {
      if (shiftHeld) {
        const start = laneDrawPoints[0];
        if (start) {
          setLaneDrawPoints([start, [x, y]]);
        }
      } else {
        const last = laneDrawPoints[laneDrawPoints.length - 1];
        if (last) {
          const dx = x - last[0];
          const dy = y - last[1];
          if (Math.sqrt(dx*dx + dy*dy) > 15) {
            setLaneDrawPoints(prev => [...prev, [x, y]]);
          }
        }
      }
      return;
    }

    if (isDrawing && drawingMode) {
      const last = drawingPoints[drawingPoints.length - 1];
      if (last) {
        const dx = x - last[0];
        const dy = y - last[1];
        if (shiftHeld) {
          setDrawingPoints([drawingPoints[0], [x, y]]);
        } else if (Math.sqrt(dx*dx + dy*dy) > 15) {
          setDrawingPoints(prev => [...prev, [x, y]]);
        }
      }
      return;
    }

    if (draggingPlanet) {
      const planet = planets.find(p => p.id === draggingPlanet);
      if (planet) updatePlanet({ ...planet, x, y });
    } else if (draggingSectorPoint) {
      const sector = sectors.find(s => s.id === draggingSectorPoint.sectorId);
      if (sector) {
        const newPoints = [...sector.points] as [number, number][];
        newPoints[draggingSectorPoint.pointIndex] = [x, y];
        updateSectorPoints(sector.id, newPoints);
      }
    } else if (draggingFleet) {
      const fleet = fleets.find(f => f.id === draggingFleet);
      if (fleet) updateFleet({ ...fleet, x, y });
    } else if (draggingLanePoint) {
      const lane = lanes.find(l => l.id === draggingLanePoint.laneId);
      if (lane && lane.pathPoints) {
        const newPoints = [...lane.pathPoints] as [number, number][];
        newPoints[draggingLanePoint.pointIndex] = [x, y];
        updateLanePathPoints(lane.id, newPoints);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && drawingMode) {
      if (drawingPoints.length > 2) {
        if (drawingMode === 'sector' && selectedSector) {
          updateSectorPoints(selectedSector.id, drawingPoints);
        } else if (drawingMode === 'lane' && selectedLane) {
          updateLanePathPoints(selectedLane.id, drawingPoints);
        }
      }
      setIsDrawing(false);
      setDrawingPoints([]);
      setDrawingMode(null);
      return;
    }
    setDraggingPlanet(null);
    setDraggingSectorPoint(null);
    setDraggingFleet(null);
    setDraggingLanePoint(null);
  };

  const startDrawing = (mode: 'sector' | 'lane', e: React.MouseEvent) => {
    e.stopPropagation();
    setDrawingMode(mode);
    setIsDrawing(true);
    setDrawingPoints([]);
  };

  useEffect(() => {
    if (laneDrawMode) {
      setLaneDrawStartPlanet(null);
      setLaneDrawPoints([]);
      setIsLaneDrawing(false);
      setSelectedPlanet(null);
      setSelectedSector(null);
      setSelectedLane(null);
      setSelectedFleet(null);
    } else {
      setLaneDrawStartPlanet(null);
      setLaneDrawPoints([]);
      setIsLaneDrawing(false);
    }
  }, [laneDrawMode]);

  const handlePlanetClickForLane = (e: React.MouseEvent, planet: Planet) => {
    e.stopPropagation();
    
    if (!laneDrawStartPlanet) {
      setLaneDrawStartPlanet(planet.id);
      const startPlanet = planets.find(p => p.id === planet.id);
      if (startPlanet) {
        setLaneDrawPoints([[startPlanet.x, startPlanet.y]]);
        setIsLaneDrawing(true);
      }
    } else if (planet.id !== laneDrawStartPlanet) {
      const pathPoints = laneDrawPoints.slice(1);
      addLane({
        id: `l${Date.now()}`,
        name: 'New Hyperlane',
        planetIds: [laneDrawStartPlanet, planet.id],
        type: 'Minor',
        pathPoints: pathPoints.length > 0 ? pathPoints : undefined,
      });
      setLaneDrawMode(false);
      setLaneDrawStartPlanet(null);
      setLaneDrawPoints([]);
      setIsLaneDrawing(false);
    }
  };

  const handlePlanetClick = (e: React.MouseEvent, planet: Planet) => {
    e.stopPropagation();
    if (isInLaneCreation) {
      handlePlanetClickForLane(e, planet);
      return;
    }
    setSelectedPlanet(planet);
    setSelectedSector(null);
    setSelectedLane(null);
    setSelectedFleet(null);
  };

  const handleSectorClick = (e: React.MouseEvent, sector: any) => {
    e.stopPropagation();
    if (isInLaneCreation) return;
    setSelectedSector(sector);
    setSelectedPlanet(null);
    setSelectedLane(null);
    setSelectedFleet(null);
  };

  const handleLaneClick = (e: React.MouseEvent, lane: HyperspaceLane) => {
    e.stopPropagation();
    if (isInLaneCreation) return;
    setSelectedLane(lane);
    setSelectedPlanet(null);
    setSelectedSector(null);
    setSelectedFleet(null);
  };

  const handleFleetClick = (e: React.MouseEvent, fleet: Fleet) => {
    e.stopPropagation();
    if (isInLaneCreation) return;
    setSelectedFleet(fleet);
    setSelectedPlanet(null);
    setSelectedSector(null);
    setSelectedLane(null);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (isDrawing || isLaneDrawing) return;
    if (editMode && selectedSector) {
    } else {
      setSelectedPlanet(null);
      setSelectedSector(null);
      setSelectedLane(null);
      setSelectedFleet(null);
      if (laneDrawMode && !laneDrawStartPlanet) {
        setLaneDrawMode(false);
      }
    }
  };

  const getPlanetPoint = (id: string) => {
    const p = planets.find(p => p.id === id);
    return p ? { x: p.x, y: p.y } : null;
  };

  const getLanePath = (lane: HyperspaceLane) => {
    const p1 = getPlanetPoint(lane.planetIds[0]);
    const p2 = getPlanetPoint(lane.planetIds[1]);
    if (!p1 || !p2) return null;

    if (lane.pathPoints && lane.pathPoints.length > 0) {
      const allPoints = [[p1.x, p1.y], ...lane.pathPoints, [p2.x, p2.y]];
      return `M ${allPoints.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
    }
    return `M ${p1.x},${p1.y} L ${p2.x},${p2.y}`;
  };

  const getDrawingLanePath = () => {
    if (laneDrawPoints.length < 2) return null;
    return `M ${laneDrawPoints.map(p => `${p[0]},${p[1]}`).join(' L ')}`;
  };

  const isDragging = draggingPlanet !== null || draggingSectorPoint !== null || draggingFleet !== null || draggingLanePoint !== null || isDrawing || isLaneDrawing;

  const getLaneDrawStatus = () => {
    if (!laneDrawMode && !laneDrawStartPlanet) return null;
    if (laneDrawMode && !laneDrawStartPlanet) return "CLICK A PLANET TO START";
    if (laneDrawStartPlanet && isLaneDrawing) {
      const startName = planets.find(p => p.id === laneDrawStartPlanet)?.name || 'Unknown';
      return `DRAWING FROM ${startName} — CLICK TARGET PLANET (SHIFT: STRAIGHT LINE, ESC: CANCEL)`;
    }
    return null;
  };

  return (
    <div className="w-full h-full overflow-hidden relative" onClick={handleMapClick}
         style={{ background: '#020408', backgroundImage: `url('/starfield-bg.png')`, backgroundSize: '512px 512px', backgroundRepeat: 'repeat' }}>

      {isInLaneCreation && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 glass-panel rounded-md px-4 py-2 text-[11px] font-display text-primary animate-pulse tracking-widest">
          {getLaneDrawStatus()}
        </div>
      )}
      
      <TransformWrapper
        ref={transformRef}
        initialScale={0.2}
        minScale={0.15}
        maxScale={10}
        centerOnInit
        limitToBounds={true}
        disabled={isDragging}
      >
        {({ zoomIn, zoomOut, resetTransform, centerView }) => (
          <>
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <div className="glass-panel rounded-md p-1 flex gap-1">
                <button onClick={() => zoomIn()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded">+</button>
                <button onClick={() => zoomOut()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded">-</button>
                <button onClick={() => resetTransform()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded">↺</button>
              </div>
              {editMode && selectedSector && !isInLaneCreation && (
                <button
                  onMouseDown={(e) => startDrawing('sector', e)}
                  className="glass-panel rounded-md p-2 text-[10px] font-display flex items-center gap-2 text-foreground hover:text-primary"
                  data-testid="button-draw-sector"
                >
                  <Pencil className="w-3 h-3" /> DRAW SECTOR BORDER
                </button>
              )}
              {editMode && selectedLane && !isInLaneCreation && (
                <button
                  onMouseDown={(e) => startDrawing('lane', e)}
                  className="glass-panel rounded-md p-2 text-[10px] font-display flex items-center gap-2 text-foreground hover:text-primary"
                  data-testid="button-draw-lane"
                >
                  <Pencil className="w-3 h-3" /> DRAW LANE PATH
                </button>
              )}
            </div>

            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
              <div 
                className={cn("relative origin-top-left", (isDrawing || isLaneDrawing) ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing")}
                style={{ 
                  width: `${totalWidth}px`, 
                  height: `${totalHeight}px`,
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <div 
                  className="absolute"
                  style={{
                    left: `${pad}px`,
                    top: `${pad}px`,
                    width: `${mapWidth}px`,
                    height: `${mapHeight}px`,
                    boxShadow: '0 0 400px 200px rgba(30, 60, 100, 0.15), 0 0 800px 400px rgba(10, 20, 50, 0.1)',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: `${pad}px`,
                    top: `${pad}px`,
                    width: `${mapWidth}px`,
                    height: `${mapHeight}px`,
                    backgroundImage: `url('/galaxy-map.png')`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    mask: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
                    WebkitMask: 'radial-gradient(ellipse at center, black 40%, transparent 85%)',
                  }}
                />
                {showOverlay && editMode && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${pad}px`,
                      top: `${pad}px`,
                      width: `${mapWidth}px`,
                      height: `${mapHeight}px`,
                      backgroundImage: `url('/reference-map.png')`,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      opacity: 0.5,
                      zIndex: 5,
                    }}
                  />
                )}
                
                <svg 
                  ref={svgRef}
                  className="absolute pointer-events-none" 
                  style={{ left: `${pad}px`, top: `${pad}px`, width: `${mapWidth}px`, height: `${mapHeight}px` }} 
                  viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                >
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    {sectors.filter(s => s.isContested).map(sector => {
                      const c1 = FACTION_COLORS[sector.contestedFaction1 || ''] || '0 0% 50%';
                      const c2 = FACTION_COLORS[sector.contestedFaction2 || ''] || '0 0% 70%';
                      return (
                        <pattern key={`pattern-${sector.id}`} id={`stripe-${sector.id}`} width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <rect width="10" height="20" fill={`hsl(${c1} / 0.3)`} />
                          <rect x="10" width="10" height="20" fill={`hsl(${c2} / 0.3)`} />
                        </pattern>
                      );
                    })}
                  </defs>

                  {showSectors && sectors.map(sector => {
                    const isSelected = selectedSector?.id === sector.id;
                    const pathD = `M ${sector.points.map(p => `${p[0]},${p[1]}`).join(' L ')} Z`;
                    
                    return (
                      <g key={sector.id}>
                        <path
                          d={pathD}
                          fill={sector.isContested ? `url(#stripe-${sector.id})` : `hsl(${sector.color} / ${isSelected ? '0.25' : '0.12'})`}
                          stroke={`hsl(${sector.color} / ${isSelected ? '0.9' : '0.35'})`}
                          strokeWidth={isSelected ? 4 : 1.5}
                          className="pointer-events-auto transition-all duration-300 cursor-pointer"
                          onClick={(e) => handleSectorClick(e, sector)}
                          filter={isSelected ? "url(#glow)" : undefined}
                        />
                        {editMode && isSelected && !isInLaneCreation && sector.points.map((p1, i) => {
                          const p2 = sector.points[(i + 1) % sector.points.length];
                          return (
                            <line
                              key={`edge-${sector.id}-${i}`}
                              x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]}
                              stroke="transparent"
                              strokeWidth={20}
                              className="pointer-events-auto cursor-crosshair"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                                if (!rect) return;
                                const clientX = e.clientX;
                                const clientY = e.clientY;
                                const x = Math.round(((clientX - rect.left) / rect.width) * mapWidth);
                                const y = Math.round(((clientY - rect.top) / rect.height) * mapHeight);
                                const newPoints = [...sector.points] as [number, number][];
                                newPoints.splice(i + 1, 0, [x, y]);
                                updateSectorPoints(sector.id, newPoints);
                              }}
                            />
                          );
                        })}
                        {editMode && isSelected && !isInLaneCreation && sector.points.map((point, idx) => (
                          <circle
                            key={`${sector.id}-p-${idx}`}
                            cx={point[0]} cy={point[1]} r={10}
                            fill={`hsl(${sector.color})`} stroke="white" strokeWidth={3}
                            className="pointer-events-auto cursor-move"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingSectorPoint({ sectorId: sector.id, pointIndex: idx });
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              const newPoints = sector.points.filter((_, i) => i !== idx);
                              updateSectorPoints(sector.id, newPoints as [number, number][]);
                            }}
                          />
                        ))}
                      </g>
                    );
                  })}

                  {showLanes && lanes.map(lane => {
                    const p1 = getPlanetPoint(lane.planetIds[0]);
                    const p2 = getPlanetPoint(lane.planetIds[1]);
                    if (!p1 || !p2) return null;
                    const isSelected = selectedLane?.id === lane.id;
                    let strokeColor = "hsl(var(--primary))";
                    if (lane.type === 'Dangerous') strokeColor = "hsl(var(--destructive))";
                    else if (lane.type === 'Minor') strokeColor = "hsl(var(--muted-foreground))";

                    const pathD = getLanePath(lane);
                    if (!pathD) return null;

                    return (
                      <g key={lane.id} className="pointer-events-auto cursor-pointer" onClick={(e) => handleLaneClick(e, lane)}>
                        <path d={pathD} fill="none" stroke="transparent" strokeWidth={20} />
                        <path
                          d={pathD}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 5 : (lane.type === 'Major' ? 3.5 : 2.5)}
                          strokeDasharray={lane.type === 'Minor' ? "6 6" : (lane.type === 'Dangerous' ? "3 8" : "none")}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          className="transition-all duration-300"
                          filter={isSelected ? "url(#glow)" : undefined}
                        />
                        {editMode && isSelected && !isInLaneCreation && lane.pathPoints && lane.pathPoints.map((point, idx) => (
                          <circle
                            key={`${lane.id}-lp-${idx}`}
                            cx={point[0]} cy={point[1]} r={8}
                            fill={strokeColor} stroke="white" strokeWidth={2}
                            className="pointer-events-auto cursor-move"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingLanePoint({ laneId: lane.id, pointIndex: idx });
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              if (lane.pathPoints) {
                                const newPoints = lane.pathPoints.filter((_, i) => i !== idx);
                                updateLanePathPoints(lane.id, newPoints as [number, number][]);
                              }
                            }}
                          />
                        ))}
                      </g>
                    );
                  })}

                  {isDrawing && drawingPoints.length > 1 && (
                    <path
                      d={`M ${drawingPoints.map(p => `${p[0]},${p[1]}`).join(' L ')}${drawingMode === 'sector' ? ' Z' : ''}`}
                      fill={drawingMode === 'sector' ? 'hsl(var(--primary) / 0.15)' : 'none'}
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      className="pointer-events-none"
                    />
                  )}

                  {isLaneDrawing && laneDrawPoints.length > 1 && (
                    <path
                      d={`M ${laneDrawPoints.map(p => `${p[0]},${p[1]}`).join(' L ')}`}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      className="pointer-events-none animate-pulse"
                    />
                  )}
                </svg>

                {filteredPlanets.map(planet => {
                  const isSelected = selectedPlanet?.id === planet.id;
                  const isLaneStart = laneDrawStartPlanet === planet.id;
                  const planetLocked = isInLaneCreation;
                  return (
                    <div
                      key={planet.id}
                      className={cn(
                        "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center",
                        planetLocked ? "cursor-pointer" : (editMode ? "cursor-move" : "cursor-pointer"),
                        isLaneStart && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full"
                      )}
                      style={{ left: planet.x + pad, top: planet.y + pad, zIndex: isLaneStart ? 20 : undefined }}
                      onClick={(e) => handlePlanetClick(e, planet)}
                      onMouseDown={(e) => {
                        if (planetLocked) return;
                        if (editMode) setDraggingPlanet(planet.id);
                      }}
                    >
                      {planet.isCapital && (
                        <div className="mb-1 text-yellow-400 drop-shadow-[0_0_5px_currentColor] animate-bounce">
                          <Crown className="w-5 h-5 fill-yellow-400/20" />
                        </div>
                      )}
                      {planet.markerImage ? (
                        <div className={cn("relative transition-all duration-300", isSelected ? "scale-125 drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" : "hover:scale-110")}>
                          <img src={planet.markerImage} alt={planet.name} className="w-10 h-10 object-contain pointer-events-none drop-shadow-lg" />
                          {isSelected && <div className="absolute inset-[-6px] border-2 border-primary rounded-full animate-ping opacity-75"></div>}
                        </div>
                      ) : (
                        <div className={cn(
                          "w-5 h-5 rounded-full bg-primary relative transition-all",
                          isSelected ? "shadow-[0_0_20px_hsl(var(--primary))] scale-125" : "shadow-[0_0_8px_hsl(var(--primary)/0.5)]",
                          planet.faction === 'Empire' && "bg-destructive shadow-[0_0_12px_hsl(var(--destructive))]",
                          planet.faction === 'Hutt Cartel' && "bg-green-500 shadow-[0_0_12px_#22c55e]",
                          planet.faction === 'Chiss Ascendancy' && "bg-indigo-500 shadow-[0_0_12px_#6366f1]",
                          isLaneStart && "bg-primary shadow-[0_0_20px_hsl(var(--primary))] scale-150"
                        )}>
                          {isSelected && <div className="absolute inset-[-6px] border-2 border-primary rounded-full animate-ping opacity-75"></div>}
                        </div>
                      )}
                      {showLabels && (
                        <div className={cn(
                          "mt-2 px-2 py-0.5 rounded text-[10px] font-display tracking-widest whitespace-nowrap bg-background/90 backdrop-blur-md border transition-all uppercase",
                          isSelected ? "border-primary text-primary shadow-[0_0_15px_hsl(var(--primary)/0.4)]" : "border-border/60 text-foreground/90"
                        )}>
                          {planet.name}
                        </div>
                      )}
                    </div>
                  );
                })}

                {fleets.map(fleet => {
                  const isSelected = selectedFleet?.id === fleet.id;
                  return (
                    <div
                      key={fleet.id}
                      className={cn("absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10", editMode && !isInLaneCreation ? "cursor-move" : "cursor-pointer")}
                      style={{ left: fleet.x + pad, top: fleet.y + pad }}
                      onClick={(e) => handleFleetClick(e, fleet)}
                      onMouseDown={(e) => {
                        if (isInLaneCreation) return;
                        if (editMode) setDraggingFleet(fleet.id);
                      }}
                    >
                      {fleet.isCapitalShip && (
                        <div className="mb-1 text-primary drop-shadow-[0_0_8px_currentColor] animate-pulse">
                          <Crown className="w-5 h-5 fill-primary/20" />
                        </div>
                      )}
                      <div className={cn(
                        "p-2 rounded-full bg-background/95 border-2 transition-all duration-300 shadow-xl overflow-hidden flex items-center justify-center",
                        isSelected ? "border-primary scale-125 shadow-[0_0_20px_hsl(var(--primary))]" : "border-muted-foreground/50",
                        fleet.faction === 'Empire' && isSelected && "border-destructive shadow-[0_0_20px_hsl(var(--destructive))]"
                      )}>
                        {fleet.markerImage ? (
                          <img src={fleet.markerImage} alt={fleet.name} className="w-6 h-6 object-contain" />
                        ) : (
                          <Ship className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                        )}
                      </div>
                      <div className="mt-1 px-2 py-0.5 rounded text-[9px] font-display tracking-widest bg-background/95 border border-primary/30 text-primary uppercase">
                        {fleet.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};
