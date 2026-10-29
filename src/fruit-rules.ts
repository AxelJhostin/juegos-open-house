import type { FruitKind } from './fruit-art';

export function specialFruitForRoll(roll: number, normalSpawnsSinceSpecial: number): 'golden' | 'bitter' | null {
  if (normalSpawnsSinceSpecial < 2) return null;
  if (roll < 0.10) return 'golden';
  if (roll < 0.17) return 'bitter';
  return null;
}

export function pointsForFruit(kind: FruitKind): number {
  if (kind === 'golden') return 30;
  if (kind === 'bitter') return -20;
  return 10;
}

export function scoreAfterFruitCuts(score: number, kinds: FruitKind[]): number {
  return Math.max(0, score + kinds.reduce((total, kind) => total + pointsForFruit(kind), 0));
}
