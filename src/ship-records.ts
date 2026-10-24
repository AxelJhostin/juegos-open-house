import { normalizePlayerName } from './records.ts';

export type ShipEntry = { name: string; timeMs: number };
export type ShipRecords = { played: number; best: ShipEntry[] };

// Los puntos de la versión anterior no se pueden comparar con tiempos de supervivencia.
const STORAGE_KEY = 'pulso-pixel-nave-tiempo-records-v1';

export function formatSurvivalTime(timeMs: number): string {
  const tenths = Math.floor(Math.max(0, timeMs) / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor(tenths / 10) % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
}

export function addShipResult(records: ShipRecords, timeMs: number): { records: ShipRecords; rank: number | null } {
  const entry = { name: 'ANÓNIMO', timeMs: Math.max(0, Math.round(timeMs)) };
  const best = [...records.best, entry].sort((a, b) => b.timeMs - a.timeMs).slice(0, 3);
  const index = best.indexOf(entry);
  return { records: { played: records.played + 1, best }, rank: index < 0 ? null : index };
}

export function nameShipResult(records: ShipRecords, rank: number, value: string): ShipRecords {
  const name = normalizePlayerName(value);
  if (!name || !records.best[rank]) return records;
  return { ...records, best: records.best.map((entry, index) => index === rank ? { ...entry, name } : entry) };
}

export function loadShipRecords(): ShipRecords {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && Number.isSafeInteger(saved.played) && saved.played >= 0 &&
      Array.isArray(saved.best) && saved.best.length <= 3 &&
      saved.best.every((entry: unknown) => {
        if (!entry || typeof entry !== 'object') return false;
        const item = entry as Partial<ShipEntry>;
        return typeof item.name === 'string' && item.name.length > 0 && item.name.length <= 10 &&
          Number.isSafeInteger(item.timeMs) && (item.timeMs as number) >= 0;
      })) {
      return { played: saved.played, best: [...saved.best].sort((a: ShipEntry, b: ShipEntry) => b.timeMs - a.timeMs) };
    }
  } catch { /* La partida sigue si el almacenamiento está bloqueado. */ }
  return { played: 0, best: [] };
}

export function saveShipRecords(records: ShipRecords): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

