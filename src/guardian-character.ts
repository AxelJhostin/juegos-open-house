import Phaser from 'phaser';
import type { GuardianSide } from './guardian-combat';

const CENTER_X = 480;
const SOURCE_WIDTH = 1024;
const SOURCE_HEIGHT = 1536;
const ATTACK_DURATION = 0.65;
const HIT_DURATION = 0.46;

type Pose = 'idle' | GuardianSide | 'both';
const TEXTURES: Record<Pose, string> = {
  idle: 'naomi-guardian',
  left: 'naomi-attack-left',
  right: 'naomi-attack-right',
  both: 'naomi-attack-both',
};

// Las poses cambian el dibujo; este controlador da continuidad al movimiento.
// La simulación de enemigos y colisiones permanece en GuardianGame.
export class GuardianCharacter {
  private readonly trail: Phaser.GameObjects.Image;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private activeTexture = TEXTURES.idle;
  private pose: Pose = 'idle';
  private attackLeft = 0;
  private hitLeft = 0;
  private trailLeft = 0;
  private fieldHeight = 540;
  private displayHeight = 480;

  constructor(scene: Phaser.Scene) {
    this.trail = scene.add.image(CENTER_X, this.fieldHeight, TEXTURES.idle)
      .setOrigin(0.5, 1).setTint(0xffdc8a).setAlpha(0).setVisible(false);
    this.sprite = scene.add.image(CENTER_X, this.fieldHeight, TEXTURES.idle)
      .setOrigin(0.5, 1).setVisible(false);
    this.setFieldHeight(this.fieldHeight);
  }

  setFieldHeight(height: number): void {
    this.fieldHeight = height;
    this.displayHeight = Math.min(height * 0.89, 500);
    const width = this.displayHeight * SOURCE_WIDTH / SOURCE_HEIGHT;
    this.sprite.setDisplaySize(width, this.displayHeight);
    this.trail.setDisplaySize(width, this.displayHeight);
    this.sprite.setPosition(CENTER_X, height);
    this.trail.setPosition(CENTER_X, height);
  }

  start(): void {
    this.pose = 'idle';
    this.attackLeft = 0;
    this.hitLeft = 0;
    this.trailLeft = 0;
    this.showPose('idle');
    this.sprite.setTint(0xffffff).setVisible(true);
    this.trail.setVisible(false);
  }

  stop(): void {
    this.sprite.setVisible(false);
    this.trail.setVisible(false);
  }

  attack(side: GuardianSide): void {
    const opposing = this.pose === (side === 'left' ? 'right' : 'left') && this.attackLeft > 0.14;
    this.pose = opposing || this.pose === 'both' && this.attackLeft > 0.14 ? 'both' : side;
    this.attackLeft = ATTACK_DURATION;
    this.hitLeft = 0;
    this.showPose(this.pose);
    this.sprite.setTint(0xffffff);
    this.trail.setTexture(TEXTURES[this.pose]).setVisible(true);
    this.trailLeft = 0.29;
  }

  takeHit(): void {
    this.hitLeft = HIT_DURATION;
    this.attackLeft = 0;
    this.trailLeft = 0;
    this.pose = 'idle';
    this.showPose('idle');
    this.trail.setVisible(false);
  }

  update(time: number, dt: number): void {
    this.attackLeft = Math.max(0, this.attackLeft - dt);
    this.hitLeft = Math.max(0, this.hitLeft - dt);
    this.trailLeft = Math.max(0, this.trailLeft - dt);
    const idle = Math.sin(time * 0.002);
    const baseY = this.fieldHeight + (this.reducedMotion ? 0 : idle * 3);
    const baseWidth = this.displayHeight * SOURCE_WIDTH / SOURCE_HEIGHT;

    if (this.attackLeft > 0) {
      const progress = 1 - this.attackLeft / ATTACK_DURATION;
      const force = Math.sin(Math.PI * progress);
      const direction = this.pose === 'left' ? -1 : this.pose === 'right' ? 1 : 0;
      const travel = this.reducedMotion ? 8 : 27;
      this.sprite.x = CENTER_X + direction * travel * force;
      this.sprite.y = baseY - (this.reducedMotion ? 2 : 13) * force;
      this.sprite.angle = direction * (this.reducedMotion ? 1 : 4) * force;
      const scale = 1 + (this.reducedMotion ? 0.015 : 0.055) * force;
      this.sprite.setDisplaySize(baseWidth * scale, this.displayHeight * scale);
      if (progress > 0.84) this.showPose('idle');
    } else if (this.hitLeft > 0) {
      const strength = this.hitLeft / HIT_DURATION;
      this.sprite.x = CENTER_X + (this.reducedMotion ? 0 : Math.sin(time * 0.09) * 12 * strength);
      this.sprite.y = baseY + 8 * strength;
      this.sprite.angle = (this.reducedMotion ? 0 : Math.sin(time * 0.055) * 5 * strength);
      this.sprite.setDisplaySize(baseWidth * (1 - 0.035 * strength), this.displayHeight * (1 + 0.025 * strength));
      this.sprite.setTint(strength > 0.38 && Math.sin(time * 0.05) > 0 ? 0xffb9c9 : 0xffffff);
    } else {
      this.pose = 'idle';
      this.showPose('idle');
      this.sprite.setTint(0xffffff);
      this.sprite.x = CENTER_X + (this.reducedMotion ? 0 : Math.sin(time * 0.0008) * 3);
      this.sprite.y = baseY;
      this.sprite.angle = this.reducedMotion ? 0 : Math.sin(time * 0.0011) * 0.8;
      const breath = this.reducedMotion ? 0 : Math.sin(time * 0.0023) * 0.007;
      this.sprite.setDisplaySize(baseWidth * (1 + breath), this.displayHeight * (1 - breath));
    }

    if (this.trailLeft > 0 && !this.reducedMotion) {
      const alpha = this.trailLeft / 0.29;
      this.trail.setVisible(true).setAlpha(alpha * 0.28);
      this.trail.x = CENTER_X - (this.pose === 'left' ? -1 : this.pose === 'right' ? 1 : 0) * (25 + 12 * (1 - alpha));
      this.trail.y = baseY + 4;
      this.trail.setDisplaySize(baseWidth * (1 + (1 - alpha) * 0.05), this.displayHeight * (1 + (1 - alpha) * 0.05));
    } else this.trail.setVisible(false);
  }

  private showPose(pose: Pose): void {
    const texture = TEXTURES[pose];
    if (this.activeTexture === texture) return;
    this.sprite.setTexture(texture);
    this.activeTexture = texture;
  }
}
