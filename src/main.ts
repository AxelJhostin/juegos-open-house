import Phaser from 'phaser';
import { AppShell } from './app-shell';
import { FruitGame, PLAY_BOTTOM, PLAY_TOP } from './fruit-game';
import { ShipGame } from './ship-game';
import { PlatformGame } from './platform-game';
import { GAMES, type GameDefinition, type GameId } from './game-catalog';
import type { PlayableScene } from './game-types';
import { HandTracker, type HandSample } from './tracking';
import { HandDemoVisualizer } from './hand-demo-visualizer';
import { cameraPointOnCanvas } from './camera-coordinates';
import { addResult, loadRecords, nameResult, saveRecords, type Records } from './records';
import { SoundEffects } from './sound';
import { RestartGesture } from './restart-gesture';
import { PoseTracker } from './pose-tracking';
import { BodyLandmarkVisualizer } from './body-landmarks';
import './style.css';
import './game-themes.css';
import './home.css';
import './game-shell.css';
import './hand-demo.css';
import './filter-room.css';

const WIDTH = 960;
const HEIGHT = 540;

type GameSession = {
  definition: GameDefinition;
  scene: PlayableScene;
  cameraHint?: () => string;
};

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Falta el contenedor de la aplicación.');
const sound = new SoundEffects();
const shell = new AppShell(root, {
  chooseGame: selectGame,
  openHandDemo,
  openFilterRoom,
  returnHome,
  play: () => { void play(); },
  stopCamera: () => tracker.stop(),
  startHandDemo: () => { void startHandDemo(); },
  stopHandDemo,
  saveName,
  toggleSound: () => {
    sound.setEnabled(!sound.isEnabled);
    shell.setSoundEnabled(sound.isEnabled);
    if (sound.isEnabled) void sound.unlock();
  },
  changeControlMode: (mode) => {
    if (mode === 'camera') return;
    cameraReplayReady = false;
    restartGesture.reset();
    shell.setRestartGesture(false);
    tracker.stop();
  },
  togglePoseMode: () => {
    if (shell.isPoseMode) {
      shell.setPoseMode(false);
      handDemoVisualizer.setPoseMode(false);
      shell.exitFullscreen();
    } else {
      shell.enterPoseMode();
      handDemoVisualizer.setPoseMode(true);
    }
  },
  poseModeChanged: (active) => handDemoVisualizer.setPoseMode(active),
  startFilterRoom: () => { void startFilterRoom(); },
  stopFilterRoom,
});
shell.setSoundEnabled(sound.isEnabled);
const guides = shell.stage.querySelector<HTMLElement>('.play-guides');
if (guides) {
  guides.style.top = `${PLAY_TOP * 100}%`;
  guides.style.bottom = `${(1 - PLAY_BOTTOM) * 100}%`;
}

const sessions: Record<GameId, GameSession> = {
  fruit: {
    definition: GAMES.fruit,
    scene: new FruitGame({
      onHud: (value, seconds, level) => shell.updateHud(value, seconds, level),
      onEnd: (value) => finishRound(value),
      onSound: (cue) => sound.play(cue),
    }),
  },
  ship: {
    definition: GAMES.ship,
    scene: new ShipGame({
      onHud: (value) => shell.updateHud(value),
      onEnd: (value) => finishRound(value),
      onSound: (cue) => sound.play(cue),
      onEngine: (movement) => movement === null ? sound.stopShipEngine() : sound.setShipEngine(movement),
    }),
  },
  platform: {
    definition: GAMES.platform,
    scene: new PlatformGame({
      onHud: (value) => shell.updateHud(value),
      onEnd: (value, won) => finishRound(value, won),
      onSound: (cue) => sound.play(cue),
      onMusic: (elapsed) => elapsed === null ? sound.stopPlatformMusic() : sound.updatePlatformMusic(elapsed),
    }),
    cameraHint: () => (sessions.platform.scene as PlatformGame).gestureHeld ? ' · pinza mantenida' : ' · junta los dedos',
  },
};

let active = sessions.fruit;
let records: Records = loadRecords(active.definition.records);
let pendingRank: number | null = null;
let lastResult = 0;
let launchId = 0;
let handDemoLaunchId = 0;
let filterLaunchId = 0;
let detectedHands = 0;
const restartGesture = new RestartGesture();
let cameraReplayReady = false;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: shell.stage,
  width: WIDTH,
  height: HEIGHT,
  transparent: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: Object.values(sessions).map((session) => session.scene),
});

function setGameplayKeyboardEnabled(enabled: boolean): void {
  if (game.input.keyboard) game.input.keyboard.enabled = enabled;
  for (const session of Object.values(sessions)) session.scene.input.keyboard?.resetKeys();
}

function toStageSample(sample: HandSample): HandSample {
  const point = cameraPointOnCanvas(
    sample,
    { width: shell.video.videoWidth, height: shell.video.videoHeight },
    shell.video.getBoundingClientRect(),
    game.canvas.getBoundingClientRect(),
    { width: game.scale.width, height: game.scale.height },
  );
  return { ...point, pinchRatio: sample.pinchRatio };
}

function setStageHeight(height: number): void {
  shell.setStageHeight(WIDTH, height);
  game.scale.setGameSize(WIDTH, height);
  for (const session of Object.values(sessions)) session.scene.setFieldHeight(height);
}

const tracker = new HandTracker(shell.video, {
  onState(message, isActive): void {
    const hint = isActive && detectedHands > 0 && active.scene.isPlaying &&
      active.scene.controlMode === 'camera' ? active.cameraHint?.() ?? '' : '';
    shell.setCameraStatus(message + hint);
    shell.setCameraActive(isActive);
    if (!isActive) {
      cameraReplayReady = false;
      restartGesture.reset();
      shell.setRestartGesture(false);
      setStageHeight(HEIGHT);
      shell.clearTrackingStats();
      if (shell.isGameVisible && active.scene.controlMode === 'camera' &&
        (active.scene.isPlaying || shell.controlMode === 'camera')) {
        active.scene.switchToKeyboard();
        shell.switchToKeyboard();
      }
    }
  },
  onPoints(samples): void {
    detectedHands = samples.length;
    if (active.scene.isPlaying) active.scene.setCameraPoints(shell.video.videoWidth ? samples.map(toStageSample) : []);
    if (cameraReplayReady && shell.isGameVisible) {
      const result = restartGesture.sample(samples, performance.now());
      shell.setRestartGesture(true, result.progress);
      if (result.restart) {
        cameraReplayReady = false;
        shell.setRestartGesture(false);
        void play();
      }
    }
  },
  onStats(fps, duration): void { shell.setTrackingStats(fps, duration); },
});

const handDemoVisualizer = new HandDemoVisualizer(shell.handDemoCanvas,
  (state, percent) => shell.setHandDemoEnergy(state, percent),
  (active, charging) => shell.setHandDemoMagic(active, charging),
  (state) => shell.setHandDemoHeart(state),
  (state) => shell.setHandDemoRainbow(state),
  (cue) => sound.play(cue));

const handDemoTracker = new HandTracker(shell.handDemoVideo, {
  onState(message, active): void {
    shell.setHandDemoStatus(message);
    if (!active) {
      handDemoVisualizer.setPoseMode(false);
      shell.setPoseMode(false);
      shell.exitFullscreen();
      handDemoVisualizer.stop();
      shell.setHandDemoActive(false);
      shell.setHandDemoLaunching(false);
      shell.clearHandDemoStats();
    }
  },
  onPoints(): void {},
  onLandmarks(hands): void {
    handDemoVisualizer.setLandmarks(hands);
    shell.setHandDemoHands(hands.length);
  },
  onStats(fps, duration): void { shell.setHandDemoStats(fps, duration); },
}, 30);

const bodyVisualizer = new BodyLandmarkVisualizer(shell.filterCanvas);
const filterTracker = new PoseTracker(shell.filterVideo, {
  onState(message, active): void {
    shell.setFilterStatus(message);
    if (!active) {
      bodyVisualizer.stop();
      shell.setFilterActive(false);
      shell.setFilterLaunching(false);
      shell.setFilterCount(0);
      shell.setBodyHandCount(0);
      shell.clearFilterStats();
    }
  },
  onLandmarks(poses, hands): void {
    bodyVisualizer.setLandmarks(poses, hands);
    shell.setFilterCount(poses.length);
    shell.setBodyHandCount(hands.length);
  },
  onStats(fps, duration): void { shell.setFilterStats(fps, duration); },
});

function openFilterRoom(): void {
  setGameplayKeyboardEnabled(false);
  active.scene.abortRound();
  tracker.stop();
  stopHandDemo();
  shell.showFilterRoom();
}

async function startFilterRoom(): Promise<void> {
  if (filterTracker.isActive) return;
  const thisLaunch = ++filterLaunchId;
  shell.setFilterLaunching(true);
  void sound.unlock();
  await filterTracker.start();
  if (thisLaunch !== filterLaunchId || !shell.isFilterVisible) {
    filterTracker.stop();
    shell.setFilterLaunching(false);
    return;
  }
  if (filterTracker.isActive) {
    shell.setFilterVideoSize(shell.filterVideo.videoWidth, shell.filterVideo.videoHeight);
    bodyVisualizer.start();
    shell.setFilterActive(true);
  }
  shell.setFilterLaunching(false);
}

function stopFilterRoom(): void {
  ++filterLaunchId;
  filterTracker.stop();
  bodyVisualizer.stop();
  shell.setFilterActive(false);
  shell.setFilterLaunching(false);
  shell.exitFullscreen();
}

function openHandDemo(): void {
  setGameplayKeyboardEnabled(false);
  tracker.stop();
  stopFilterRoom();
  shell.showHandDemo();
}

async function startHandDemo(): Promise<void> {
  if (handDemoTracker.isActive) return;
  const thisLaunch = ++handDemoLaunchId;
  shell.setHandDemoLaunching(true);
  void sound.unlock();
  await handDemoTracker.start();
  if (thisLaunch !== handDemoLaunchId || !shell.isHandDemoVisible) {
    handDemoTracker.stop();
    shell.setHandDemoLaunching(false);
    return;
  }
  if (handDemoTracker.isActive) {
    shell.setHandDemoVideoSize(shell.handDemoVideo.videoWidth, shell.handDemoVideo.videoHeight);
    handDemoVisualizer.start();
    shell.setHandDemoActive(true);
  }
  shell.setHandDemoLaunching(false);
}

function stopHandDemo(): void {
  ++handDemoLaunchId;
  handDemoVisualizer.setPoseMode(false);
  shell.setPoseMode(false);
  shell.exitFullscreen();
  handDemoVisualizer.stop();
  handDemoTracker.stop();
  shell.setHandDemoActive(false);
  shell.setHandDemoLaunching(false);
  shell.clearHandDemoStats();
}

function selectGame(id: GameId): void {
  setGameplayKeyboardEnabled(false);
  cameraReplayReady = false;
  restartGesture.reset();
  stopHandDemo();
  stopFilterRoom();
  launchId++;
  pendingRank = null;
  active = sessions[id];
  records = loadRecords(active.definition.records);
  shell.selectGame(id, records);
}

function returnHome(): void {
  setGameplayKeyboardEnabled(false);
  cameraReplayReady = false;
  restartGesture.reset();
  launchId++;
  pendingRank = null;
  active.scene.abortRound();
  tracker.stop();
  stopHandDemo();
  stopFilterRoom();
  shell.showHome();
}

function finishRound(value: number, won = false): void {
  setGameplayKeyboardEnabled(false);
  const cameraReplay = active.scene.controlMode === 'camera' && tracker.isActive;
  restartGesture.reset();
  cameraReplayReady = false;
  if (!cameraReplay) tracker.stop();
  lastResult = value;
  const result = addResult(records, value, active.definition.records);
  records = result.records;
  pendingRank = result.rank;
  const saved = saveRecords(records, active.definition.records);
  shell.renderRecords(records);
  shell.showResult(value, won, result.rank, saved);
  cameraReplayReady = cameraReplay && result.rank === null;
  shell.setRestartGesture(cameraReplayReady);
}

function saveName(name: string): void {
  if (pendingRank === null) return;
  records = nameResult(records, pendingRank, name);
  const saved = saveRecords(records, active.definition.records);
  pendingRank = null;
  shell.renderRecords(records);
  shell.showSavedName(lastResult, saved);
  restartGesture.reset();
  cameraReplayReady = active.scene.controlMode === 'camera' && tracker.isActive;
  shell.setRestartGesture(cameraReplayReady);
}

async function play(): Promise<void> {
  if (active.scene.isPlaying) return;
  cameraReplayReady = false;
  restartGesture.reset();
  shell.setRestartGesture(false);
  const thisLaunch = ++launchId;
  shell.setLaunching(true);
  const audioReady = sound.unlock();
  const mode = shell.controlMode;
  if (mode === 'camera') {
    await tracker.start();
    if (thisLaunch !== launchId || !shell.isGameVisible) {
      tracker.stop();
      shell.setLaunching(false);
      return;
    }
    if (!tracker.isActive) {
      shell.setLaunching(false);
      return;
    }
    setStageHeight(Math.round(WIDTH * shell.video.videoHeight / shell.video.videoWidth));
  } else tracker.stop();

  active.scene.startRound(mode);
  void audioReady.then(() => {
    if (thisLaunch === launchId && active.scene.isPlaying && active !== sessions.platform) sound.play('start');
  });
  setGameplayKeyboardEnabled(true);
  shell.showPlaying();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    sound.stopShipEngine();
    sound.stopPlatformMusic();
    tracker.stop();
    stopHandDemo();
    stopFilterRoom();
  }
});
window.addEventListener('pagehide', () => {
  sound.stopShipEngine();
  sound.stopPlatformMusic();
  tracker.stop();
  stopHandDemo();
  stopFilterRoom();
});
