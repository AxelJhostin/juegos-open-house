import { PLATFORM_BEAT_SECONDS, PLATFORM_JUMP_CUES } from './platform-level';

export type SoundCue = 'start' | 'slice' | 'level' | 'roundEnd' | 'warning' | 'crash' |
  'meteorPass' | 'jump' | 'land' | 'goal' | 'energy' | 'energyClose' | 'magic' | 'heart' | 'rainbow';

type Voice = { wave: OscillatorType; from: number; to: number; duration: number; volume: number; delay?: number; filterHz?: number };

// Los sonidos se sintetizan en el navegador: no hay descargas ni archivos de terceros.
export class SoundEffects {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private readonly lastPlayed = new Map<SoundCue, number>();
  private shipEngine: { low: OscillatorNode; high: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
  private platformBus: GainNode | null = null;
  private nextPlatformBeat: number | null = null;

  get isEnabled(): boolean { return this.enabled; }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopShipEngine();
    if (!enabled) this.stopPlatformMusic();
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? 0.22 : 0, this.context.currentTime, 0.015);
    }
  }

  // Un solo par de osciladores acompaña toda la partida; no se crea uno por fotograma.
  setShipEngine(movement: number): void {
    if (!this.enabled || !this.context || !this.master || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (!this.shipEngine) {
      const low = this.context.createOscillator();
      const high = this.context.createOscillator();
      const filter = this.context.createBiquadFilter();
      const gain = this.context.createGain();
      low.type = 'sawtooth';
      high.type = 'triangle';
      filter.type = 'lowpass';
      gain.gain.value = 0;
      low.connect(filter);
      high.connect(filter);
      filter.connect(gain).connect(this.master);
      low.start();
      high.start();
      this.shipEngine = { low, high, filter, gain };
    }
    const speed = Math.min(1, Math.max(0, movement));
    this.shipEngine.low.frequency.setTargetAtTime(62 + speed * 19, now, 0.09);
    this.shipEngine.high.frequency.setTargetAtTime(124 + speed * 38, now, 0.09);
    this.shipEngine.filter.frequency.setTargetAtTime(220 + speed * 130, now, 0.09);
    this.shipEngine.gain.gain.setTargetAtTime(0.07 + speed * 0.025, now, 0.12);
  }

  stopShipEngine(): void {
    if (!this.shipEngine || !this.context) return;
    const { low, high, filter, gain } = this.shipEngine;
    this.shipEngine = null;
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0.001, now, 0.035);
    low.stop(now + 0.22);
    high.stop(now + 0.22);
    low.onended = () => { low.disconnect(); high.disconnect(); filter.disconnect(); gain.disconnect(); };
  }

  // El reloj del nivel decide el siguiente beat: música y obstáculos no se desincronizan.
  updatePlatformMusic(elapsedSeconds: number): void {
    if (!this.enabled || !this.context || !this.master || this.context.state !== 'running') return;
    if (!this.platformBus) {
      this.platformBus = this.context.createGain();
      this.platformBus.gain.value = 0.52;
      this.platformBus.connect(this.master);
      this.nextPlatformBeat = Math.floor(elapsedSeconds / PLATFORM_BEAT_SECONDS);
    }
    while (this.nextPlatformBeat !== null && this.nextPlatformBeat < 64 &&
      this.nextPlatformBeat * PLATFORM_BEAT_SECONDS <= elapsedSeconds + 0.12) {
      const beat = this.nextPlatformBeat++;
      const delay = Math.max(0, beat * PLATFORM_BEAT_SECONDS - elapsedSeconds);
      if (beat * PLATFORM_BEAT_SECONDS >= elapsedSeconds - 0.06) this.schedulePlatformBeat(beat, delay);
    }
  }

  stopPlatformMusic(): void {
    const bus = this.platformBus;
    this.platformBus = null;
    this.nextPlatformBeat = null;
    if (!bus || !this.context) return;
    const now = this.context.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(0.001, now, 0.035);
    window.setTimeout(() => bus.disconnect(), 450);
  }

  private schedulePlatformBeat(beat: number, delay: number): void {
    const bus = this.platformBus;
    if (!bus) return;
    const bar = Math.floor(beat / 4);
    const position = beat % 4;
    const roots = [82.41, 65.41, 98, 73.42]; // Mi menor · Do · Sol · Re
    const root = roots[bar % roots.length];
    const chorus = beat >= 32;
    // Batería: bombo en cada pulso, caja en 2 y 4, charles entre pulsos.
    this.tone({ wave: 'sine', from: 150, to: 48, duration: 0.18, volume: 0.55, delay }, bus);
    if (position % 2 === 1) {
      this.noise(0.12, 0.27, 1800, delay, bus);
      this.tone({ wave: 'triangle', from: 175, to: 105, duration: 0.1, volume: 0.16, delay }, bus);
    }
    this.noise(0.045, 0.075, 5200, delay, bus);
    this.noise(0.035, chorus ? 0.085 : 0.055, 5800, delay + PLATFORM_BEAT_SECONDS / 2, bus);
    // Bajo y acordes de quinta dan carácter rock sin imitar ninguna canción existente.
    this.tone({ wave: 'sawtooth', from: root, to: root * 0.995, duration: 0.29,
      volume: 0.17, delay, filterHz: 380 }, bus);
    if (position === 0 || position === 2) {
      this.tone({ wave: 'sawtooth', from: root * 2, to: root * 2, duration: 0.32,
        volume: chorus ? 0.16 : 0.11, delay, filterHz: 1050 }, bus);
      this.tone({ wave: 'square', from: root * 3, to: root * 3, duration: 0.28,
        volume: chorus ? 0.075 : 0.05, delay, filterHz: 1150 }, bus);
    }
    const motif = [2, 3, 4, 3, 0, 2, 3, 2, 4, 5, 4, 2, 3, 2, 0, 1];
    const minorScale = [1, 1.125, 1.2, 1.333, 1.5, 1.6];
    const lead = root * 4 * minorScale[motif[beat % motif.length]];
    if (beat >= 16 && position !== 1) {
      this.tone({ wave: 'triangle', from: lead, to: lead, duration: chorus ? 0.24 : 0.18,
        volume: chorus ? 0.095 : 0.065, delay, filterHz: 1800 }, bus);
    }
    // Una subida avisa el salto siguiente; el acento coincide con la marca visual.
    if (PLATFORM_JUMP_CUES.some((cue) => cue.beat === beat + 1)) {
      this.tone({ wave: 'triangle', from: 520, to: 740, duration: 0.19,
        volume: 0.11, delay: delay + PLATFORM_BEAT_SECONDS * 0.48 }, bus);
    }
    if (PLATFORM_JUMP_CUES.some((cue) => cue.beat === beat)) {
      this.noise(0.25, 0.12, 3400, delay, bus);
      this.tone({ wave: 'triangle', from: 880, to: 660, duration: 0.13, volume: 0.12, delay }, bus);
    }
  }

  // Llamar desde un clic o pulsación permite iniciar AudioContext en navegadores que lo exigen.
  async unlock(): Promise<void> {
    if (!this.enabled || !('AudioContext' in window)) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      // Si no hay salida de audio, el juego sigue funcionando normalmente.
    }
  }

  play(cue: SoundCue): void {
    if (!this.enabled || !this.context || !this.master || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const minGap = cue === 'slice' ? 0.065 : cue === 'warning' ? 0.4 : cue === 'meteorPass' ? 0.28 : 0;
    if (now - (this.lastPlayed.get(cue) ?? -Infinity) < minGap) return;
    this.lastPlayed.set(cue, now);
    switch (cue) {
      case 'start':
        this.tone({ wave: 'triangle', from: 440, to: 660, duration: 0.13, volume: 0.26 });
        this.tone({ wave: 'sine', from: 660, to: 880, duration: 0.16, volume: 0.17, delay: 0.09 });
        break;
      case 'slice':
        this.noise(0.09, 0.2, 2200);
        this.tone({ wave: 'triangle', from: 900, to: 420, duration: 0.11, volume: 0.18 });
        break;
      case 'level':
        this.tone({ wave: 'square', from: 523, to: 784, duration: 0.12, volume: 0.12 });
        this.tone({ wave: 'square', from: 784, to: 1047, duration: 0.15, volume: 0.1, delay: 0.11 });
        break;
      case 'roundEnd':
        this.tone({ wave: 'triangle', from: 620, to: 390, duration: 0.24, volume: 0.2 });
        this.tone({ wave: 'sine', from: 390, to: 260, duration: 0.28, volume: 0.18, delay: 0.18 });
        break;
      case 'warning':
        this.tone({ wave: 'square', from: 430, to: 330, duration: 0.1, volume: 0.13 });
        break;
      case 'meteorPass':
        this.noise(0.16, 0.16, 850);
        this.tone({ wave: 'triangle', from: 240, to: 115, duration: 0.16, volume: 0.1 });
        break;
      case 'crash':
        this.noise(0.27, 0.36, 420);
        this.tone({ wave: 'sawtooth', from: 180, to: 55, duration: 0.31, volume: 0.25 });
        break;
      case 'jump':
        this.tone({ wave: 'triangle', from: 300, to: 720, duration: 0.15, volume: 0.29 });
        break;
      case 'land':
        this.tone({ wave: 'sine', from: 175, to: 100, duration: 0.075, volume: 0.2 });
        break;
      case 'goal':
        for (const [index, pitch] of [523, 659, 784, 1047].entries()) {
          this.tone({ wave: 'triangle', from: pitch, to: pitch * 1.02, duration: 0.22, volume: 0.19, delay: index * 0.1 });
        }
        break;
      case 'energy':
        this.tone({ wave: 'sine', from: 210, to: 760, duration: 0.42, volume: 0.28 });
        this.tone({ wave: 'triangle', from: 420, to: 1040, duration: 0.32, volume: 0.13, delay: 0.08 });
        break;
      case 'energyClose':
        this.tone({ wave: 'sine', from: 620, to: 130, duration: 0.33, volume: 0.19 });
        break;
      case 'magic':
        this.tone({ wave: 'sine', from: 500, to: 1000, duration: 0.26, volume: 0.21 });
        this.tone({ wave: 'triangle', from: 750, to: 1250, duration: 0.23, volume: 0.12, delay: 0.06 });
        break;
      case 'heart':
        for (const [index, pitch] of [659, 784, 988, 1318].entries()) {
          this.tone({ wave: 'sine', from: pitch, to: pitch * 1.015, duration: 0.26,
            volume: 0.12, delay: index * 0.085 });
        }
        break;
      case 'rainbow':
        for (const [index, pitch] of [523, 659, 784, 988, 1175].entries()) {
          this.tone({ wave: 'triangle', from: pitch * 0.97, to: pitch,
            duration: 0.27, volume: 0.11, delay: index * 0.075 });
        }
        break;
    }
  }

  private tone(voice: Voice, output = this.master): void {
    const context = this.context;
    if (!context || !output) return;
    const start = context.currentTime + (voice.delay ?? 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = voice.wave;
    oscillator.frequency.setValueAtTime(voice.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, voice.to), start + voice.duration);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(voice.volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + voice.duration);
    const filter = voice.filterHz ? context.createBiquadFilter() : null;
    if (filter) {
      filter.type = 'lowpass';
      filter.frequency.value = voice.filterHz!;
      oscillator.connect(filter).connect(gain).connect(output);
    } else oscillator.connect(gain).connect(output);
    oscillator.start(start);
    oscillator.stop(start + voice.duration + 0.015);
    oscillator.onended = () => { oscillator.disconnect(); filter?.disconnect(); gain.disconnect(); };
  }

  private noise(duration: number, volume: number, frequency: number, delay = 0, output = this.master): void {
    const context = this.context;
    if (!context || !output) return;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    const start = context.currentTime + delay;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter).connect(gain).connect(output);
    source.start(start);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
}
