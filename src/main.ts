import Phaser from 'phaser';
import { FruitGame, PLAY_TOP, PLAY_BOTTOM, type ControlMode } from './fruit-game';
import { ShipGame } from './ship-game';
import { PlatformGame } from './platform-game';
import { HandTracker, type HandSample } from './tracking';
import type { Point } from './geometry';
import { cameraPointOnCanvas } from './camera-coordinates';
import { addResult, loadRecords, nameResult, normalizePlayerName, saveRecords, type RecordGame } from './records';
import { addShipResult, formatSurvivalTime, loadShipRecords, nameShipResult, saveShipRecords } from './ship-records';
import './style.css';

const WIDTH = 960;
const HEIGHT = 540;

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Falta el contenedor de la aplicación.');
app.innerHTML = `
  <section id="home" class="home" aria-labelledby="home-title">
    <p class="eyebrow">Open House · Tres minijuegos</p>
    <h1 id="home-title">Pulso Pixel</h1>
    <p class="home-intro">Elige un juego y juega con cámara o teclado. En Nave, sobrevive el mayor tiempo posible.</p>
    <div class="game-cards">
      <button class="game-card" type="button" data-game="fruit"><span class="card-symbol">✦</span><strong>Rebanar fruta</strong><span>Corta frutas con uno o dos índices. Suma puntos antes de que termine el tiempo.</span><em>Jugar fruta →</em></button>
      <button class="game-card" type="button" data-game="ship"><span class="card-symbol">◆</span><strong>Nave espacial</strong><span>Esquiva meteoritos. Cada segundo que sobrevives cuenta.</span><em>Jugar nave →</em></button>
      <button class="game-card" type="button" data-game="platform"><span class="card-symbol">▣</span><strong>Plataformas</strong><span>Corre, salta huecos y supera obstáculos hasta llegar a la meta.</span><em>Jugar plataformas →</em></button>
    </div>
  </section>
  <section id="game-panel" class="panel" aria-labelledby="title" hidden>
    <header class="header">
      <div><p id="eyebrow" class="eyebrow">Pulso Pixel · Juego 1 de 3</p><h1 id="title">Rebanar fruta</h1></div>
      <div class="hud"><span><span id="score-label">Puntos</span> <strong id="score">0</strong><span id="score-unit" hidden>s</span></span><span id="countdown-stat">Tiempo <strong id="time">45</strong>s</span><span id="extra-stat"><span id="extra-label">Nivel</span> <strong id="extra-value">1</strong></span></div>
    </header>
    <div class="controls">
      <button id="menu-button" type="button">← Menú principal</button>
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
        <p id="overlay-text">Tienes 45 segundos. Cada fruta suma 10 puntos. Tras 20 segundos empieza el nivel 2.</p>
        <form id="name-entry" class="name-entry" hidden>
          <label for="player-name">Nuevo récord · escribe tu nombre o apodo (máx. 10 caracteres)</label>
          <div><input id="player-name" name="player-name" type="text" maxlength="10" autocomplete="off" autocapitalize="characters" required placeholder="TU NOMBRE"><button type="submit">Guardar nombre</button></div>
        </form>
      </div>
    </div>
    <div class="status-row"><p id="camera-status" role="status" aria-live="polite">Cámara apagada</p><p id="tracking-stats">Detección: —</p></div>
    <div id="records" class="records" aria-live="polite"></div>
    <p class="privacy">La cámara solo se activa al elegirla. El video se procesa aquí; no se guarda ni se transmite.</p>
  </section>
`;

const stage = document.querySelector<HTMLElement>('#stage')!;
const home = document.querySelector<HTMLElement>('#home')!;
const gamePanel = document.querySelector<HTMLElement>('#game-panel')!;
const menuButton = document.querySelector<HTMLButtonElement>('#menu-button')!;
const playGuides = document.querySelector<HTMLElement>('.play-guides')!;
playGuides.style.top = `${PLAY_TOP * 100}%`;
playGuides.style.bottom = `${(1 - PLAY_BOTTOM) * 100}%`;
const video = document.querySelector<HTMLVideoElement>('#camera-video')!;
const select = document.querySelector<HTMLSelectElement>('#control-mode')!;
const mouseOption = select.querySelector<HTMLOptionElement>('option[value="mouse"]')!;
const playButton = document.querySelector<HTMLButtonElement>('#play-button')!;
const stopCameraButton = document.querySelector<HTMLButtonElement>('#stop-camera')!;
const overlay = document.querySelector<HTMLElement>('#round-overlay')!;
const overlayTitle = document.querySelector<HTMLElement>('#overlay-title')!;
const overlayText = document.querySelector<HTMLElement>('#overlay-text')!;
const nameEntry = document.querySelector<HTMLFormElement>('#name-entry')!;
const playerName = document.querySelector<HTMLInputElement>('#player-name')!;
const help = document.querySelector<HTMLElement>('#help')!;
const status = document.querySelector<HTMLElement>('#camera-status')!;
const stats = document.querySelector<HTMLElement>('#tracking-stats')!;
const scoreText = document.querySelector<HTMLElement>('#score')!;
const scoreLabel = document.querySelector<HTMLElement>('#score-label')!;
const scoreUnit = document.querySelector<HTMLElement>('#score-unit')!;
const countdownStat = document.querySelector<HTMLElement>('#countdown-stat')!;
const extraStat = document.querySelector<HTMLElement>('#extra-stat')!;
const timeText = document.querySelector<HTMLElement>('#time')!;
const extraLabel = document.querySelector<HTMLElement>('#extra-label')!;
const extraValue = document.querySelector<HTMLElement>('#extra-value')!;
const title = document.querySelector<HTMLElement>('#title')!;
const eyebrow = document.querySelector<HTMLElement>('#eyebrow')!;
const recordsText = document.querySelector<HTMLElement>('#records')!;
let selectedGame: RecordGame = 'fruit';
let records = loadRecords(selectedGame);
let shipRecords = loadShipRecords();
let pendingShipRank: number | null = null;
let pendingScoreRank: number | null = null;
let launchId = 0;

function renderRecords(): void {
  if (selectedGame === 'ship') {
    const board = shipRecords.best.length
      ? shipRecords.best.map((entry, index) => `${index + 1}. ${entry.name.padEnd(10, ' ')}  ${formatSurvivalTime(entry.timeMs)}`).join('\n')
      : '—';
    recordsText.textContent = `Partidas jugadas: ${shipRecords.played} · Mejores tiempos\n${board}`;
    return;
  }
  const board = records.best.length
    ? records.best.map((entry, index) => `${index + 1}. ${entry.name.padEnd(10, ' ')}  ${entry.score} puntos`).join('\n')
    : '—';
  recordsText.textContent = `Partidas jugadas: ${records.played} · Mejores puntuaciones\n${board}`;
}
renderRecords();

const instructions: Record<RecordGame, Record<ControlMode, string>> = {
  fruit: {
    mouse: 'Arrastra el mouse a través de las frutas para cortarlas.',
    keyboard: 'Mueve el círculo con flechas o WASD. Mantén Espacio para cortar al moverte.',
    camera: 'Mueve uno o ambos índices a través de las frutas. Cada mano corta por separado.',
  },
  ship: {
    mouse: 'Usa el teclado o la cámara para dirigir la nave.',
    keyboard: 'Mueve la nave con A/D o las flechas. Evita los meteoritos: el primer choque termina la partida.',
    camera: 'Mueve una mano de izquierda a derecha para esquivar meteoritos. El primer choque termina la partida.',
  },
  platform: {
    mouse: 'Usa el teclado o la cámara para correr y saltar.',
    keyboard: 'Corre con A/D o flechas y salta con Espacio, W o flecha arriba.',
    camera: 'Mueve la mano a los lados para correr; levanta el índice rápido para saltar. Espacio también funciona.',
  },
};

function updateHud(score: number, seconds: number, extra: number): void {
  scoreText.textContent = String(score);
  timeText.textContent = String(seconds);
  extraValue.textContent = String(extra);
}

function updateShipHud(elapsedMs: number): void {
  scoreText.textContent = formatSurvivalTime(elapsedMs);
}

function finishRound(kind: RecordGame, score: number): void {
  tracker.stop();
  const result = addResult(records, score);
  records = result.records;
  pendingScoreRank = result.rank;
  const saved = saveRecords(records, kind);
  renderRecords();
  stage.classList.remove('playing', 'fruit-round');
  overlayTitle.textContent = 'Partida terminada';
  overlayText.textContent = `Conseguiste ${score} puntos. ${saved ? '' : 'No se pudo guardar el récord en este navegador. '}${result.rank === null ? '¿Otra ronda?' : '¡Entraste en las mejores puntuaciones!'}`;
  overlay.hidden = false;
  nameEntry.hidden = result.rank === null;
  select.disabled = false;
  playButton.disabled = result.rank !== null;
  playButton.textContent = 'Jugar otra vez';
  if (result.rank !== null) {
    playerName.value = '';
    playerName.focus();
  }
}

function finishShipRound(elapsedMs: number): void {
  tracker.stop();
  const result = addShipResult(shipRecords, elapsedMs);
  shipRecords = result.records;
  const saved = saveShipRecords(shipRecords);
  pendingShipRank = result.rank;
  renderRecords();
  stage.classList.remove('playing', 'fruit-round');
  overlayTitle.textContent = '¡Choque!';
  overlayText.textContent = `Sobreviviste ${formatSurvivalTime(elapsedMs)} s. ${saved ? '' : 'No se pudo guardar el tiempo en este navegador. '}${result.rank === null ? '¿Otra ronda?' : '¡Entraste en los mejores tiempos!'}`;
  overlay.hidden = false;
  nameEntry.hidden = result.rank === null;
  select.disabled = false;
  playButton.disabled = result.rank !== null;
  playButton.textContent = 'Jugar otra vez';
  if (result.rank !== null) {
    playerName.value = '';
    playerName.focus();
  }
}

const fruitScene = new FruitGame({ onHud: updateHud, onEnd: (score) => finishRound('fruit', score) });
const shipScene = new ShipGame({ onHud: updateShipHud, onEnd: finishShipRound });
const platformScene = new PlatformGame({ onHud: updateHud, onEnd: (score) => finishRound('platform', score) });
let activeScene: FruitGame | ShipGame | PlatformGame = fruitScene;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  width: WIDTH,
  height: HEIGHT,
  transparent: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [fruitScene, shipScene, platformScene],
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
  fruitScene.setFieldHeight(height);
  shipScene.setFieldHeight(height);
  platformScene.setFieldHeight(height);
}

const tracker = new HandTracker(video, {
  onState(message, active): void {
    if (status.textContent !== message) status.textContent = message;
    stage.classList.toggle('camera-active', active);
    stopCameraButton.hidden = !active;
    if (!active) {
      setStageHeight(HEIGHT);
      stats.textContent = 'Detección: —';
      if (activeScene.isPlaying && activeScene.controlMode === 'camera') {
        activeScene.switchToKeyboard();
        select.value = 'keyboard';
        help.textContent = instructions[selectedGame].keyboard;
      }
    }
  },
  onPoints(samples): void {
    activeScene.setCameraPoints(video.videoWidth ? samples.map(toStagePoint) : []);
  },
  onStats(fps, duration): void {
    stats.textContent = `Detección: ${fps} fps · ${duration.toFixed(0)} ms por imagen`;
  },
});

function renderSelection(kind: RecordGame): void {
  launchId++;
  pendingShipRank = null;
  pendingScoreRank = null;
  nameEntry.hidden = true;
  selectedGame = kind;
  activeScene = kind === 'fruit' ? fruitScene : kind === 'ship' ? shipScene : platformScene;
  mouseOption.hidden = kind !== 'fruit';
  if (kind !== 'fruit' && select.value === 'mouse') select.value = 'keyboard';
  title.textContent = kind === 'fruit' ? 'Rebanar fruta' : kind === 'ship' ? 'Nave espacial' : 'Plataformas';
  eyebrow.textContent = `Pulso Pixel · Juego ${kind === 'fruit' ? 1 : kind === 'ship' ? 2 : 3} de 3`;
  scoreLabel.textContent = kind === 'ship' ? 'Tiempo' : 'Puntos';
  scoreUnit.hidden = kind !== 'ship';
  countdownStat.hidden = kind === 'ship';
  extraStat.hidden = kind === 'ship';
  extraLabel.textContent = kind === 'fruit' ? 'Nivel' : 'Caídas';
  if (kind === 'ship') updateShipHud(0);
  else updateHud(0, 45, kind === 'fruit' ? 1 : 0);
  help.textContent = instructions[selectedGame][select.value as ControlMode];
  overlayTitle.textContent = kind === 'fruit' ? 'Corta las frutas' : kind === 'ship' ? 'Sobrevive' : 'Corre y salta';
  overlayText.textContent = kind === 'fruit'
    ? 'Tienes 45 segundos. Cada fruta suma 10 puntos. Tras 20 segundos empieza el nivel 2.'
    : kind === 'ship'
      ? 'Esquiva meteoritos hasta el primer choque. Cada vez caen más y más rápido; tu tiempo es la puntuación.'
      : 'Cruza los huecos y obstáculos hasta la meta antes de que termine el tiempo. No hay objetos que recoger.';
  if (kind === 'ship') shipRecords = loadShipRecords();
  else records = loadRecords(selectedGame);
  renderRecords();
  overlay.hidden = false;
  playButton.textContent = 'Empezar partida';
  playButton.disabled = false;
  home.hidden = true;
  gamePanel.hidden = false;
}

for (const card of document.querySelectorAll<HTMLButtonElement>('.game-card')) {
  card.addEventListener('click', () => renderSelection(card.dataset.game as RecordGame));
}
menuButton.addEventListener('click', () => {
  launchId++;
  pendingShipRank = null;
  pendingScoreRank = null;
  nameEntry.hidden = true;
  activeScene.abortRound();
  tracker.stop();
  stage.classList.remove('playing', 'fruit-round');
  gamePanel.hidden = true;
  home.hidden = false;
  select.disabled = false;
});
nameEntry.addEventListener('submit', (event) => {
  event.preventDefault();
  if (pendingShipRank === null && pendingScoreRank === null) return;
  const name = normalizePlayerName(playerName.value);
  if (!name) {
    playerName.setCustomValidity('Escribe al menos una letra o número.');
    playerName.reportValidity();
    return;
  }
  playerName.setCustomValidity('');
  let saved: boolean;
  if (pendingShipRank !== null) {
    shipRecords = nameShipResult(shipRecords, pendingShipRank, name);
    saved = saveShipRecords(shipRecords);
    pendingShipRank = null;
    overlayText.textContent = `Tiempo registrado: ${scoreText.textContent} s. ${saved ? '' : 'No se pudo guardar el nombre en este navegador. '}¿Otra ronda?`;
  } else {
    records = nameResult(records, pendingScoreRank!, name);
    saved = saveRecords(records, selectedGame);
    pendingScoreRank = null;
    overlayText.textContent = `Puntuación registrada: ${scoreText.textContent} puntos. ${saved ? '' : 'No se pudo guardar el nombre en este navegador. '}¿Otra ronda?`;
  }
  nameEntry.hidden = true;
  renderRecords();
  playButton.disabled = false;
  playButton.focus();
});
playerName.addEventListener('input', () => playerName.setCustomValidity(''));
select.addEventListener('change', () => { help.textContent = instructions[selectedGame][select.value as ControlMode]; });

playButton.addEventListener('click', async () => {
  if (activeScene.isPlaying) return;
  const thisLaunch = ++launchId;
  playButton.disabled = true;
  const mode = select.value as ControlMode;
  if (mode === 'camera') {
    await tracker.start();
    if (thisLaunch !== launchId || gamePanel.hidden) {
      tracker.stop();
      playButton.disabled = false;
      return;
    }
    if (!tracker.isActive) { playButton.disabled = false; return; }
    setStageHeight(Math.round(WIDTH * video.videoHeight / video.videoWidth));
  } else tracker.stop();

  activeScene.startRound(mode);
  stage.classList.add('playing');
  stage.classList.toggle('fruit-round', selectedGame === 'fruit');
  overlay.hidden = true;
  select.disabled = true;
  playButton.textContent = 'Jugando…';
});

stopCameraButton.addEventListener('click', () => tracker.stop());
document.addEventListener('visibilitychange', () => { if (document.hidden) tracker.stop(); });
window.addEventListener('pagehide', () => tracker.stop());
