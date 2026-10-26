import type Phaser from 'phaser';
import type { GuardianSide } from './guardian-combat';

export type ShadowVisual = { x: number; y: number; size: number; phase: number; variant: number };
export type GuardianSpark = { x: number; y: number; life: number; maxLife: number; color: number };

const SKY = [0x0a1130, 0x0d1637, 0x122047, 0x17264d, 0x1d2b50, 0x222b4b, 0x252943, 0x28273f];

export function drawGuardianBackdrop(g: Phaser.GameObjects.Graphics, height: number, showCamera: boolean): void {
  g.clear();
  const bandHeight = height / SKY.length;
  SKY.forEach((color, index) => {
    g.fillStyle(color, showCamera ? 0.72 : 0.95);
    g.fillRect(0, index * bandHeight, 960, bandHeight + 1);
  });

  // Ventanales y columnas convierten el tablero en un santuario sin tapar las amenazas.
  for (const x of [96, 240, 720, 864]) {
    g.fillStyle(0x0a1230, 0.72);
    g.fillRect(x - 38, 50, 76, height * 0.58);
    g.fillStyle(0x455184, 0.6);
    g.fillTriangle(x - 31, 63, x + 31, 63, x, 8);
    g.fillStyle(0x253e69, 0.52);
    g.fillRect(x - 27, 72, 54, height * 0.47);
    g.fillStyle(0x8394c3, 0.24);
    g.fillTriangle(x - 24, 74, x + 24, 74, x, 35);
    g.lineStyle(3, 0xbda66c, 0.54);
    g.lineBetween(x - 36, 50, x - 36, height * 0.66);
    g.lineBetween(x + 36, 50, x + 36, height * 0.66);
    g.lineBetween(x - 29, height * 0.4, x + 29, height * 0.4);
  }

  g.fillStyle(0xe5b966, 0.08);
  g.fillCircle(480, height * 0.42, height * 0.39);
  g.lineStyle(5, 0xf4d78d, 0.24);
  g.strokeCircle(480, height * 0.42, height * 0.32);
  g.lineStyle(2, 0xf4d78d, 0.25);
  g.strokeCircle(480, height * 0.42, height * 0.27);
  for (let ray = 0; ray < 12; ray++) {
    const angle = ray * Math.PI / 6;
    const cy = height * 0.42;
    g.lineBetween(480 + Math.cos(angle) * height * 0.34, cy + Math.sin(angle) * height * 0.34,
      480 + Math.cos(angle) * height * 0.39, cy + Math.sin(angle) * height * 0.39);
  }

  const floorY = height * 0.82;
  g.fillStyle(0x13162f, 0.96);
  g.fillRect(0, floorY, 960, height - floorY);
  g.fillStyle(0xd4af70, 0.7);
  g.fillRect(0, floorY, 960, 5);
  g.lineStyle(2, 0x62618a, 0.34);
  for (let x = 0; x <= 960; x += 80) g.lineBetween(x, floorY + 5, x - 50, height);
  for (let y = floorY + 37; y < height; y += 37) g.lineBetween(0, y, 960, y);
  g.fillStyle(0xe9c57b, 0.15);
  g.fillTriangle(360, height, 600, height, 480, floorY - 7);
  g.lineStyle(2, 0xf5d58e, 0.4);
  g.lineBetween(363, height - 2, 480, floorY - 7);
  g.lineBetween(597, height - 2, 480, floorY - 7);
}

export function drawStrikeGuide(g: Phaser.GameObjects.Graphics, height: number, time: number,
  ready: { left: boolean; right: boolean }): void {
  const y = height * 0.66;
  for (const [side, x] of [['left', 326], ['right', 634]] as const) {
    const pulse = 0.68 + 0.14 * Math.sin(time * 0.003 + x);
    const color = ready[side] ? 0x9ce6ff : 0xf6d48a;
    g.fillStyle(color, 0.045);
    g.fillCircle(x, y, 76);
    g.lineStyle(4, color, pulse);
    g.strokeCircle(x, y, 76);
    g.lineStyle(2, 0xffe7a5, pulse * 0.8);
    g.strokeCircle(x, y, 84);
    g.lineBetween(x - 18, y, x + 18, y);
    g.lineBetween(x, y - 18, x, y + 18);
  }
}

export function drawShadow(g: Phaser.GameObjects.Graphics, shadow: ShadowVisual, time: number): void {
  g.save();
  g.translateCanvas(shadow.x, shadow.y + Math.sin(time * 0.004 + shadow.phase) * 5);
  const wing = shadow.size * (0.7 + Math.sin(time * 0.012 + shadow.phase) * 0.1);
  g.fillStyle(0x100f29, 0.88);
  g.fillTriangle(-shadow.size * 0.3, -8, -wing * 1.45, -wing * 0.9, -wing, wing * 0.75);
  g.fillTriangle(shadow.size * 0.3, -8, wing * 1.45, -wing * 0.9, wing, wing * 0.75);
  g.fillStyle(0x322656, 0.9);
  g.fillTriangle(-shadow.size * 0.82, -wing * 0.2, -shadow.size * 0.27, -shadow.size * 0.7, -shadow.size * 0.2, shadow.size * 0.4);
  g.fillTriangle(shadow.size * 0.82, -wing * 0.2, shadow.size * 0.27, -shadow.size * 0.7, shadow.size * 0.2, shadow.size * 0.4);
  g.fillStyle(0x1f183c, 1);
  g.fillCircle(0, 0, shadow.size * 0.58);
  g.fillStyle(0x894aab, 0.52);
  g.fillCircle(0, 0, shadow.size * 0.37);
  g.fillStyle(shadow.variant % 2 ? 0xf47daf : 0xe59fff, 0.88);
  g.fillCircle(0, 0, shadow.size * 0.18);
  g.fillStyle(0xffe0ef, 0.85);
  g.fillCircle(-shadow.size * 0.14, -shadow.size * 0.07, 2);
  g.fillCircle(shadow.size * 0.14, -shadow.size * 0.07, 2);
  g.restore();
}

export function drawWingStrike(g: Phaser.GameObjects.Graphics, side: GuardianSide, height: number, remaining: number): void {
  if (remaining <= 0) return;
  const direction = side === 'left' ? -1 : 1;
  const progress = 1 - remaining / 0.24;
  const y = height * 0.65;
  const farX = 480 + direction * (145 + progress * 75);
  const nearX = 480 + direction * 35;
  const flare = Math.max(0, 1 - progress);
  g.fillStyle(0xf6d27c, flare * 0.32);
  g.fillTriangle(nearX, y - 64, farX, y - 26, 480 + direction * 95, y + 86);
  g.fillStyle(0xeefaff, flare * 0.7);
  g.fillTriangle(nearX, y - 47, farX, y + 3, nearX, y + 56);
  g.lineStyle(7, 0xffe8a2, flare);
  g.lineBetween(nearX, y - 45, farX, y + 3);
  g.lineStyle(3, 0xffffff, flare);
  g.lineBetween(nearX, y - 48, farX, y);
  g.lineStyle(2, 0xa3e8ff, flare * 0.8);
  g.lineBetween(nearX, y + 58, farX, y + 8);
}

export function drawGuardianSpark(g: Phaser.GameObjects.Graphics, spark: GuardianSpark): void {
  const alpha = Math.max(0, spark.life / spark.maxLife);
  g.fillStyle(spark.color, alpha);
  const size = 2 + alpha * 4;
  g.fillTriangle(spark.x, spark.y - size, spark.x + size, spark.y, spark.x, spark.y + size);
  g.fillTriangle(spark.x, spark.y - size, spark.x - size, spark.y, spark.x, spark.y + size);
}
