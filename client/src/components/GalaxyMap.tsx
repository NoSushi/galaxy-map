import React, { useRef, useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useMap } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Circle, Hexagon, Triangle } from 'lucide-react';

export const GalaxyMap = () => {
  const { 
    planets, sectors, lanes, 
    showLanes, showSectors, showLabels, 
    selectedPlanet, setSelectedPlanet,
    selectedSector, setSelectedSector,
    selectedLane, setSelectedLane,
    editMode, updatePlanet,
    searchQuery, filters
  } = useMap();

  const mapWidth = 2000;
  const mapHeight = 1125; // 16:9 aspect ratio
  
  const [draggingPlanet, setDraggingPlanet] = useState<string | null>(null);

  // Filter planets based on search and filters
  const filteredPlanets = planets.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFaction = filters.faction === 'All' || p.faction === filters.faction;
    const matchesHabitable = filters.habitable === 'All' || 
                             (filters.habitable === 'Yes' ? p.habitable : !p.habitable);
    const matchesEnv = filters.environment === 'All' || p.environment === filters.environment;
    
    return matchesSearch && matchesFaction && matchesHabitable && matchesEnv;
  });

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

  const handleMapClick = () => {
    if (!editMode) {
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
        disabled={draggingPlanet !== null}
        panning={{ disabled: draggingPlanet !== null }}
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
                      <path
                        key={sector.id}
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
                        {/* Invisible thicker line for easier clicking */}
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
                          // Setup window listeners for drag
                          const handleMouseMove = (mvEvent: MouseEvent) => {
                            // This is simplified, real implementation would need complex coordinate mapping
                            // taking zoom/pan into account. For mockup, we use a basic offset.
                          };
                          const handleMouseUp = () => {
                            setDraggingPlanet(null);
                            window.removeEventListener('mouseup', handleMouseUp);
                          };
                          window.addEventListener('mouseup', handleMouseUp);
                        }
                      }}
                    >
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
