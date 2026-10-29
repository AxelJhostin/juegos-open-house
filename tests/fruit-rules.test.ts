import assert from 'node:assert/strict';
import test from 'node:test';
import { pointsForFruit, scoreAfterFruitCuts, specialFruitForRoll } from '../src/fruit-rules.ts';

test('las dos frutas especiales tienen el premio y la penalización acordados', () => {
  assert.equal(pointsForFruit('apple'), 10);
  assert.equal(pointsForFruit('golden'), 30);
  assert.equal(pointsForFruit('bitter'), -20);
  assert.equal(scoreAfterFruitCuts(10, ['golden', 'bitter']), 20);
  assert.equal(scoreAfterFruitCuts(10, ['bitter']), 0);
});

test('una fruta especial deja al menos dos lanzamientos normales antes de otra', () => {
  assert.equal(specialFruitForRoll(0.03, 2), 'golden');
  assert.equal(specialFruitForRoll(0.13, 2), 'bitter');
  assert.equal(specialFruitForRoll(0.5, 2), null);
  assert.equal(specialFruitForRoll(0.03, 0), null);
  assert.equal(specialFruitForRoll(0.13, 1), null);
});
