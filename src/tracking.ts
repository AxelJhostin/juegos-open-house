import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { handPinchRatio } from './pinch-jump';

export type HandSample = { x: number; y: number; pinchRatio: number | null };

type Callbacks = {
  onState(message: string, active: boolean): void;
  onPoints(points: HandSample[]): void;
  onStats(fps: number, durationMs: number): void;
};

export class HandTracker {
  private stream: MediaStream | null = null;
  private landmarker: HandLandmarker | null = null;
  private frameId = 0;
  private runId = 0;
  private active = false;
  private lastVideoTime = -1;
  private frameCount = 0;
  private rateStart = 0;

  constructor(private video: HTMLVideoElement, private callbacks: Callbacks) {}

  get isActive(): boolean { return this.active; }

  async start(): Promise<void> {
    if (this.active) return;
    this.active = true;
    const runId = ++this.runId;
    this.callbacks.onState('Solicitando permiso para la cámara…', true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      if (runId !== this.runId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => this.stop(), { once: true });
      this.video.srcObject = stream;
      await this.video.play();
      if (runId !== this.runId) return;

      this.callbacks.onState('Cargando el detector local…', true);
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      const landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: '/mediapipe/models/hand_landmarker.task', delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 2,
      });
      if (runId !== this.runId) {
        landmarker.close();
        return;
      }
      this.landmarker = landmarker;
      this.lastVideoTime = -1;
      this.frameCount = 0;
      this.rateStart = performance.now();
      this.callbacks.onState('Cámara activa · buscando manos', true);
      this.detect(runId);
    } catch (error) {
      if (runId !== this.runId) return;
      this.cleanup();
      const name = error instanceof DOMException ? error.name : '';
      const message = name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Puedes seguir con el teclado.'
        : name === 'NotFoundError'
          ? 'No se encontró una cámara. Puedes seguir con el teclado.'
          : 'No se pudo iniciar la cámara o el detector local. Revisa la consola.';
      console.error('Error al iniciar el seguimiento:', error);
      this.callbacks.onState(message, false);
    }
  }

  stop(): void {
    if (!this.active) return;
    ++this.runId;
    this.cleanup();
    this.callbacks.onState('Cámara apagada', false);
  }

  private cleanup(): void {
    this.active = false;
    cancelAnimationFrame(this.frameId);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.pause();
    this.video.srcObject = null;
    this.landmarker?.close();
    this.landmarker = null;
    this.callbacks.onPoints([]);
  }

  private detect(runId: number): void {
    if (runId !== this.runId || !this.landmarker) return;
    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && this.video.currentTime !== this.lastVideoTime) {
      try {
        const started = performance.now();
        const result = this.landmarker.detectForVideo(this.video, started);
        const duration = performance.now() - started;
        const points = result.landmarks.flatMap((hand) => {
          const tip = hand[8]; // Punto 8: punta del índice de cada mano.
          return tip ? [{ x: tip.x, y: tip.y, pinchRatio: handPinchRatio(hand, this.video.videoWidth, this.video.videoHeight) }] : [];
        });
        this.callbacks.onPoints(points);
        this.callbacks.onState(points.length ? `Cámara activa · ${points.length} ${points.length === 1 ? 'mano detectada' : 'manos detectadas'}` : 'Cámara activa · sin mano visible', true);
        this.lastVideoTime = this.video.currentTime;
        this.frameCount++;
        const elapsed = performance.now() - this.rateStart;
        if (elapsed >= 1000) {
          this.callbacks.onStats(Math.round(this.frameCount * 1000 / elapsed), duration);
          this.frameCount = 0;
          this.rateStart = performance.now();
        }
      } catch (error) {
        console.error('Error durante la detección:', error);
        this.cleanup();
        this.callbacks.onState('Se detuvo la detección por un error. El teclado sigue disponible.', false);
        return;
      }
    }
    this.frameId = requestAnimationFrame(() => this.detect(runId));
  }
}
