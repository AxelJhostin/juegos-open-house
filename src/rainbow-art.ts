import type { RainbowSample, RainbowPose } from './rainbow-gesture';

const BANDS = ['#ff6480', '#ffad58', '#ffe67a', '#7fe397', '#5fe1dc', '#79aaf7', '#c49bfa'] as const;
const TAU = Math.PI * 2;

function star(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number): void {
  if (alpha <= 0 || size <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = '#fffbe7';
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.16, y - size * 0.16, x + size, y);
  ctx.quadraticCurveTo(x + size * 0.16, y + size * 0.16, x, y + size);
  ctx.quadraticCurveTo(x - size * 0.16, y + size * 0.16, x - size, y);
  ctx.quadraticCurveTo(x - size * 0.16, y - size * 0.16, x, y - size);
  ctx.fill();
  ctx.restore();
}

export class RainbowArcEffect {
  private pose: RainbowPose | null = null;
  private opacity = 0;
  private reveal = 0;
  private activeSince = -1;
  private wasActive = false;

  reset(): void {
    this.pose = null;
    this.opacity = 0;
    this.reveal = 0;
    this.activeSince = -1;
    this.wasActive = false;
  }

  draw(ctx: CanvasRenderingContext2D, sample: RainbowSample, dtMs: number, now: number, reduceMotion: boolean): void {
    const dt = Math.max(0, Math.min(50, dtMs));
    const showing = sample.state === 'opening' || sample.state === 'active';
    const active = sample.state === 'active';
    if (active && !this.wasActive) this.activeSince = now;
    this.wasActive = active;
    const follow = 1 - Math.exp(-dt / 65);
    if (sample.pose) {
      if (!this.pose || this.opacity < 0.02) this.pose = { ...sample.pose, left: { ...sample.pose.left }, right: { ...sample.pose.right } };
      else {
        this.pose.left.x += (sample.pose.left.x - this.pose.left.x) * follow;
        this.pose.left.y += (sample.pose.left.y - this.pose.left.y) * follow;
        this.pose.right.x += (sample.pose.right.x - this.pose.right.x) * follow;
        this.pose.right.y += (sample.pose.right.y - this.pose.right.y) * follow;
      }
    }
    this.opacity += ((showing ? 1 : 0) - this.opacity) * (1 - Math.exp(-dt / (reduceMotion ? 90 : showing ? 115 : 310)));
    this.reveal += ((showing ? Math.max(0.08, sample.progress) : 0) - this.reveal) *
      (1 - Math.exp(-dt / (reduceMotion ? 70 : showing ? 125 : 225)));
    if (!this.pose) return;

    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    // El video está reflejado; invertimos las anclas para que el arco toque ambas manos visibles.
    const leftX = (1 - this.pose.right.x) * width;
    const rightX = (1 - this.pose.left.x) * width;
    const span = rightX - leftX;
    if (span < width * 0.08) return;
    const leftY = Math.max(height * 0.09, this.pose.right.y * height - height * 0.035);
    const rightY = Math.max(height * 0.09, this.pose.left.y * height - height * 0.035);
    const scale = Math.min(width / 640, height / 480);
    if (sample.state === 'ready' && !reduceMotion) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.012);
      const x = (leftX + rightX) / 2;
      const y = (leftY + rightY) / 2 - 7 * scale;
      ctx.save();
      ctx.fillStyle = `rgba(255, 240, 174, ${0.11 + pulse * 0.08})`;
      ctx.beginPath(); ctx.arc(x, y, (24 + pulse * 8) * scale, 0, TAU); ctx.fill();
      star(ctx, x, y, (9 + pulse * 4) * scale, 0.7 + pulse * 0.3);
      ctx.restore();
    }
    if (this.opacity < 0.015 || this.reveal < 0.01) return;
    const lift = Math.max(height * 0.07, Math.min(height * 0.32, span * 0.47,
      Math.min(leftY, rightY) - height * 0.04));
    const breath = reduceMotion ? 0 : Math.sin(now * 0.0023) * 2.3 * scale;
    const bandWidth = Math.max(36, Math.min(74, height * 0.14));
    const stripe = bandWidth / BANDS.length;
    const curve = (index: number): void => {
      const inset = index * stripe * 0.78;
      const bandLeft = leftX + inset;
      const bandRight = rightX - inset;
      const bandSpan = bandRight - bandLeft;
      const bandLift = lift + breath - index * stripe * 1.18;
      ctx.beginPath();
      ctx.moveTo(bandLeft, leftY);
      ctx.bezierCurveTo(bandLeft + bandSpan * 0.22, leftY - bandLift * 1.34,
        bandRight - bandSpan * 0.22, rightY - bandLift * 1.34, bandRight, rightY);
    };
    const pointOnBand = (index: number, t: number): { x: number; y: number } => {
      const inset = index * stripe * 0.78;
      const bandLeft = leftX + inset;
      const bandRight = rightX - inset;
      const bandSpan = bandRight - bandLeft;
      const bandLift = lift + breath - index * stripe * 1.18;
      const inv = 1 - t;
      return {
        x: inv ** 3 * bandLeft + 3 * inv ** 2 * t * (bandLeft + bandSpan * 0.22) +
          3 * inv * t ** 2 * (bandRight - bandSpan * 0.22) + t ** 3 * bandRight,
        y: inv ** 3 * leftY + 3 * inv ** 2 * t * (leftY - bandLift * 1.34) +
          3 * inv * t ** 2 * (rightY - bandLift * 1.34) + t ** 3 * rightY,
      };
    };

    ctx.save();
    ctx.globalAlpha = this.opacity;
    const centerX = (leftX + rightX) / 2;
    const easedReveal = 1 - (1 - Math.min(1, this.reveal)) ** 2;
    const halfReveal = span * easedReveal / 2 + bandWidth * 0.5;
    ctx.beginPath();
    ctx.rect(centerX - halfReveal, 0, halfReveal * 2, height);
    ctx.clip();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    curve(0);
    ctx.strokeStyle = '#e2e0ff22';
    ctx.lineWidth = stripe + 31 * scale;
    ctx.stroke();
    curve(0);
    ctx.strokeStyle = '#fff4dd55';
    ctx.lineWidth = stripe + 17 * scale;
    ctx.stroke();
    curve(0);
    ctx.strokeStyle = '#17335baa';
    ctx.lineWidth = stripe + 6 * scale;
    ctx.stroke();
    curve(BANDS.length - 1);
    ctx.strokeStyle = '#17335b88';
    ctx.lineWidth = stripe + 6 * scale;
    ctx.stroke();
    for (let index = 0; index < BANDS.length; index++) {
      curve(index);
      ctx.strokeStyle = BANDS[index];
      ctx.lineWidth = stripe + 2 * scale;
      ctx.stroke();
    }
    curve(0);
    ctx.strokeStyle = '#fff8de77';
    ctx.lineWidth = Math.max(1, 1.8 * scale);
    ctx.stroke();

    if (!reduceMotion) {
      // Pocos destellos móviles, sin filtros de desenfoque que reduzcan los FPS.
      for (let index = 0; index < 13; index++) {
        const t = ((index * 0.173 + now * 0.000055) % 0.84) + 0.08;
        const p = pointOnBand(index % BANDS.length, t);
        const pulse = Math.max(0, Math.sin(now * 0.006 + index * 2.35));
        star(ctx, p.x, p.y - stripe * 0.28, (1.6 + pulse * 3.7) * scale, 0.25 + pulse * 0.7);
      }
      // Dos reflejos viajan por colores distintos y dibujan una estela corta.
      for (let index = 0; index < 2; index++) {
        const band = index === 0 ? 1 : 5;
        const head = ((now * 0.00019 + index * 0.53) % 1.18) - 0.09;
        ctx.beginPath();
        let started = false;
        for (let step = 0; step <= 7; step++) {
          const t = head - 0.10 + step * 0.10 / 7;
          if (t < 0.04 || t > 0.96) continue;
          const p = pointOnBand(band, t);
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        }
        if (started) {
          ctx.strokeStyle = '#fffef5aa';
          ctx.lineWidth = Math.max(1.5, stripe * 0.24);
          ctx.stroke();
        }
        if (head > 0.04 && head < 0.96) {
          const p = pointOnBand(band, head);
          star(ctx, p.x, p.y, 5.5 * scale, 0.85);
        }
      }
      for (let index = 0; index < 10; index++) {
        const t = (index + 0.6) / 11;
        const p = pointOnBand(6, t);
        const phase = (now * 0.0004 + index * 0.31) % 1;
        const spread = 12 + (index % 3) * 12;
        const x = p.x + Math.sin(index * 4.1) * spread * scale;
        const y = p.y + (15 + phase * 26) * scale;
        ctx.fillStyle = `rgba(255, 244, 220, ${0.1 + Math.sin(phase * Math.PI) * 0.36})`;
        ctx.beginPath(); ctx.arc(x, y, (1.1 + (index % 3) * 0.6) * scale, 0, TAU); ctx.fill();
      }
      const burst = this.activeSince < 0 ? 0 : Math.max(0, 1 - (now - this.activeSince) / 620);
      if (burst > 0) {
        for (let index = 0; index < 9; index++) {
          const t = (index + 1) / 10;
          const p = pointOnBand(index % BANDS.length, t);
          const drift = (1 - burst) * (14 + index % 3 * 6) * scale;
          star(ctx, p.x + Math.sin(index * 2.4) * drift,
            p.y - 12 * scale - (1 - burst) * 18 * scale,
            (3 + burst * 8) * scale, burst * 0.9);
        }
      }
      for (const [index, x, y] of [[0, leftX, leftY], [1, rightX, rightY]] as const) {
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.008 + index * Math.PI);
        ctx.fillStyle = `rgba(255, 244, 185, ${0.1 + pulse * 0.11})`;
        ctx.beginPath(); ctx.arc(x, y, (18 + pulse * 8) * scale, 0, TAU); ctx.fill();
        star(ctx, x, y, (5 + pulse * 3) * scale, 0.45 + pulse * 0.4);
      }
    }
    ctx.restore();
  }
}
