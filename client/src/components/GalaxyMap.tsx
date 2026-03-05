import React, { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { useMap, Planet, Fleet, HyperspaceLane } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Circle, Hexagon, Triangle, Move, Crown, Ship, Plus } from 'lucide-react';

export const GalaxyMap = () => {
  const { 
    planets, sectors, lanes, fleets,
    showLanes, showSectors, showLabels, 
    selectedPlanet, setSelectedPlanet,
    selectedSector, setSelectedSector,
    selectedLane, setSelectedLane,
    selectedFleet, setSelectedFleet,
    editMode, updatePlanet, updateSectorPoints, updateFleet, addLane,
    searchQuery, filters
  } = useMap();

  const mapWidth = 5000;
  const mapHeight = 5000; 
  
  const [draggingPlanet, setDraggingPlanet] = useState<string | null>(null);
  const [draggingSectorPoint, setDraggingSectorPoint] = useState<{sectorId: string, pointIndex: number} | null>(null);
  const [draggingFleet, setDraggingFleet] = useState<string | null>(null);
  const [laneStartPlanet, setLaneStartPlanet] = useState<string | null>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (transformRef.current) {
        transformRef.current.centerView(0.2, 0);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const filteredPlanets = planets.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFaction = filters.faction === 'All' || p.faction === filters.faction;
    const matchesHabitable = filters.habitable === 'All' || 
                             (filters.habitable === 'Yes' ? p.habitable : !p.habitable);
    const matchesEnv = filters.environment === 'All' || p.environment === filters.environment;
    
    return matchesSearch && matchesFaction && matchesHabitable && matchesEnv;
  });

  const getMapCoords = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * mapWidth);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * mapHeight);
    return { x, y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editMode) return;
    const { x, y } = getMapCoords(e);

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
    }
  };

  const handleMouseUp = () => {
    setDraggingPlanet(null);
    setDraggingSectorPoint(null);
    setDraggingFleet(null);
  };

  const handlePlanetClick = (e: React.MouseEvent, planet: Planet) => {
    e.stopPropagation();
    if (editMode && laneStartPlanet && laneStartPlanet !== planet.id) {
      addLane({
        id: `l${Date.now()}`,
        name: 'New Hyperlane',
        planetIds: [laneStartPlanet, planet.id],
        type: 'Minor'
      });
      setLaneStartPlanet(null);
      return;
    }
    setSelectedPlanet(planet);
    setSelectedSector(null);
    setSelectedLane(null);
    setSelectedFleet(null);
  };

  const handleSectorClick = (e: React.MouseEvent, sector: any) => {
    e.stopPropagation();
    setSelectedSector(sector);
    setSelectedPlanet(null);
    setSelectedLane(null);
    setSelectedFleet(null);
  };

  const handleLaneClick = (e: React.MouseEvent, lane: HyperspaceLane) => {
    e.stopPropagation();
    setSelectedLane(lane);
    setSelectedPlanet(null);
    setSelectedSector(null);
    setSelectedFleet(null);
  };

  const handleFleetClick = (e: React.MouseEvent, fleet: Fleet) => {
    e.stopPropagation();
    setSelectedFleet(fleet);
    setSelectedPlanet(null);
    setSelectedSector(null);
    setSelectedLane(null);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (editMode && selectedSector) {
      // Logic for clicking map to add point is now handled by sector edges
    } else {
      setSelectedPlanet(null);
      setSelectedSector(null);
      setSelectedLane(null);
      setSelectedFleet(null);
      setLaneStartPlanet(null);
    }
  };

  const getPlanetPoint = (id: string) => {
    const p = planets.find(p => p.id === id);
    return p ? { x: p.x, y: p.y } : null;
  };

  return (
    <div className="w-full h-full bg-[#020408] overflow-hidden relative" onClick={handleMapClick}>
      <div className="absolute inset-0 pointer-events-none opacity-40" 
           style={{ backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)', backgroundSize: '150px 100px' }} />
      
      <TransformWrapper
        ref={transformRef}
        initialScale={0.2}
        minScale={0.15}
        maxScale={10}
        centerOnInit
        limitToBounds={true}
        alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
        disabled={draggingPlanet !== null || draggingSectorPoint !== null || draggingFleet !== null}
      >
        {({ zoomIn, zoomOut, resetTransform, centerView }) => (
          <>
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <div className="glass-panel rounded-md p-1 flex gap-1">
                <button onClick={() => zoomIn()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded">+</button>
                <button onClick={() => zoomOut()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded">-</button>
                <button onClick={() => resetTransform()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded">↺</button>
              </div>
              {editMode && selectedPlanet && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setLaneStartPlanet(selectedPlanet.id); }}
                  className={cn(
                    "glass-panel rounded-md p-2 text-[10px] font-display flex items-center gap-2",
                    laneStartPlanet ? "text-primary border-primary animate-pulse" : "text-foreground hover:text-primary"
                  )}
                >
                  <Plus className="w-3 h-3" /> {laneStartPlanet ? "CLICK TARGET PLANET" : "START HYPERLANE"}
                </button>
              )}
            </div>

            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
              <div 
                className="relative cursor-grab active:cursor-grabbing origin-top-left"
                style={{ 
                  width: `${mapWidth}px`, 
                  height: `${mapHeight}px`,
                  backgroundImage: `url('/galaxy-map.png')`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {showSectors && sectors.map(sector => {
                    const isSelected = selectedSector?.id === sector.id;
                    const pathD = `M ${sector.points.map(p => `${p[0]},${p[1]}`).join(' L ')} Z`;
                    
                    return (
                      <g key={sector.id}>
                        <path
                          d={pathD}
                          fill={`hsl(${sector.color} / ${isSelected ? '0.25' : '0.12'})`}
                          stroke={`hsl(${sector.color} / ${isSelected ? '0.9' : '0.35'})`}
                          strokeWidth={isSelected ? 4 : 1.5}
                          className="pointer-events-auto transition-all duration-300 cursor-pointer"
                          onClick={(e) => handleSectorClick(e, sector)}
                          filter={isSelected ? "url(#glow)" : undefined}
                        />
                        {/* Edge click zones for adding points */}
                        {editMode && isSelected && sector.points.map((p1, i) => {
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
                                
                                // Calculate position relative to map scale
                                const clientX = e.clientX;
                                const clientY = e.clientY;
                                const rectLeft = rect.left;
                                const rectTop = rect.top;
                                const rectWidth = rect.width;
                                const rectHeight = rect.height;
                                
                                const x = Math.round(((clientX - rectLeft) / rectWidth) * mapWidth);
                                const y = Math.round(((clientY - rectTop) / rectHeight) * mapHeight);
                                
                                const newPoints = [...sector.points] as [number, number][];
                                newPoints.splice(i + 1, 0, [x, y]);
                                updateSectorPoints(sector.id, newPoints);
                              }}
                            />
                          );
                        })}
                        {editMode && isSelected && sector.points.map((point, idx) => (
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

                    return (
                      <g key={lane.id} className="pointer-events-auto cursor-pointer" onClick={(e) => handleLaneClick(e, lane)}>
                        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={20} />
                        <line
                          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 5 : (lane.type === 'Major' ? 3.5 : 2.5)}
                          strokeDasharray={lane.type === 'Minor' ? "6 6" : (lane.type === 'Dangerous' ? "3 8" : "none")}
                          className="transition-all duration-300"
                          filter={isSelected ? "url(#glow)" : undefined}
                        />
                      </g>
                    );
                  })}
                </svg>

                {filteredPlanets.map(planet => {
                  const isSelected = selectedPlanet?.id === planet.id;
                  return (
                    <div
                      key={planet.id}
                      className={cn("absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center", editMode ? "cursor-move" : "cursor-pointer")}
                      style={{ left: planet.x, top: planet.y }}
                      onClick={(e) => handlePlanetClick(e, planet)}
                      onMouseDown={(e) => editMode && setDraggingPlanet(planet.id)}
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
                          planet.faction === 'Sith Empire' && "bg-destructive shadow-[0_0_12px_hsl(var(--destructive))]",
                          planet.faction === 'Hutt Cartel' && "bg-green-500 shadow-[0_0_12px_#22c55e]"
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
                      className={cn("absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10", editMode ? "cursor-move" : "cursor-pointer")}
                      style={{ left: fleet.x, top: fleet.y }}
                      onClick={(e) => handleFleetClick(e, fleet)}
                      onMouseDown={(e) => editMode && setDraggingFleet(fleet.id)}
                    >
                      {fleet.isCapitalShip && (
                        <div className="mb-1 text-primary drop-shadow-[0_0_8px_currentColor] animate-pulse">
                          <Crown className="w-5 h-5 fill-primary/20" />
                        </div>
                      )}
                      <div className={cn(
                        "p-2 rounded-full bg-background/95 border-2 transition-all duration-300 shadow-xl overflow-hidden flex items-center justify-center",
                        isSelected ? "border-primary scale-125 shadow-[0_0_20px_hsl(var(--primary))]" : "border-muted-foreground/50",
                        fleet.faction === 'Sith Empire' && isSelected && "border-destructive shadow-[0_0_20px_hsl(var(--destructive))]"
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
