import { FilesetResolver, HandLandmarker, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';

export type BodyPose = NormalizedLandmark[];
export type BodyHands = NormalizedLandmark[][];
type Callbacks = {
  onState(message: string, active: boolean): void;
  onLandmarks(poses: BodyPose[], hands: BodyHands): void;
  onStats(fps: number, durationMs: number): void;
};

export class PoseTracker {
  private stream: MediaStream | null = null;
  private landmarker: PoseLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private frameId = 0;
  private runId = 0;
  private active = false;
  private lastVideoTime = -1;
  private lastDetectionAt = 0;
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
        video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      if (runId !== this.runId) { stream.getTracks().forEach((track) => track.stop()); return; }
      this.stream = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => this.stop(), { once: true });
      this.video.srcObject = stream;
      await this.video.play();
      if (runId !== this.runId) return;
      this.callbacks.onState('Cargando detectores de cuerpo y manos…', true);
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      const landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: '/mediapipe/models/pose_landmarker_lite.task', delegate: 'CPU' },
        runningMode: 'VIDEO',
        numPoses: 3,
      });
      if (runId !== this.runId) { landmarker.close(); return; }
      this.landmarker = landmarker;
      const handLandmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: '/mediapipe/models/hand_landmarker.task', delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 6,
      });
      if (runId !== this.runId) { handLandmarker.close(); return; }
      this.handLandmarker = handLandmarker;
      this.lastVideoTime = -1;
      this.lastDetectionAt = 0;
      this.frameCount = 0;
      this.rateStart = performance.now();
      this.callbacks.onState('Cámara activa · buscando personas', true);
      this.detect(runId);
    } catch (error) {
      if (runId !== this.runId) return;
      console.error('Error al iniciar el mapa corporal:', error);
      this.cleanup();
      const name = error instanceof DOMException ? error.name : '';
      this.callbacks.onState(name === 'NotAllowedError' ? 'Permiso de cámara denegado.' :
        name === 'NotFoundError' ? 'No se encontró una cámara.' :
          'No se pudo iniciar el detector corporal local.', false);
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
    this.handLandmarker?.close();
    this.handLandmarker = null;
    this.callbacks.onLandmarks([], []);
  }

  private detect(runId: number): void {
    if (runId !== this.runId || !this.landmarker || !this.handLandmarker) return;
    const now = performance.now();
    if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      this.video.currentTime !== this.lastVideoTime && now - this.lastDetectionAt >= 55) {
      try {
        const result = this.landmarker.detectForVideo(this.video, now);
        const hands = this.handLandmarker.detectForVideo(this.video, now);
        const duration = performance.now() - now;
        this.callbacks.onLandmarks(result.landmarks.slice(0, 3), hands.landmarks.slice(0, 6));
        this.lastVideoTime = this.video.currentTime;
        this.lastDetectionAt = now;
        this.frameCount++;
        const elapsed = now - this.rateStart;
        if (elapsed >= 1000) {
          this.callbacks.onStats(Math.round(this.frameCount * 1000 / elapsed), duration);
          this.frameCount = 0;
          this.rateStart = now;
        }
      } catch (error) {
        console.error('Error durante detección corporal:', error);
        this.cleanup();
        this.callbacks.onState('La detección se detuvo por un error.', false);
        return;
      }
    }
    this.frameId = requestAnimationFrame(() => this.detect(runId));
  }
}
