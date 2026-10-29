import Phaser from 'phaser';
import { segmentHitsCircle, type Point } from './geometry';
import { assignHandSlots, type HandSlots } from './hand-slots';
import type { ControlMode } from './game-types';
import { drawFruit, FRUIT_KINDS, type FruitKind } from './fruit-art';
import { scoreAfterFruitCuts, specialFruitForRoll } from './fruit-rules';
import type { SoundCue } from './sound';

const WIDTH = 960;
const DEFAULT_HEIGHT = 540;
const ROUND_SECONDS = 45;
const LEVEL_TWO_AT = 20;
const GRAVITY = [1150, 1700] as const;
const SPAWN_INTERVAL = [0.68, 0.45] as const;
const TRAIL_LIFE_MS = 360;
const TRAIL_COLORS = [
  { edge: 0x005c79, body: 0x00c7df, light: 0xe9ffff },
  { edge: 0x8e2752, body: 0xff5d9f, light: 0xffedf6 },
] as const;
export const PLAY_TOP = 0.12;
export const PLAY_BOTTOM = 0.86;

type Fruit = Point & { vx: number; vy: number; gravity: number; radius: number; kind: FruitKind };
type CutMark = { from: Point; to: Point; until: number; slot: 0 | 1 };
type GameCallbacks = { onHud(score: number, seconds: number, level: number): void; onEnd(score: number): void; onSound(cue: SoundCue): void };

function strokeTrail(graphics: Phaser.GameObjects.Graphics, mark: CutMark, width: number, color: number, alpha: number): void {
  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(mark.from.x, mark.from.y);
  graphics.lineTo(mark.to.x, mark.to.y);
  graphics.strokePath();
}

export class FruitGame extends Phaser.Scene {
  private graphics?: Phaser.GameObjects.Graphics;
  private keys?: Record<'left' | 'right' | 'up' | 'down' | 'a' | 'd' | 'w' | 's' | 'space', Phaser.Input.Keyboard.Key>;
  private fruits: Fruit[] = [];
  private cutMarks: CutMark[] = [];
  private pointer: Point = { x: WIDTH / 2, y: DEFAULT_HEIGHT / 2 };
  private lastMouse: Point | null = null;
  private lastCamera: [{ point: Point; at: number } | null, { point: Point; at: number } | null] = [null, null];
  private cameraPointers: HandSlots = [null, null];
  private mouseHeld = false;
  private playing = false;
  private mode: ControlMode = 'mouse';
  private score = 0;
  private level: 1 | 2 = 1;
  private secondsLeft = ROUND_SECONDS;
  private roundEndsAt = 0;
  private spawnClock = 0;
  private normalSpawnsSinceSpecial = 2;
  private shownSeconds = ROUND_SECONDS;
  private fieldHeight = DEFAULT_HEIGHT;

  constructor(private callbacks: GameCallbacks) { super('fruit-game'); }

  get isPlaying(): boolean { return this.playing; }
  get controlMode(): ControlMode { return this.mode; }

  setFieldHeight(height: number): void {
    this.fieldHeight = height;
    this.pointer.y = Phaser.Math.Clamp(this.pointer.y, 0, height);
  }

  create(): void {
    this.graphics = this.add.graphics();
    const keyboard = this.input.keyboard;
    if (keyboard) {
      const codes = Phaser.Input.Keyboard.KeyCodes;
      this.keys = {
        left: keyboard.addKey(codes.LEFT), right: keyboard.addKey(codes.RIGHT),
        up: keyboard.addKey(codes.UP), down: keyboard.addKey(codes.DOWN),
        a: keyboard.addKey(codes.A), d: keyboard.addKey(codes.D),
        w: keyboard.addKey(codes.W), s: keyboard.addKey(codes.S),
        space: keyboard.addKey(codes.SPACE),
      };
      keyboard.addCapture([codes.LEFT, codes.RIGHT, codes.UP, codes.DOWN, codes.SPACE]);
    }
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.playing || this.mode !== 'mouse') return;
      this.mouseHeld = true;
      this.pointer = { x: pointer.x, y: pointer.y };
      this.lastMouse = this.pointer;
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.playing || this.mode !== 'mouse') return;
      const next = { x: pointer.x, y: pointer.y };
      // Si se perdió pointerup al salir del canvas, isDown evita un corte continuo.
      if (!pointer.isDown) this.mouseHeld = false;
      if (this.mouseHeld && this.lastMouse) this.slice(this.lastMouse, next);
      this.pointer = next;
      this.lastMouse = this.mouseHeld ? next : null;
    });
    this.input.on('pointerup', () => { this.mouseHeld = false; this.lastMouse = null; });
    this.input.on('pointerupoutside', () => { this.mouseHeld = false; this.lastMouse = null; });
  }

  startRound(mode: ControlMode): void {
    this.mode = mode;
    this.fruits = [];
    this.cutMarks = [];
    this.pointer = { x: WIDTH / 2, y: this.fieldHeight / 2 };
    this.lastCamera = [null, null];
    this.cameraPointers = [null, null];
    this.lastMouse = null;
    this.mouseHeld = false;
    this.score = 0;
    this.level = 1;
    this.secondsLeft = ROUND_SECONDS;
    this.roundEndsAt = performance.now() + ROUND_SECONDS * 1000;
    this.shownSeconds = ROUND_SECONDS;
    this.spawnClock = 0.75;
    this.normalSpawnsSinceSpecial = 2;
    this.playing = true;
    this.callbacks.onHud(0, ROUND_SECONDS, 1);
  }

  switchToKeyboard(): void {
    this.mode = 'keyboard';
    this.lastCamera = [null, null];
    this.cameraPointers = [null, null];
  }

  abortRound(): void {
    this.playing = false;
    this.fruits = [];
    this.cutMarks = [];
    this.cameraPointers = [null, null];
    this.graphics?.clear();
  }

  setCameraPoints(points: Point[], at = performance.now()): void {
    if (!this.playing || this.mode !== 'camera') return;
    const assigned = assignHandSlots(this.cameraPointers, points);
    for (const slot of [0, 1] as const) {
      const point = assigned[slot];
      const previous = this.lastCamera[slot];
      if (point && previous) {
        const elapsed = Math.max((at - previous.at) / 1000, 0.001);
        const distance = Math.hypot(point.x - previous.point.x, point.y - previous.point.y);
        if (elapsed < 0.15 && distance < 300) {
          this.addTrail(previous.point, point, slot);
          if (distance / elapsed >= 160) this.slice(previous.point, point, false);
        }
      }
      this.lastCamera[slot] = point ? { point, at } : null;
    }
    this.cameraPointers = assigned;
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    if (this.playing) {
      this.secondsLeft = Math.max(0, (this.roundEndsAt - performance.now()) / 1000);
      const seconds = Math.ceil(this.secondsLeft);
      const nextLevel = ROUND_SECONDS - this.secondsLeft >= LEVEL_TWO_AT ? 2 : 1;
      if (seconds !== this.shownSeconds || nextLevel !== this.level) {
        if (nextLevel !== this.level) this.callbacks.onSound('level');
        this.level = nextLevel;
        this.shownSeconds = seconds;
        this.callbacks.onHud(this.score, seconds, this.level);
      }
      if (this.secondsLeft === 0) this.endRound();
      else {
        this.moveKeyboard(dt);
        for (const fruit of this.fruits) {
          fruit.vy += fruit.gravity * dt;
          fruit.x += fruit.vx * dt;
          fruit.y += fruit.vy * dt;
        }
        const lowerLimit = this.fieldHeight * PLAY_BOTTOM;
        this.fruits = this.fruits.filter((fruit) => (fruit.vy < 0 || fruit.y < lowerLimit + fruit.radius) && fruit.x > -fruit.radius && fruit.x < WIDTH + fruit.radius);
        this.spawnClock += dt;
        const interval = SPAWN_INTERVAL[this.level - 1];
        if (this.spawnClock >= interval) {
          this.spawnClock -= interval;
          this.spawnFruit();
        }
      }
    }
    const now = performance.now();
    this.cutMarks = this.cutMarks.filter((mark) => mark.until > now);
    this.draw();
  }

  private moveKeyboard(dt: number): void {
    if (this.mode !== 'keyboard' && !(this.mode === 'camera' && !this.lastCamera.some(Boolean))) return;
    const keys = this.keys;
    if (!keys) return;
    const x = Number(keys.right.isDown || keys.d.isDown) - Number(keys.left.isDown || keys.a.isDown);
    const y = Number(keys.down.isDown || keys.s.isDown) - Number(keys.up.isDown || keys.w.isDown);
    const length = Math.hypot(x, y) || 1;
    const previous = { ...this.pointer };
    this.pointer.x = Phaser.Math.Clamp(this.pointer.x + x / length * 480 * dt, 0, WIDTH);
    this.pointer.y = Phaser.Math.Clamp(this.pointer.y + y / length * 480 * dt, 0, this.fieldHeight);
    if (keys.space.isDown) this.slice(previous, this.pointer);
  }

  private spawnFruit(): void {
    const launchY = this.fieldHeight * PLAY_BOTTOM;
    const apexY = this.fieldHeight * Phaser.Math.FloatBetween(PLAY_TOP + 0.015, PLAY_TOP + 0.11);
    const gravity = GRAVITY[this.level - 1];
    const special = specialFruitForRoll(Math.random(), this.normalSpawnsSinceSpecial);
    const kind = special ?? FRUIT_KINDS[Phaser.Math.Between(0, FRUIT_KINDS.length - 1)];
    this.normalSpawnsSinceSpecial = special ? 0 : this.normalSpawnsSinceSpecial + 1;
    this.fruits.push({
      x: Phaser.Math.Between(180, WIDTH - 180), y: launchY,
      vx: Phaser.Math.Between(-50, 50), vy: -Math.sqrt(2 * gravity * (launchY - apexY)), gravity,
      radius: Phaser.Math.Between(25, 34),
      kind,
    });
  }

  private addTrail(from: Point, to: Point, slot: 0 | 1): void {
    if (Math.hypot(to.x - from.x, to.y - from.y) < 3) return;
    this.cutMarks.push({ from: { ...from }, to: { ...to }, until: performance.now() + TRAIL_LIFE_MS, slot });
    if (this.cutMarks.length > 48) this.cutMarks.shift();
  }

  // La colisión sigue usando solo los segmentos de corte; la estela puede mostrar movimientos más lentos.
  private slice(from: Point, to: Point, showTrail = true): void {
    if (!this.playing || Math.hypot(to.x - from.x, to.y - from.y) < 4) return;
    if (showTrail) this.addTrail(from, to, 0);
    const remaining: Fruit[] = [];
    const cutKinds: FruitKind[] = [];
    for (const fruit of this.fruits) {
      if (segmentHitsCircle(from, to, fruit, fruit.radius + 5)) cutKinds.push(fruit.kind);
      else remaining.push(fruit);
    }
    if (cutKinds.length) {
      this.score = scoreAfterFruitCuts(this.score, cutKinds);
      this.callbacks.onSound('slice');
      this.callbacks.onHud(this.score, this.shownSeconds, this.level);
    }
    this.fruits = remaining;
  }

  private endRound(): void {
    this.playing = false;
    this.mouseHeld = false;
    this.lastMouse = null;
    this.lastCamera = [null, null];
    this.cameraPointers = [null, null];
    this.fruits = [];
    this.cutMarks = [];
    this.callbacks.onSound('roundEnd');
    this.callbacks.onEnd(this.score);
  }

  private draw(): void {
    const graphics = this.graphics;
    if (!graphics) return;
    graphics.clear();
    for (const fruit of this.fruits) {
      drawFruit(graphics, fruit);
    }
    const now = performance.now();
    for (const mark of this.cutMarks) {
      const fade = Math.sqrt(Math.min(1, (mark.until - now) / TRAIL_LIFE_MS));
      const palette = TRAIL_COLORS[mark.slot];
      strokeTrail(graphics, mark, 17, palette.edge, 0.38 * fade);
      strokeTrail(graphics, mark, 8, palette.body, fade);
      strokeTrail(graphics, mark, 2, palette.light, 0.9 * fade);
      graphics.fillStyle(palette.light, 0.85 * fade);
      graphics.fillCircle(mark.to.x, mark.to.y, 2.5);
    }
    if (this.playing) {
      const pointers = this.mode === 'camera' && this.cameraPointers.some(Boolean) ? this.cameraPointers : [this.pointer];
      pointers.forEach((point, index) => {
        if (!point) return;
        const palette = TRAIL_COLORS[index as 0 | 1];
        graphics.lineStyle(4, palette.edge, 0.9);
        graphics.strokeCircle(point.x, point.y, 18);
        graphics.lineStyle(2, palette.body);
        graphics.strokeCircle(point.x, point.y, 14);
        graphics.fillStyle(palette.body);
        graphics.fillCircle(point.x, point.y, 6);
        graphics.fillStyle(palette.light);
        graphics.fillCircle(point.x, point.y, 2.5);
      });
    }
  }
}
