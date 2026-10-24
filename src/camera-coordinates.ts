import type { Point } from './geometry';

type Rect = { left: number; top: number; width: number; height: number };

export function cameraPointOnCanvas(
  sample: Point,
  videoSize: { width: number; height: number },
  videoRect: Rect,
  canvasRect: Rect,
  canvasSize: { width: number; height: number },
): Point {
  const fit = Math.min(videoRect.width / videoSize.width, videoRect.height / videoSize.height);
  const shownWidth = videoSize.width * fit;
  const shownHeight = videoSize.height * fit;
  const screenX = videoRect.left + (videoRect.width - shownWidth) / 2 + (1 - sample.x) * shownWidth;
  const screenY = videoRect.top + (videoRect.height - shownHeight) / 2 + sample.y * shownHeight;
  return {
    x: (screenX - canvasRect.left) / canvasRect.width * canvasSize.width,
    y: (screenY - canvasRect.top) / canvasRect.height * canvasSize.height,
  };
}
