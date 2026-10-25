import type Phaser from 'phaser';

export const FRUIT_KINDS = ['apple', 'pear', 'citrus', 'berry'] as const;
export type FruitKind = typeof FRUIT_KINDS[number];

type FruitVisual = { x: number; y: number; radius: number; kind: FruitKind };
type PixelGrid = { left: number; top: number; size: number };
type FruitPalette = {
  outline: number;
  body: number;
  shade: number;
  highlight: number;
  leaf: number;
  stem: number;
  seed: number;
};

// Los colores del objeto pertenecen a Fruta; los demás juegos conservan sus temas.
const FRUIT_PALETTES: Record<FruitKind, FruitPalette> = {
  apple:  { outline: 0x963b4e, body: 0xed5960, shade: 0xc73d52, highlight: 0xffc6b8, leaf: 0x59b76d, stem: 0x76503c, seed: 0xffe58d },
  pear:   { outline: 0x557543, body: 0xb5d75c, shade: 0x82ad45, highlight: 0xf2f6af, leaf: 0x4eaa70, stem: 0x76503c, seed: 0xffe58d },
  citrus: { outline: 0xa85b35, body: 0xffb74e, shade: 0xe98a39, highlight: 0xffeaaa, leaf: 0x59b76d, stem: 0x76503c, seed: 0xffe58d },
  berry:  { outline: 0x983958, body: 0xe95880, shade: 0xc83d6a, highlight: 0xffb5c8, leaf: 0x59b76d, stem: 0x76503c, seed: 0xffe58d },
};

// Trece filas sobre una cuadrícula de 13 × 13. Cada variedad tiene una silueta propia.
const SHAPES: Record<FruitKind, readonly number[]> = {
  apple:  [2, 4, 5, 6, 6, 6, 6, 6, 6, 5, 4, 3, 1],
  pear:   [1, 2, 2, 3, 4, 5, 6, 6, 6, 6, 5, 4, 2],
  citrus: [2, 4, 5, 6, 6, 6, 6, 6, 6, 5, 4, 3, 1],
  berry:  [4, 5, 6, 6, 6, 5, 5, 4, 4, 3, 2, 1, 0],
};

function pixel(graphics: Phaser.GameObjects.Graphics, grid: PixelGrid, column: number, row: number, width = 1, height = 1): void {
  graphics.fillRect(grid.left + column * grid.size, grid.top + row * grid.size, width * grid.size, height * grid.size);
}

function drawBody(graphics: Phaser.GameObjects.Graphics, grid: PixelGrid, kind: FruitKind, palette: FruitPalette): void {
  const rows = SHAPES[kind];
  graphics.fillStyle(palette.outline);
  rows.forEach((halfWidth, row) => pixel(graphics, grid, 6 - halfWidth, row, halfWidth * 2 + 1));
  graphics.fillStyle(palette.body);
  rows.forEach((halfWidth, row) => {
    if (row > 0 && row < rows.length - 1 && halfWidth > 0) {
      pixel(graphics, grid, 7 - halfWidth, row, halfWidth * 2 - 1);
    }
  });
}

function drawDetails(graphics: Phaser.GameObjects.Graphics, grid: PixelGrid, kind: FruitKind, palette: FruitPalette): void {
  if (kind === 'apple' || kind === 'pear') {
    graphics.fillStyle(palette.shade);
    pixel(graphics, grid, 9, 7, 2);
    pixel(graphics, grid, 8, 8, 3);
    pixel(graphics, grid, 7, 9, 2);
    graphics.fillStyle(palette.highlight);
    pixel(graphics, grid, kind === 'apple' ? 3 : 5, 3, 2);
    pixel(graphics, grid, kind === 'apple' ? 2 : 4, 4, 1, 2);
    graphics.fillStyle(palette.stem);
    pixel(graphics, grid, 6, -2, 1, 3);
    graphics.fillStyle(palette.outline);
    pixel(graphics, grid, kind === 'apple' ? 7 : 3, -1, 3);
    graphics.fillStyle(palette.leaf);
    pixel(graphics, grid, kind === 'apple' ? 7 : 4, -1, 2);
    return;
  }

  if (kind === 'citrus') {
    graphics.fillStyle(palette.highlight);
    for (let step = 2; step <= 3; step++) {
      pixel(graphics, grid, 6 + step, 6 + step);
      pixel(graphics, grid, 6 - step, 6 + step);
      pixel(graphics, grid, 6 + step, 6 - step);
      pixel(graphics, grid, 6 - step, 6 - step);
    }
    pixel(graphics, grid, 6, 3, 1, 2);
    pixel(graphics, grid, 6, 8, 1, 2);
    pixel(graphics, grid, 3, 6, 2);
    pixel(graphics, grid, 8, 6, 2);
    graphics.fillStyle(palette.shade);
    pixel(graphics, grid, 6, 6);
    graphics.fillStyle(palette.highlight);
    pixel(graphics, grid, 3, 3, 2);
    graphics.fillStyle(palette.shade);
    pixel(graphics, grid, 9, 8, 2);
    return;
  }

  graphics.fillStyle(palette.leaf);
  pixel(graphics, grid, 3, -1, 2, 2);
  pixel(graphics, grid, 6, -2, 1, 3);
  pixel(graphics, grid, 8, -1, 2, 2);
  graphics.fillStyle(palette.seed);
  pixel(graphics, grid, 3, 3);
  pixel(graphics, grid, 8, 4);
  pixel(graphics, grid, 5, 6);
  pixel(graphics, grid, 8, 7);
  pixel(graphics, grid, 5, 9);
  graphics.fillStyle(palette.highlight);
  pixel(graphics, grid, 4, 4);
  pixel(graphics, grid, 8, 5);
  pixel(graphics, grid, 6, 8);
}

// El arte usa el mismo radio aproximado de siempre; FruitGame conserva la colisión circular.
export function drawFruit(graphics: Phaser.GameObjects.Graphics, fruit: FruitVisual): void {
  const size = Math.max(4, Math.round(fruit.radius / 7));
  const grid = {
    left: Math.round(fruit.x - 6.5 * size),
    top: Math.round(fruit.y - 6.5 * size),
    size,
  };
  const palette = FRUIT_PALETTES[fruit.kind];
  drawBody(graphics, grid, fruit.kind, palette);
  drawDetails(graphics, grid, fruit.kind, palette);
}
