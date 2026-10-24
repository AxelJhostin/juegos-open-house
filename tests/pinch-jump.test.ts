import test from 'node:test';
import assert from 'node:assert/strict';
import { handPinchRatio, PinchJumpControl } from '../src/pinch-jump.ts';

test('normaliza la pinza al tamaño de la mano y la proporción del video', () => {
  const hand = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
  hand[5] = { x: 0.4, y: 0.5 };
  hand[17] = { x: 0.6, y: 0.5 };
  hand[4] = { x: 0.5, y: 0.4 };
  hand[8] = { x: 0.5, y: 0.5 };
  assert.ok(Math.abs(handPinchRatio(hand, 640, 480)! - 0.375) < 1e-10);
  assert.equal(handPinchRatio([], 640, 480), null);
});

test('salta una vez por pinza y exige abrir antes de repetir', () => {
  const control = new PinchJumpControl();
  assert.equal(control.sample(0.2).jump, false);
  assert.equal(control.sample(0.8).ready, true);
  assert.equal(control.sample(0.5).jump, false);
  assert.equal(control.sample(0.3).jump, true);
  assert.equal(control.sample(0.25).jump, false);
  assert.equal(control.sample(0.65).jump, false);
  assert.equal(control.sample(0.75).ready, true);
  assert.equal(control.sample(0.35).jump, true);
  assert.equal(control.sample(null).ready, false);
  assert.equal(control.sample(0.3).jump, false);
});
