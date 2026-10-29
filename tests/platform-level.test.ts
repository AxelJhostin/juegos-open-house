import test from 'node:test';
import assert from 'node:assert/strict';
import { PLATFORM_BEAT_DISTANCE, PLATFORM_JUMP_CUES, PLATFORM_LEVEL, PLATFORM_SPEED, cueX } from '../src/platform-level.ts';

// Reproduce la física del bloque con un salto en cada marca, a distintas tasas de fotogramas.
function clearCourse(fps: number, timingOffsetSeconds: number): boolean {
  const dt = 1 / fps;
  const targets = PLATFORM_JUMP_CUES.map((cue) => cueX(cue.beat) + PLATFORM_SPEED * timingOffsetSeconds);
  let x = 70;
  let y = 0; // Distancia vertical desde el suelo.
  let vy = 0;
  let grounded = true;
  let coyote = 0.1;
  let nextCue = 0;
  for (let frame = 0; frame < fps * 35; frame++) {
    const previousX = x;
    x = Math.min(PLATFORM_LEVEL.worldWidth - 70, x + PLATFORM_SPEED * dt);
    coyote = Math.max(0, coyote - dt);
    if (nextCue < targets.length && previousX < targets[nextCue] && x >= targets[nextCue]) {
      if (coyote <= 0) return false;
      vy = -680;
      grounded = false;
      coyote = 0;
      nextCue++;
    }
    const previousY = y;
    if (!grounded) {
      vy += 1800 * (vy > 0 ? 1.4 : 1) * dt;
      y += vy * dt;
    }
    const touching = PLATFORM_LEVEL.platforms.filter((platform) => x + 18 > platform.from && x - 18 < platform.to);
    if (touching.some((platform) => platform.from > 0 && previousX + 18 <= platform.from && y > -platform.height + 2)) return false;
    const landing = vy >= 0 ? touching
      .filter((platform) => previousY <= -platform.height && y >= -platform.height)
      .sort((a, b) => b.height - a.height)[0] : undefined;
    if (landing) {
      y = -landing.height;
      vy = 0;
      grounded = true;
    } else if (grounded && !touching.some((platform) => Math.abs(y + platform.height) < 2)) grounded = false;
    if (grounded) coyote = 0.1;
    if (y > 169 ||
      PLATFORM_LEVEL.gaps.some((gap) => x > gap.from && x < gap.to && y > 48) ||
      PLATFORM_LEVEL.spikes.some((spike) => y > -spike.height - 32 && Math.abs(x - spike.x) < 32)) return false;
    if (x >= PLATFORM_LEVEL.worldWidth - 70) return nextCue === targets.length;
  }
  return false;
}

test('cada marca de salto cae en el pulso musical y el recorrido cambia de ritmo', () => {
  assert.equal(PLATFORM_BEAT_DISTANCE, PLATFORM_SPEED * 60 / 128);
  assert.ok(PLATFORM_JUMP_CUES.some((cue) => cue.kind === 'gap'));
  assert.ok(PLATFORM_JUMP_CUES.some((cue) => cue.kind === 'double'));
  assert.ok(PLATFORM_JUMP_CUES.some((cue) => cue.kind === 'step'));
  assert.ok(new Set(PLATFORM_LEVEL.platforms.map((platform) => platform.height)).size >= 4);
  assert.ok(PLATFORM_JUMP_CUES.some((cue, index) => index > 0 && cue.beat - PLATFORM_JUMP_CUES[index - 1].beat === 2));
});

test('el recorrido se puede completar siguiendo las marcas, incluso con un pequeño desfase', () => {
  for (const fps of [20, 30, 60, 120]) {
    for (const offset of [-0.08, 0, 0.08]) {
      assert.ok(clearCourse(fps, offset), `El salto falla a ${fps} FPS con ${offset} s de desfase`);
    }
  }
});
