import type Phaser from 'phaser';

type Grid = { left: number; top: number; size: number };
export type MeteorVisual = { x: number; y: number; radius: number; variant: number; angle: number };

const SHIP_OUTLINE = 0x7fc4f2;
const SHIP_HULL = 0xeaf6ff;
const SHIP_SHADOW = 0x3e8fd6;
const SHIP_COCKPIT = 0xffc76b;
const SHIP_ENGINE = 0xff915e;

// La cuadrícula mantiene la nave cerca de los 60 × 60 px del prototipo.
const SHIP_MASK = [
  '.......#.......',
  '......###......',
  '......###......',
  '.....#####.....',
  '.....#####.....',
  '....#######....',
  '....#######....',
  '...#########...',
  '..###########..',
  '.#############.',
  '###############',
  '###.#######.###',
  '##..#######..##',
  '....###.###....',
  '.....##.##.....',
] as const;

const METEOR_SHAPES = [
  [[3, 7], [2, 8], [1, 9], [0, 9], [0, 10], [0, 10], [1, 10], [1, 9], [2, 9], [3, 8], [4, 6]],
  [[4, 7], [2, 8], [1, 9], [1, 10], [0, 10], [0, 10], [0, 9], [1, 9], [2, 8], [2, 7], [4, 6]],
  [[3, 6], [2, 8], [1, 8], [0, 9], [0, 10], [0, 10], [1, 10], [1, 10], [1, 9], [3, 8], [4, 7]],
] as const;

const METEOR_PALETTES = [
  { outline: 0x605d70, body: 0xb7aaa9, shade: 0x8a7f88, highlight: 0xe2d7d1 },
  { outline: 0x62637d, body: 0xb8b9cf, shade: 0x8d90ad, highlight: 0xe1e2ef },
  { outline: 0x795e5d, body: 0xcdb18f, shade: 0xa48370, highlight: 0xf0d8b6 },
] as const;

function pixel(graphics: Phaser.GameObjects.Graphics, grid: Grid, column: number, row: number, width = 1, height = 1): void {
  graphics.fillRect(grid.left + column * grid.size, grid.top + row * grid.size, width * grid.size, height * grid.size);
}

export function drawShip(graphics: Phaser.GameObjects.Graphics, x: number, y: number, bank: number, elapsedSeconds: number): void {
  graphics.save();
  graphics.translateCanvas(x, y);
  graphics.rotateCanvas(bank);
  const grid = { left: -30, top: -32, size: 4 };
  graphics.fillStyle(SHIP_OUTLINE);
  SHIP_MASK.forEach((row, rowIndex) => {
    for (let column = 0; column < row.length; column++) {
      if (row[column] === '#') pixel(graphics, grid, column, rowIndex);
    }
  });
  graphics.fillStyle(SHIP_HULL);
  SHIP_MASK.forEach((row, rowIndex) => {
    if (rowIndex === 0 || rowIndex === SHIP_MASK.length - 1) return;
    for (let column = 1; column < row.length - 1; column++) {
      if (row[column - 1] === '#' && row[column] === '#' && row[column + 1] === '#' &&
          SHIP_MASK[rowIndex - 1][column] === '#' && SHIP_MASK[rowIndex + 1][column] === '#') {
        pixel(graphics, grid, column, rowIndex);
      }
    }
  });
  graphics.fillStyle(SHIP_SHADOW);
  pixel(graphics, grid, 6, 8, 3, 3);
  pixel(graphics, grid, 3, 10, 2);
  pixel(graphics, grid, 10, 10, 2);
  graphics.fillStyle(0x1e5a9c);
  pixel(graphics, grid, 6, 5, 3, 3);
  graphics.fillStyle(SHIP_COCKPIT);
  pixel(graphics, grid, 7, 5, 1, 2);
  const flameLength = Math.sin(elapsedSeconds * 19) > 0 ? 3 : 2;
  graphics.fillStyle(SHIP_ENGINE);
  pixel(graphics, grid, 5, 14, 1, flameLength);
  pixel(graphics, grid, 9, 14, 1, flameLength);
  graphics.fillStyle(SHIP_COCKPIT);
  pixel(graphics, grid, 5, 14, 1, flameLength - 1);
  pixel(graphics, grid, 9, 14, 1, flameLength - 1);
  graphics.restore();
}

export function drawMeteor(graphics: Phaser.GameObjects.Graphics, meteor: MeteorVisual): void {
  const variant = ((meteor.variant % METEOR_SHAPES.length) + METEOR_SHAPES.length) % METEOR_SHAPES.length;
  const shape = METEOR_SHAPES[variant];
  const palette = METEOR_PALETTES[variant];
  const size = Math.max(3, Math.round(meteor.radius / 6));
  graphics.save();
  graphics.translateCanvas(meteor.x, meteor.y);
  graphics.rotateCanvas(meteor.angle);
  const grid = { left: Math.round(-5.5 * size), top: Math.round(-5.5 * size), size };
  graphics.fillStyle(palette.outline);
  shape.forEach(([left, right], row) => pixel(graphics, grid, left, row, right - left + 1));
  graphics.fillStyle(palette.body);
  shape.forEach(([left, right], row) => {
    if (row > 0 && row < shape.length - 1 && right - left > 1) pixel(graphics, grid, left + 1, row, right - left - 1);
  });
  graphics.fillStyle(palette.shade);
  pixel(graphics, grid, 3, 3, 2);
  pixel(graphics, grid, 7, 7, 2);
  pixel(graphics, grid, 3, 8, 2);
  graphics.fillStyle(palette.outline);
  pixel(graphics, grid, 4, 4);
  pixel(graphics, grid, 8, 7);
  graphics.fillStyle(palette.highlight);
  pixel(graphics, grid, 4, 2, 2);
  pixel(graphics, grid, 2, 5);
  graphics.restore();
}
