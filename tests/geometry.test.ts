import assert from 'node:assert/strict';
import test from 'node:test';
import { segmentHitsCircle } from '../src/geometry.ts';

test('un corte rápido atraviesa la fruta aunque ambos extremos queden fuera', () => {
  assert.equal(segmentHitsCircle({ x: 0, y: 50 }, { x: 100, y: 50 }, { x: 50, y: 50 }, 12), true);
});

test('un tramo cercano que no toca la fruta no cuenta como corte', () => {
  assert.equal(segmentHitsCircle({ x: 0, y: 20 }, { x: 100, y: 20 }, { x: 50, y: 50 }, 12), false);
});

test('un punto sin desplazamiento puede tocar la fruta', () => {
  assert.equal(segmentHitsCircle({ x: 50, y: 50 }, { x: 50, y: 50 }, { x: 50, y: 50 }, 12), true);
});
