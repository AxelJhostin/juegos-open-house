import type { HandLandmarks } from './tracking';
import { energyPoseFromHands, type EnergyPose } from './energy-pose';
import { drawEnergyOrb } from './hand-energy-art';
import { drawHandLandmarks } from './hand-landmark-art';

type EnergyState = 'idle' | 'charging' | 'active';
const CHARGE_MS = 850;
const LOST_GRACE_MS = 180;

export class HandDemoVisualizer {
  private frameId = 0;
  private running = false;
  private hands: HandLandmarks = [];
  private lastLandmarksAt = 0;
  private lastPoseAt = 0;
  private poseSince = 0;
  private pose: EnergyPose | null = null;
  private x = 0;
  private y = 0;
  private radius = 50;
  private charge = 0;
  private burst = 0;
  private wasActive = false;
  private previousFrame = 0;
  private lastState: EnergyState = 'idle';
  private lastPercent = -1;
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onEnergy: (state: EnergyState, percent: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.previousFrame = performance.now();
    this.frameId = requestAnimationFrame(this.render);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.hands = [];
    this.pose = null;
    this.lastPoseAt = 0;
    this.poseSince = 0;
    this.charge = 0;
    this.burst = 0;
    this.wasActive = false;
    this.lastState = 'idle';
    this.lastPercent = -1;
    this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.onEnergy('idle', 0);
  }

  setLandmarks(hands: HandLandmarks): void {
    if (!this.running) return;
    const now = performance.now();
    this.hands = hands;
    this.lastLandmarksAt = now;
    const pose = energyPoseFromHands(hands, this.canvas.width / Math.max(1, this.canvas.height));
    if (!pose) return;
    if (now - this.lastPoseAt > LOST_GRACE_MS) this.poseSince = now;
    this.lastPoseAt = now;
    this.pose = pose;
  }

  private render = (now: number): void => {
    if (!this.running) return;
    const context = this.canvas.getContext('2d');
    if (!context) return;
    const dt = Math.min(50, now - this.previousFrame);
    this.previousFrame = now;
    const visible = now - this.lastLandmarksAt < 250;
    const holding = visible && this.pose !== null && now - this.lastPoseAt < LOST_GRACE_MS;
    this.charge = holding ? Math.min(1, (now - this.poseSince) / CHARGE_MS) : 0;

    if (holding && this.pose) {
      const targetX = (1 - this.pose.x) * this.canvas.width;
      const targetY = this.pose.y * this.canvas.height;
      const targetRadius = Math.max(30, Math.min(105, this.pose.radius * this.canvas.height));
      const follow = 1 - Math.exp(-dt / 45);
      if (!this.wasActive && this.charge < 0.04) {
        this.x = targetX;
        this.y = targetY;
        this.radius = targetRadius;
      } else {
        this.x += (targetX - this.x) * follow;
        this.y += (targetY - this.y) * follow;
        this.radius += (targetRadius - this.radius) * follow;
      }
    }
    const active = holding && this.charge >= 1;
    if (active && !this.wasActive) this.burst = this.reduceMotion ? 0 : 1;
    this.wasActive = active;
    this.burst = holding ? Math.max(0, this.burst - dt / 550) : 0;
    if (!holding) this.pose = null;

    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawEnergyOrb(context, { x: this.x, y: this.y, radius: this.radius, charge: this.charge, burst: this.burst },
      this.reduceMotion ? 0 : now);
    if (visible) drawHandLandmarks(this.canvas, this.hands, false);

    const state: EnergyState = active ? 'active' : holding ? 'charging' : 'idle';
    const percent = Math.round(this.charge * 20) * 5;
    if (state !== this.lastState || percent !== this.lastPercent) {
      this.onEnergy(state, percent);
      this.lastState = state;
      this.lastPercent = percent;
    }
    this.frameId = requestAnimationFrame(this.render);
  };
}
