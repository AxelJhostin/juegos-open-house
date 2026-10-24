import type { Point } from './geometry';

export type HandSlots = [Point | null, Point | null];

function distance(a: Point | null, b: Point): number {
  return a ? Math.hypot(a.x - b.x, a.y - b.y) : Infinity;
}

export function assignHandSlots(previous: HandSlots, points: Point[]): HandSlots {
  if (points.length === 0) return [null, null];
  if (points.length === 1) {
    const slot = distance(previous[0], points[0]) <= distance(previous[1], points[0]) ? 0 : 1;
    return slot === 0 ? [points[0], null] : [null, points[0]];
  }

  const [a, b] = points;
  if (!previous[0] && !previous[1]) return a.x <= b.x ? [a, b] : [b, a];
  if (!previous[0]) return distance(previous[1], a) <= distance(previous[1], b) ? [b, a] : [a, b];
  if (!previous[1]) return distance(previous[0], a) <= distance(previous[0], b) ? [a, b] : [b, a];

  const sameOrder = distance(previous[0], a) + distance(previous[1], b);
  const swapped = distance(previous[0], b) + distance(previous[1], a);
  return sameOrder <= swapped ? [a, b] : [b, a];
}
