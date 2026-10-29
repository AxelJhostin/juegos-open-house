// Una pulsación musical equivale exactamente al espacio recorrido en un beat.
export const PLATFORM_BPM = 128;
export const PLATFORM_SPEED = 240;
export const PLATFORM_BEAT_SECONDS = 60 / PLATFORM_BPM;
export const PLATFORM_BEAT_DISTANCE = PLATFORM_SPEED * PLATFORM_BEAT_SECONDS;
const START_X = 70;

type JumpCue = { beat: number; kind: 'spike' | 'double' | 'gap' | 'step'; nextHeight?: number };

// Cada salto tiene una tarea: esquivar, cruzar o subir a una columna.
export const PLATFORM_JUMP_CUES: readonly JumpCue[] = [
  { beat: 4, kind: 'step', nextHeight: 45 }, { beat: 6, kind: 'spike' },
  { beat: 8, kind: 'gap', nextHeight: 70 },
  { beat: 12, kind: 'double' }, { beat: 16, kind: 'gap', nextHeight: 75 },
  { beat: 20, kind: 'step', nextHeight: 115 }, { beat: 24, kind: 'double' },
  { beat: 28, kind: 'gap', nextHeight: 20 }, { beat: 32, kind: 'step', nextHeight: 65 },
  { beat: 34, kind: 'double' }, { beat: 36, kind: 'step', nextHeight: 90 },
  { beat: 38, kind: 'gap', nextHeight: 105 },
  { beat: 42, kind: 'double' }, { beat: 46, kind: 'gap', nextHeight: 45 },
  { beat: 50, kind: 'step', nextHeight: 85 }, { beat: 52, kind: 'double' },
  { beat: 54, kind: 'step', nextHeight: 115 }, { beat: 56, kind: 'gap', nextHeight: 0 },
  { beat: 58, kind: 'spike' }, { beat: 60, kind: 'double' },
];

export const cueX = (beat: number): number => START_X + beat * PLATFORM_BEAT_DISTANCE;

export type PlatformSegment = { from: number; to: number; height: number };
const platforms: PlatformSegment[] = [];
const gaps: { from: number; to: number }[] = [];
let from = 0;
let height = 0;
for (const cue of PLATFORM_JUMP_CUES) {
  if (cue.kind === 'gap') {
    const gapStart = cueX(cue.beat) + 20;
    const gapEnd = cueX(cue.beat) + 128;
    platforms.push({ from, to: gapStart, height });
    gaps.push({ from: gapStart, to: gapEnd });
    from = gapEnd;
    height = cue.nextHeight ?? height;
  } else if (cue.kind === 'step') {
    const stepStart = cueX(cue.beat) + 65;
    platforms.push({ from, to: stepStart, height });
    from = stepStart;
    height = cue.nextHeight ?? height;
  }
}
const worldWidth = cueX(64) + 70;
platforms.push({ from, to: worldWidth, height });

export function platformHeightAt(x: number): number | null {
  return platforms.find((platform) => x >= platform.from && x < platform.to)?.height ?? null;
}

export const PLATFORM_LEVEL = {
  worldWidth,
  platforms,
  gaps,
  spikes: PLATFORM_JUMP_CUES.flatMap((cue) => {
    if (cue.kind === 'gap' || cue.kind === 'step') return [];
    const first = cueX(cue.beat) + 65;
    return (cue.kind === 'double' ? [first, first + 28] : [first])
      .map((x) => ({ x, height: platformHeightAt(x) ?? 0 }));
  }),
  cues: PLATFORM_JUMP_CUES.map((cue) => ({ ...cue, x: cueX(cue.beat) })),
} as const;
