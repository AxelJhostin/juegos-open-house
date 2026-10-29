import test from 'node:test';
import assert from 'node:assert/strict';
import { heartPoseFromHands } from '../src/heart-gesture.ts';
import type { HandLandmarks } from '../src/tracking.ts';

function heartHand(): HandLandmarks[number] {
  const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const set = (index: number, x: number, y: number): void => { hand[index] = { x, y, z: 0 }; };
  set(0, 0.5, 0.8);
  set(2, 0.37, 0.49); set(4, 0.47, 0.34);
  set(5, 0.44, 0.55); set(6, 0.45, 0.44); set(8, 0.49, 0.35);
  set(9, 0.5, 0.55); set(10, 0.5, 0.47); set(12, 0.51, 0.51);
  set(13, 0.56, 0.55); set(14, 0.57, 0.47); set(16, 0.57, 0.52);
  set(17, 0.62, 0.55); set(18, 0.63, 0.48); set(20, 0.62, 0.52);
  return hand;
}

test('una mano con corazón activa el gesto', () => {
  const pose = heartPoseFromHands([heartHand()], 4 / 3);
  assert.ok(pose);
  assert.ok(Math.abs(pose.x - 0.48) < 0.02);
});

test('ignora pinza con dedos abiertos, puño y ausencia de mano', () => {
  const open = heartHand(); open[12].y = 0.25;
  assert.equal(heartPoseFromHands([open], 4 / 3), null);
  const fist = heartHand(); fist[8].y = 0.54;
  assert.equal(heartPoseFromHands([fist], 4 / 3), null);
  assert.equal(heartPoseFromHands([], 4 / 3), null);
});
