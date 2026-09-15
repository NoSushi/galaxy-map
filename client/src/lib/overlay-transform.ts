import type { MapOverlay } from "./data";

export interface OverlayGesture {
  type: "move" | "resize";
  startX: number;
  startY: number;
  scale: number;
  origin: MapOverlay;
}

// Screen-space deltas use a fixed scale for the whole gesture, independent
// of the event target (image, resize handle, or map).
export function transformOverlay(gesture: OverlayGesture, clientX: number, clientY: number): MapOverlay {
  const dx = (clientX - gesture.startX) / gesture.scale;
  const dy = (clientY - gesture.startY) / gesture.scale;
  return gesture.type === "move"
    ? { ...gesture.origin, x: Math.round(gesture.origin.x + dx), y: Math.round(gesture.origin.y + dy) }
    : {
        ...gesture.origin,
        width: Math.max(100, Math.round(gesture.origin.width + dx)),
        height: Math.max(100, Math.round(gesture.origin.height + dy)),
      };
}