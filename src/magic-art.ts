export type MagicSeal = { x: number; y: number; radius: number; charge: number; burst: number };

const TAU = Math.PI * 2;

export function drawMagicSeal(context: CanvasRenderingContext2D, seal: MagicSeal, time: number): void {
  const { x, y, charge, burst } = seal;
  if (charge < 0.01) return;
  const radius = seal.radius * (0.48 + charge * 0.52) * (1 + 0.018 * Math.sin(time * 0.005));
  const spin = time * 0.00065;
  context.save();
  context.globalCompositeOperation = 'screen';

  const glow = context.createRadialGradient(x, y, radius * 0.08, x, y, radius * 1.55);
  glow.addColorStop(0, `rgba(255, 222, 161, ${charge * 0.42})`);
  glow.addColorStop(0.32, `rgba(169, 96, 245, ${charge * 0.38})`);
  glow.addColorStop(1, 'rgba(95, 41, 191, 0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(x, y, radius * 1.55, 0, TAU);
  context.fill();

  for (const [scale, width, color] of [
    [1.02, 0.045, `rgba(235, 196, 255, ${charge * 0.9})`],
    [0.86, 0.018, `rgba(255, 217, 142, ${charge * 0.76})`],
    [0.58, 0.024, `rgba(168, 239, 255, ${charge * 0.8})`],
  ] as const) {
    context.beginPath();
    context.arc(x, y, radius * scale, 0, TAU);
    context.strokeStyle = color;
    context.lineWidth = Math.max(1.5, radius * width);
    context.stroke();
  }

  // Marcas de un alfabeto geométrico propio, en dos ruedas que giran en sentidos opuestos.
  for (let tick = 0; tick < 28; tick++) {
    const angle = tick * TAU / 28 + spin;
    const inner = radius * (tick % 7 === 0 ? 0.89 : 0.94);
    const outer = radius * (tick % 7 === 0 ? 1.17 : 1.08);
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    context.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    context.strokeStyle = tick % 7 === 0 ? `rgba(255, 222, 150, ${charge})` : `rgba(196, 151, 255, ${charge * 0.72})`;
    context.lineWidth = tick % 7 === 0 ? 3 : 1.4;
    context.stroke();
  }

  for (let glyph = 0; glyph < 7; glyph++) {
    const angle = glyph * TAU / 7 - spin * 0.8;
    const gx = x + Math.cos(angle) * radius * 0.72;
    const gy = y + Math.sin(angle) * radius * 0.72;
    const size = radius * 0.085;
    context.beginPath();
    context.moveTo(gx, gy - size);
    context.lineTo(gx + size * 0.72, gy);
    context.lineTo(gx, gy + size);
    context.lineTo(gx - size * 0.72, gy);
    context.closePath();
    context.strokeStyle = `rgba(247, 218, 159, ${charge * 0.9})`;
    context.lineWidth = 1.7;
    context.stroke();
  }

  context.save();
  context.translate(x, y);
  context.rotate(-spin * 1.3);
  context.beginPath();
  for (let vertex = 0; vertex < 12; vertex++) {
    const angle = vertex * TAU / 12 - Math.PI / 2;
    const size = radius * (vertex % 2 === 0 ? 0.49 : 0.26);
    const px = Math.cos(angle) * size;
    const py = Math.sin(angle) * size;
    if (vertex === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.strokeStyle = `rgba(236, 205, 255, ${charge * 0.9})`;
  context.lineWidth = Math.max(2, radius * 0.027);
  context.stroke();
  context.restore();

  context.beginPath();
  context.arc(x, y, Math.max(3, radius * 0.075), 0, TAU);
  context.fillStyle = `rgba(255, 245, 207, ${charge})`;
  context.fill();

  for (let spark = 0; spark < 12; spark++) {
    const angle = spark * 2.4 + spin * (spark % 2 ? -1.8 : 2);
    const orbit = radius * (1.19 + (spark % 4) * 0.12);
    context.beginPath();
    context.arc(x + Math.cos(angle) * orbit, y + Math.sin(angle) * orbit,
      Math.max(1.3, radius * (spark % 3 === 0 ? 0.034 : 0.02)), 0, TAU);
    context.fillStyle = `rgba(250, 215, 173, ${charge * (0.35 + 0.45 * Math.sin(angle + spark) ** 2)})`;
    context.fill();
  }

  if (burst > 0.01) {
    context.beginPath();
    context.arc(x, y, radius * (1.04 + (1 - burst) * 0.65), 0, TAU);
    context.strokeStyle = `rgba(255, 233, 178, ${burst * 0.78})`;
    context.lineWidth = Math.max(2, radius * burst * 0.07);
    context.stroke();
  }
  context.restore();
}
