// Recorrido único de la demo. Las distancias se ajustan al salto de platform-game.ts.
// Empieza con un pico y un hueco; después combina picos cercanos y huecos.
export const PLATFORM_LEVEL = {
  worldWidth: 4670,
  platforms: [
    [0, 760],
    [870, 1590],
    [1710, 2430],
    [2550, 3310],
    [3430, 4100],
    [4220, 4670],
  ],
  spikes: [
    430,
    1100, 1360,
    1940, 2190,
    2780, 2810, 3090,
    3650, 3680, 3910,
    4450,
  ],
} as const;
