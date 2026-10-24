export type Point = { x: number; y: number };

// Comprueba todo el tramo recorrido, no solo sus dos extremos.
export function segmentHitsCircle(from: Point, to: Point, center: Point, radius: number): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((center.x - from.x) * dx + (center.y - from.y) * dy) / lengthSquared));
  const closestX = from.x + projection * dx;
  const closestY = from.y + projection * dy;
  return (center.x - closestX) ** 2 + (center.y - closestY) ** 2 <= radius ** 2;
}
