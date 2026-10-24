import assert from 'node:assert/strict';
import test from 'node:test';
import { cameraPointOnCanvas } from '../src/camera-coordinates.ts';

test('el dedo coincide con el canvas cuando la cámara llena el tablero', () => {
  const point = cameraPointOnCanvas(
    { x: 0.8, y: 0.25 },
    { width: 640, height: 480 },
    { left: 40, top: 100, width: 800, height: 600 },
    { left: 40, top: 100, width: 800, height: 600 },
    { width: 960, height: 720 },
  );
  assert.ok(Math.abs(point.x - 192) < 0.001);
  assert.equal(point.y, 180);
});

test('compensa las franjas y un canvas desplazado', () => {
  const point = cameraPointOnCanvas(
    { x: 0, y: 1 },
    { width: 640, height: 480 },
    { left: 20, top: 30, width: 960, height: 540 },
    { left: 10, top: 20, width: 1000, height: 600 },
    { width: 1000, height: 600 },
  );
  assert.deepEqual(point, { x: 850, y: 550 });
});
