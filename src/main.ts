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
import { GestureSynthMapper, chordNotes, type GestureSynthState } from './gesture-synth';
import { GestureSynthAudio } from './gesture-synth-audio';
import { GestureSynthVisual } from './gesture-synth-visual';
import './style.css';
import './game-themes.css';
import './home.css';
import './game-shell.css';
import './hand-demo.css';
import './filter-room.css';
import './gesture-synth.css';

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
const synthAudio = new GestureSynthAudio();
const shell = new AppShell(root, {
  chooseGame: selectGame,
  openHandDemo,
  openFilterRoom,
  openGestureSynth,
  returnHome,
  play: () => { void play(); },
  stopCamera: () => tracker.stop(),
  startHandDemo: () => { void startHandDemo(); },
  stopHandDemo,
  saveName,
  toggleSound: () => {
    sound.setEnabled(!sound.isEnabled);
    synthAudio.setEnabled(sound.isEnabled);
    shell.setSoundEnabled(sound.isEnabled);
    if (synthKeyboardMode) updateKeyboardSynth();
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
  startGestureSynth: () => { void startGestureSynth(); },
  startGestureSynthKeyboard,
  stopGestureSynth,
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
let synthLaunchId = 0;
let synthKeyboardMode = false;
let keyboardDegree = 1;
let keyboardQuality = 1;
let keyboardVolume = 0.55;
let keyboardMinor = false;
let keyboardSilent = false;
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

const synthMapper = new GestureSynthMapper();
const synthVisual = new GestureSynthVisual(shell.synthCanvas);
const synthTracker = new HandTracker(shell.synthVideo, {
  onState(message, active): void {
    shell.setSynthStatus(message);
    if (!active) {
      synthAudio.silence();
      synthVisual.stop();
      synthMapper.reset();
      shell.setSynthActive(false);
      shell.setSynthLaunching(false);
      shell.setSynthState(null);
      shell.clearSynthStats();
    }
  },
  onPoints(): void {},
  onLandmarks(hands, labels = []): void {
    const state = synthMapper.sample(hands, labels, performance.now());
    synthAudio.update(state);
    synthVisual.set(hands, state);
    shell.setSynthState(state);
  },
  onStats(fps, duration): void { shell.setSynthStats(fps, duration); },
}, 30);

function keyboardSynthState(): GestureSynthState {
  const mode = keyboardMinor ? 'menor' : 'mayor';
  const name = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI'][keyboardDegree - 1];
  return {
    degree: keyboardSilent ? 0 : keyboardDegree,
    name: keyboardSilent ? '—' : `${name} ${mode}`,
    mode,
    quality: keyboardSilent ? 0 : keyboardQuality,
    volume: keyboardSilent ? 0 : keyboardVolume,
    color: 0,
    notes: keyboardSilent ? [] : chordNotes(keyboardDegree, mode, keyboardQuality),
    hands: 0,
  };
}

function updateKeyboardSynth(): void {
  if (!synthKeyboardMode || !shell.isSynthVisible) return;
  const state = keyboardSynthState();
  synthAudio.update(state);
  synthVisual.set([], state);
  shell.setSynthState(state);
}

window.addEventListener('keydown', (event) => {
  if (!synthKeyboardMode || !shell.isSynthVisible || event.target instanceof HTMLInputElement) return;
  const key = event.key.toLowerCase();
  if (/^[1-7]$/.test(key)) keyboardDegree = Number(key);
  else if (['q', 'w', 'e', 'r'].includes(key)) keyboardQuality = ['q', 'w', 'e', 'r'].indexOf(key) + 1;
  else if (key === 'arrowup') keyboardVolume = Math.min(1, keyboardVolume + 0.08);
  else if (key === 'arrowdown') keyboardVolume = Math.max(0, keyboardVolume - 0.08);
  else if (key === 'm' && !event.repeat) keyboardMinor = !keyboardMinor;
  else if (event.code === 'Space') keyboardSilent = true;
  else return;
  event.preventDefault();
  void synthAudio.unlock().then(updateKeyboardSynth);
});
window.addEventListener('keyup', (event) => {
  if (!synthKeyboardMode || !shell.isSynthVisible || event.code !== 'Space') return;
  keyboardSilent = false;
  event.preventDefault();
  updateKeyboardSynth();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) synthAudio.silence();
  else if (synthKeyboardMode) updateKeyboardSynth();
});

function openGestureSynth(): void {
  setGameplayKeyboardEnabled(false);
  active.scene.abortRound();
  tracker.stop();
  stopHandDemo();
  stopFilterRoom();
  shell.showSynthRoom();
}

async function startGestureSynth(): Promise<void> {
  if (synthTracker.isActive) return;
  synthKeyboardMode = false;
  const thisLaunch = ++synthLaunchId;
  shell.setSynthLaunching(true);
  await synthAudio.unlock();
  if (thisLaunch !== synthLaunchId || !shell.isSynthVisible) return;
  await synthTracker.start();
  if (thisLaunch !== synthLaunchId || !shell.isSynthVisible) {
    synthTracker.stop();
    shell.setSynthLaunching(false);
    return;
  }
  if (synthTracker.isActive) {
    shell.setSynthVideoSize(shell.synthVideo.videoWidth, shell.synthVideo.videoHeight);
    synthVisual.start();
    shell.setSynthActive(true);
  }
  shell.setSynthLaunching(false);
}

function startGestureSynthKeyboard(): void {
  ++synthLaunchId;
  synthTracker.stop();
  synthMapper.reset();
  synthKeyboardMode = true;
  shell.setSynthVideoSize(640, 480);
  shell.setSynthKeyboardActive();
  shell.setSynthStatus('Teclado activo · usa 1–7 y Q/W/E/R');
  synthVisual.start();
  void synthAudio.unlock().then(updateKeyboardSynth);
}

function stopGestureSynth(): void {
  ++synthLaunchId;
  synthKeyboardMode = false;
  synthTracker.stop();
  synthVisual.stop();
  synthMapper.reset();
  synthAudio.stop();
  shell.setSynthActive(false);
  shell.setSynthLaunching(false);
  shell.setSynthState(null);
  shell.clearSynthStats();
  shell.exitFullscreen();
}

function openFilterRoom(): void {
  setGameplayKeyboardEnabled(false);
  active.scene.abortRound();
  tracker.stop();
  stopHandDemo();
  stopGestureSynth();
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
  stopGestureSynth();
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
  stopGestureSynth();
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
  stopGestureSynth();
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
    stopGestureSynth();
  }
});
window.addEventListener('pagehide', () => {
  sound.stopShipEngine();
  sound.stopPlatformMusic();
  tracker.stop();
  stopHandDemo();
  stopFilterRoom();
  stopGestureSynth();
});
