import test from 'node:test';
import assert from 'node:assert/strict';
import { RestartGesture } from '../src/restart-gesture.ts';

const hand = (x: number, pinchRatio: number) => ({ x, y: 0.5, pinchRatio });

test('exige abrir después del resultado y sostener la pinza; una pinza previa no reinicia', () => {
  const gesture = new RestartGesture();
  assert.equal(gesture.sample([hand(0.4, 0.25)], 0).restart, false);
  assert.equal(gesture.sample([hand(0.4, 0.25)], 1200).restart, false);
  gesture.sample([hand(0.4, 0.8)], 1300);
  assert.equal(gesture.sample([hand(0.4, 0.25)], 1400).progress, 0);
  assert.equal(gesture.sample([hand(0.4, 0.25)], 2200).restart, false);
  assert.equal(gesture.sample([hand(0.4, 0.25)], 2300).restart, true);
});

test('perder la mano o soltar la pinza cancela el tiempo acumulado', () => {
  const gesture = new RestartGesture();
  gesture.sample([hand(0.3, 0.8)], 0);
  gesture.sample([hand(0.3, 0.25)], 100);
  assert.equal(gesture.sample([], 700).progress, 0);
  assert.equal(gesture.sample([hand(0.3, 0.25)], 1500).restart, false);
  gesture.sample([hand(0.3, 0.8)], 1600);
  gesture.sample([hand(0.3, 0.25)], 1700);
  gesture.sample([hand(0.3, 0.55)], 2300);
  assert.equal(gesture.sample([hand(0.3, 0.25)], 2400).progress, 0);
});

test('sigue la misma mano cuando el detector invierte el orden', () => {
  const gesture = new RestartGesture();
  gesture.sample([hand(0.2, 0.8), hand(0.8, 0.25)], 0);
  gesture.sample([hand(0.8, 0.25), hand(0.2, 0.25)], 100);
  assert.equal(gesture.sample([hand(0.8, 0.25), hand(0.2, 0.25)], 1000).restart, true);
});
