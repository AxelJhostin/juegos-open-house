import assert from 'node:assert/strict';
import test from 'node:test';
import { GestureSynthMapper, chordNotes, fingerCount } from '../src/gesture-synth.ts';

function hand(x: number, open: number[], thumb = false, wristY = 0.72) {
  const points = Array.from({ length: 21 }, () => ({ x, y: 0.56, z: 0 }));
  points[0] = { x, y: wristY, z: 0 };
  points[2] = { x: x - 0.055, y: 0.55, z: 0 };
  points[3] = { x: x - 0.075, y: 0.51, z: 0 };
  points[4] = { x: thumb ? x - 0.17 : x - 0.07, y: thumb ? 0.48 : 0.54, z: 0 };
  const fingers = [
    [5, 6, 8, -0.08], [9, 10, 12, -0.025],
    [13, 14, 16, 0.025], [17, 18, 20, 0.08],
  ] as const;
  fingers.forEach(([mcp, pip, tip, offset], index) => {
    points[mcp] = { x: x + offset, y: 0.53, z: 0 };
    points[pip] = { x: x + offset, y: 0.42, z: 0 };
    points[tip] = { x: x + offset, y: open.includes(index) ? 0.22 : 0.58, z: 0 };
  });
  const shift = wristY - 0.72;
  for (let index = 1; index < points.length; index++) points[index].y += shift;
  return points;
}

test('la mano izquierda elige el grado y la derecha la armonía y el volumen', () => {
  const mapper = new GestureSynthMapper();
  const left = hand(0.7, [0, 1]);
  const right = hand(0.3, [0, 1, 2], false, 0.55);
  assert.equal(fingerCount(right), 3);
  assert.equal(mapper.sample([right, left], ['Right', 'Left'], 1000).degree, 0);
  const state = mapper.sample([left, right], ['Left', 'Right'], 1120);
  assert.equal(state.degree, 2);
  assert.equal(state.quality, 3);
  assert.ok(state.volume > 0.4);
  assert.equal(state.notes.length, 4);
  assert.equal(state.name, 'RE mayor');
  assert.equal(mapper.sample([], [], 1350).degree, 0);
});

test('índice y meñique reservan los grados sexto y séptimo', () => {
  const mapper = new GestureSynthMapper();
  const right = hand(0.3, [0]);
  const la = hand(0.7, [0, 3]);
  const si = hand(0.7, [0, 3], true);
  mapper.sample([la, right], ['Left', 'Right'], 1000);
  assert.equal(mapper.sample([la, right], ['Left', 'Right'], 1120).degree, 6);
  mapper.sample([si, right], ['Left', 'Right'], 1200);
  assert.equal(mapper.sample([si, right], ['Left', 'Right'], 1330).degree, 7);
});

test('los acordes generan notas válidas y se silencian sin mano de expresión', () => {
  assert.equal(chordNotes(1, 'mayor', 4).length, 4);
  assert.ok(chordNotes(1, 'mayor', 1).every((note) => note > 100 && note < 800));
  assert.deepEqual(chordNotes(0, 'mayor', 2), []);
  const mapper = new GestureSynthMapper();
  mapper.sample([hand(0.7, [0]), hand(0.3, [0])], ['Left', 'Right'], 1000);
  mapper.sample([hand(0.7, [0]), hand(0.3, [0])], ['Left', 'Right'], 1120);
  assert.equal(mapper.sample([hand(0.7, [0])], ['Left'], 1400).volume, 0);
});
