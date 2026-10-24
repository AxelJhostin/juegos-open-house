import assert from 'node:assert/strict';
import test from 'node:test';
import { addResult, loadRecords, nameResult, saveRecords, type Records } from '../src/records.ts';

test('cuenta las rondas, conserva tres mejores puntajes y pide nombre solo para la tabla', () => {
  let records: Records = { played: 0, best: [] };
  for (const score of [20, 50, 10, 80, 40]) {
    const result = addResult(records, score);
    records = result.rank === null ? result.records : nameResult(result.records, result.rank, `P${records.played + 1}`);
  }
  assert.equal(records.played, 5);
  assert.deepEqual(records.best.map((entry) => entry.score), [80, 50, 40]);
  const low = addResult(records, 5);
  assert.equal(low.rank, null);
  assert.equal(low.records.played, 6);
  const empty = addResult({ played: 0, best: [] }, 0);
  assert.equal(empty.rank, null);
  assert.deepEqual(empty.records, { played: 1, best: [] });
});

test('conserva récords numéricos antiguos como ANÓNIMO y guarda nombres nuevos', () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    },
  });
  values.set('pulso-pixel-fruta-records-v1', JSON.stringify({ played: 2, best: [50, 20] }));
  assert.deepEqual(loadRecords(), { played: 2, best: [{ name: 'ANÓNIMO', score: 50 }, { name: 'ANÓNIMO', score: 20 }] });
  const result = addResult(loadRecords(), 70);
  const named = nameResult(result.records, result.rank!, 'Axel');
  assert.equal(saveRecords(named), true);
  assert.deepEqual(loadRecords().best[0], { name: 'AXEL', score: 70 });
  assert.deepEqual(loadRecords('platform'), { played: 0, best: [] });
  assert.equal(saveRecords({ played: 1, best: [{ name: 'LIA', score: 75 }] }, 'platform'), true);
  assert.deepEqual(loadRecords('platform'), { played: 1, best: [{ name: 'LIA', score: 75 }] });
  values.set('pulso-pixel-plataformas-records-v1', JSON.stringify({ played: 2, best: [75, 0] }));
  assert.deepEqual(loadRecords('platform'), { played: 2, best: [{ name: 'ANÓNIMO', score: 75 }] });
});
