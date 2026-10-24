import type { ControlMode } from './game-types';
import type { RecordStorage } from './records';

export type GameDefinition = {
  title: string;
  symbol: string;
  summary: string;
  callToAction: string;
  controls: Partial<Record<ControlMode, string>>;
  intro: { title: string; text: string };
  hud: { label: string; unit: string; initial: number; countdown?: number; extraLabel?: string; extra?: number };
  records: RecordStorage;
  recordsTitle: string;
  formatScore(value: number): string;
  formatRecord(value: number): string;
  endTitle(won: boolean): string;
  endText(value: number): string;
  rankText: string;
  savedText(value: number): string;
};

export function formatSurvivalTime(timeMs: number): string {
  const tenths = Math.floor(Math.max(0, timeMs) / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor(tenths / 10) % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths % 10}`;
}

// La identidad de la pantalla de cada juego se cambia aquí y en game-themes.css.
// Los recursos, controles y reglas internos siguen dentro de la escena correspondiente.
export const GAMES = {
  fruit: {
    title: 'Rebanar fruta', symbol: '✦',
    summary: 'Corta frutas con uno o dos índices. Suma puntos antes de que termine el tiempo.',
    callToAction: 'Jugar fruta →',
    controls: {
      mouse: 'Arrastra el mouse a través de las frutas para cortarlas.',
      keyboard: 'Mueve el círculo con flechas o WASD. Mantén Espacio para cortar al moverte.',
      camera: 'Mueve uno o ambos índices a través de las frutas. Cada mano corta por separado.',
    },
    intro: { title: 'Corta las frutas', text: 'Tienes 45 segundos. Cada fruta suma 10 puntos. Tras 20 segundos empieza el nivel 2.' },
    hud: { label: 'Puntos', unit: '', initial: 0, countdown: 45, extraLabel: 'Nivel', extra: 1 },
    records: { key: 'pulso-pixel-fruta-records-v1', field: 'score', includeZero: false },
    recordsTitle: 'Mejores puntuaciones',
    formatScore: (value: number) => String(value),
    formatRecord: (value: number) => `${value} puntos`,
    endTitle: () => 'Partida terminada',
    endText: (value: number) => `Conseguiste ${value} puntos.`,
    rankText: '¡Entraste en las mejores puntuaciones!',
    savedText: (value: number) => `Puntuación registrada: ${value} puntos.`,
  },
  ship: {
    title: 'Nave espacial', symbol: '◆',
    summary: 'Esquiva meteoritos. Cada segundo que sobrevives cuenta.',
    callToAction: 'Jugar nave →',
    controls: {
      keyboard: 'Mueve la nave con A/D o las flechas. Evita los meteoritos: el primer choque termina la partida.',
      camera: 'Mueve una mano de izquierda a derecha para esquivar meteoritos. El primer choque termina la partida.',
    },
    intro: { title: 'Sobrevive', text: 'Esquiva meteoritos hasta el primer choque. Cada vez caen más y más rápido; tu tiempo es la puntuación.' },
    hud: { label: 'Tiempo', unit: 's', initial: 0 },
    records: { key: 'pulso-pixel-nave-tiempo-records-v1', field: 'timeMs', includeZero: true },
    recordsTitle: 'Mejores tiempos',
    formatScore: formatSurvivalTime,
    formatRecord: (value: number) => formatSurvivalTime(value),
    endTitle: () => '¡Choque!',
    endText: (value: number) => `Sobreviviste ${formatSurvivalTime(value)} s.`,
    rankText: '¡Entraste en los mejores tiempos!',
    savedText: (value: number) => `Tiempo registrado: ${formatSurvivalTime(value)} s.`,
  },
  platform: {
    title: 'Plataformas', symbol: '▣',
    summary: 'Avanza automáticamente. Salta huecos y obstáculos sin chocar.',
    callToAction: 'Jugar plataformas →',
    controls: {
      keyboard: 'El personaje avanza solo. Pulsa Espacio, W o flecha arriba para saltar.',
      camera: 'El personaje avanza solo. Separa pulgar e índice; júntalos para saltar. Ábrelos antes del siguiente salto. Espacio también funciona.',
    },
    intro: { title: 'Salta a tiempo', text: 'El personaje corre solo. Salta obstáculos y huecos; el primer choque termina el intento. La puntuación es el porcentaje recorrido.' },
    hud: { label: 'Progreso', unit: '%', initial: 0 },
    records: { key: 'pulso-pixel-plataformas-records-v2', field: 'score', includeZero: false },
    recordsTitle: 'Mejores recorridos',
    formatScore: (value: number) => String(value),
    formatRecord: (value: number) => `${value}%`,
    endTitle: (won: boolean) => won ? '¡Meta!' : '¡Choque!',
    endText: (value: number) => `Llegaste al ${value}% del recorrido.`,
    rankText: '¡Entraste en los mejores recorridos!',
    savedText: (value: number) => `Puntuación registrada: ${value}% recorrido.`,
  },
} satisfies Record<string, GameDefinition>;

export type GameId = keyof typeof GAMES;
export const GAME_ORDER = Object.keys(GAMES) as GameId[];
