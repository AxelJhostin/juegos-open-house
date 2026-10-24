import assert from 'node:assert/strict';
import test from 'node:test';
import { GAMES, formatSurvivalTime } from '../src/game-catalog.ts';
import { addResult, loadRecords, nameResult, normalizePlayerName, saveRecords, type Records } from '../src/records.ts';

function useMemoryStorage(): Map<string, string> {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    },
  });
  return values;
}

test('cuenta rondas y conserva los tres mejores puntajes con nombre', () => {
  let records: Records = { played: 0, best: [] };
  for (const score of [20, 50, 10, 80, 40]) {
    const result = addResult(records, score, GAMES.fruit.records);
    records = result.rank === null ? result.records : nameResult(result.records, result.rank, `P${records.played + 1}`);
  }
  assert.equal(records.played, 5);
  assert.deepEqual(records.best.map((entry) => entry.value), [80, 50, 40]);
  assert.equal(addResult(records, 5, GAMES.fruit.records).rank, null);
  assert.deepEqual(addResult({ played: 0, best: [] }, 0, GAMES.fruit.records).records, { played: 1, best: [] });
});

test('lee puntajes antiguos y guarda nombres sin cambiar el formato local', () => {
  const values = useMemoryStorage();
  const storage = GAMES.fruit.records;
  values.set(storage.key, JSON.stringify({ played: 2, best: [50, 20] }));
  assert.deepEqual(loadRecords(storage), { played: 2, best: [{ name: 'ANÓNIMO', value: 50 }, { name: 'ANÓNIMO', value: 20 }] });
  const result = addResult(loadRecords(storage), 70, storage);
  const named = nameResult(result.records, result.rank!, 'Axel');
  assert.equal(saveRecords(named, storage), true);
  assert.deepEqual(JSON.parse(values.get(storage.key)!), {
    played: 3,
    best: [{ name: 'AXEL', score: 70 }, { name: 'ANÓNIMO', score: 50 }, { name: 'ANÓNIMO', score: 20 }],
  });
});

test('separa la tabla nueva de Plataformas de sus puntajes anteriores', () => {
  const values = useMemoryStorage();
  values.set('pulso-pixel-plataformas-records-v1', JSON.stringify({ played: 3, best: [250] }));
  const storage = GAMES.platform.records;
  assert.deepEqual(loadRecords(storage), { played: 0, best: [] });
  assert.equal(saveRecords({ played: 1, best: [{ name: 'ANA', value: 40 }] }, storage), true);
  assert.equal(values.has('pulso-pixel-plataformas-records-v1'), true);
  assert.deepEqual(loadRecords(storage).best, [{ name: 'ANA', value: 40 }]);
  values.set(storage.key, JSON.stringify({ played: 2, best: [75, 0] }));
  assert.deepEqual(loadRecords(storage), { played: 2, best: [{ name: 'ANÓNIMO', value: 75 }] });
});

test('guarda los tiempos de Nave con la clave y el campo anteriores', () => {
  const values = useMemoryStorage();
  const storage = GAMES.ship.records;
  let records: Records = { played: 0, best: [] };
  for (const time of [1200, 3500, 2100]) records = addResult(records, time, storage).records;
  assert.equal(addResult(records, 900, storage).rank, null);
  const result = addResult(records, 4200, storage);
  assert.equal(result.rank, 0);
  const named = nameResult(result.records, result.rank!, 'Axel');
  assert.equal(saveRecords(named, storage), true);
  assert.deepEqual(JSON.parse(values.get(storage.key)!).best[0], { name: 'AXEL', timeMs: 4200 });
  assert.deepEqual(loadRecords(storage).best.map((entry) => entry.value), [4200, 3500, 2100]);
  assert.equal(formatSurvivalTime(125430), '2:05.4');
  assert.equal(normalizePlayerName('  áxel!  123 '), 'ÁXEL 123');
});
