import type Phaser from 'phaser';

const SKYLINE = 0xa66bf0;
const GROUND = 0x29164f;
const GROUND_TILE = 0x482077;
const EDGE = 0xd977ff;
const CUBE_OUTLINE = 0x422b78;
const CUBE_BODY = 0xa986f2;
const CUBE_LIGHT = 0xdec5ff;
const CUBE_CORE = 0x5de1e6;
const SPIKE_OUTLINE = 0x573363;
const SPIKE_BODY = 0xff5fa8;
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
    graphics.fillStyle(0xd977ff, 0.13);
    graphics.fillRect(x + 43, groundY - height - 22, 8, 8);
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
  graphics.lineStyle(2, EDGE, 0.45);
  graphics.strokeRect(left, groundY, width, fieldHeight - groundY);

  const firstTile = Math.ceil(from / 48) * 48;
  for (let worldX = firstTile; worldX < to; worldX += 48) {
    const screenX = Math.round(worldX - cameraOffset);
    if (screenX < -48 || screenX > fieldWidth) continue;
    graphics.fillStyle(0x8651bb, 0.45);
    graphics.fillRect(screenX, groundY + 16, 2, fieldHeight - groundY - 16);
    graphics.fillStyle(0x70409e, 0.65);
    graphics.fillRect(screenX + 15, groundY + 40, 16, 3);
    graphics.fillRect(screenX + 8, groundY + 76, 9, 3);
  }
}

export function drawPit(
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
  graphics.fillStyle(0x180e37);
  graphics.fillRect(left, groundY + 48, to - from, fieldHeight - groundY - 48);
  for (let x = from + 8; x < to - 6; x += 18) {
    const screenX = x - cameraOffset;
    graphics.fillStyle(0xff5fa8);
    graphics.fillTriangle(screenX - 8, groundY + 48, screenX, groundY + 26, screenX + 8, groundY + 48);
  }
  graphics.fillStyle(0xff5fa8, 0.55);
  graphics.fillRect(left, groundY + 48, to - from, 4);
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

export function drawJumpCue(graphics: Phaser.GameObjects.Graphics, x: number, groundY: number, active: boolean): void {
  const color = active ? 0xffffff : 0x5de1e6;
  graphics.fillStyle(color, active ? 0.95 : 0.68);
  graphics.fillRect(Math.round(x - 3), Math.round(groundY - 30), 6, 30);
  graphics.fillTriangle(x - 12, groundY - 42, x + 12, groundY - 42, x, groundY - 33);
  graphics.lineStyle(2, color, active ? 0.8 : 0.35);
  graphics.strokeCircle(x, groundY - 42, active ? 18 : 15);
}
