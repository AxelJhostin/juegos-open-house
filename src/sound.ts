export type SoundCue = 'start' | 'slice' | 'level' | 'roundEnd' | 'warning' | 'crash' |
  'jump' | 'land' | 'goal' | 'energy' | 'energyClose' | 'magic';

type Voice = { wave: OscillatorType; from: number; to: number; duration: number; volume: number; delay?: number };

// Los sonidos se sintetizan en el navegador: no hay descargas ni archivos de terceros.
export class SoundEffects {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private readonly lastPlayed = new Map<SoundCue, number>();

  get isEnabled(): boolean { return this.enabled; }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(enabled ? 0.22 : 0, this.context.currentTime, 0.015);
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
    const minGap = cue === 'slice' ? 0.065 : cue === 'warning' ? 0.4 : 0;
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
    }
  }

  private tone(voice: Voice): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const start = context.currentTime + (voice.delay ?? 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = voice.wave;
    oscillator.frequency.setValueAtTime(voice.from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, voice.to), start + voice.duration);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(voice.volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + voice.duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + voice.duration + 0.015);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  private noise(duration: number, volume: number, frequency: number): void {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
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
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    source.connect(filter).connect(gain).connect(master);
    source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
}
