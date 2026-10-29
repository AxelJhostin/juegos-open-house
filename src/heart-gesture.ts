import type { HandLandmarks } from './tracking';

type Point = { x: number; y: number };
export type HeartPose = { x: number; y: number; size: number };
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export function heartPoseFromHands(hands: HandLandmarks, aspectRatio: number): HeartPose | null {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return null;
  for (const hand of hands) {
    if (hand.length < 21) continue;
    const point = (index: number): Point => ({ x: hand[index].x * aspectRatio, y: hand[index].y });
    const width = distance(point(5), point(17));
    if (width < 0.035) continue;
    const thumb = point(4), index = point(8);
    const tipGap = distance(thumb, index) / width;
    const middleFolded = distance(point(12), point(9)) < distance(point(10), point(9)) * 1.55;
    const ringFolded = distance(point(16), point(13)) < distance(point(14), point(13)) * 1.55;
    const pinkyFolded = distance(point(20), point(17)) < distance(point(18), point(17)) * 1.65;
    const indexRaised = distance(index, point(5)) > distance(point(6), point(5)) * 1.12;
    const thumbVisible = distance(thumb, point(2)) > width * 0.33;
    // La mano cerrada y una pinza con otros dedos abiertos no deben activar la lluvia.
    if (tipGap > 0.62 || !middleFolded || !ringFolded || !pinkyFolded ||
      !indexRaised || !thumbVisible) continue;
    return { x: (thumb.x + index.x) / (2 * aspectRatio), y: (thumb.y + index.y) / 2,
      size: Math.max(0.035, Math.min(0.16, width * 0.72)) };
  }
  return null;
}
