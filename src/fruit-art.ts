import type Phaser from 'phaser';

const OUTLINE = 0x1e5a9c;
const HIGHLIGHT = 0xeaf6ff;
const LEAF = 0x7fc4f2;
const HALF_WIDTHS = [2, 4, 5, 6, 6, 6, 6, 6, 6, 5, 4, 3, 1] as const;

type FruitVisual = { x: number; y: number; radius: number; color: number };

function band(graphics: Phaser.GameObjects.Graphics, x: number, y: number, halfWidth: number, size: number): void {
  const width = (halfWidth * 2 + 1) * size;
  graphics.fillRect(Math.round(x - width / 2), y, width, size);
}

// Dibujo en bloques de 4 o 5 px; el radio de colisión sigue en FruitGame.
export function drawFruit(graphics: Phaser.GameObjects.Graphics, fruit: FruitVisual): void {
  const size = Math.max(4, Math.round(fruit.radius / 7));
  const x = Math.round(fruit.x);
  const y = Math.round(fruit.y);
  const shade = fruit.color === 0x3e8fd6 ? OUTLINE : fruit.color === 0xbfe3fa ? 0x7fc4f2 : 0x3e8fd6;

  graphics.fillStyle(OUTLINE);
  for (let row = 0; row < HALF_WIDTHS.length; row++) {
    band(graphics, x, y + (row - 6) * size, HALF_WIDTHS[row], size);
  }

  graphics.fillStyle(fruit.color);
  for (let row = 1; row < HALF_WIDTHS.length - 1; row++) {
    band(graphics, x, y + (row - 6) * size, HALF_WIDTHS[row] - 1, size);
  }

  graphics.fillStyle(shade);
  graphics.fillRect(x + 2 * size, y + size, 3 * size, size);
  graphics.fillRect(x + size, y + 2 * size, 4 * size, size);
  graphics.fillRect(x + size, y + 3 * size, 3 * size, size);
  graphics.fillRect(x, y + 4 * size, 2 * size, size);

  graphics.fillStyle(HIGHLIGHT);
  graphics.fillRect(x - 3 * size, y - 3 * size, 2 * size, size);
  graphics.fillRect(x - 4 * size, y - 2 * size, size, 2 * size);

  graphics.fillStyle(OUTLINE);
  graphics.fillRect(Math.round(x - size / 2), y - 8 * size, size, 3 * size);
  graphics.fillStyle(LEAF);
  graphics.fillRect(x + size, y - 8 * size, 3 * size, size);
  graphics.fillRect(x + 2 * size, y - 7 * size, 2 * size, size);
}
