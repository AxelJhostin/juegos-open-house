import assert from 'node:assert/strict';
import test from 'node:test';
import { strikeTarget } from '../src/guardian-combat.ts';

test('cada ala alcanza solo amenazas de su lado y dentro de su ventana', () => {
  const threats = [
    { id: 1, side: 'left' as const, x: 120 },
    { id: 2, side: 'left' as const, x: 340 },
    { id: 3, side: 'right' as const, x: 620 },
  ];
  assert.equal(strikeTarget(threats, 'left')?.id, 2);
  assert.equal(strikeTarget(threats, 'right')?.id, 3);
});

test('un golpe adelantado o después del impacto no cuenta', () => {
  assert.equal(strikeTarget([{ side: 'left', x: 100 }], 'left'), null);
  assert.equal(strikeTarget([{ side: 'right', x: 550 }], 'right'), null);
});

test('una mano puede atacar mientras la otra amenaza sigue activa', () => {
  const left = { id: 'l', side: 'left' as const, x: 300 };
  const right = { id: 'r', side: 'right' as const, x: 650 };
  assert.equal(strikeTarget([left, right], 'left'), left);
  assert.equal(strikeTarget([right], 'right'), right);
});
