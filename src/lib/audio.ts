/**
 * GymLite Audio & Haptic Engine
 * 100% Web Audio API synthesizer. Zero external audio downloads.
 * Generates distinct athletic alerts and triggers device haptics.
 */

export type SoundType = 'chime' | 'boxing' | 'pulse' | 'high_beep';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return null;

      try {
        this.ctx = new AudioCtxClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      } catch (e) {
        console.warn('GymLite: Web Audio Context could not be created:', e);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /**
   * Ensure audio context is ready on first user touch / interaction
   */
  public prepare() {
    this.initContext();
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    }
  }

  /**
   * Plays the rest timer finished alert
   */
  public playAlert(type: SoundType = 'chime', volume: number = 0.8) {
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    this.setVolume(volume);

    switch (type) {
      case 'boxing':
        this.playBoxingBell(ctx);
        break;
      case 'high_beep':
        this.playHighBeep(ctx);
        break;
      case 'pulse':
        this.playPulse(ctx);
        break;
      case 'chime':
      default:
        this.playChime(ctx);
        break;
    }

    // Suspend audio context immediately after sound finishes to release audio focus back to music players
    setTimeout(() => {
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    }, 1500);
  }

  /**
   * Subtle tick for final 3-2-1 countdown seconds
   */
  public playCountdownTick(second: number) {
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(second === 1 ? 880 : 587.33, now); // Higher pitch on last second

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Sound 1: Four-Tone Ascending Crystal Chime (C5, E5, G5, C6)
   */
  private playChime(ctx: AudioContext) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.11;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }

  /**
   * Sound 2: Resonant Boxing Bell (Ring of the round timer)
   */
  private playBoxingBell(ctx: AudioContext) {
    const now = ctx.currentTime;
    // Two bell rings 150ms apart
    [0, 0.22].forEach((offset) => {
      const startTime = now + offset;
      // Fundamental + overtones
      const frequencies = [880, 1760, 2640, 3520];
      const weights = [0.4, 0.25, 0.15, 0.08];

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(weights[idx], startTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.85);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(startTime);
        osc.stop(startTime + 0.9);
      });
    });
  }

  /**
   * Sound 3: High Double Beep (Athletic Stopwatch tone)
   */
  private playHighBeep(ctx: AudioContext) {
    const now = ctx.currentTime;
    const beeps = [
      { freq: 987.77, start: 0, dur: 0.12 },     // B5
      { freq: 1318.51, start: 0.16, dur: 0.22 } // E6
    ];

    beeps.forEach(({ freq, start, dur }) => {
      const startTime = now + start;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square'; // Classic digital watch tone
      osc.frequency.setValueAtTime(freq, startTime);

      // Lowpass filter for smooth round tone without harsh piercing high buzz
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + dur + 0.02);
    });
  }

  /**
   * Sound 4: Tri-Tone Energy Pulse
   */
  private playPulse(ctx: AudioContext) {
    const now = ctx.currentTime;
    const chords = [587.33, 739.99, 880.0]; // D5, F#5, A5
    chords.forEach((freq, idx) => {
      const startTime = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }
}

export const soundEngine = new SoundSynthesizer();
