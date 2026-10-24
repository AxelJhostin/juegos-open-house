import Phaser from 'phaser';
import type { Point } from './geometry';
import type { ControlMode } from './fruit-game';

const WIDTH = 960;
type Meteor = { x: number; y: number; vy: number; radius: number };
type Callbacks = { onHud(elapsedMs: number): void; onEnd(elapsedMs: number): void };

export class ShipGame extends Phaser.Scene {
  private graphics?: Phaser.GameObjects.Graphics;
  private keys?: Record<'left' | 'right' | 'a' | 'd', Phaser.Input.Keyboard.Key>;
  private fieldHeight = 540;
  private shipX = WIDTH / 2;
  private cameraX: number | null = null;
  private meteors: Meteor[] = [];
  private playing = false;
  private mode: ControlMode = 'keyboard';
  private elapsedMs = 0;
  private tenthShown = 0;
  private spawnClock = 0;

  constructor(private callbacks: Callbacks) { super({ key: 'ship-game', active: true }); }

  get isPlaying(): boolean { return this.playing; }
  get controlMode(): ControlMode { return this.mode; }

  create(): void {
    this.graphics = this.add.graphics();
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const codes = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: keyboard.addKey(codes.LEFT), right: keyboard.addKey(codes.RIGHT),
      a: keyboard.addKey(codes.A), d: keyboard.addKey(codes.D),
    };
    keyboard.addCapture([codes.LEFT, codes.RIGHT]);
  }

  setFieldHeight(height: number): void { this.fieldHeight = height; }

  startRound(mode: ControlMode): void {
    this.mode = mode;
    this.playing = true;
    this.shipX = WIDTH / 2;
    this.cameraX = null;
    this.meteors = [];
    this.elapsedMs = 0;
    this.tenthShown = 0;
    this.spawnClock = 0.55;
    this.callbacks.onHud(0);
  }

  switchToKeyboard(): void {
    this.mode = 'keyboard';
    this.cameraX = null;
  }

  abortRound(): void {
    this.playing = false;
    this.meteors = [];
    this.graphics?.clear();
  }

  setCameraPoints(points: Point[]): void {
    if (!this.playing || this.mode !== 'camera') return;
    const nearest = points.reduce<Point | null>((best, point) =>
      !best || Math.abs(point.x - (this.cameraX ?? this.shipX)) < Math.abs(best.x - (this.cameraX ?? this.shipX)) ? point : best, null);
    this.cameraX = nearest?.x ?? null;
  }

  update(_time: number, delta: number): void {
    const graphics = this.graphics;
    if (!graphics) return;
    graphics.clear();
    if (!this.playing) return;

    const dt = Math.min(delta, 50) / 1000;
    this.elapsedMs += dt * 1000;
    const elapsed = this.elapsedMs / 1000;
    const tenth = Math.floor(this.elapsedMs / 100);
    if (tenth !== this.tenthShown) {
      this.tenthShown = tenth;
      this.callbacks.onHud(this.elapsedMs);
    }
    if (this.mode === 'camera' && this.cameraX !== null) {
      this.shipX += (this.cameraX - this.shipX) * Math.min(1, dt * 12);
    } else if (this.keys) {
      const axis = Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown);
      this.shipX += axis * 500 * dt;
    }
    this.shipX = Phaser.Math.Clamp(this.shipX, 36, WIDTH - 36);

    const shipY = this.fieldHeight * 0.84;
    for (const meteor of this.meteors) meteor.y += meteor.vy * dt;
    const survivors: Meteor[] = [];
    for (const meteor of this.meteors) {
      if (Math.hypot(meteor.x - this.shipX, meteor.y - shipY) < meteor.radius + 27) {
        this.playing = false;
        this.meteors = [];
        this.callbacks.onHud(this.elapsedMs);
        this.callbacks.onEnd(Math.floor(this.elapsedMs));
        return;
      }
      if (meteor.y < this.fieldHeight + meteor.radius) survivors.push(meteor);
    }
    this.meteors = survivors;

    this.spawnClock += dt;
    const interval = Math.max(0.26, 0.9 - elapsed * 0.012);
    if (this.spawnClock >= interval) {
      this.spawnClock -= interval;
      const aimed = elapsed > 12 && Math.random() < 0.35;
      this.meteors.push({
        x: aimed ? Phaser.Math.Clamp(this.shipX + Phaser.Math.Between(-120, 120), 55, WIDTH - 55) : Phaser.Math.Between(55, WIDTH - 55),
        y: -30,
        vy: Math.min(570, 220 + elapsed * 5),
        radius: Phaser.Math.Between(18, 28),
      });
    }
    this.draw(graphics, shipY);
  }

  private draw(graphics: Phaser.GameObjects.Graphics, shipY: number): void {
    for (const meteor of this.meteors) {
      graphics.fillStyle(0x3e8fd6);
      graphics.fillCircle(meteor.x, meteor.y, meteor.radius);
      graphics.lineStyle(4, 0x1e5a9c);
      graphics.strokeCircle(meteor.x, meteor.y, meteor.radius);
      graphics.fillStyle(0x1e5a9c);
      graphics.fillCircle(meteor.x - meteor.radius * 0.3, meteor.y - meteor.radius * 0.2, 4);
      graphics.fillCircle(meteor.x + meteor.radius * 0.35, meteor.y + meteor.radius * 0.25, 5);
    }
    graphics.fillStyle(0xeaf6ff);
    graphics.fillTriangle(this.shipX, shipY - 33, this.shipX - 30, shipY + 25, this.shipX + 30, shipY + 25);
    graphics.lineStyle(4, 0x1e5a9c);
    graphics.strokeTriangle(this.shipX, shipY - 33, this.shipX - 30, shipY + 25, this.shipX + 30, shipY + 25);
    graphics.fillStyle(0x3e8fd6);
    graphics.fillCircle(this.shipX, shipY + 4, 8);
  }
}
