import Phaser from 'phaser';
import { FruitGame, PLAY_TOP, PLAY_BOTTOM, type ControlMode } from './fruit-game';
import { HandTracker, type HandSample } from './tracking';
import type { Point } from './geometry';
import { cameraPointOnCanvas } from './camera-coordinates';
import './style.css';

const WIDTH = 960;
const HEIGHT = 540;

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Falta el contenedor de la aplicación.');
app.innerHTML = `
  <section class="panel" aria-labelledby="title">
    <header class="header">
      <div><p class="eyebrow">Pulso Pixel · Prototipo 1 de 3</p><h1 id="title">Rebanar fruta</h1></div>
      <div class="hud"><span>Puntos <strong id="score">0</strong></span><span>Tiempo <strong id="time">45</strong>s</span></div>
    </header>
    <div class="controls">
      <label for="control-mode">Control</label>
      <select id="control-mode">
        <option value="mouse">Mouse</option>
        <option value="keyboard">Teclado</option>
        <option value="camera">Cámara</option>
      </select>
      <button id="play-button" type="button">Empezar partida</button>
      <button id="stop-camera" type="button" hidden>Detener cámara</button>
    </div>
    <p id="help" class="help">Arrastra el mouse a través de las frutas para cortarlas.</p>
    <div id="stage" class="stage">
      <video id="camera-video" autoplay playsinline muted aria-label="Vista local de la cámara"></video>
      <div class="play-guides" aria-hidden="true"><span class="guide-top">LÍMITE SUPERIOR</span><span class="guide-bottom">SALIDA DE FRUTAS</span></div>
      <div id="round-overlay" class="overlay">
        <h2 id="overlay-title">Corta las frutas</h2>
        <p id="overlay-text">Tienes 45 segundos. Cada fruta cortada suma 10 puntos.</p>
      </div>
    </div>
    <div class="status-row"><p id="camera-status" role="status" aria-live="polite">Cámara apagada</p><p id="tracking-stats">Detección: —</p></div>
    <p class="privacy">La cámara solo se activa al elegirla. El video se procesa aquí; no se guarda ni se transmite.</p>
  </section>
`;

const stage = document.querySelector<HTMLElement>('#stage')!;
const playGuides = document.querySelector<HTMLElement>('.play-guides')!;
playGuides.style.top = `${PLAY_TOP * 100}%`;
playGuides.style.bottom = `${(1 - PLAY_BOTTOM) * 100}%`;
const video = document.querySelector<HTMLVideoElement>('#camera-video')!;
const select = document.querySelector<HTMLSelectElement>('#control-mode')!;
const playButton = document.querySelector<HTMLButtonElement>('#play-button')!;
const stopCameraButton = document.querySelector<HTMLButtonElement>('#stop-camera')!;
const overlay = document.querySelector<HTMLElement>('#round-overlay')!;
const overlayTitle = document.querySelector<HTMLElement>('#overlay-title')!;
const overlayText = document.querySelector<HTMLElement>('#overlay-text')!;
const help = document.querySelector<HTMLElement>('#help')!;
const status = document.querySelector<HTMLElement>('#camera-status')!;
const stats = document.querySelector<HTMLElement>('#tracking-stats')!;
const scoreText = document.querySelector<HTMLElement>('#score')!;
const timeText = document.querySelector<HTMLElement>('#time')!;

const instructions: Record<ControlMode, string> = {
  mouse: 'Arrastra el mouse a través de las frutas para cortarlas.',
  keyboard: 'Mueve el círculo con flechas o WASD. Mantén Espacio para cortar al moverte.',
  camera: 'Mueve uno o ambos índices a través de las frutas. Cada mano corta por separado.',
};

const gameScene = new FruitGame({
  onHud(score, seconds): void {
    scoreText.textContent = String(score);
    timeText.textContent = String(seconds);
  },
  onEnd(score): void {
    tracker.stop();
    stage.classList.remove('playing');
    overlayTitle.textContent = 'Partida terminada';
    overlayText.textContent = `Conseguiste ${score} puntos. ¿Otra ronda?`;
    overlay.hidden = false;
    select.disabled = false;
    playButton.disabled = false;
    playButton.textContent = 'Jugar otra vez';
  },
});

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  width: WIDTH,
  height: HEIGHT,
  transparent: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [gameScene],
});

function toStagePoint(sample: HandSample): Point {
  return cameraPointOnCanvas(
    sample,
    { width: video.videoWidth, height: video.videoHeight },
    video.getBoundingClientRect(),
    game.canvas.getBoundingClientRect(),
    { width: game.scale.width, height: game.scale.height },
  );
}

function setStageHeight(height: number): void {
  stage.style.aspectRatio = `${WIDTH} / ${height}`;
  game.scale.setGameSize(WIDTH, height);
  gameScene.setFieldHeight(height);
}

const tracker = new HandTracker(video, {
  onState(message, active): void {
    if (status.textContent !== message) status.textContent = message;
    stage.classList.toggle('camera-active', active);
    stopCameraButton.hidden = !active;
    if (!active) {
      setStageHeight(HEIGHT);
      stats.textContent = 'Detección: —';
      if (gameScene.isPlaying && gameScene.controlMode === 'camera') {
        gameScene.switchToKeyboard();
        select.value = 'keyboard';
        help.textContent = instructions.keyboard;
      }
    }
  },
  onPoints(samples): void {
    gameScene.setCameraPoints(video.videoWidth ? samples.map(toStagePoint) : []);
  },
  onStats(fps, duration): void {
    stats.textContent = `Detección: ${fps} fps · ${duration.toFixed(0)} ms por imagen`;
  },
});

select.addEventListener('change', () => { help.textContent = instructions[select.value as ControlMode]; });

playButton.addEventListener('click', async () => {
  if (gameScene.isPlaying) return;
  playButton.disabled = true;
  const mode = select.value as ControlMode;
  if (mode === 'camera') {
    await tracker.start();
    if (!tracker.isActive) { playButton.disabled = false; return; }
    setStageHeight(Math.round(WIDTH * video.videoHeight / video.videoWidth));
  } else tracker.stop();

  gameScene.startRound(mode);
  stage.classList.add('playing');
  overlay.hidden = true;
  select.disabled = true;
  playButton.textContent = 'Jugando…';
});

stopCameraButton.addEventListener('click', () => tracker.stop());
document.addEventListener('visibilitychange', () => { if (document.hidden) tracker.stop(); });
window.addEventListener('pagehide', () => tracker.stop());
