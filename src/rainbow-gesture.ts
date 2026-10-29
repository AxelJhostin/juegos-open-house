import type { HandLandmarks } from './tracking';

type Point = { x: number; y: number };
export type RainbowPose = { left: Point; right: Point; gap: number };
export type RainbowState = 'idle' | 'ready' | 'opening' | 'active';
export type RainbowSample = { state: RainbowState; pose: RainbowPose | null; progress: number };

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

function openPalm(hand: HandLandmarks[number], aspectRatio: number): Point | null {
  if (hand.length < 21) return null;
  const scaled = (index: number): Point => ({ x: hand[index].x * aspectRatio, y: hand[index].y });
  const wrist = scaled(0);
  const palmWidth = distance(scaled(5), scaled(17));
  if (palmWidth < 0.035) return null;
  const fingers = [[8, 6], [12, 10], [16, 14], [20, 18]] as const;
  const extended = fingers.filter(([tip, joint]) =>
    distance(scaled(tip), wrist) > distance(scaled(joint), wrist) + palmWidth * 0.12).length;
  if (extended < 3) return null;
  const knuckles = [5, 9, 13, 17].map((index) => hand[index]);
  const center = {
    x: (knuckles.reduce((sum, point) => sum + point.x, 0) / 4 * 3 + hand[0].x) / 4,
    y: (knuckles.reduce((sum, point) => sum + point.y, 0) / 4 * 3 + hand[0].y) / 4,
  };
  return center;
}

// Las manos están a una altura similar y ocupan la mitad superior de la cámara.
export function rainbowPoseFromHands(hands: HandLandmarks, aspectRatio: number): RainbowPose | null {
  if (hands.length < 2 || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return null;
  const first = openPalm(hands[0], aspectRatio);
  const second = openPalm(hands[1], aspectRatio);
  if (!first || !second) return null;
  const [left, right] = first.x <= second.x ? [first, second] : [second, first];
  const gap = right.x - left.x;
  if (gap < 0.08 || gap > 0.88 || Math.abs(left.y - right.y) > 0.17 ||
    (left.y + right.y) / 2 > 0.58 || (left.y + right.y) / 2 < 0.08) return null;
  return { left, right, gap };
}

export class RainbowGesture {
  private state: RainbowState = 'idle';
  private armedAt = 0;
  private startGap = 0;
  private lastSeenAt = 0;
  private pose: RainbowPose | null = null;
  private progress = 0;

  reset(): void {
    this.state = 'idle';
    this.armedAt = 0;
    this.startGap = 0;
    this.lastSeenAt = 0;
    this.pose = null;
    this.progress = 0;
  }

  sample(hands: HandLandmarks, aspectRatio: number, now: number): RainbowSample {
    const pose = rainbowPoseFromHands(hands, aspectRatio);
    if (!pose) {
      if (now - this.lastSeenAt > 220) this.reset();
      return { state: this.state, pose: this.pose, progress: this.progress };
    }
    this.pose = pose;
    this.lastSeenAt = now;

    if (this.state === 'active') {
      if (pose.gap > 0.32) return { state: 'active', pose, progress: 1 };
      this.state = 'idle';
      this.armedAt = 0;
    }

    if (pose.gap <= 0.32) {
      if (!this.armedAt) {
        this.armedAt = now;
        this.startGap = pose.gap;
      }
      this.startGap = Math.min(this.startGap, pose.gap);
      this.progress = 0;
      this.state = now - this.armedAt >= 130 ? 'ready' : 'idle';
      return { state: this.state, pose, progress: 0 };
    }

    if (!this.armedAt || now - this.armedAt < 130) {
      this.reset();
      return { state: 'idle', pose: null, progress: 0 };
    }

    const targetGap = Math.max(0.46, this.startGap + 0.19);
    this.progress = Math.min(1, Math.max(0, (pose.gap - this.startGap) / (targetGap - this.startGap)));
    this.state = pose.gap >= targetGap ? 'active' : 'opening';
    return { state: this.state, pose, progress: this.progress };
  }
}
