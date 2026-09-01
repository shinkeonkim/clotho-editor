export interface DrawPoint {
  x: number;
  y: number;
}

export interface DragBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  distance: number;
}

export function dragBounds(start: DrawPoint, end: DrawPoint): DragBounds {
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width,
    height,
    centerX: (start.x + end.x) / 2,
    centerY: (start.y + end.y) / 2,
    distance: Math.hypot(end.x - start.x, end.y - start.y),
  };
}

export function isShapeDrag(start: DrawPoint, end: DrawPoint): boolean {
  return dragBounds(start, end).distance >= 4;
}

export function regularPolygonPoints(
  center: DrawPoint,
  radius: number,
  requestedSides: number,
): string {
  const sides = Math.max(3, Math.min(24, Math.round(requestedSides) || 6));
  return Array.from({ length: sides }, (_, index) => {
    const angle = (index * Math.PI * 2) / sides - Math.PI / 2;
    return `${(center.x + radius * Math.cos(angle)).toFixed(1)},${(center.y + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");
}
