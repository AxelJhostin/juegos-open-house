export type GuardianSide = 'left' | 'right';
export type GuardianThreat = { side: GuardianSide; x: number };

export const GUARDIAN_CENTER_X = 480;
export const STRIKE_NEAR = 78;
export const STRIKE_FAR = 230;

export function strikeTarget<T extends GuardianThreat>(threats: readonly T[], side: GuardianSide): T | null {
  let target: T | null = null;
  let nearest = Infinity;
  for (const threat of threats) {
    if (threat.side !== side) continue;
    const distance = Math.abs(threat.x - GUARDIAN_CENTER_X);
    if (distance < STRIKE_NEAR || distance > STRIKE_FAR) continue;
    if (distance < nearest) {
      target = threat;
      nearest = distance;
    }
  }
  return target;
}
