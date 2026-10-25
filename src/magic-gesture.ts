import type { HandLandmarks } from './tracking';

type Point = { x: number; y: number };
export type MagicPose = { x: number; y: number; radius: number };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function average(points: Point[]): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function fingerReach(mcp: Point, pip: Point, tip: Point): number {
  const x = pip.x - mcp.x;
  const y = pip.y - mcp.y;
  const lengthSquared = x * x + y * y;
  if (lengthSquared < 0.00001) return 0;
  return ((tip.x - mcp.x) * x + (tip.y - mcp.y) * y) / lengthSquared;
}

function magicPoseForHand(hand: HandLandmarks[number], aspectRatio: number): MagicPose | null {
  if (hand.length < 21) return null;
  const point = (index: number): Point => ({ x: hand[index].x * aspectRatio, y: hand[index].y });
  const width = distance(point(5), point(17));
  if (width < 0.035) return null;
  const wrist = point(0);
  const reach = (mcp: number, pip: number, tip: number): number =>
    fingerReach(point(mcp), point(pip), point(tip));

  // Índice y meñique levantados; medio y anular doblados. Las distancias se
  // miden respecto de la propia mano para tolerar cambios de tamaño en cámara.
  const indexUp = reach(5, 6, 8) > 1.6 && distance(point(8), wrist) > distance(point(6), wrist) + width * 0.04;
  const pinkyUp = reach(17, 18, 20) > 1.55 && distance(point(20), wrist) > distance(point(18), wrist) + width * 0.04;
  const middleDown = reach(9, 10, 12) < 1.35;
  const ringDown = reach(13, 14, 16) < 1.35;
  if (!indexUp || !pinkyUp || !middleDown || !ringDown) return null;

  const knuckles = average([5, 9, 13, 17].map(point));
  const center = { x: knuckles.x * 0.76 + wrist.x * 0.24, y: knuckles.y * 0.76 + wrist.y * 0.24 };
  if (distance(point(4), center) > width * 1.25) return null; // Pulgar cerca de la palma.
  return {
    x: center.x / aspectRatio,
    y: center.y,
    radius: Math.max(0.05, Math.min(0.17, width * 0.62)),
  };
}

export function magicPosesFromHands(hands: HandLandmarks, aspectRatio: number): MagicPose[] {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return [];
  return hands.flatMap((hand) => {
    const pose = magicPoseForHand(hand, aspectRatio);
    return pose ? [pose] : [];
  });
}
