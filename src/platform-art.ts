import type Phaser from 'phaser';

const SKYLINE = 0x72a8df;
const GROUND = 0x27366d;
const GROUND_TILE = 0x344b88;
const EDGE = 0x66dce5;
const CUBE_OUTLINE = 0x422b78;
const CUBE_BODY = 0xa986f2;
const CUBE_LIGHT = 0xdec5ff;
const CUBE_CORE = 0x5de1e6;
const SPIKE_OUTLINE = 0x573363;
const SPIKE_BODY = 0xff886c;
const SPIKE_LIGHT = 0xffd27d;

// Estos adornos se desplazan más despacio que el suelo y no participan en la colisión.
export function drawBackdrop(graphics: Phaser.GameObjects.Graphics, groundY: number, cameraOffset: number, fieldWidth: number): void {
  const first = Math.floor(cameraOffset * 0.25 / 160) * 160;
  for (let worldX = first; worldX < cameraOffset * 0.25 + fieldWidth + 160; worldX += 160) {
    const x = Math.round(worldX - cameraOffset * 0.25);
    const height = 65 + (Math.floor(worldX / 160) % 3 + 3) % 3 * 30;
    graphics.lineStyle(2, SKYLINE, 0.18);
    graphics.strokeRect(x, groundY - height - 32, 96, height);
    graphics.lineStyle(1, SKYLINE, 0.13);
    graphics.strokeRect(x + 20, groundY - height - 12, 56, height - 40);
  }
}

// El dibujo gira; la caja de colisión sigue fija en platform-game.ts.
export function drawCube(graphics: Phaser.GameObjects.Graphics, x: number, feetY: number, angle: number): void {
  graphics.save();
  graphics.translateCanvas(Math.round(x), Math.round(feetY - 18));
  graphics.rotateCanvas(angle);

  graphics.fillStyle(CUBE_OUTLINE);
  graphics.fillRect(-18, -18, 36, 36);
  graphics.fillStyle(CUBE_BODY);
  graphics.fillRect(-14, -14, 28, 28);
  graphics.fillStyle(CUBE_LIGHT);
  graphics.fillRect(-12, -12, 24, 5);
  graphics.fillRect(-12, -7, 5, 19);

  // Cuatro esquinas y un núcleo: emblema simétrico original, legible al girar.
  graphics.fillStyle(CUBE_OUTLINE);
  graphics.fillRect(-9, -9, 5, 5);
  graphics.fillRect(4, -9, 5, 5);
  graphics.fillRect(-9, 4, 5, 5);
  graphics.fillRect(4, 4, 5, 5);
  graphics.fillStyle(CUBE_CORE);
  graphics.fillRect(-4, -4, 8, 8);
  graphics.restore();
}

export function drawPlatform(
  graphics: Phaser.GameObjects.Graphics,
  from: number,
  to: number,
  groundY: number,
  fieldHeight: number,
  cameraOffset: number,
  fieldWidth: number,
): void {
  const left = from - cameraOffset;
  if (left > fieldWidth || to - cameraOffset < 0) return;
  const width = to - from;
  graphics.fillStyle(GROUND);
  graphics.fillRect(left, groundY, width, fieldHeight - groundY);
  graphics.fillStyle(EDGE);
  graphics.fillRect(left, groundY, width, 6);
  graphics.fillStyle(GROUND_TILE);
  graphics.fillRect(left, groundY + 6, width, 10);

  const firstTile = Math.ceil(from / 48) * 48;
  for (let worldX = firstTile; worldX < to; worldX += 48) {
    const screenX = Math.round(worldX - cameraOffset);
    if (screenX < -48 || screenX > fieldWidth) continue;
    graphics.fillStyle(0x5267a1);
    graphics.fillRect(screenX, groundY + 16, 2, fieldHeight - groundY - 16);
    graphics.fillStyle(0x42558d);
    graphics.fillRect(screenX + 15, groundY + 40, 16, 3);
    graphics.fillRect(screenX + 8, groundY + 76, 9, 3);
  }
}

export function drawHazard(graphics: Phaser.GameObjects.Graphics, x: number, groundY: number): void {
  const left = Math.round(x - 30);
  const top = Math.round(groundY - 36);
  // Una punta de 60 × 36 px ocupa el mismo espacio de peligro que antes.
  graphics.fillStyle(SPIKE_OUTLINE);
  graphics.fillTriangle(left, groundY, left + 30, top, left + 60, groundY);
  graphics.fillStyle(SPIKE_BODY);
  graphics.fillTriangle(left + 6, groundY - 3, left + 30, top + 8, left + 54, groundY - 3);
  graphics.fillStyle(SPIKE_LIGHT);
  graphics.fillTriangle(left + 15, groundY - 6, left + 30, top + 8, left + 29, groundY - 6);
}
