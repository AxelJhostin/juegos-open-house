import assert from 'node:assert/strict';
import test from 'node:test';
import { assignHandSlots } from '../src/hand-slots.ts';

test('conserva cada índice aunque MediaPipe invierta el orden de las manos', () => {
  const left = { x: 100, y: 200 };
  const right = { x: 800, y: 200 };
  const next = assignHandSlots([left, right], [{ x: 790, y: 210 }, { x: 110, y: 210 }]);
  assert.deepEqual(next, [{ x: 110, y: 210 }, { x: 790, y: 210 }]);
});

test('al perder una mano no conecta su estela con la otra', () => {
  const next = assignHandSlots([{ x: 100, y: 200 }, { x: 800, y: 200 }], [{ x: 790, y: 210 }]);
  assert.deepEqual(next, [null, { x: 790, y: 210 }]);
});
