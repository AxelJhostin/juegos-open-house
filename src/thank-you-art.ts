// El mensaje se dibuja sobre la cámara; no se captura ni almacena ninguna imagen.
export function drawThankYou(ctx: CanvasRenderingContext2D, alpha: number, now: number, reduced: boolean): void {
  if (alpha <= 0) return;
  const { width: w, height: h } = ctx.canvas;
  const t = reduced ? 0 : now / 1000;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(25, 10, 37, .56)';
  ctx.fillRect(0, 0, w, h);
  const gradient = ctx.createRadialGradient(w / 2, h * .44, 0, w / 2, h * .44, w * .48);
  gradient.addColorStop(0, 'rgba(255, 98, 166, .38)');
  gradient.addColorStop(1, 'rgba(255, 98, 166, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 20; i++) {
    const x = w * (.08 + ((i * 0.6180339) % .84));
    const y = h * (.10 + ((i * .381966 + t * .035 * (i % 2 ? 1 : -1) + 10) % .8));
    ctx.fillStyle = i % 3 === 0 ? '#ffe49e' : '#ffb8d8';
    ctx.globalAlpha = alpha * (.35 + .5 * (reduced ? .7 : (Math.sin(t * 2 + i) + 1) / 2));
    ctx.font = `${Math.max(12, h * (.025 + (i % 3) * .009))}px sans-serif`;
    ctx.fillText(i % 3 === 0 ? '✦' : '♥', x, y);
  }
  ctx.globalAlpha = alpha;
  ctx.shadowColor = '#ff66ad';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#ffd2e5';
  ctx.font = `bold ${Math.round(Math.min(w * .17, h * .22))}px sans-serif`;
  ctx.fillText('♥', w / 2, h * .31 + (reduced ? 0 : Math.sin(t * 2.4) * h * .008));
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#fff8ef';
  ctx.font = `900 ${Math.round(Math.min(w * .079, h * .10))}px sans-serif`;
  ctx.fillText('¡GRACIAS POR VENIR!', w / 2, h * .55, w * .9);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd5e6';
  ctx.font = `700 ${Math.round(Math.min(w * .026, h * .038))}px sans-serif`;
  ctx.fillText('PULSO PIXEL · OPEN HOUSE', w / 2, h * .65, w * .85);
  ctx.restore();
}
