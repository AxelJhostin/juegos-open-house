import assert from 'node:assert/strict';
import test from 'node:test';
import { addShipResult, formatSurvivalTime, loadShipRecords, nameShipResult, saveShipRecords } from '../src/ship-records.ts';
import { normalizePlayerName } from '../src/records.ts';

test('ordena los tres mejores tiempos y pide nombre solo si entra en la tabla', () => {
  let records = { played: 0, best: [] as { name: string; timeMs: number }[] };
  for (const timeMs of [1200, 3500, 2100]) {
    const result = addShipResult(records, timeMs);
    assert.notEqual(result.rank, null);
    records = nameShipResult(result.records, result.rank!, `P${records.played + 1}`);
  }
  const shortRun = addShipResult(records, 900);
  assert.equal(shortRun.rank, null);
  assert.equal(shortRun.records.played, 4);
  assert.deepEqual(shortRun.records.best.map((entry) => entry.timeMs), [3500, 2100, 1200]);
  const record = addShipResult(shortRun.records, 4200);
  assert.equal(record.rank, 0);
  assert.deepEqual(record.records.best.map((entry) => entry.timeMs), [4200, 3500, 2100]);
});

test('guarda nombres cortos y tiempos en una tabla local separada', () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    },
  });
  assert.equal(normalizePlayerName('  áxel!  123 '), 'ÁXEL 123');
  assert.equal(formatSurvivalTime(125430), '2:05.4');
  const run = addShipResult(loadShipRecords(), 125430);
  const named = nameShipResult(run.records, run.rank!, 'Axel');
  assert.equal(saveShipRecords(named), true);
  assert.deepEqual(loadShipRecords(), { played: 1, best: [{ name: 'AXEL', timeMs: 125430 }] });
});
