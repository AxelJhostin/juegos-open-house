import type { HandLandmarks } from './tracking';

type Point = { x: number; y: number };
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

// Los dedos se curvan hacia dentro: índices arriba y pulgares unidos abajo.
// Las distancias se normalizan al tamaño de las palmas para admitir distintas cámaras.
export function twoHandHeart(hands: HandLandmarks, aspect: number): boolean {
  if (hands.length !== 2 || !Number.isFinite(aspect) || aspect <= 0 || hands.some(hand => hand.length < 21)) return false;
  const point = (hand: HandLandmarks[number], index: number): Point => ({ x: hand[index].x * aspect, y: hand[index].y });
  const [left, right] = [...hands].sort((a, b) => a[0].x - b[0].x);
  const width = (distance(point(left, 5), point(left, 17)) + distance(point(right, 5), point(right, 17))) / 2;
  if (width < 0.035) return false;
  const li = point(left, 8), ri = point(right, 8), lt = point(left, 4), rt = point(right, 4);
  const indexMid = { x: (li.x + ri.x) / 2, y: (li.y + ri.y) / 2 };
  const thumbMid = { x: (lt.x + rt.x) / 2, y: (lt.y + rt.y) / 2 };
  const leftWrist = point(left, 0), rightWrist = point(right, 0);
  const leftJoint = point(left, 6), rightJoint = point(right, 6);
  return distance(li, ri) < width * 1.15 && distance(lt, rt) < width * 1.15 &&
    thumbMid.y - indexMid.y > width * 0.55 && thumbMid.y - indexMid.y < width * 4 &&
    Math.abs(indexMid.x - thumbMid.x) < width * 1.2 &&
    li.y > leftJoint.y - width * .15 && ri.y > rightJoint.y - width * .15 &&
    li.x > leftJoint.x && ri.x < rightJoint.x &&
    leftWrist.x < indexMid.x && rightWrist.x > indexMid.x &&
    rightWrist.x - leftWrist.x > width * 1.3;
}
