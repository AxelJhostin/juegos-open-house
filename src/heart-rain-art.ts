type Point = { x: number; y: number };
type Heart = {
  x: number; y: number; vx: number; vy: number; size: number;
  angle: number; spin: number; phase: number; alpha: number; shade: number; burst: boolean;
};

const PINKS = ['#ff4eaa', '#ff80c4', '#ffb2dc', '#e94b96', '#ffd8ed'];

export class HeartRainEffect {
  private hearts: Heart[] = [];
  private sprites: HTMLCanvasElement[] | null = null;
  private active = false;
  private spawnCarry = 0;
  private glow = 0;

  reset(): void {
    this.hearts = [];
    this.active = false;
    this.spawnCarry = 0;
    this.glow = 0;
  }

  draw(ctx: CanvasRenderingContext2D, active: boolean, anchor: Point | null,
    dtMs: number, now: number, reduceMotion: boolean): void {
    const width = ctx.canvas.width, height = ctx.canvas.height;
    const dt = Math.min(50, Math.max(0, dtMs)) / 1000;
    if (active && !this.active && anchor) {
      const count = reduceMotion ? 9 : 28;
      for (let i = 0; i < count; i++) {
        const angle = Math.PI * 2 * i / count + Math.random() * 0.25;
        const speed = height * (0.16 + Math.random() * 0.35);
        this.hearts.push(this.makeHeart(anchor.x, anchor.y, Math.cos(angle) * speed,
          Math.sin(angle) * speed - height * 0.2, width, true));
      }
    }
    this.active = active;
    this.glow += ((active ? 1 : 0) - this.glow) * Math.min(1, dt * 6);
    if (active) {
      this.spawnCarry += dt * (reduceMotion ? 14 : 50);
      while (this.spawnCarry >= 1 && this.hearts.length < 100) {
        this.spawnCarry--;
        const x = Math.random() * width;
        const size = width * (0.014 + Math.random() * 0.027);
        this.hearts.push(this.makeHeart(x, -size * 2, (Math.random() - 0.5) * width * 0.06,
          height * (0.24 + Math.random() * 0.28), width, false));
      }
    } else this.spawnCarry = 0;

    const sprites = this.sprites ?? (this.sprites = PINKS.map((color) => this.makeSprite(color)));
    const live: Heart[] = [];
    for (const heart of this.hearts) {
      heart.x += (heart.vx + Math.sin(now * 0.0018 + heart.phase) * width * 0.018) * dt;
      heart.y += heart.vy * dt;
      heart.vy += height * (heart.burst ? 0.55 : 0.08) * dt;
      heart.angle += heart.spin * dt;
      if (!active) heart.alpha = Math.max(0, heart.alpha - dt * 1.25);
      if (heart.alpha <= 0 || heart.y > height + heart.size * 2) continue;
      live.push(heart);
      ctx.save();
      ctx.translate(heart.x, heart.y);
      ctx.rotate(heart.angle + Math.sin(now * 0.002 + heart.phase) * 0.12);
      ctx.globalAlpha = heart.alpha;
      const diameter = heart.size * (128 / 72);
      ctx.drawImage(sprites[heart.shade], -diameter / 2, -diameter / 2, diameter, diameter);
      ctx.restore();
    }
    this.hearts = live;

    if (anchor && this.glow > 0.01) {
      ctx.save();
      ctx.translate(anchor.x, anchor.y - height * 0.035);
      ctx.globalAlpha = this.glow;
      const pulse = 1 + Math.sin(now * 0.006) * 0.07;
      const radius = width * 0.062 * pulse;
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 2.3);
      halo.addColorStop(0, '#ff9acf70');
      halo.addColorStop(1, '#ff9acf00');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, radius * 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = '#ff78b9';
      ctx.shadowBlur = radius * 0.6;
      this.heart(ctx, radius * 1.1, '#ff5ba9');
      ctx.restore();
    }
  }

  private makeHeart(x: number, y: number, vx: number, vy: number, width: number, burst: boolean): Heart {
    return {
      x, y, vx, vy,
      size: width * (burst ? 0.012 + Math.random() * 0.024 : 0.014 + Math.random() * 0.027),
      angle: (Math.random() - 0.5) * 0.7,
      spin: (Math.random() - 0.5) * 2.4,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.7 + Math.random() * 0.3,
      shade: Math.floor(Math.random() * PINKS.length),
      burst,
    };
  }

  private makeSprite(color: string): HTMLCanvasElement {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 128;
    const context = sprite.getContext('2d');
    if (context) {
      context.translate(64, 64);
      context.shadowColor = '#ff5caa';
      context.shadowBlur = 18;
      this.heart(context, 72, color);
    }
    return sprite;
  }

  private heart(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#8f245a';
    ctx.lineWidth = Math.max(1, size * 0.07);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.43);
    ctx.bezierCurveTo(-size * 0.34, size * 0.12, -size * 0.58, -size * 0.14, -size * 0.38, -size * 0.38);
    ctx.bezierCurveTo(-size * 0.19, -size * 0.6, 0, -size * 0.37, 0, -size * 0.28);
    ctx.bezierCurveTo(0, -size * 0.37, size * 0.19, -size * 0.6, size * 0.38, -size * 0.38);
    ctx.bezierCurveTo(size * 0.58, -size * 0.14, size * 0.34, size * 0.12, 0, size * 0.43);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffffa8';
    ctx.beginPath();
    ctx.ellipse(-size * 0.2, -size * 0.29, size * 0.11, size * 0.055, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
