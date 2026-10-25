import assert from 'node:assert/strict';
import test from 'node:test';
import { energyPoseFromHands } from '../src/energy-pose.ts';

function sidewaysHand(x: number, y: number, direction: -1 | 1, curled = false) {
  const hand = Array.from({ length: 21 }, () => ({ x, y, z: 0 }));
  hand[0] = { x: x - direction * 0.17, y, z: 0 };
  const fingers = [
    { mcp: 5, pip: 6, tip: 8, offset: -0.065 },
    { mcp: 9, pip: 10, tip: 12, offset: -0.025 },
    { mcp: 13, pip: 14, tip: 16, offset: 0.025 },
    { mcp: 17, pip: 18, tip: 20, offset: 0.065 },
  ];
  for (const finger of fingers) {
    hand[finger.mcp] = { x, y: y + finger.offset, z: 0 };
    hand[finger.pip] = { x: x + direction * 0.09, y: y + finger.offset, z: 0 };
    hand[finger.tip] = { x: x + direction * (curled ? 0.03 : 0.18), y: y + finger.offset, z: 0 };
  }
  return hand;
}

const upper = sidewaysHand(0.5, 0.25, -1);
const lower = sidewaysHand(0.5, 0.72, 1);

test('reconoce dos manos enfrentadas y ubica la esfera justo entre ellas', () => {
  const pose = energyPoseFromHands([upper, lower], 4 / 3);
  assert.ok(pose);
  assert.ok(Math.abs(pose.x - 0.5) < 0.02);
  assert.ok(Math.abs(pose.y - 0.485) < 0.02);
  assert.ok(pose.radius > 0.055);
  assert.deepEqual(energyPoseFromHands([lower, upper], 4 / 3), pose);
  assert.ok(energyPoseFromHands([sidewaysHand(0.5, 0.25, 1), sidewaysHand(0.5, 0.72, -1)], 4 / 3));
});

test('una mano sola no activa la esfera aunque esté abierta', () => {
  assert.equal(energyPoseFromHands([upper], 4 / 3), null);
});

test('exige una mano arriba, otra abajo y los dedos en sentidos opuestos', () => {
  assert.equal(energyPoseFromHands([upper, sidewaysHand(0.5, 0.72, -1)], 4 / 3), null);
  assert.equal(energyPoseFromHands([upper, sidewaysHand(0.5, 0.30, 1)], 4 / 3), null);
  assert.equal(energyPoseFromHands([upper, sidewaysHand(0.88, 0.72, 1)], 4 / 3), null);
});

test('manos cerradas no activan la técnica', () => {
  assert.equal(energyPoseFromHands([upper, sidewaysHand(0.5, 0.72, 1, true)], 4 / 3), null);
});
