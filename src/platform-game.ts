import Phaser from 'phaser';
import type { Point } from './geometry';
import type { ControlMode } from './fruit-game';

const WIDTH = 960;
const WORLD_WIDTH = 2800;
const ROUND_SECONDS = 45;
const SPEED = 300;
const JUMP_SPEED = -620;
const GRAVITY = 1300;
const PLATFORMS: Array<[number, number]> = [[0, 450], [560, 930], [1020, 1400], [1500, 1900], [1980, 2360], [2460, WORLD_WIDTH]];
const HAZARDS = [350, 850, 1320, 1810, 2260];
type Callbacks = { onHud(score: number, seconds: number, falls: number): void; onEnd(score: number): void };

export class PlatformGame extends Phaser.Scene {
  private graphics?: Phaser.GameObjects.Graphics;
  private keys?: Record<'left' | 'right' | 'up' | 'a' | 'd' | 'w' | 'space', Phaser.Input.Keyboard.Key>;
  private fieldHeight = 540;
  private x = 70;
  private y = 0;
  private vy = 0;
  private cameraOffset = 0;
  private cameraPoint: Point | null = null;
  private priorHandY: number | null = null;
  private jumpQueued = false;
  private jumpBuffer = 0;
  private coyote = 0;
  private grounded = true;
  private playing = false;
  private mode: ControlMode = 'keyboard';
  private score = 0;
  private falls = 0;
  private endsAt = 0;
  private shownSeconds = ROUND_SECONDS;

  constructor(private callbacks: Callbacks) { super({ key: 'platform-game', active: true }); }

  get isPlaying(): boolean { return this.playing; }
  get controlMode(): ControlMode { return this.mode; }

  create(): void {
    this.graphics = this.add.graphics();
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const codes = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: keyboard.addKey(codes.LEFT), right: keyboard.addKey(codes.RIGHT), up: keyboard.addKey(codes.UP),
      a: keyboard.addKey(codes.A), d: keyboard.addKey(codes.D), w: keyboard.addKey(codes.W),
      space: keyboard.addKey(codes.SPACE),
    };
    keyboard.addCapture([codes.LEFT, codes.RIGHT, codes.UP, codes.SPACE]);
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
    this.priorHandY = null;
    this.jumpQueued = false;
    this.jumpBuffer = 0;
    this.coyote = 0.1;
    this.grounded = true;
    this.score = 0;
    this.falls = 0;
    this.endsAt = performance.now() + ROUND_SECONDS * 1000;
    this.shownSeconds = ROUND_SECONDS;
    this.callbacks.onHud(0, ROUND_SECONDS, 0);
  }

  switchToKeyboard(): void {
    this.mode = 'keyboard';
    this.cameraPoint = null;
    this.priorHandY = null;
  }

  abortRound(): void {
    this.playing = false;
    this.graphics?.clear();
  }

  setCameraPoints(points: Point[]): void {
    if (!this.playing || this.mode !== 'camera') return;
    const point = points[0] ?? null;
    if (point && this.priorHandY !== null && this.priorHandY > this.fieldHeight * 0.4 &&
      point.y < this.fieldHeight * 0.4 && this.priorHandY - point.y > 45) this.jumpQueued = true;
    this.priorHandY = point?.y ?? null;
    this.cameraPoint = point;
  }

  update(_time: number, delta: number): void {
    const graphics = this.graphics;
    if (!graphics) return;
    graphics.clear();
    if (!this.playing) return;

    const dt = Math.min(delta, 50) / 1000;
    const remaining = Math.max(0, (this.endsAt - performance.now()) / 1000);
    const seconds = Math.ceil(remaining);
    if (seconds !== this.shownSeconds) {
      this.shownSeconds = seconds;
      this.callbacks.onHud(this.score, seconds, this.falls);
    }
    if (remaining === 0 || this.x >= WORLD_WIDTH - 70) {
      this.playing = false;
      this.callbacks.onEnd(this.score);
      return;
    }

    const keys = this.keys;
    let axis = keys ? Number(keys.right.isDown || keys.d.isDown) - Number(keys.left.isDown || keys.a.isDown) : 0;
    if (this.mode === 'camera' && this.cameraPoint) {
      axis = this.cameraPoint.x < WIDTH * 0.42 ? -1 : this.cameraPoint.x > WIDTH * 0.58 ? 1 : 0;
    }
    this.x = Phaser.Math.Clamp(this.x + axis * SPEED * dt, 20, WORLD_WIDTH - 20);

    const keyJump = keys ? Phaser.Input.Keyboard.JustDown(keys.space) || Phaser.Input.Keyboard.JustDown(keys.up) || Phaser.Input.Keyboard.JustDown(keys.w) : false;
    if (keyJump || this.jumpQueued) this.jumpBuffer = 0.12;
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
      this.vy += GRAVITY * (this.vy > 0 ? 1.5 : 1) * dt;
      this.y += this.vy * dt;
    }
    const ground = this.groundY();
    const onPlatform = PLATFORMS.some(([from, to]) => this.x >= from + 16 && this.x <= to - 16);
    if (this.vy >= 0 && onPlatform && previousY <= ground && this.y >= ground) {
      this.y = ground;
      this.vy = 0;
      this.grounded = true;
    } else if (this.grounded && !onPlatform) {
      this.grounded = false;
    }
    if (this.grounded) this.coyote = 0.1;

    if (this.y > this.fieldHeight + 50 || (this.y > ground - 32 && HAZARDS.some((hazard) => Math.abs(this.x - hazard) < 26))) {
      this.falls++;
      const segment = PLATFORMS.find(([from, to]) => this.x >= from && this.x <= to);
      this.x = segment ? segment[0] + 50 : ([...PLATFORMS].reverse().find(([, to]) => to < this.x)?.[0] ?? 0) + 50;
      this.y = ground;
      this.vy = 0;
      this.grounded = true;
      this.coyote = 0.1;
      this.callbacks.onHud(this.score, this.shownSeconds, this.falls);
    }
    const progress = Math.floor((this.x - 70) / 10);
    if (progress > this.score) {
      this.score = progress;
      this.callbacks.onHud(this.score, this.shownSeconds, this.falls);
    }
    const target = Phaser.Math.Clamp(this.x - WIDTH * 0.3, 0, WORLD_WIDTH - WIDTH);
    this.cameraOffset += (target - this.cameraOffset) * Math.min(1, dt * 9);
    this.draw(graphics);
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
