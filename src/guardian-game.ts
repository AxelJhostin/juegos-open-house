import Phaser from 'phaser';
import type { ControlMode } from './game-types';
import type { HandSample } from './tracking';
import { PinchJumpControl } from './pinch-jump';
import { GuardianCharacter } from './guardian-character';
import { GUARDIAN_CENTER_X, strikeTarget, type GuardianSide } from './guardian-combat';
import { drawGuardianBackdrop, drawGuardianSpark, drawShadow, drawStrikeGuide, drawWingStrike, type GuardianSpark, type ShadowVisual } from './guardian-art';

const WIDTH = 960;
const ROUND_SECONDS = 45;
type Shadow = ShadowVisual & { side: GuardianSide; speed: number };
type Callbacks = { onHud(score: number, seconds: number, lives: number): void; onEnd(score: number): void };

export class GuardianGame extends Phaser.Scene {
  private backdrop?: Phaser.GameObjects.Graphics;
  private effects?: Phaser.GameObjects.Graphics;
  private character?: GuardianCharacter;
  private readout?: Phaser.GameObjects.Text;
  private readonly pinches = { left: new PinchJumpControl(), right: new PinchJumpControl() };
  private readonly queued = { left: false, right: false };
  private readonly slash = { left: 0, right: 0 };
  private readonly cooldown = { left: 0, right: 0 };
  private fieldHeight = 540;
  private backdropHeight = 0;
  private backdropCamera = false;
  private mode: ControlMode = 'keyboard';
  private playing = false;
  private elapsed = 0;
  private score = 0;
  private lives = 3;
  private combo = 0;
  private spawnClock = 0;
  private spawnCount = 0;
  private shadows: Shadow[] = [];
  private sparks: GuardianSpark[] = [];
  private lastTwoHandsAt = 0;
  private pausedForHands = false;
  private hitFlash = 0;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.playing || event.repeat) return;
    if (event.code === 'KeyF') this.queued.left = true;
    if (event.code === 'KeyJ') this.queued.right = true;
  };

  constructor(private callbacks: Callbacks) { super({ key: 'guardian-game', active: true }); }

  get isPlaying(): boolean { return this.playing; }
  get controlMode(): ControlMode { return this.mode; }
  get gestureHint(): string {
    if (this.pausedForHands) return ' · muestra dos manos';
    const ready = ['left', 'right'].filter((side) => this.pinches[side as GuardianSide].isReady);
    return ready.length ? ` · ${ready.length} ${ready.length === 1 ? 'pinza lista' : 'pinzas listas'}` : ' · separa pulgares e índices';
  }

  preload(): void {
    this.load.image('naomi-guardian', '/guardian/naomi-key-art.png');
    this.load.image('naomi-attack-left', '/guardian/naomi-attack-left.png');
    this.load.image('naomi-attack-right', '/guardian/naomi-attack-right.png');
    this.load.image('naomi-attack-both', '/guardian/naomi-attack-both.png');
  }

  create(): void {
    this.backdrop = this.add.graphics();
    this.character = new GuardianCharacter(this);
    this.effects = this.add.graphics();
    this.readout = this.add.text(WIDTH / 2, 20, '', {
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: '16px', fontStyle: 'bold', color: '#ffe4a1',
      backgroundColor: '#111632cc', padding: { x: 12, y: 7 }, align: 'center',
    }).setOrigin(0.5, 0).setVisible(false);
    window.addEventListener('keydown', this.onKeyDown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', this.onKeyDown));
  }

  setFieldHeight(height: number): void { this.fieldHeight = height; this.character?.setFieldHeight(height); }

  startRound(mode: ControlMode): void {
    this.mode = mode;
    this.playing = true;
    this.backdropHeight = 0;
    this.elapsed = 0;
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.spawnClock = 0.95;
    this.spawnCount = 0;
    this.shadows = [];
    this.sparks = [];
    this.hitFlash = 0;
    this.lastTwoHandsAt = 0;
    this.pausedForHands = mode === 'camera';
    for (const side of ['left', 'right'] as const) {
      this.pinches[side].reset();
      this.queued[side] = false;
      this.slash[side] = 0;
      this.cooldown[side] = 0;
    }
    this.character?.setFieldHeight(this.fieldHeight);
    this.character?.start();
    this.readout?.setVisible(true);
    this.callbacks.onHud(0, ROUND_SECONDS, this.lives);
  }

  switchToKeyboard(): void {
    this.mode = 'keyboard';
    this.pausedForHands = false;
    for (const side of ['left', 'right'] as const) this.pinches[side].reset();
  }

  abortRound(): void {
    this.playing = false;
    this.shadows = [];
    this.sparks = [];
    this.character?.stop();
    this.readout?.setVisible(false);
    this.backdrop?.clear();
    this.backdropHeight = 0;
    this.effects?.clear();
  }

  setCameraPoints(points: HandSample[]): void {
    if (!this.playing || this.mode !== 'camera') return;
    if (points.length < 2) {
      if (performance.now() - this.lastTwoHandsAt > 300) {
        this.pausedForHands = true;
        this.queued.left = false;
        this.queued.right = false;
      }
      for (const side of ['left', 'right'] as const) this.pinches[side].reset();
      return;
    }
    this.lastTwoHandsAt = performance.now();
    this.pausedForHands = false;
    const [left, right] = [...points].sort((a, b) => a.x - b.x);
    if (this.pinches.left.sample(left.pinchRatio ?? null).jump) this.queued.left = true;
    if (this.pinches.right.sample(right.pinchRatio ?? null).jump) this.queued.right = true;
  }

  update(time: number, delta: number): void {
    const backdrop = this.backdrop;
    const effects = this.effects;
    if (!backdrop || !effects || !this.playing) return;
    const dt = Math.min(delta, 50) / 1000;
    const cameraBackdrop = this.mode === 'camera';
    if (this.backdropHeight !== this.fieldHeight || this.backdropCamera !== cameraBackdrop) {
      drawGuardianBackdrop(backdrop, this.fieldHeight, cameraBackdrop);
      this.backdropHeight = this.fieldHeight;
      this.backdropCamera = cameraBackdrop;
    }
    effects.clear();
    this.character?.update(time, dt);
    if (this.mode === 'camera' && performance.now() - this.lastTwoHandsAt > 350) this.pausedForHands = true;
    if (this.pausedForHands) {
      this.readout?.setText('MUESTRA DOS MANOS · ABRE Y CIERRA CADA PINZA');
      this.draw(effects, time);
      return;
    }

    const previousSecond = Math.ceil(ROUND_SECONDS - this.elapsed);
    this.elapsed = Math.min(ROUND_SECONDS, this.elapsed + dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.readout?.setText(this.mode === 'camera'
      ? `IZQ ${this.pinches.left.isReady ? 'LISTA' : 'ABRE'}  ←  NAOMI  →  ${this.pinches.right.isReady ? 'LISTA' : 'ABRE'} DCHA`
      : 'F  ←  DEFIENDE A NAOMI  →  J');
    for (const side of ['left', 'right'] as const) {
      this.slash[side] = Math.max(0, this.slash[side] - dt);
      this.cooldown[side] = Math.max(0, this.cooldown[side] - dt);
    }
    if (this.queued.left) this.attack('left');
    if (this.queued.right) this.attack('right');
    this.queued.left = false;
    this.queued.right = false;

    for (const shadow of this.shadows) shadow.x += (shadow.side === 'left' ? 1 : -1) * shadow.speed * dt;
    const survivors: Shadow[] = [];
    for (const shadow of this.shadows) {
      if (Math.abs(shadow.x - GUARDIAN_CENTER_X) <= 56) {
        this.lives--;
        this.combo = 0;
        this.hitFlash = 0.4;
        this.character?.takeHit();
        this.burst(shadow.x, shadow.y, 0xf995b5, 15);
        this.callbacks.onHud(this.score, Math.ceil(ROUND_SECONDS - this.elapsed), this.lives);
        if (this.lives <= 0) {
          this.finish();
          return;
        }
      } else survivors.push(shadow);
    }
    this.shadows = survivors;
    this.sparks = this.sparks.filter((spark) => (spark.life -= dt) > 0);
    this.spawnClock -= dt;
    if (this.spawnClock <= 0) {
      this.spawnWave();
      this.spawnClock = Math.max(0.68, 2.05 - this.elapsed * 0.029);
    }
    const seconds = Math.ceil(ROUND_SECONDS - this.elapsed);
    if (seconds !== previousSecond) this.callbacks.onHud(this.score, seconds, this.lives);
    this.draw(effects, time);
    if (this.elapsed >= ROUND_SECONDS) this.finish();
  }

  private attack(side: GuardianSide): void {
    if (this.cooldown[side] > 0) return;
    this.slash[side] = 0.24;
    this.cooldown[side] = 0.32;
    this.character?.attack(side);
    const target = strikeTarget(this.shadows, side);
    if (!target) {
      this.combo = 0;
      return;
    }
    this.shadows.splice(this.shadows.indexOf(target), 1);
    this.combo++;
    this.score += 100 + Math.min(5, this.combo - 1) * 20;
    this.burst(target.x, target.y, 0xffe49e, 22);
    this.callbacks.onHud(this.score, Math.ceil(ROUND_SECONDS - this.elapsed), this.lives);
  }

  private spawnWave(): void {
    this.spawnCount++;
    const first: GuardianSide = Math.random() < 0.5 ? 'left' : 'right';
    this.spawnShadow(first);
    if (this.elapsed > 15 && (this.spawnCount % 5 === 0 || this.elapsed > 30 && Math.random() < 0.28)) {
      this.spawnShadow(first === 'left' ? 'right' : 'left');
    }
  }

  private spawnShadow(side: GuardianSide): void {
    const speed = 135 + Math.min(130, this.elapsed * 3.1) + Phaser.Math.Between(-10, 10);
    this.shadows.push({
      side, x: side === 'left' ? -40 : WIDTH + 40,
      y: this.fieldHeight * (0.60 + Math.random() * 0.15),
      speed, size: Phaser.Math.Between(32, 40), phase: Math.random() * Math.PI * 2,
      variant: Phaser.Math.Between(0, 2),
    });
  }

  private burst(x: number, y: number, color: number, count: number): void {
    for (let index = 0; index < count; index++) {
      const angle = index * Math.PI * 2 / count;
      const radius = Phaser.Math.Between(12, 65);
      this.sparks.push({ x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius,
        life: Phaser.Math.FloatBetween(0.18, 0.48), maxLife: 0.48, color });
    }
  }

  private draw(graphics: Phaser.GameObjects.Graphics, time: number): void {
    drawStrikeGuide(graphics, this.fieldHeight, time, {
      left: this.mode === 'keyboard' || this.pinches.left.isReady,
      right: this.mode === 'keyboard' || this.pinches.right.isReady,
    });
    for (const shadow of this.shadows) drawShadow(graphics, shadow, time);
    drawWingStrike(graphics, 'left', this.fieldHeight, this.slash.left);
    drawWingStrike(graphics, 'right', this.fieldHeight, this.slash.right);
    for (const spark of this.sparks) drawGuardianSpark(graphics, spark);
    if (this.hitFlash > 0) {
      graphics.fillStyle(0xff7992, this.hitFlash * 0.32);
      graphics.fillRect(0, 0, WIDTH, this.fieldHeight);
    }
  }

  private finish(): void {
    if (!this.playing) return;
    this.playing = false;
    this.readout?.setVisible(false);
    this.callbacks.onEnd(this.score);
  }
}
