import { drawHandLandmarks } from './hand-landmark-art';
import type { GestureSynthState } from './gesture-synth';
import type { HandLandmarks } from './tracking';

const COLORS = ['#72e7ff', '#ffcb73', '#ff8fa8', '#ab9bff', '#a4f2a5', '#ffb37a', '#ed9fff'];

export class GestureSynthVisual {
  private hands: HandLandmarks = [];
  private state: GestureSynthState | null = null;
  private frame = 0;
  private running = false;
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.render(performance.now());
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.hands = [];
    this.state = null;
    this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  set(hands: HandLandmarks, state: GestureSynthState): void {
    this.hands = hands;
    this.state = state;
  }

  private render(now: number): void {
    if (!this.running) return;
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      const { width, height } = this.canvas;
      ctx.clearRect(0, 0, width, height);
      if (this.hands.length) drawHandLandmarks(this.canvas, this.hands, false);
      const state = this.state;
      if (state && state.degree > 0 && state.volume > 0.01) {
        const color = COLORS[state.degree - 1];
        const energy = Math.min(1, state.volume);
        const time = this.reduceMotion ? 0 : now * 0.003;
        const baseY = height * 0.78;
        ctx.save();
        for (let layer = 0; layer < Math.min(4, state.quality); layer++) {
          ctx.beginPath();
          for (let x = 0; x <= width; x += Math.max(8, width / 72)) {
            const envelope = Math.sin(Math.PI * x / width) ** 2;
            const wave = Math.sin(x * (0.012 + layer * 0.002) - time * (1 + layer * 0.1) + layer * 0.8);
            const y = baseY + (layer - 1.5) * 13 + wave * (15 + energy * 34) * envelope;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = color;
          ctx.globalAlpha = (0.3 + energy * 0.4) * (1 - layer * 0.12);
          ctx.lineWidth = 2 + energy * 3;
          ctx.stroke();
        }
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.38, 48 + energy * 24 + (this.reduceMotion ? 0 : Math.sin(time * 2) * 4), 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 + energy * 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.38, 29 + energy * 12, 0, Math.PI * 2);
        ctx.globalAlpha = 0.18 + energy * 0.12;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }
    }
    this.frame = requestAnimationFrame((time) => this.render(time));
  }
}
