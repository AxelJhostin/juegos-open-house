import type { GestureSynthState } from './gesture-synth';

// Cuatro voces sostenidas; solo cambian frecuencia y volumen al cambiar el gesto.
export class GestureSynthAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private voices: { oscillator: OscillatorNode; gain: GainNode }[] = [];
  private enabled = true;
  private lastNotes = '';
  private lastLevel = -1;
  private lastFilter = -1;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(enabled ? 0.7 : 0, this.context.currentTime, 0.025);
    }
  }

  async unlock(): Promise<void> {
    if (!this.enabled || !('AudioContext' in window)) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.7;
        this.filter = this.context.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 1200;
        this.filter.Q.value = 0.8;
        this.filter.connect(this.master).connect(this.context.destination);
        for (let index = 0; index < 4; index++) {
          const oscillator = this.context.createOscillator();
          const gain = this.context.createGain();
          oscillator.type = index % 2 ? 'triangle' : 'sawtooth';
          oscillator.frequency.value = 220;
          gain.gain.value = 0;
          oscillator.connect(gain).connect(this.filter);
          oscillator.start();
          this.voices.push({ oscillator, gain });
        }
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      this.stop();
    }
  }

  update(state: GestureSynthState): void {
    if (!this.context || this.context.state !== 'running' || !this.filter) return;
    const now = this.context.currentTime;
    const level = this.enabled ? Math.min(0.15, state.volume ** 1.5 * 0.15) : 0;
    const filterFrequency = 900 + (state.color + 1) * 1100;
    if (Math.abs(filterFrequency - this.lastFilter) > 12) {
      this.filter.frequency.setTargetAtTime(filterFrequency, now, 0.06);
      this.lastFilter = filterFrequency;
    }
    const notesKey = state.notes.map((note) => note.toFixed(2)).join(',');
    const notesChanged = notesKey !== this.lastNotes;
    const levelChanged = Math.abs(level - this.lastLevel) > 0.003;
    for (let index = 0; index < this.voices.length; index++) {
      const { oscillator, gain } = this.voices[index];
      const note = state.notes[index];
      if (note && notesChanged) oscillator.frequency.setTargetAtTime(note, now, 0.025);
      if (notesChanged || levelChanged) {
        gain.gain.setTargetAtTime(note ? level * (index === 0 ? 0.8 : 0.42) : 0, now, 0.045);
      }
    }
    this.lastNotes = notesKey;
    if (levelChanged) this.lastLevel = level;
  }

  silence(): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const voice of this.voices) voice.gain.gain.setTargetAtTime(0, now, 0.03);
    this.lastLevel = 0;
  }

  stop(): void {
    this.voices.forEach(({ oscillator, gain }) => { try { oscillator.stop(); } catch { /* ya detenido */ } oscillator.disconnect(); gain.disconnect(); });
    this.voices = [];
    this.filter?.disconnect();
    this.master?.disconnect();
    void this.context?.close();
    this.context = null;
    this.filter = null;
    this.master = null;
    this.lastNotes = '';
    this.lastLevel = -1;
    this.lastFilter = -1;
  }
}
