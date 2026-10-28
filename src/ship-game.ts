import Phaser from 'phaser';
import type { Point } from './geometry';
import type { ControlMode } from './game-types';
import { drawMeteor, drawShip, type MeteorVisual } from './ship-art';
import type { SoundCue } from './sound';

const WIDTH = 960;
type Meteor = MeteorVisual & { vy: number; spin: number; warned: boolean };
type Callbacks = { onHud(elapsedMs: number): void; onEnd(elapsedMs: number): void; onSound(cue: SoundCue): void };

export class ShipGame extends Phaser.Scene {
  private graphics?: Phaser.GameObjects.Graphics;
  private keys?: Record<'left' | 'right' | 'a' | 'd', Phaser.Input.Keyboard.Key>;
  private fieldHeight = 540;
  private shipX = WIDTH / 2;
  private shipBank = 0;
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
    this.shipBank = 0;
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
    const previousShipX = this.shipX;
    if (this.mode === 'camera' && this.cameraX !== null) {
      this.shipX += (this.cameraX - this.shipX) * Math.min(1, dt * 12);
    } else if (this.keys) {
      const axis = Number(this.keys.right.isDown || this.keys.d.isDown) - Number(this.keys.left.isDown || this.keys.a.isDown);
      this.shipX += axis * 500 * dt;
    }
    this.shipX = Phaser.Math.Clamp(this.shipX, 36, WIDTH - 36);
    const targetBank = dt > 0 ? Phaser.Math.Clamp((this.shipX - previousShipX) / dt / 500, -1, 1) * 0.1 : 0;
    this.shipBank += (targetBank - this.shipBank) * Math.min(1, dt * 10);

    const shipY = this.fieldHeight * 0.84;
    for (const meteor of this.meteors) {
      meteor.y += meteor.vy * dt;
      meteor.angle += meteor.spin * dt;
    }
    const survivors: Meteor[] = [];
    for (const meteor of this.meteors) {
      if (Math.hypot(meteor.x - this.shipX, meteor.y - shipY) < meteor.radius + 27) {
        this.playing = false;
        this.meteors = [];
        this.callbacks.onSound('crash');
        this.callbacks.onHud(this.elapsedMs);
        this.callbacks.onEnd(Math.floor(this.elapsedMs));
        return;
      }
      if (!meteor.warned && meteor.y > shipY - 155 && Math.abs(meteor.x - this.shipX) < 100) {
        meteor.warned = true;
        this.callbacks.onSound('warning');
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
      });
    }
    this.draw(graphics, shipY);
  }

  private draw(graphics: Phaser.GameObjects.Graphics, shipY: number): void {
    for (const meteor of this.meteors) drawMeteor(graphics, meteor);
    drawShip(graphics, this.shipX, shipY, this.shipBank, this.elapsedMs / 1000);
  }
}
