import React, { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useMap } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Circle, Hexagon, Triangle, Move } from 'lucide-react';

export const GalaxyMap = () => {
  const { 
    planets, sectors, lanes, 
    showLanes, showSectors, showLabels, 
    selectedPlanet, setSelectedPlanet,
    selectedSector, setSelectedSector,
    selectedLane, setSelectedLane,
    editMode, updatePlanet, updateSectorPoints,
    searchQuery, filters
  } = useMap();

  const mapWidth = 2000;
  const mapHeight = 1125; 
  
  const [draggingPlanet, setDraggingPlanet] = useState<string | null>(null);
  const [draggingSectorPoint, setDraggingSectorPoint] = useState<{sectorId: string, pointIndex: number} | null>(null);

  const filteredPlanets = planets.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFaction = filters.faction === 'All' || p.faction === filters.faction;
    const matchesHabitable = filters.habitable === 'All' || 
                             (filters.habitable === 'Yes' ? p.habitable : !p.habitable);
    const matchesEnv = filters.environment === 'All' || p.environment === filters.environment;
    
    return matchesSearch && matchesFaction && matchesHabitable && matchesEnv;
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editMode) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * mapWidth);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * mapHeight);

    if (draggingPlanet) {
      const planet = planets.find(p => p.id === draggingPlanet);
      if (planet) {
        updatePlanet({ ...planet, x, y });
      }
    } else if (draggingSectorPoint) {
      const sector = sectors.find(s => s.id === draggingSectorPoint.sectorId);
      if (sector) {
        const newPoints = [...sector.points] as [number, number][];
        newPoints[draggingSectorPoint.pointIndex] = [x, y];
        updateSectorPoints(sector.id, newPoints);
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingPlanet(null);
    setDraggingSectorPoint(null);
  };

  const handlePlanetClick = (e: React.MouseEvent, planet: any) => {
    e.stopPropagation();
    if (!editMode) {
      setSelectedPlanet(planet);
      setSelectedSector(null);
      setSelectedLane(null);
    }
  };

  const handleSectorClick = (e: React.MouseEvent, sector: any) => {
    e.stopPropagation();
    if (!editMode) {
      setSelectedSector(sector);
      setSelectedPlanet(null);
      setSelectedLane(null);
    }
  };

  const handleLaneClick = (e: React.MouseEvent, lane: any) => {
    e.stopPropagation();
    if (!editMode) {
      setSelectedLane(lane);
      setSelectedPlanet(null);
      setSelectedSector(null);
    }
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (editMode && selectedSector) {
      // Add point to sector if in edit mode and sector selected
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * mapWidth);
      const y = Math.round(((e.clientY - rect.top) / rect.height) * mapHeight);
      
      const newPoints = [...selectedSector.points, [x, y]] as [number, number][];
      updateSectorPoints(selectedSector.id, newPoints);
    } else if (!editMode) {
      setSelectedPlanet(null);
      setSelectedSector(null);
      setSelectedLane(null);
    }
  };

  const getPlanetPoint = (id: string) => {
    const p = planets.find(p => p.id === id);
    return p ? { x: p.x, y: p.y } : null;
  };

  return (
    <div className="w-full h-full bg-background overflow-hidden relative" onClick={handleMapClick}>
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
        disabled={draggingPlanet !== null || draggingSectorPoint !== null}
        panning={{ disabled: draggingPlanet !== null || draggingSectorPoint !== null }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <div className="glass-panel rounded-md p-1 flex gap-1">
                <button onClick={() => zoomIn()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded" data-testid="button-zoom-in">+</button>
                <button onClick={() => zoomOut()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded" data-testid="button-zoom-out">-</button>
                <button onClick={() => resetTransform()} className="w-8 h-8 flex items-center justify-center text-foreground hover:text-primary transition-colors bg-white/5 rounded" data-testid="button-zoom-reset">↺</button>
              </div>
            </div>

            <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
              <div 
                className="relative cursor-grab active:cursor-grabbing origin-top-left"
                style={{ 
                  width: `${mapWidth}px`, 
                  height: `${mapHeight}px`,
                  backgroundImage: `url('/galaxy-map.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                
                {/* SVG Overlay for Sectors and Lanes */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${mapWidth} ${mapHeight}`}>
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Sectors */}
                  {showSectors && sectors.map(sector => {
                    const isSelected = selectedSector?.id === sector.id;
                    const pathD = `M ${sector.points.map(p => `${p[0]},${p[1]}`).join(' L ')} Z`;
                    
                    return (
                      <g key={sector.id}>
                        <path
                          d={pathD}
                          fill={`hsl(${sector.color} / ${isSelected ? '0.2' : '0.1'})`}
                          stroke={`hsl(${sector.color} / ${isSelected ? '0.8' : '0.3'})`}
                          strokeWidth={isSelected ? 3 : 1}
                          className={cn(
                            "pointer-events-auto transition-all duration-300 cursor-pointer",
                            !editMode && "hover:fill-[hsl(var(--primary)/0.15)]"
                          )}
                          onClick={(e) => handleSectorClick(e, sector)}
                          filter={isSelected ? "url(#glow)" : undefined}
                        />
                        {/* Sector drag handles in edit mode */}
                        {editMode && isSelected && sector.points.map((point, idx) => (
                          <circle
                            key={`${sector.id}-point-${idx}`}
                            cx={point[0]}
                            cy={point[1]}
                            r={8}
                            fill={`hsl(${sector.color})`}
                            stroke="white"
                            strokeWidth={2}
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

                  {/* Hyperspace Lanes */}
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
                        <line
                          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                          stroke="transparent"
                          strokeWidth={15}
                        />
                        <line
                          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 4 : (lane.type === 'Major' ? 3 : 2)}
                          strokeDasharray={lane.type === 'Minor' ? "4 4" : (lane.type === 'Dangerous' ? "2 6" : "none")}
                          className={cn(
                            "transition-all duration-300",
                            isSelected && "filter drop-shadow-[0_0_5px_currentColor]",
                            !editMode && "hover:stroke-width-[4px]"
                          )}
                          filter={isSelected ? "url(#glow)" : undefined}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Planet Markers */}
                {filteredPlanets.map(planet => {
                  const isSelected = selectedPlanet?.id === planet.id;
                  
                  return (
                    <div
                      key={planet.id}
                      className={cn(
                        "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center",
                        editMode ? "cursor-move" : "cursor-pointer"
                      )}
                      style={{ left: planet.x, top: planet.y }}
                      onClick={(e) => handlePlanetClick(e, planet)}
                      onMouseDown={(e) => {
                        if (editMode) {
                          setDraggingPlanet(planet.id);
                        }
                      }}
                    >
                      {planet.markerImage ? (
                        <div className={cn(
                          "relative transition-all duration-300",
                          isSelected ? "scale-125 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "hover:scale-110",
                          editMode && draggingPlanet === planet.id && "scale-150 opacity-50"
                        )}>
                          <img 
                            src={planet.markerImage} 
                            alt={planet.name}
                            className="w-8 h-8 object-contain pointer-events-none"
                          />
                          {isSelected && (
                            <div className="absolute inset-[-4px] border border-primary rounded-full animate-ping opacity-75"></div>
                          )}
                        </div>
                      ) : (
                        <div className={cn(
                          "w-4 h-4 rounded-full bg-primary relative",
                          isSelected ? "shadow-[0_0_15px_hsl(var(--primary))]" : "shadow-[0_0_5px_hsl(var(--primary)/0.5)]",
                          planet.faction === 'Sith Empire' && "bg-destructive shadow-[0_0_10px_hsl(var(--destructive))]",
                          planet.faction === 'Hutt Cartel' && "bg-green-500 shadow-[0_0_10px_#22c55e]",
                          !planet.habitable && "bg-muted-foreground",
                          editMode && draggingPlanet === planet.id && "scale-150 shadow-[0_0_20px_hsl(var(--primary))]"
                        )}>
                          {isSelected && (
                            <div className="absolute inset-[-4px] border border-primary rounded-full animate-ping opacity-75"></div>
                          )}
                        </div>
                      )}
                      
                      {showLabels && (
                        <div className={cn(
                          "mt-1 px-2 py-0.5 rounded text-xs font-display tracking-widest whitespace-nowrap bg-background/80 backdrop-blur-sm border transition-all",
                          isSelected ? "border-primary text-primary shadow-[0_0_10px_hsl(var(--primary)/0.3)]" : "border-border/50 text-foreground/80",
                          editMode && draggingPlanet === planet.id && "opacity-50"
                        )}>
                          {planet.name}
                        </div>
                      )}
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
