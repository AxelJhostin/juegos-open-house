export type ScoreEntry = { name: string; score: number };
export type Records = { played: number; best: ScoreEntry[] };

const FRUIT_KEY = 'pulso-pixel-fruta-records-v1';
const SHIP_KEY = 'pulso-pixel-nave-records-v1'; // Datos antiguos de puntos; la tabla nueva de tiempos usa otra clave.
const PLATFORM_KEY = 'pulso-pixel-plataformas-records-v1';
export type RecordGame = 'fruit' | 'ship' | 'platform';

function keyFor(game: RecordGame): string {
  return game === 'fruit' ? FRUIT_KEY : game === 'ship' ? SHIP_KEY : PLATFORM_KEY;
}

export function normalizePlayerName(value: string): string {
  return value.trim().toLocaleUpperCase('es').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').slice(0, 10).trim();
}

export function addResult(records: Records, score: number): { records: Records; rank: number | null } {
  const entry = { name: 'ANÓNIMO', score: Math.max(0, Math.round(score)) };
  if (entry.score === 0) return { records: { ...records, played: records.played + 1 }, rank: null };
  const best = [...records.best, entry].sort((a, b) => b.score - a.score).slice(0, 3);
  const index = best.indexOf(entry);
  return { records: { played: records.played + 1, best }, rank: index < 0 ? null : index };
}

export function nameResult(records: Records, rank: number, value: string): Records {
  const name = normalizePlayerName(value);
  if (!name || !records.best[rank]) return records;
  return { ...records, best: records.best.map((entry, index) => index === rank ? { ...entry, name } : entry) };
}

export function loadRecords(game: RecordGame = 'fruit'): Records {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(game)) ?? 'null');
    if (saved && Number.isSafeInteger(saved.played) && saved.played >= 0 &&
      Array.isArray(saved.best) && saved.best.length <= 3) {
      const best = saved.best.map((value: unknown): ScoreEntry | null => {
        // Conserva los récords numéricos de Fruta y Plataformas al añadir nombres.
        if (Number.isSafeInteger(value) && (value as number) >= 0) return { name: 'ANÓNIMO', score: value as number };
        if (!value || typeof value !== 'object') return null;
        const entry = value as Partial<ScoreEntry>;
        if (typeof entry.name !== 'string' || !entry.name || entry.name.length > 10 ||
          !Number.isSafeInteger(entry.score) || (entry.score as number) < 0) return null;
        return { name: entry.name, score: entry.score as number };
      });
      if (best.every((entry: ScoreEntry | null): entry is ScoreEntry => entry !== null)) {
        return { played: saved.played, best: best.filter((entry: ScoreEntry) => entry.score > 0).sort((a: ScoreEntry, b: ScoreEntry) => b.score - a.score) };
      }
    }
  } catch { /* El juego sigue si el almacenamiento está bloqueado. */ }
  return { played: 0, best: [] };
}

export function saveRecords(records: Records, game: RecordGame = 'fruit'): boolean {
  try {
    localStorage.setItem(keyFor(game), JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}
