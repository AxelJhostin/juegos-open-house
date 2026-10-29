import assert from 'node:assert/strict';
import test from 'node:test';
import { RainbowGesture, rainbowPoseFromHands } from '../src/rainbow-gesture.ts';

function openHand(x: number, y = 0.35, folded = false) {
  const hand = Array.from({ length: 21 }, () => ({ x, y, z: 0 }));
  hand[0] = { x, y: y + 0.2, z: 0 };
  const fingers = [
    { mcp: 5, pip: 6, tip: 8, offset: -0.09 },
    { mcp: 9, pip: 10, tip: 12, offset: -0.03 },
    { mcp: 13, pip: 14, tip: 16, offset: 0.03 },
    { mcp: 17, pip: 18, tip: 20, offset: 0.09 },
  ];
  for (const finger of fingers) {
    hand[finger.mcp] = { x: x + finger.offset, y: y + 0.04, z: 0 };
    hand[finger.pip] = { x: x + finger.offset, y: y - 0.07, z: 0 };
    hand[finger.tip] = { x: x + finger.offset, y: folded ? y + 0.1 : y - 0.2, z: 0 };
  }
  return hand;
}

test('reconoce dos manos abiertas y elevadas sin depender de su orden', () => {
  const pose = rainbowPoseFromHands([openHand(0.4), openHand(0.6)], 4 / 3);
  assert.ok(pose);
  assert.ok(Math.abs(pose.gap - 0.2) < 0.001);
  assert.deepEqual(rainbowPoseFromHands([openHand(0.6), openHand(0.4)], 4 / 3), pose);
  assert.equal(rainbowPoseFromHands([openHand(0.4)], 4 / 3), null);
  assert.equal(rainbowPoseFromHands([openHand(0.4, 0.7), openHand(0.6, 0.7)], 4 / 3), null);
  assert.equal(rainbowPoseFromHands([openHand(0.4, 0.35, true), openHand(0.6)], 4 / 3), null);
});

test('el arco se abre solo después de juntar y separar ambas manos', () => {
  const gesture = new RainbowGesture();
  assert.equal(gesture.sample([openHand(0.2), openHand(0.8)], 4 / 3, 1000).state, 'idle');
  assert.equal(gesture.sample([openHand(0.4), openHand(0.6)], 4 / 3, 1100).state, 'idle');
  assert.equal(gesture.sample([openHand(0.4), openHand(0.6)], 4 / 3, 1250).state, 'ready');
  const opening = gesture.sample([openHand(0.3), openHand(0.7)], 4 / 3, 1320);
  assert.equal(opening.state, 'opening');
  assert.ok(opening.progress > 0 && opening.progress < 1);
  assert.equal(gesture.sample([openHand(0.2), openHand(0.8)], 4 / 3, 1400).state, 'active');
  assert.equal(gesture.sample([openHand(0.19), openHand(0.81)], 4 / 3, 1470).state, 'active');
  assert.equal(gesture.sample([], 4 / 3, 1750).state, 'idle');
});
