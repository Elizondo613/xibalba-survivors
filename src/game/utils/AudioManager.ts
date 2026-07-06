/**
 * All audio — music and SFX — is synthesized live with the Web Audio API
 * instead of streamed from external files. This avoids relying on
 * third-party audio CDNs (broken links, licensing risk, extra load time)
 * while still giving the game an atmospheric, motif-driven soundtrack.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicNodes: { stop: () => void } | null = null;
  private musicOn = true;
  private sfxOn = true;
  private started = false;

  private ensureCtx() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.35;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.masterGain);
    }
    return this.ctx;
  }

  /** Must be called from a user gesture (click/tap) to satisfy autoplay policies. */
  unlock() {
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") ctx.resume();
    if (!this.started) {
      this.started = true;
      this.startMusic();
    }
  }

  setMusicEnabled(on: boolean) {
    this.musicOn = on;
    if (this.musicGain) this.musicGain.gain.value = on ? 0.35 : 0;
  }

  setSfxEnabled(on: boolean) {
    this.sfxOn = on;
  }

  private startMusic() {
    const ctx = this.ensureCtx();
    if (!this.musicGain) return;

    // Low drone pad (two detuned sawtooths through a slow lowpass sweep)
    const droneOsc1 = ctx.createOscillator();
    const droneOsc2 = ctx.createOscillator();
    droneOsc1.type = "sawtooth";
    droneOsc2.type = "sawtooth";
    droneOsc1.frequency.value = 55; // A1
    droneOsc2.frequency.value = 55.6;

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 400;
    droneFilter.Q.value = 1.2;

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.5;

    droneOsc1.connect(droneFilter);
    droneOsc2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.musicGain);

    // Slow filter sweep for atmosphere
    const now = ctx.currentTime;
    const sweep = () => {
      const t = ctx.currentTime;
      droneFilter.frequency.cancelScheduledValues(t);
      droneFilter.frequency.setValueAtTime(droneFilter.frequency.value, t);
      droneFilter.frequency.linearRampToValueAtTime(
        Phaser_Math_Between(250, 650),
        t + 6
      );
    };
    function Phaser_Math_Between(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }
    const sweepInterval = window.setInterval(sweep, 6000);
    sweep();

    droneOsc1.start(now);
    droneOsc2.start(now);

    // Pentatonic flute-like motif plucked at intervals (evokes a distant
    // ceremonial instrument echoing through the underworld)
    const scale = [220, 261.6, 293.7, 349.2, 392.0]; // A minor pentatonic-ish
    let motifTimeout: number;
    const playMotif = () => {
      if (!this.musicOn) {
        motifTimeout = window.setTimeout(playMotif, 2200);
        return;
      }
      const freq = scale[Math.floor(Math.random() * scale.length)] / 2;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.musicGain!);
      const t = ctx.currentTime;
      gain.gain.linearRampToValueAtTime(0.18, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      osc.start(t);
      osc.stop(t + 2);
      motifTimeout = window.setTimeout(playMotif, 1800 + Math.random() * 1600);
    };
    motifTimeout = window.setTimeout(playMotif, 1000);

    this.musicNodes = {
      stop: () => {
        clearInterval(sweepInterval);
        clearTimeout(motifTimeout);
        droneOsc1.stop();
        droneOsc2.stop();
      },
    };
  }

  stopMusic() {
    this.musicNodes?.stop();
    this.musicNodes = null;
    this.started = false;
  }

  private blip(opts: {
    freq: number;
    dur: number;
    type?: OscillatorType;
    slideTo?: number;
    volume?: number;
  }) {
    if (!this.sfxOn) return;
    const ctx = this.ensureCtx();
    if (!this.sfxGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(opts.freq, ctx.currentTime);
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(
        opts.slideTo,
        ctx.currentTime + opts.dur
      );
    }
    gain.gain.setValueAtTime(opts.volume ?? 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + opts.dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + opts.dur);
  }

  private noiseBurst(dur: number, volume = 0.2) {
    if (!this.sfxOn) return;
    const ctx = this.ensureCtx();
    if (!this.sfxGain) return;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
  }

  shoot() {
    this.blip({ freq: 520, slideTo: 220, dur: 0.12, type: "square", volume: 0.12 });
  }
  hit() {
    this.noiseBurst(0.1, 0.18);
  }
  enemyDeath() {
    this.blip({ freq: 180, slideTo: 40, dur: 0.25, type: "sawtooth", volume: 0.16 });
  }
  pickupXp() {
    this.blip({ freq: 700, slideTo: 1100, dur: 0.1, type: "sine", volume: 0.14 });
  }
  levelUp() {
    [440, 554, 659, 880].forEach((f, i) => {
      window.setTimeout(() => this.blip({ freq: f, dur: 0.25, type: "triangle", volume: 0.18 }), i * 90);
    });
  }
  playerHurt() {
    this.blip({ freq: 160, slideTo: 60, dur: 0.2, type: "sawtooth", volume: 0.22 });
  }
  gameOver() {
    [392, 349, 294, 220].forEach((f, i) => {
      window.setTimeout(() => this.blip({ freq: f, dur: 0.5, type: "sawtooth", volume: 0.2 }), i * 220);
    });
  }
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => {
      window.setTimeout(() => this.blip({ freq: f, dur: 0.35, type: "triangle", volume: 0.2 }), i * 140);
    });
  }
}

export const audioManager = new AudioManager();
