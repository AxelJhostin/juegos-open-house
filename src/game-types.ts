import type Phaser from 'phaser';
import type { HandSample } from './tracking';

export type ControlMode = 'mouse' | 'keyboard' | 'camera';

// La pantalla conoce este contrato; cada escena decide cómo interpreta la entrada.
export type PlayableScene = Phaser.Scene & {
  readonly isPlaying: boolean;
  readonly controlMode: ControlMode;
  startRound(mode: ControlMode): void;
  abortRound(): void;
  switchToKeyboard(): void;
  setFieldHeight(height: number): void;
  setCameraPoints(points: HandSample[]): void;
};
