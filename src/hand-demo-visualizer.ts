import type { HandLandmarks } from './tracking';
import { energyPoseFromHands, type EnergyPose } from './energy-pose';
import { magicPosesFromHands, type MagicPose } from './magic-gesture';
import { drawEnergyOrb } from './hand-energy-art';
import { drawMagicSeal } from './magic-art';
import { drawHandLandmarks } from './hand-landmark-art';
import { assignHandSlots, type HandSlots } from './hand-slots';
import { heartPoseFromHands, type HeartPose } from './heart-gesture';
import { HeartRainEffect } from './heart-rain-art';
import { RainbowGesture, type RainbowSample, type RainbowState } from './rainbow-gesture';
import { RainbowArcEffect } from './rainbow-art';
import type { SoundCue } from './sound';

type EnergyState = 'idle' | 'charging' | 'active';
const CHARGE_MS = 850;
const MAGIC_CHARGE_MS = 480;
const MAGIC_VISUAL_SCALE = 3;
const LOST_GRACE_MS = 180;

type MagicSlot = {
  pose: MagicPose | null;
  lastAt: number;
  since: number;
  x: number;
  y: number;
  radius: number;
  charge: number;
  burst: number;
  wasActive: boolean;
};

function emptyMagicSlot(): MagicSlot {
  return { pose: null, lastAt: 0, since: 0, x: 0, y: 0, radius: 50, charge: 0, burst: 0, wasActive: false };
}

export class HandDemoVisualizer {
  private frameId = 0;
  private running = false;
  private poseMode = false;
  private hands: HandLandmarks = [];
  private lastLandmarksAt = 0;
  private lastPoseAt = 0;
  private poseSince = 0;
  private pose: EnergyPose | null = null;
  private x = 0;
  private y = 0;
  private radius = 50;
  private charge = 0;
  private visualCharge = 0;
  private closing = 1;
  private closingFrom = 0;
  private burst = 0;
  private wasActive = false;
  private previousFrame = 0;
  private lastState: EnergyState = 'idle';
  private lastPercent = -1;
  private magicSlots: [MagicSlot, MagicSlot] = [emptyMagicSlot(), emptyMagicSlot()];
  private previousMagicLocations: HandSlots = [null, null];
  private lastMagicActive = -1;
  private lastMagicCharging = -1;
  private heartPose: HeartPose | null = null;
  private lastHeartAt = 0;
  private heartSince = 0;
  private heartX = 0;
  private heartY = 0;
  private heartWasActive = false;
  private lastHeartState = '';
  private readonly heartRain = new HeartRainEffect();
  private readonly rainbowGesture = new RainbowGesture();
  private readonly rainbowArc = new RainbowArcEffect();
  private rainbowSample: RainbowSample = { state: 'idle', pose: null, progress: 0 };
  private rainbowWasActive = false;
  private lastRainbowState: RainbowState = 'idle';
  private readonly reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onEnergy: (state: EnergyState, percent: number) => void,
    private readonly onMagic: (active: number, charging: number) => void,
    private readonly onHeart: (state: 'idle' | 'charging' | 'active') => void,
    private readonly onRainbow: (state: RainbowState) => void,
    private readonly onSound: (cue: SoundCue) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.previousFrame = performance.now();
    this.frameId = requestAnimationFrame(this.render);
  }

  setPoseMode(active: boolean): void { this.poseMode = active; }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.hands = [];
    this.pose = null;
    this.lastPoseAt = 0;
    this.poseSince = 0;
    this.charge = 0;
    this.visualCharge = 0;
    this.closing = 1;
    this.closingFrom = 0;
    this.burst = 0;
    this.wasActive = false;
    this.lastState = 'idle';
    this.lastPercent = -1;
    this.magicSlots = [emptyMagicSlot(), emptyMagicSlot()];
    this.previousMagicLocations = [null, null];
    this.lastMagicActive = -1;
    this.lastMagicCharging = -1;
    this.heartPose = null;
    this.lastHeartAt = 0;
    this.heartSince = 0;
    this.heartWasActive = false;
    this.lastHeartState = '';
    this.heartRain.reset();
    this.rainbowGesture.reset();
    this.rainbowArc.reset();
    this.rainbowSample = { state: 'idle', pose: null, progress: 0 };
    this.rainbowWasActive = false;
    this.lastRainbowState = 'idle';
    this.canvas.getContext('2d')?.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.onEnergy('idle', 0);
    this.onMagic(0, 0);
    this.onHeart('idle');
    this.onRainbow('idle');
  }

  setLandmarks(hands: HandLandmarks): void {
    if (!this.running) return;
    const now = performance.now();
    this.hands = hands;
    this.lastLandmarksAt = now;
    const aspectRatio = this.canvas.width / Math.max(1, this.canvas.height);
    this.rainbowSample = this.rainbowGesture.sample(hands, aspectRatio, now);
    const heart = heartPoseFromHands(hands, aspectRatio);
    if (heart) {
      if (now - this.lastHeartAt > LOST_GRACE_MS) this.heartSince = now;
      this.lastHeartAt = now;
      this.heartPose = heart;
    }
    const pose = energyPoseFromHands(hands, aspectRatio);
    if (pose) {
      this.heartPose = null;
      if (now - this.lastPoseAt > LOST_GRACE_MS) this.poseSince = now;
      this.lastPoseAt = now;
      this.pose = pose;
      this.previousMagicLocations = [null, null];
      for (const slot of this.magicSlots) slot.lastAt = 0;
      return;
    }

    const magicPoses = magicPosesFromHands(hands, aspectRatio);
    if (magicPoses.length > 0) {
      this.lastPoseAt = 0;
      this.pose = null;
    }
    const assigned = assignHandSlots(this.previousMagicLocations, magicPoses);
    const nextLocations: HandSlots = [null, null];
    for (let index = 0; index < 2; index++) {
      const candidate = assigned[index] as MagicPose | null;
      const previous = this.previousMagicLocations[index];
      const slot = this.magicSlots[index];
      if (candidate) {
        const switched = !previous || Math.hypot(candidate.x - previous.x, candidate.y - previous.y) > 0.22;
        if (switched || now - slot.lastAt > LOST_GRACE_MS) {
          slot.since = now;
          slot.charge = 0;
          slot.burst = 0;
          slot.wasActive = false;
        }
        slot.pose = candidate;
        slot.lastAt = now;
        nextLocations[index] = candidate;
      } else if (now - slot.lastAt < LOST_GRACE_MS) nextLocations[index] = previous;
    }
    this.previousMagicLocations = nextLocations;
  }

  private render = (now: number): void => {
    if (!this.running) return;
    const context = this.canvas.getContext('2d');
    if (!context) return;
    const dt = Math.min(50, now - this.previousFrame);
    this.previousFrame = now;
    const visible = now - this.lastLandmarksAt < 250;
    const holding = visible && this.pose !== null && now - this.lastPoseAt < LOST_GRACE_MS;
    const previousCharge = this.visualCharge;
    this.charge = holding ? Math.min(1, (now - this.poseSince) / CHARGE_MS) : 0;
    if (holding) {
      this.closing = 1;
      this.visualCharge = this.charge;
    } else if (previousCharge > 0 && this.closing === 1) {
      // Al soltar el gesto, conservamos la última posición y animamos el apagado.
      this.closingFrom = previousCharge;
      this.closing = 0;
    }
    if (!holding && this.closing < 1) {
      this.closing = Math.min(1, this.closing + dt / (this.reduceMotion ? 150 : 420));
      const fade = 1 - this.closing * this.closing * (3 - 2 * this.closing);
      this.visualCharge = this.closingFrom * fade;
    }

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
    if (active && !this.wasActive) {
      this.burst = this.reduceMotion ? 0 : 1;
      this.onSound('energy');
    }
    if (!holding && this.wasActive) this.onSound('energyClose');
    this.wasActive = active;
    this.burst = holding ? Math.max(0, this.burst - dt / 550) : 0;
    if (!holding) this.pose = null;

    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const rainbowState = visible ? this.rainbowSample.state : 'idle';
    const rainbowSample = visible ? this.rainbowSample : { state: 'idle' as const, pose: null, progress: 0 };
    this.rainbowArc.draw(context, rainbowSample, dt, now, this.reduceMotion);
    const rainbowActive = rainbowState === 'active';
    if (rainbowActive && !this.rainbowWasActive) this.onSound('rainbow');
    this.rainbowWasActive = rainbowActive;
    if (rainbowState !== this.lastRainbowState) {
      this.onRainbow(rainbowState);
      this.lastRainbowState = rainbowState;
    }
    drawEnergyOrb(context, { x: this.x, y: this.y, radius: this.radius, charge: this.visualCharge,
      burst: this.burst, closing: holding ? 0 : this.closing },
      this.reduceMotion ? 0 : now);

    let magicActive = 0;
    let magicCharging = 0;
    for (let index = 0; index < 2; index++) {
      const slot = this.magicSlots[index];
      const magicHolding = visible && slot.pose !== null && now - slot.lastAt < LOST_GRACE_MS;
      slot.charge = magicHolding ? Math.min(1, (now - slot.since) / MAGIC_CHARGE_MS) : 0;
      if (magicHolding && slot.pose) {
        const targetX = (1 - slot.pose.x) * this.canvas.width;
        const targetY = slot.pose.y * this.canvas.height;
        const targetRadius = Math.max(34, Math.min(95, slot.pose.radius * this.canvas.height)) * MAGIC_VISUAL_SCALE;
        const follow = 1 - Math.exp(-dt / 45);
        if (!slot.wasActive && slot.charge < 0.05) {
          slot.x = targetX;
          slot.y = targetY;
          slot.radius = targetRadius;
        } else {
          slot.x += (targetX - slot.x) * follow;
          slot.y += (targetY - slot.y) * follow;
          slot.radius += (targetRadius - slot.radius) * follow;
        }
      }
      const magicReady = magicHolding && slot.charge >= 1;
      if (magicReady && !slot.wasActive) {
        slot.burst = this.reduceMotion ? 0 : 1;
        this.onSound('magic');
      }
      slot.wasActive = magicReady;
      slot.burst = magicHolding ? Math.max(0, slot.burst - dt / 500) : 0;
      if (!magicHolding) slot.pose = null;
      if (magicReady) magicActive++;
      else if (magicHolding) magicCharging++;
      drawMagicSeal(context, { x: slot.x, y: slot.y, radius: slot.radius, charge: slot.charge, burst: slot.burst },
        this.reduceMotion ? 0 : now + index * 730);
    }
    const heartHolding = visible && this.heartPose !== null && now - this.lastHeartAt < LOST_GRACE_MS;
    const heartReady = heartHolding && now - this.heartSince >= 330;
    if (heartHolding && this.heartPose) {
      const targetX = (1 - this.heartPose.x) * this.canvas.width;
      const targetY = this.heartPose.y * this.canvas.height;
      const follow = 1 - Math.exp(-dt / 45);
      if (!this.heartWasActive && now - this.heartSince < 60) {
        this.heartX = targetX;
        this.heartY = targetY;
      } else {
        this.heartX += (targetX - this.heartX) * follow;
        this.heartY += (targetY - this.heartY) * follow;
      }
    }
    if (heartReady && !this.heartWasActive) this.onSound('heart');
    this.heartWasActive = heartReady;
    this.heartRain.draw(context, heartReady, { x: this.heartX, y: this.heartY }, dt, now, this.reduceMotion);
    const heartState = heartReady ? 'active' : heartHolding ? 'charging' : 'idle';
    if (heartState !== this.lastHeartState) {
      this.onHeart(heartState);
      this.lastHeartState = heartState;
    }
    if (!heartHolding) this.heartPose = null;
    if (visible && !this.poseMode) drawHandLandmarks(this.canvas, this.hands, false);

    const state: EnergyState = active ? 'active' : holding ? 'charging' : 'idle';
    const percent = Math.round(this.charge * 20) * 5;
    if (state !== this.lastState || percent !== this.lastPercent) {
      this.onEnergy(state, percent);
      this.lastState = state;
      this.lastPercent = percent;
    }
    if (magicActive !== this.lastMagicActive || magicCharging !== this.lastMagicCharging) {
      this.onMagic(magicActive, magicCharging);
      this.lastMagicActive = magicActive;
      this.lastMagicCharging = magicCharging;
    }
    this.frameId = requestAnimationFrame(this.render);
  };
}
