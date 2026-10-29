import type { BodyHands, BodyPose } from './pose-tracking';

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];
const COLORS = ['#78f4ea', '#ffd27d', '#ff8fc7'];
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export class BodyLandmarkVisualizer {
  private poses: BodyPose[] = [];
  private hands: BodyHands = [];
  private frame = 0;
  private running = false;

  constructor(private canvas: HTMLCanvasElement) {}

  setLandmarks(poses: BodyPose[], hands: BodyHands): void {
    this.poses = poses.slice(0, 3);
    this.hands = hands.slice(0, 6);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.draw();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.poses = [];
    this.hands = [];
    this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private draw = (): void => {
    if (!this.running) return;
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      const { width, height } = this.canvas;
      ctx.clearRect(0, 0, width, height);
      const scale = width / 960;
      for (const [person, pose] of this.poses.entries()) {
        const color = COLORS[person];
        const point = (index: number) => {
          const p = pose[index];
          return p && Number.isFinite(p.x) && Number.isFinite(p.y)
            ? { x: (1 - p.x) * width, y: p.y * height, alpha: Math.max(0.35, p.visibility ?? 1) }
            : null;
        };
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, 3 * scale);
        for (const [a, b] of CONNECTIONS) {
          const start = point(a), end = point(b);
          if (!start || !end) continue;
          ctx.globalAlpha = Math.min(start.alpha, end.alpha) * 0.8;
          ctx.strokeStyle = '#101327';
          ctx.lineWidth = Math.max(4, 6 * scale);
          ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(2, 3 * scale);
          ctx.stroke();
        }
        for (let i = 0; i < pose.length; i++) {
          const p = point(i);
          if (!p) continue;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = '#101327';
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(4, 6 * scale), 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2.5, 4 * scale), 0, Math.PI * 2); ctx.fill();
        }
      }
      // Las manos se dibujan al final para que sus 21 puntos se distingan del esqueleto corporal.
      for (const hand of this.hands) {
        const point = (index: number) => {
          const p = hand[index];
          return p && Number.isFinite(p.x) && Number.isFinite(p.y)
            ? { x: (1 - p.x) * width, y: p.y * height }
            : null;
        };
        ctx.globalAlpha = 1;
        ctx.lineCap = 'round';
        for (const [a, b] of HAND_CONNECTIONS) {
          const start = point(a), end = point(b);
          if (!start || !end) continue;
          ctx.strokeStyle = '#101327';
          ctx.lineWidth = Math.max(4, 5 * scale);
          ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
          ctx.strokeStyle = '#ffe979';
          ctx.lineWidth = Math.max(2, 2.5 * scale);
          ctx.stroke();
        }
        for (let i = 0; i < hand.length; i++) {
          const p = point(i);
          if (!p) continue;
          ctx.fillStyle = '#101327';
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(4, 5 * scale), 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffe979';
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(2.5, 3.5 * scale), 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    this.frame = requestAnimationFrame(this.draw);
  };
}
