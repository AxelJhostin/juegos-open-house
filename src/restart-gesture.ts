import { assignHandSlots, type HandSlots } from './hand-slots.ts';
import type { HandSample } from './tracking';

const HOLD_MS = 900;
type SlotState = { armed: boolean; since: number | null };

export class RestartGesture {
  private previous: HandSlots = [null, null];
  private slots: [SlotState, SlotState] = [{ armed: false, since: null }, { armed: false, since: null }];

  reset(): void {
    this.previous = [null, null];
    this.slots = [{ armed: false, since: null }, { armed: false, since: null }];
  }

  sample(hands: HandSample[], now: number): { progress: number; restart: boolean } {
    const assigned = assignHandSlots(this.previous, hands) as [HandSample | null, HandSample | null];
    this.previous = assigned;
    let progress = 0;
    for (let index = 0; index < 2; index++) {
      const hand = assigned[index];
      const slot = this.slots[index];
      const ratio = hand?.pinchRatio;
      if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
        slot.armed = false;
        slot.since = null;
        continue;
      }
      if (ratio >= 0.7) {
        slot.armed = true;
        slot.since = null;
      } else if (slot.armed && ratio <= 0.42) {
        slot.since ??= now;
        progress = Math.max(progress, Math.min(1, (now - slot.since) / HOLD_MS));
      } else {
        slot.since = null;
      }
    }
    if (progress >= 1) {
      this.reset();
      return { progress: 1, restart: true };
    }
    return { progress, restart: false };
  }
}
