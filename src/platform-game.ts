import Phaser from 'phaser';
import type { HandSample } from './tracking';
import type { ControlMode } from './game-types';
import { HeldPinchJumpControl } from './pinch-jump';
import { drawBackdrop, drawCube, drawHazard, drawJumpCue, drawPit, drawPlatform } from './platform-art';
import { PLATFORM_LEVEL, PLATFORM_SPEED, platformHeightAt } from './platform-level';
import type { SoundCue } from './sound';

const WIDTH = 960;
const WORLD_WIDTH = PLATFORM_LEVEL.worldWidth;
const JUMP_SPEED = -680;
const GRAVITY = 1800;
const PLAYER_HALF_WIDTH = 18;
type Callbacks = { onHud(progress: number): void; onEnd(progress: number, won: boolean): void; onSound(cue: SoundCue): void; onMusic(elapsedSeconds: number | null): void };

export class PlatformGame extends Phaser.Scene {
  private graphics?: Phaser.GameObjects.Graphics;
  private keys?: Record<'up' | 'w' | 'space', Phaser.Input.Keyboard.Key>;
  private fieldHeight = 540;
  private x = 70;
  private y = 0;
  private vy = 0;
  private cameraOffset = 0;
  private cameraPoint: HandSample | null = null;
  private pinch = new HeldPinchJumpControl();
  private jumpQueued = false;
  private jumpBuffer = 0;
  private coyote = 0;
  private grounded = true;
  private cubeAngle = 0;
  private playing = false;
  private mode: ControlMode = 'keyboard';
  private progress = 0;

  constructor(private callbacks: Callbacks) { super({ key: 'platform-game', active: true }); }

  get isPlaying(): boolean { return this.playing; }
  get controlMode(): ControlMode { return this.mode; }
  get gestureHeld(): boolean { return this.pinch.isHeld; }

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
    this.cubeAngle = 0;
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
    this.callbacks.onMusic(null);
    this.pinch.reset();
    this.graphics?.clear();
  }

  setCameraPoints(points: HandSample[]): void {
    if (!this.playing || this.mode !== 'camera') return;
    const point = points.reduce<HandSample | null>((nearest, candidate) =>
      !nearest || (this.cameraPoint && Math.abs(candidate.x - this.cameraPoint.x) < Math.abs(nearest.x - this.cameraPoint.x))
        ? candidate : nearest, null);
    if (this.pinch.sample(point?.pinchRatio ?? null).pressed) this.jumpQueued = true;
    this.cameraPoint = point;
  }

  update(_time: number, delta: number): void {
    const graphics = this.graphics;
    if (!graphics) return;
    graphics.clear();
    if (!this.playing) return;

    const dt = Math.min(delta, 50) / 1000;
    const previousX = this.x;
    this.x = Math.min(WORLD_WIDTH - 70, this.x + PLATFORM_SPEED * dt);
    this.callbacks.onMusic((this.x - 70) / PLATFORM_SPEED);

    const keys = this.keys;
    const keyJump = keys ? Phaser.Input.Keyboard.JustDown(keys.space) ||
      Phaser.Input.Keyboard.JustDown(keys.up) || Phaser.Input.Keyboard.JustDown(keys.w) : false;
    const keyHeld = keys ? keys.space.isDown || keys.up.isDown || keys.w.isDown : false;
    if (keyJump || this.jumpQueued) this.jumpBuffer = 0.14;
    this.jumpQueued = false;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    if ((this.jumpBuffer > 0 && this.coyote > 0) || ((keyHeld || this.pinch.isHeld) && this.grounded)) {
      this.vy = JUMP_SPEED;
      this.grounded = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.callbacks.onSound('jump');
    }

    const previousY = this.y;
    if (!this.grounded) {
      this.vy += GRAVITY * (this.vy > 0 ? 1.4 : 1) * dt;
      this.y += this.vy * dt;
    }
    const ground = this.groundY();
    const touching = PLATFORM_LEVEL.platforms.filter((platform) =>
      this.x + PLAYER_HALF_WIDTH > platform.from && this.x - PLAYER_HALF_WIDTH < platform.to);
    // Una columna elevada exige despegar antes de tocar su pared lateral.
    if (touching.some((platform) => platform.from > 0 && previousX + PLAYER_HALF_WIDTH <= platform.from &&
      this.y > ground - platform.height + 2)) {
      this.finish(false);
      return;
    }
    const landing = this.vy >= 0 ? touching
      .filter((platform) => previousY <= ground - platform.height && this.y >= ground - platform.height)
      .sort((a, b) => b.height - a.height)[0] : undefined;
    if (landing) {
      if (!this.grounded) this.callbacks.onSound('land');
      this.y = ground - landing.height;
      this.vy = 0;
      this.grounded = true;
    } else if (this.grounded && !touching.some((platform) => Math.abs(this.y - (ground - platform.height)) < 2)) {
      this.grounded = false;
    }
    if (this.grounded) this.coyote = 0.1;
    if (this.grounded) {
      const quarterTurn = Math.PI / 2;
      const targetAngle = Math.round(this.cubeAngle / quarterTurn) * quarterTurn;
      this.cubeAngle += (targetAngle - this.cubeAngle) * Math.min(1, dt * 18);
    } else {
      this.cubeAngle += dt * 4.3;
    }

    const progress = Math.min(100, Math.floor((this.x - 70) / (WORLD_WIDTH - 140) * 100));
    if (progress !== this.progress) {
      this.progress = progress;
      this.callbacks.onHud(progress);
    }
    if (this.y > this.fieldHeight + 50 ||
      PLATFORM_LEVEL.gaps.some((gap) => this.x > gap.from && this.x < gap.to && this.y > ground + 48) ||
      PLATFORM_LEVEL.spikes.some((hazard) => this.y > ground - hazard.height - 32 && Math.abs(this.x - hazard.x) < 32)) {
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
    this.callbacks.onMusic(null);
    this.callbacks.onSound(won ? 'goal' : 'crash');
    this.callbacks.onEnd(this.progress, won);
  }

  private groundY(): number { return this.fieldHeight * 0.78; }

  private draw(graphics: Phaser.GameObjects.Graphics): void {
    const ground = this.groundY();
    drawBackdrop(graphics, ground, this.cameraOffset, WIDTH);
    for (const gap of PLATFORM_LEVEL.gaps) {
      drawPit(graphics, gap.from, gap.to, ground, this.fieldHeight, this.cameraOffset, WIDTH);
    }
    for (const platform of PLATFORM_LEVEL.platforms) {
      drawPlatform(graphics, platform.from, platform.to, ground - platform.height, this.fieldHeight, this.cameraOffset, WIDTH);
    }
    for (const cue of PLATFORM_LEVEL.cues) {
      const markerX = cue.x - this.cameraOffset;
      if (markerX < -30 || markerX > WIDTH + 30) continue;
      drawJumpCue(graphics, markerX, ground - (platformHeightAt(cue.x) ?? 0), Math.abs(this.x - cue.x) < 16);
    }
    for (const hazard of PLATFORM_LEVEL.spikes) {
      const left = hazard.x - this.cameraOffset;
      if (left < -30 || left > WIDTH + 30) continue;
      drawHazard(graphics, left, ground - hazard.height);
    }
    const goalX = WORLD_WIDTH - 50 - this.cameraOffset;
    if (goalX < WIDTH) {
      const goalY = ground - (platformHeightAt(WORLD_WIDTH - 50) ?? 0);
      graphics.fillStyle(0x1e5a9c);
      graphics.fillRect(goalX, goalY - 100, 5, 100);
      graphics.fillStyle(0x7fc4f2);
      graphics.fillTriangle(goalX + 5, goalY - 98, goalX + 58, goalY - 77, goalX + 5, goalY - 60);
    }
    const playerX = this.x - this.cameraOffset;
    drawCube(graphics, playerX, this.y, this.cubeAngle);
  }
}
