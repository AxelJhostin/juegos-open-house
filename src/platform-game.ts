import Phaser from 'phaser';
import type { HandSample } from './tracking';
import type { ControlMode } from './game-types';
import { PinchJumpControl } from './pinch-jump';

const WIDTH = 960;
const WORLD_WIDTH = 3300;
const SPEED = 240;
const JUMP_SPEED = -680;
const GRAVITY = 1800;
const PLAYER_HALF_WIDTH = 18;
const PLATFORMS: Array<[number, number]> = [
  [0, 850], [960, 1550], [1660, 2250], [2360, 2900], [3010, WORLD_WIDTH],
];
const HAZARDS = [530, 1250, 1970, 2650];
type Callbacks = { onHud(progress: number): void; onEnd(progress: number, won: boolean): void };

export class PlatformGame extends Phaser.Scene {
  private graphics?: Phaser.GameObjects.Graphics;
  private keys?: Record<'up' | 'w' | 'space', Phaser.Input.Keyboard.Key>;
  private fieldHeight = 540;
  private x = 70;
  private y = 0;
  private vy = 0;
  private cameraOffset = 0;
  private cameraPoint: HandSample | null = null;
  private pinch = new PinchJumpControl();
  private jumpQueued = false;
  private jumpBuffer = 0;
  private coyote = 0;
  private grounded = true;
  private playing = false;
  private mode: ControlMode = 'keyboard';
  private progress = 0;

  constructor(private callbacks: Callbacks) { super({ key: 'platform-game', active: true }); }

  get isPlaying(): boolean { return this.playing; }
  get controlMode(): ControlMode { return this.mode; }
  get gestureReady(): boolean { return this.pinch.isReady; }

  create(): void {
    this.graphics = this.add.graphics();
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const codes = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: keyboard.addKey(codes.UP),
      w: keyboard.addKey(codes.W),
      space: keyboard.addKey(codes.SPACE),
    };
    keyboard.addCapture([codes.UP, codes.SPACE]);
  }

  setFieldHeight(height: number): void { this.fieldHeight = height; }

  startRound(mode: ControlMode): void {
    this.mode = mode;
    this.playing = true;
    this.x = 70;
    this.y = this.groundY();
    this.vy = 0;
    this.cameraOffset = 0;
    this.cameraPoint = null;
    this.pinch.reset();
    this.jumpQueued = false;
    this.jumpBuffer = 0;
    this.coyote = 0.1;
    this.grounded = true;
    this.progress = 0;
    this.callbacks.onHud(0);
  }

  switchToKeyboard(): void {
    this.mode = 'keyboard';
    this.cameraPoint = null;
    this.pinch.reset();
    this.jumpQueued = false;
  }

  abortRound(): void {
    this.playing = false;
    this.pinch.reset();
    this.graphics?.clear();
  }

  setCameraPoints(points: HandSample[]): void {
    if (!this.playing || this.mode !== 'camera') return;
    const point = points.reduce<HandSample | null>((nearest, candidate) =>
      !nearest || (this.cameraPoint && Math.abs(candidate.x - this.cameraPoint.x) < Math.abs(nearest.x - this.cameraPoint.x))
        ? candidate : nearest, null);
    if (this.pinch.sample(point?.pinchRatio ?? null).jump) this.jumpQueued = true;
    this.cameraPoint = point;
  }

  update(_time: number, delta: number): void {
    const graphics = this.graphics;
    if (!graphics) return;
    graphics.clear();
    if (!this.playing) return;

    const dt = Math.min(delta, 50) / 1000;
    this.x = Math.min(WORLD_WIDTH - 70, this.x + SPEED * dt);

    const keys = this.keys;
    const keyJump = keys ? Phaser.Input.Keyboard.JustDown(keys.space) ||
      Phaser.Input.Keyboard.JustDown(keys.up) || Phaser.Input.Keyboard.JustDown(keys.w) : false;
    if (keyJump || this.jumpQueued) this.jumpBuffer = 0.14;
    this.jumpQueued = false;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = JUMP_SPEED;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
    }

    const previousY = this.y;
    if (!this.grounded) {
      this.vy += GRAVITY * (this.vy > 0 ? 1.4 : 1) * dt;
      this.y += this.vy * dt;
    }
    const ground = this.groundY();
    const onPlatform = PLATFORMS.some(([from, to]) =>
      this.x + PLAYER_HALF_WIDTH > from && this.x - PLAYER_HALF_WIDTH < to);
    if (this.vy >= 0 && onPlatform && previousY <= ground && this.y >= ground) {
      this.y = ground;
      this.vy = 0;
      this.grounded = true;
    } else if (this.grounded && !onPlatform) {
      this.grounded = false;
    }
    if (this.grounded) this.coyote = 0.1;

    const progress = Math.min(100, Math.floor((this.x - 70) / (WORLD_WIDTH - 140) * 100));
    if (progress !== this.progress) {
      this.progress = progress;
      this.callbacks.onHud(progress);
    }
    if (this.y > this.fieldHeight + 50 ||
      (this.y > ground - 32 && HAZARDS.some((hazard) => Math.abs(this.x - hazard) < 32))) {
      this.finish(false);
      return;
    }
    if (this.x >= WORLD_WIDTH - 70) {
      this.progress = 100;
      this.callbacks.onHud(100);
      this.finish(true);
      return;
    }

    const target = Phaser.Math.Clamp(this.x - WIDTH * 0.28, 0, WORLD_WIDTH - WIDTH);
    this.cameraOffset += (target - this.cameraOffset) * Math.min(1, dt * 9);
    this.draw(graphics);
  }

  private finish(won: boolean): void {
    this.playing = false;
    this.callbacks.onEnd(this.progress, won);
  }

  private groundY(): number { return this.fieldHeight * 0.78; }

  private draw(graphics: Phaser.GameObjects.Graphics): void {
    const ground = this.groundY();
    for (const [from, to] of PLATFORMS) {
      const left = from - this.cameraOffset;
      if (left > WIDTH || to - this.cameraOffset < 0) continue;
      graphics.fillStyle(0x3e8fd6, 0.85);
      graphics.fillRect(left, ground, to - from, this.fieldHeight - ground);
      graphics.fillStyle(0x1e5a9c);
      graphics.fillRect(left, ground, to - from, 7);
    }
    for (const hazard of HAZARDS) {
      const left = hazard - this.cameraOffset;
      if (left < -30 || left > WIDTH + 30) continue;
      graphics.fillStyle(0x1e5a9c);
      graphics.fillTriangle(left - 20, ground, left, ground - 36, left + 20, ground);
    }
    const goalX = WORLD_WIDTH - 50 - this.cameraOffset;
    if (goalX < WIDTH) {
      graphics.fillStyle(0x1e5a9c);
      graphics.fillRect(goalX, ground - 100, 5, 100);
      graphics.fillStyle(0x7fc4f2);
      graphics.fillTriangle(goalX + 5, ground - 98, goalX + 58, ground - 77, goalX + 5, ground - 60);
    }
    const playerX = this.x - this.cameraOffset;
    graphics.fillStyle(0xeaf6ff);
    graphics.fillRect(playerX - 18, this.y - 42, 36, 42);
    graphics.lineStyle(4, 0x1e5a9c);
    graphics.strokeRect(playerX - 18, this.y - 42, 36, 42);
    graphics.fillStyle(0x3e8fd6);
    graphics.fillRect(playerX + 5, this.y - 30, 7, 7);
  }
}
