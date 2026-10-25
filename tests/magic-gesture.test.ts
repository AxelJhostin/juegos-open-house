import assert from 'node:assert/strict';
import test from 'node:test';
import { magicPosesFromHands } from '../src/magic-gesture.ts';

function spellHand(x: number, { index = true, pinky = true, middle = false, ring = false, thumbOut = false } = {}) {
  const hand = Array.from({ length: 21 }, () => ({ x, y: 0.65, z: 0 }));
  hand[0] = { x, y: 0.87, z: 0 };
  hand[4] = { x: x + (thumbOut ? 0.4 : 0.01), y: 0.66, z: 0 };
  const fingers = [
    { mcp: 5, pip: 6, tip: 8, offset: -0.12, raised: index },
    { mcp: 9, pip: 10, tip: 12, offset: -0.04, raised: middle },
    { mcp: 13, pip: 14, tip: 16, offset: 0.04, raised: ring },
    { mcp: 17, pip: 18, tip: 20, offset: 0.12, raised: pinky },
  ];
  for (const finger of fingers) {
    hand[finger.mcp] = { x: x + finger.offset, y: 0.56, z: 0 };
    hand[finger.pip] = { x: x + finger.offset, y: 0.42, z: 0 };
    hand[finger.tip] = { x: x + finger.offset, y: finger.raised ? 0.2 : 0.6, z: 0 };
  }
  return hand;
}

test('el gesto de índice y meñique activa un sello sobre una sola mano', () => {
  const poses = magicPosesFromHands([spellHand(0.5)], 4 / 3);
  assert.equal(poses.length, 1);
  assert.ok(Math.abs(poses[0].x - 0.5) < 0.02);
  assert.ok(poses[0].radius > 0.05);
});

test('dos manos con el gesto activan dos sellos independientes', () => {
  const poses = magicPosesFromHands([spellHand(0.3), spellHand(0.7)], 4 / 3);
  assert.equal(poses.length, 2);
  assert.ok(poses[0].x < poses[1].x);
});

test('palma abierta, puño o gesto incompleto no activan el sello', () => {
  assert.deepEqual(magicPosesFromHands([spellHand(0.5, { middle: true, ring: true })], 4 / 3), []);
  assert.deepEqual(magicPosesFromHands([spellHand(0.5, { index: false, pinky: false })], 4 / 3), []);
  assert.deepEqual(magicPosesFromHands([spellHand(0.5, { pinky: false })], 4 / 3), []);
  assert.deepEqual(magicPosesFromHands([spellHand(0.5, { thumbOut: true })], 4 / 3), []);
});
