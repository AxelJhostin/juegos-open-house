export type RecordEntry = { name: string; value: number };
export type Records = { played: number; best: RecordEntry[] };
export type RecordStorage = { key: string; field: string; includeZero: boolean };

export function normalizePlayerName(value: string): string {
  return value.trim().toLocaleUpperCase('es').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').slice(0, 10).trim();
}

export function addResult(records: Records, value: number, storage: RecordStorage): { records: Records; rank: number | null } {
  const entry = { name: 'ANÓNIMO', value: Math.max(0, Math.round(value)) };
  if (entry.value === 0 && !storage.includeZero) return { records: { ...records, played: records.played + 1 }, rank: null };
  const best = [...records.best, entry].sort((a, b) => b.value - a.value).slice(0, 3);
  const rank = best.indexOf(entry);
  return { records: { played: records.played + 1, best }, rank: rank < 0 ? null : rank };
}

export function nameResult(records: Records, rank: number, value: string): Records {
  const name = normalizePlayerName(value);
  if (!name || !records.best[rank]) return records;
  return { ...records, best: records.best.map((entry, index) => index === rank ? { ...entry, name } : entry) };
}

export function loadRecords(storage: RecordStorage): Records {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storage.key) ?? 'null');
    if (!saved || typeof saved !== 'object') return { played: 0, best: [] };
    const data = saved as { played?: unknown; best?: unknown };
    if (!Number.isSafeInteger(data.played) || (data.played as number) < 0 ||
      !Array.isArray(data.best) || data.best.length > 3) return { played: 0, best: [] };
    const best = data.best.map((item: unknown): RecordEntry | null => {
      // Las primeras tablas de Fruta y Plataformas guardaban números sin nombres.
      if (storage.field === 'score' && Number.isSafeInteger(item) && (item as number) >= 0) {
        return { name: 'ANÓNIMO', value: item as number };
      }
      if (!item || typeof item !== 'object') return null;
      const entry = item as Record<string, unknown>;
      if (typeof entry.name !== 'string' || !entry.name || entry.name.length > 10 ||
        !Number.isSafeInteger(entry[storage.field]) || (entry[storage.field] as number) < 0) return null;
      return { name: entry.name, value: entry[storage.field] as number };
    });
    if (best.some((entry: RecordEntry | null) => entry === null)) return { played: 0, best: [] };
    return {
      played: data.played as number,
      best: (best as RecordEntry[]).filter((entry) => storage.includeZero || entry.value > 0).sort((a, b) => b.value - a.value),
    };
  } catch { /* La demo sigue si el almacenamiento está bloqueado o dañado. */ }
  return { played: 0, best: [] };
}

export function saveRecords(records: Records, storage: RecordStorage): boolean {
  try {
    // Conserva el formato guardado de cada juego para no perder récords existentes.
    const best = records.best.map((entry) => ({ name: entry.name, [storage.field]: entry.value }));
    localStorage.setItem(storage.key, JSON.stringify({ played: records.played, best }));
    return true;
  } catch {
    return false;
  }
}
