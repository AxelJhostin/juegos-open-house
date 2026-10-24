export type Records = { played: number; best: number[] };

const KEY = 'pulso-pixel-fruta-records-v1';

export function addResult(records: Records, score: number): Records {
  return {
    played: records.played + 1,
    best: [...records.best, score].sort((a, b) => b - a).slice(0, 3),
  };
}

export function loadRecords(): Records {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved && Number.isSafeInteger(saved.played) && saved.played >= 0 &&
      Array.isArray(saved.best) && saved.best.length <= 3 &&
      saved.best.every((score: unknown) => Number.isSafeInteger(score) && (score as number) >= 0)) {
      return { played: saved.played, best: [...saved.best].sort((a, b) => b - a) };
    }
  } catch { /* El juego sigue si el almacenamiento está bloqueado. */ }
  return { played: 0, best: [] };
}

export function saveRecords(records: Records): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}
