export type EnergyOrb = { x: number; y: number; radius: number; charge: number; burst: number };

const TAU = Math.PI * 2;

export function drawEnergyOrb(context: CanvasRenderingContext2D, orb: EnergyOrb, time: number): void {
  const { x, y, charge, burst } = orb;
  if (charge < 0.01) return;
  const radius = orb.radius * (0.55 + 0.45 * charge) * (1 + 0.025 * Math.sin(time * 0.006));
  const rotation = time * 0.0018;
  context.save();
  context.globalCompositeOperation = 'screen';

  const aura = context.createRadialGradient(x, y, radius * 0.15, x, y, radius * 1.85);
  aura.addColorStop(0, `rgba(180, 244, 255, ${0.28 * charge})`);
  aura.addColorStop(0.42, `rgba(27, 165, 246, ${0.3 * charge})`);
  aura.addColorStop(1, 'rgba(20, 102, 239, 0)');
  context.fillStyle = aura;
  context.beginPath();
  context.arc(x, y, radius * 1.85, 0, TAU);
  context.fill();

  const core = context.createRadialGradient(x - radius * 0.24, y - radius * 0.28, 1, x, y, radius);
  core.addColorStop(0, `rgba(255, 255, 255, ${0.88 * charge})`);
  core.addColorStop(0.25, `rgba(168, 246, 255, ${0.89 * charge})`);
  core.addColorStop(0.62, `rgba(32, 177, 249, ${0.7 * charge})`);
  core.addColorStop(1, `rgba(25, 94, 219, ${0.09 * charge})`);
  context.fillStyle = core;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();

  context.save();
  context.beginPath();
  context.arc(x, y, radius * 0.97, 0, TAU);
  context.clip();
  for (let band = 0; band < 4; band++) {
    const bandRadius = radius * (0.35 + band * 0.17);
    context.strokeStyle = band % 2 ? `rgba(255, 255, 255, ${0.38 * charge})` : `rgba(87, 229, 255, ${0.55 * charge})`;
    context.lineWidth = Math.max(2, radius * (0.065 - band * 0.008));
    context.lineCap = 'round';
    for (let arc = 0; arc < 3; arc++) {
      const start = rotation * (band % 2 ? -1.4 : 1) + arc * TAU / 3 + band * 0.5;
      context.beginPath();
      context.arc(x, y, bandRadius, start, start + 0.9 + 0.18 * Math.sin(rotation + band));
      context.stroke();
    }
  }
  context.restore();

  for (let ring = 0; ring < 3; ring++) {
    context.beginPath();
    context.ellipse(x, y, radius * (1.02 + ring * 0.15), radius * (0.42 + ring * 0.08),
      rotation * (ring % 2 ? -0.9 : 1.2) + ring, 0.08, TAU - 0.14);
    context.strokeStyle = `rgba(${ring === 1 ? '248, 255, 255' : '79, 211, 255'}, ${charge * (0.4 - ring * 0.08)})`;
    context.lineWidth = Math.max(1.5, radius * (0.035 - ring * 0.006));
    context.stroke();
  }

  // Chispas deterministas: movimiento fluido sin crear objetos ni números aleatorios por fotograma.
  for (let spark = 0; spark < 19; spark++) {
    const phase = spark * 2.399 + rotation * (spark % 2 ? -1.6 : 1.3);
    const orbit = radius * (1.1 + (spark % 5) * 0.16 + 0.07 * Math.sin(rotation * 2 + spark));
    const sx = x + Math.cos(phase) * orbit;
    const sy = y + Math.sin(phase) * orbit * 0.7;
    const size = Math.max(1.3, radius * (spark % 4 === 0 ? 0.042 : 0.023));
    context.fillStyle = `rgba(212, 250, 255, ${charge * (0.4 + 0.45 * Math.sin(phase + spark) ** 2)})`;
    context.beginPath();
    context.arc(sx, sy, size, 0, TAU);
    context.fill();
  }

  if (burst > 0.01) {
    context.beginPath();
    context.arc(x, y, radius * (1.05 + (1 - burst) * 1.25), 0, TAU);
    context.strokeStyle = `rgba(222, 253, 255, ${burst * 0.8})`;
    context.lineWidth = Math.max(2, radius * 0.08 * burst);
    context.stroke();
  }
  context.restore();
}
