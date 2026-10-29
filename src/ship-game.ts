import Phaser from 'phaser';
import type { Point } from './geometry';
import type { ControlMode } from './game-types';
import { drawMeteor, drawShip, type MeteorVisual } from './ship-art';
import type { SoundCue } from './sound';

const WIDTH = 960;
type Meteor = MeteorVisual & { vy: number; spin: number; warned: boolean; passed: boolean };
type Callbacks = { onHud(elapsedMs: number): void; onEnd(elapsedMs: number): void; onSound(cue: SoundCue): void; onEngine(movement: number | null): void };

export class ShipGame extends Phaser.Scene {
  private graphics?: Phaser.GameObjects.Graphics;
  private keys?: Record<'left' | 'right' | 'up' | 'down' | 'a' | 'd' | 'w' | 's', Phaser.Input.Keyboard.Key>;
  private fieldHeight = 540;
  private shipX = WIDTH / 2;
  private shipY = this.fieldHeight * 0.84;
  private shipBank = 0;
  private cameraPoint: Point | null = null;
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
      up: keyboard.addKey(codes.UP), down: keyboard.addKey(codes.DOWN),
      a: keyboard.addKey(codes.A), d: keyboard.addKey(codes.D),
      w: keyboard.addKey(codes.W), s: keyboard.addKey(codes.S),
    };
    keyboard.addCapture([codes.LEFT, codes.RIGHT, codes.UP, codes.DOWN]);
  }

  setFieldHeight(height: number): void {
    this.fieldHeight = height;
    this.shipY = Phaser.Math.Clamp(this.shipY, 56, height - 56);
  }

  startRound(mode: ControlMode): void {
    this.mode = mode;
    this.playing = true;
    this.shipX = WIDTH / 2;
    this.shipY = this.fieldHeight * 0.84;
    this.shipBank = 0;
    this.cameraPoint = null;
    this.meteors = [];
    this.elapsedMs = 0;
    this.tenthShown = 0;
    this.spawnClock = 0.55;
    this.callbacks.onHud(0);
  }

  switchToKeyboard(): void {
    this.mode = 'keyboard';
    this.cameraPoint = null;
  }

  abortRound(): void {
    this.playing = false;
    this.callbacks.onEngine(null);
    this.meteors = [];
    this.graphics?.clear();
  }

  setCameraPoints(points: Point[]): void {
    if (!this.playing || this.mode !== 'camera') return;
    const nearest = points.reduce<Point | null>((best, point) =>
      !best || Math.hypot(point.x - (this.cameraPoint?.x ?? this.shipX), point.y - (this.cameraPoint?.y ?? this.shipY)) <
        Math.hypot(best.x - (this.cameraPoint?.x ?? this.shipX), best.y - (this.cameraPoint?.y ?? this.shipY)) ? point : best, null);
    this.cameraPoint = nearest;
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
    const previousShipX = this.shipX;
    const previousShipY = this.shipY;
    if (this.mode === 'camera' && this.cameraPoint) {
      const smoothing = Math.min(1, dt * 12);
      this.shipX += (this.cameraPoint.x - this.shipX) * smoothing;
      this.shipY += (this.cameraPoint.y - this.shipY) * smoothing;
    } else if (this.keys) {
      const axisX = Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown);
      const axisY = Number(this.keys.down.isDown || this.keys.s.isDown) - Number(this.keys.up.isDown || this.keys.w.isDown);
      const length = Math.hypot(axisX, axisY) || 1;
      this.shipX += axisX / length * 500 * dt;
      this.shipY += axisY / length * 500 * dt;
    }
    this.shipX = Phaser.Math.Clamp(this.shipX, 36, WIDTH - 36);
    this.shipY = Phaser.Math.Clamp(this.shipY, 56, this.fieldHeight - 56);
    const targetBank = dt > 0 ? Phaser.Math.Clamp((this.shipX - previousShipX) / dt / 500, -1, 1) * 0.1 : 0;
    this.shipBank += (targetBank - this.shipBank) * Math.min(1, dt * 10);

    for (const meteor of this.meteors) {
      meteor.y += meteor.vy * dt;
      meteor.angle += meteor.spin * dt;
    }
    const survivors: Meteor[] = [];
    for (const meteor of this.meteors) {
      if (Math.hypot(meteor.x - this.shipX, meteor.y - this.shipY) < meteor.radius + 27) {
        this.playing = false;
        this.callbacks.onEngine(null);
        this.meteors = [];
        this.callbacks.onSound('crash');
        this.callbacks.onHud(this.elapsedMs);
        this.callbacks.onEnd(Math.floor(this.elapsedMs));
        return;
      }
      if (!meteor.warned && meteor.y < this.shipY && meteor.y > this.shipY - 155 && Math.abs(meteor.x - this.shipX) < 100) {
        meteor.warned = true;
        this.callbacks.onSound('warning');
      }
      if (!meteor.passed && meteor.y > this.shipY + meteor.radius + 28) {
        meteor.passed = true;
        if (Math.abs(meteor.x - this.shipX) < 175) this.callbacks.onSound('meteorPass');
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
        variant: Phaser.Math.Between(0, 2),
        angle: Phaser.Math.FloatBetween(-Math.PI, Math.PI),
        spin: Phaser.Math.FloatBetween(0.6, 1.1) * (Math.random() < 0.5 ? -1 : 1),
        warned: false,
        passed: false,
      });
    }
    this.callbacks.onEngine(Math.min(1, Math.hypot(this.shipX - previousShipX, this.shipY - previousShipY) / Math.max(dt, 0.001) / 500));
    this.draw(graphics);
  }

  private draw(graphics: Phaser.GameObjects.Graphics): void {
    for (const meteor of this.meteors) drawMeteor(graphics, meteor);
    drawShip(graphics, this.shipX, this.shipY, this.shipBank, this.elapsedMs / 1000);
  }
}
