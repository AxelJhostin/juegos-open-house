import type { Point } from './geometry';

function distance(a: Point, b: Point, width: number, height: number): number {
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
}

export function handPinchRatio(hand: ReadonlyArray<Point>, width: number, height: number): number | null {
  const thumb = hand[4];
  const index = hand[8];
  const indexBase = hand[5];
  const pinkyBase = hand[17];
  if (!thumb || !index || !indexBase || !pinkyBase) return null;
  const palmWidth = distance(indexBase, pinkyBase, width, height);
  return palmWidth > 1 ? distance(thumb, index, width, height) / palmWidth : null;
}

export class PinchJumpControl {
  private ready = false;

  get isReady(): boolean { return this.ready; }

  reset(): void { this.ready = false; }

  sample(ratio: number | null): { jump: boolean; ready: boolean } {
    if (ratio === null || !Number.isFinite(ratio)) {
      this.ready = false;
      return { jump: false, ready: false };
    }
    if (ratio >= 0.7) this.ready = true;
    if (this.ready && ratio <= 0.42) {
      this.ready = false;
      return { jump: true, ready: false };
    }
    return { jump: false, ready: this.ready };
  }
}

// Plataformas conserva la pinza mientras los dedos siguen juntos; la histéresis
// evita que un pequeño temblor del detector la suelte entre fotogramas.
export class HeldPinchJumpControl {
  private held = false;

  get isHeld(): boolean { return this.held; }

  reset(): void { this.held = false; }

  sample(ratio: number | null): { pressed: boolean; held: boolean } {
    if (ratio === null || !Number.isFinite(ratio)) this.held = false;
    else if (ratio <= 0.42) {
      const pressed = !this.held;
      this.held = true;
      return { pressed, held: true };
    } else if (ratio >= 0.7) this.held = false;
    return { pressed: false, held: this.held };
  }
}
