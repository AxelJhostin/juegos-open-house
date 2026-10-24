import assert from 'node:assert/strict';
import test from 'node:test';
import { addResult, loadRecords, saveRecords } from '../src/records.ts';

test('cuenta todas las rondas y conserva solo las tres mejores', () => {
  let records = { played: 0, best: [] as number[] };
  for (const score of [20, 50, 10, 80, 40]) records = addResult(records, score);
  assert.deepEqual(records, { played: 5, best: [80, 50, 40] });
});

test('los récords se recuperan del almacenamiento local', () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    },
  });
  assert.equal(saveRecords({ played: 2, best: [50, 20] }), true);
  assert.deepEqual(loadRecords(), { played: 2, best: [50, 20] });
});
