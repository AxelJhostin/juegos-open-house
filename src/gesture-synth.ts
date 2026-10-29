import type { HandLandmarks } from './tracking';

export type ChordMode = 'mayor' | 'menor';
export type GestureSynthState = {
  degree: number;
  name: string;
  mode: ChordMode;
  quality: number;
  volume: number;
  color: number;
  notes: number[];
  hands: number;
};

const SCALE = [0, 2, 4, 5, 7, 9, 11];
const NAMES = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI'];
const C3 = 130.8128;
const FINGERS = [[8, 6], [12, 10], [16, 14], [20, 18]] as const;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function extended(hand: HandLandmarks[number], tip: number, joint: number): boolean {
  const wrist = hand[0];
  const palm = distance(hand[5], hand[17]);
  return distance(hand[tip], wrist) > distance(hand[joint], wrist) + palm * 0.1;
}

function thumbExtended(hand: HandLandmarks[number]): boolean {
  return distance(hand[4], hand[2]) > distance(hand[3], hand[2]) * 1.35;
}

export function fingerCount(hand: HandLandmarks[number]): number {
  if (hand.length < 21) return 0;
  return FINGERS.filter(([tip, joint]) => extended(hand, tip, joint)).length;
}

function chordDegree(hand: HandLandmarks[number]): number {
  if (hand.length < 21) return 0;
  const fingers = FINGERS.map(([tip, joint]) => extended(hand, tip, joint));
  const thumb = thumbExtended(hand);
  if (fingers[0] && fingers[3] && !fingers[1] && !fingers[2]) return thumb ? 7 : 6;
  return fingers.filter(Boolean).length + (thumb ? 1 : 0);
}

function tilt(hand: HandLandmarks[number]): number {
  const width = Math.max(0.01, distance(hand[5], hand[17]));
  return Math.max(-1, Math.min(1, (hand[0].x - hand[9].x) / width));
}

function frequency(root: number, semitones: number): number {
  return root * 2 ** (semitones / 12);
}

export function chordNotes(degree: number, mode: ChordMode, quality: number): number[] {
  if (degree < 1 || degree > 7 || quality < 1 || quality > 4) return [];
  const root = frequency(C3, SCALE[degree - 1]);
  const third = frequency(root, mode === 'mayor' ? 4 : 3);
  const fifth = frequency(root, quality === 4 && mode === 'menor' ? 6 : 7);
  if (quality === 1) return [root, fifth, root * 2, third * 2];
  if (quality === 2) return [third, fifth, root * 2, third * 2];
  if (quality === 3) return [root, third, fifth, frequency(root, mode === 'mayor' ? 11 : 10)];
  return [root, third, fifth, frequency(root, mode === 'mayor' ? 10 : 9)];
}

function selectHands(hands: HandLandmarks, labels: string[]): [HandLandmarks[number] | null, HandLandmarks[number] | null] {
  const leftIndex = labels.findIndex((label) => label === 'Left');
  const rightIndex = labels.findIndex((label) => label === 'Right');
  if (leftIndex >= 0 || rightIndex >= 0) {
    return [hands[leftIndex] ?? null, hands[rightIndex] ?? null];
  }
  if (hands.length >= 2) {
    const sorted = [...hands].sort((a, b) => b[0].x - a[0].x);
    return [sorted[0], sorted[1]];
  }
  if (hands.length === 1) return hands[0][0].x >= 0.5 ? [hands[0], null] : [null, hands[0]];
  return [null, null];
}

// Inspirado en la interacción de Gesture Synth: acorde con la izquierda,
// voz y expresión con la derecha. La estabilidad evita saltos por ruido de cámara.
export class GestureSynthMapper {
  private candidate = '';
  private candidateAt = 0;
  private stable: { degree: number; mode: ChordMode; quality: number } | null = null;
  private lastSeenAt = 0;

  reset(): void {
    this.candidate = '';
    this.candidateAt = 0;
    this.stable = null;
    this.lastSeenAt = 0;
  }

  sample(hands: HandLandmarks, labels: string[], now: number): GestureSynthState {
    const [left, right] = selectHands(hands, labels);
    const degree = left ? chordDegree(left) : 0;
    const quality = right ? fingerCount(right) : 0;
    const mode: ChordMode = left && tilt(left) < -0.25 ? 'menor' : 'mayor';
    const key = degree && quality ? `${degree}-${mode}-${quality}` : '';
    if (key) this.lastSeenAt = now;
    if (key !== this.candidate) {
      this.candidate = key;
      this.candidateAt = now;
    }
    if (key && now - this.candidateAt >= 110) this.stable = { degree, mode, quality };
    if (!key && now - this.lastSeenAt > 170) this.stable = null;

    const active = this.stable && (key || now - this.lastSeenAt <= 170) ? this.stable : null;
    const volume = right && active ? Math.max(0, Math.min(1, (0.9 - right[0].y) / 0.75)) : 0;
    const color = right ? tilt(right) : 0;
    return {
      degree: active?.degree ?? 0,
      name: active ? `${NAMES[active.degree - 1]} ${active.mode}` : '—',
      mode: active?.mode ?? 'mayor',
      quality: active?.quality ?? 0,
      volume,
      color,
      notes: active ? chordNotes(active.degree, active.mode, active.quality) : [],
      hands: hands.length,
    };
  }
}
