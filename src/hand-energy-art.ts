export type EnergyOrb = { x: number; y: number; radius: number; charge: number; burst: number; closing: number };

const TAU = Math.PI * 2;

export function drawEnergyOrb(context: CanvasRenderingContext2D, orb: EnergyOrb, time: number): void {
  const { x, y, charge, burst, closing } = orb;
  if (charge < 0.01) return;
  const collapse = closing > 0 ? 1 - 0.72 * closing : 1;
  const radius = orb.radius * (0.48 + 0.52 * charge) * collapse * (1 + 0.018 * Math.sin(time * 0.005));
  const rotation = time * 0.00135;
  context.save();
  context.globalCompositeOperation = 'screen';

  const aura = context.createRadialGradient(x, y, radius * 0.1, x, y, radius * 2.2);
  aura.addColorStop(0, `rgba(201, 251, 255, ${0.38 * charge})`);
  aura.addColorStop(0.36, `rgba(37, 184, 255, ${0.32 * charge})`);
  aura.addColorStop(0.72, `rgba(16, 106, 239, ${0.14 * charge})`);
  aura.addColorStop(1, 'rgba(20, 102, 239, 0)');
  context.fillStyle = aura;
  context.beginPath();
  context.arc(x, y, radius * 2.2, 0, TAU);
  context.fill();

  const core = context.createRadialGradient(x - radius * 0.18, y - radius * 0.2, radius * 0.03, x, y, radius);
  core.addColorStop(0, `rgba(255, 255, 255, ${0.98 * charge})`);
  core.addColorStop(0.18, `rgba(203, 253, 255, ${0.95 * charge})`);
  core.addColorStop(0.48, `rgba(72, 212, 255, ${0.82 * charge})`);
  core.addColorStop(0.78, `rgba(12, 105, 222, ${0.68 * charge})`);
  core.addColorStop(1, `rgba(13, 59, 165, ${0.05 * charge})`);
  context.fillStyle = core;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();

  context.save();
  context.beginPath();
  context.arc(x, y, radius * 0.97, 0, TAU);
  context.clip();
  for (let arm = 0; arm < 4; arm++) {
    context.beginPath();
    for (let step = 0; step <= 24; step++) {
      const progress = step / 24;
      const distance = radius * (0.08 + progress * 0.9);
      const angle = rotation * 1.6 + arm * TAU / 4 + progress * 2.7;
      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      if (step === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.strokeStyle = `rgba(105, 234, 255, ${0.26 * charge})`;
    context.lineWidth = Math.max(3, radius * 0.11);
    context.stroke();
    context.strokeStyle = `rgba(235, 255, 255, ${0.68 * charge})`;
    context.lineWidth = Math.max(1.3, radius * 0.023);
    context.stroke();
  }
  for (let band = 0; band < 6; band++) {
    const bandRadius = radius * (0.19 + band * 0.13);
    context.strokeStyle = band % 2 ? `rgba(242, 255, 255, ${0.4 * charge})` : `rgba(56, 215, 255, ${0.61 * charge})`;
    context.lineWidth = Math.max(1.5, radius * (0.055 - band * 0.005));
    context.lineCap = 'round';
    for (let arc = 0; arc < 3; arc++) {
      const start = rotation * (band % 2 ? -1.25 : 1) + arc * TAU / 3 + band * 0.65;
      context.beginPath();
      context.arc(x, y, bandRadius, start, start + 0.7 + 0.25 * Math.sin(rotation * 1.5 + band));
      context.stroke();
    }
  }
  context.restore();

  for (let ring = 0; ring < 4; ring++) {
    context.beginPath();
    context.ellipse(x, y, radius * (1.05 + ring * 0.11), radius * (0.36 + ring * 0.09),
      rotation * (ring % 2 ? -0.8 : 1.1) + ring * 0.9, 0.12, TAU - 0.2);
    context.strokeStyle = `rgba(${ring === 1 ? '248, 255, 255' : '79, 211, 255'}, ${charge * (0.47 - ring * 0.08)})`;
    context.lineWidth = Math.max(1.2, radius * (0.031 - ring * 0.005));
    context.stroke();
  }

  // Chispas deterministas: movimiento fluido sin crear objetos ni números aleatorios por fotograma.
  for (let spark = 0; spark < 24; spark++) {
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

  // El cierre arrastra la energía hacia el centro y deja un último destello.
  if (closing > 0 && closing < 1) {
    const fade = 1 - closing;
    context.beginPath();
    context.arc(x, y, radius * (1.35 - closing * 0.65), 0, TAU);
    context.strokeStyle = `rgba(219, 252, 255, ${fade * charge * 0.8})`;
    context.lineWidth = Math.max(1.5, radius * 0.055);
    context.stroke();
    const glint = context.createRadialGradient(x, y, 0, x, y, radius * 0.38);
    glint.addColorStop(0, `rgba(255, 255, 255, ${fade * charge})`);
    glint.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = glint;
    context.beginPath();
    context.arc(x, y, radius * 0.38, 0, TAU);
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
