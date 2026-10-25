import { HandLandmarker } from '@mediapipe/tasks-vision';
import type { HandLandmarks } from './tracking';

const THUMB_TIP = 4;
const INDEX_TIP = 8;

export function drawHandLandmarks(canvas: HTMLCanvasElement, hands: HandLandmarks, clear = true): void {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = canvas;
  if (clear) context.clearRect(0, 0, width, height);

  const point = (landmark: { x: number; y: number }) => ({
    x: (1 - landmark.x) * width,
    y: landmark.y * height,
  });

  for (const hand of hands) {
    context.beginPath();
    for (const connection of HandLandmarker.HAND_CONNECTIONS) {
      const from = hand[connection.start];
      const to = hand[connection.end];
      if (!from || !to) continue;
      const start = point(from);
      const end = point(to);
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
    }
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = '#1e5a9c';
    context.lineWidth = 7;
    context.stroke();
    context.strokeStyle = '#eaf6ff';
    context.lineWidth = 3;
    context.stroke();

    hand.forEach((landmark, index) => {
      const { x, y } = point(landmark);
      const highlighted = index === THUMB_TIP || index === INDEX_TIP;
      context.beginPath();
      context.arc(x, y, highlighted ? 9 : 5, 0, Math.PI * 2);
      context.fillStyle = highlighted ? '#ffd27d' : '#3e8fd6';
      context.fill();
      context.strokeStyle = '#1e5a9c';
      context.lineWidth = 3;
      context.stroke();
    });
  }
}
