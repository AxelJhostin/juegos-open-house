import type { HandLandmarks } from './tracking';

type Point = { x: number; y: number };
type HandShape = { center: Point; direction: Point; width: number };
export type EnergyPose = { x: number; y: number; radius: number };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function average(points: Point[]): Point {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function handShape(hand: HandLandmarks[number], aspectRatio: number): HandShape | null {
  if (hand.length < 21) return null;
  // Corregimos la proporción del video para comparar distancias reales en pantalla.
  const point = (index: number): Point => ({ x: hand[index].x * aspectRatio, y: hand[index].y });
  const wrist = point(0);
  const knuckles = average([5, 9, 13, 17].map(point));
  const tips = average([8, 12, 16, 20].map(point));
  const width = distance(point(5), point(17));
  if (width < 0.035) return null;

  // Una mano que sostiene la esfera mantiene varios dedos extendidos hacia un lado.
  const fingers = [[8, 6], [12, 10], [16, 14], [20, 18]];
  const extended = fingers.filter(([tip, joint]) =>
    distance(point(tip), wrist) > distance(point(joint), wrist) + width * 0.07,
  ).length;
  if (extended < 3) return null;

  const direction = { x: tips.x - knuckles.x, y: tips.y - knuckles.y };
  if (Math.abs(direction.x) < Math.max(width * 0.55, Math.abs(direction.y) * 1.15)) return null;
  const center = {
    x: knuckles.x * 0.75 + wrist.x * 0.25,
    y: knuckles.y * 0.75 + wrist.y * 0.25,
  };
  return { center, direction, width };
}

// La referencia del usuario: una mano encima de la otra, dedos hacia lados opuestos.
// La esfera se centra entre las palmas y no se activa con una sola mano abierta.
export function energyPoseFromHands(hands: HandLandmarks, aspectRatio: number): EnergyPose | null {
  if (hands.length < 2 || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return null;
  const first = handShape(hands[0], aspectRatio);
  const second = handShape(hands[1], aspectRatio);
  if (!first || !second) return null;
  const [upper, lower] = first.center.y < second.center.y ? [first, second] : [second, first];
  const averageWidth = (upper.width + lower.width) / 2;
  const verticalGap = lower.center.y - upper.center.y;
  const horizontalGap = Math.abs(lower.center.x - upper.center.x);
  if (verticalGap < Math.max(0.16, averageWidth * 1.05)) return null;
  if (horizontalGap > Math.max(0.14, averageWidth * 1.8)) return null;
  if (upper.direction.x * lower.direction.x >= 0) return null;

  return {
    x: (upper.center.x + lower.center.x) / (2 * aspectRatio),
    y: (upper.center.y + lower.center.y) / 2,
    radius: Math.max(0.055, Math.min(0.19, verticalGap * 0.29, averageWidth * 1.05)),
  };
}
