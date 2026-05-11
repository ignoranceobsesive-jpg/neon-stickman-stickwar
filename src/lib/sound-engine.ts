// ====== NEON STICKMAN: SOUND ENGINE ======
// Web Audio API procedural sounds — optimized for smooth performance

export interface SoundSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  musicVolume: 0.5,
  musicEnabled: true,
  sfxEnabled: true,
};

const SOUND_SAVE_KEY = 'neonStickman_sound_v1';

// Pre-allocated noise buffer size (reused for all noise sounds)
const NOISE_BUFFER_SAMPLES = 4410; // 0.1 seconds at 44100Hz

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicPlaying = false;
  private bossMusicPlaying = false;
  private menuMusicPlaying = false;
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private bossMusicInterval: ReturnType<typeof setInterval> | null = null;
  private menuMusicInterval: ReturnType<typeof setInterval> | null = null;

  // Pre-created noise buffer (reused instead of allocating each time)
  private noiseBuffer: AudioBuffer | null = null;
  private shortNoiseBuffer: AudioBuffer | null = null;

  // Throttle SFX to avoid stacking too many sounds
  private lastSfxTime: Record<string, number> = {};
  private readonly SFX_THROTTLE_MS = 50; // Minimum ms between same SFX

  // Active node count limit to prevent audio overload
  private activeNodeCount = 0;
  private readonly MAX_ACTIVE_NODES = 30;

  // Throttle ensureCtx resume calls
  private lastResumeTime = 0;
  private readonly RESUME_THROTTLE_MS = 500;

  masterVolume = 0.7;
  sfxVolume = 0.8;
  musicVolume = 0.5;
  musicEnabled = true;
  sfxEnabled = true;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      // Pre-create noise buffers
      this.noiseBuffer = this.createNoiseBuffer(NOISE_BUFFER_SAMPLES);
      this.shortNoiseBuffer = this.createNoiseBuffer(2205); // 0.05s
    } catch {
      // AudioContext not supported
    }
  }

  private createNoiseBuffer(samples: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const buffer = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private ensureCtx() {
    if (!this.ctx) this.init();
    if (this.ctx?.state === 'suspended') {
      const now = performance.now();
      if (now - this.lastResumeTime >= this.RESUME_THROTTLE_MS) {
        this.lastResumeTime = now;
        this.ctx.resume();
      }
    }
  }

  // Check if a sound type was played too recently (throttle)
  private canPlaySfx(type: string): boolean {
    const now = performance.now();
    const last = this.lastSfxTime[type] || 0;
    if (now - last < this.SFX_THROTTLE_MS) return false;
    this.lastSfxTime[type] = now;
    return true;
  }

  setMasterVolume(v: number) {
    this.masterVolume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
    this.saveSettings();
  }

  setSfxVolume(v: number) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
    this.saveSettings();
  }

  setMusicVolume(v: number) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
    this.saveSettings();
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!enabled) this.stopMusic();
    else if (this.ctx) this.startMusic();
    this.saveSettings();
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    this.saveSettings();
  }

  // ====== HELPER: create oscillator with envelope ======
  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 0.3,
    freqEnd?: number,
  ) {
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    if (this.ctx.state !== 'running') return;
    if (this.activeNodeCount >= this.MAX_ACTIVE_NODES) return;
    this.ensureCtx();
    try {
      this.activeNodeCount++;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (freqEnd !== undefined) {
        osc.frequency.linearRampToValueAtTime(freqEnd, this.ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
      osc.onended = () => { this.activeNodeCount = Math.max(0, this.activeNodeCount - 1); };
    } catch {
      this.activeNodeCount = Math.max(0, this.activeNodeCount - 1);
    }
  }

  // Noise burst - now uses PRE-CREATED buffer (no allocation!)
  private playNoise(duration: number, volume: number = 0.3, filterFreq?: number) {
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    if (this.ctx.state !== 'running') return;
    if (this.activeNodeCount >= this.MAX_ACTIVE_NODES) return;
    this.ensureCtx();
    try {
      this.activeNodeCount++;
      const source = this.ctx.createBufferSource();
      const buf = this.noiseBuffer || this.shortNoiseBuffer;
      if (!buf) { this.activeNodeCount = Math.max(0, this.activeNodeCount - 1); return; }
      source.buffer = buf;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      if (filterFreq) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = filterFreq;
        filter.Q.value = 2;
        source.connect(filter);
        filter.connect(gain);
      } else {
        source.connect(gain);
      }
      gain.connect(this.sfxGain);
      source.start(this.ctx.currentTime);
      source.stop(this.ctx.currentTime + duration);
      source.onended = () => { this.activeNodeCount = Math.max(0, this.activeNodeCount - 1); };
    } catch {
      this.activeNodeCount = Math.max(0, this.activeNodeCount - 1);
    }
  }

  // Combined tone + noise
  private playToneNoise(
    freq: number, duration: number, type: OscillatorType = 'sine',
    toneVol: number = 0.2, noiseVol: number = 0.15, noiseDur?: number,
  ) {
    this.playTone(freq, duration, type, toneVol);
    this.playNoise(noiseDur ?? duration, noiseVol);
  }

  // ====== SOUND EFFECTS (with throttling) ======

  playShoot() {
    if (!this.canPlaySfx('shoot')) return;
    this.playTone(800, 0.15, 'square', 0.15, 400);
  }

  playDash() {
    if (!this.canPlaySfx('dash')) return;
    this.playNoise(0.15, 0.2, 2000);
  }

  playShield() {
    if (!this.canPlaySfx('shield')) return;
    this.playTone(220, 0.12, 'sine', 0.12);
    this.playTone(330, 0.12, 'sine', 0.1);
    setTimeout(() => {
      this.playTone(220, 0.1, 'sine', 0.08);
      this.playTone(330, 0.1, 'sine', 0.06);
    }, 120);
  }

  playSpecial() {
    this.playTone(200, 0.3, 'square', 0.15, 800);
  }

  playHit() {
    if (!this.canPlaySfx('hit')) return;
    this.playToneNoise(100, 0.08, 'sine', 0.12, 0.15, 0.06);
  }

  playExplosion() {
    if (!this.canPlaySfx('explosion')) return;
    this.playNoise(0.4, 0.25, 200);
    this.playTone(60, 0.4, 'sine', 0.2, 20);
  }

  playJump() {
    if (!this.canPlaySfx('jump')) return;
    this.playTone(300, 0.08, 'sine', 0.12, 600);
  }

  playEnemyDeath() {
    if (!this.canPlaySfx('enemyDeath')) return;
    this.playTone(600, 0.15, 'square', 0.1, 100);
  }

  playBossHit() {
    if (!this.canPlaySfx('bossHit')) return;
    this.playTone(80, 0.2, 'sawtooth', 0.15, 40);
    this.playNoise(0.1, 0.15, 500);
  }

  playWaveComplete() {
    const notes = [440, 554, 659];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.15), i * 150);
    });
  }

  playLevelComplete() {
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.2), i * 150);
    });
  }

  // Simple, pleasant victory jingle for PvP — no harsh noise
  playVersusVictory() {
    const notes = [523, 659, 784]; // C5, E5, G5 — a clean major triad
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.12), i * 200);
    });
  }

  playGameOver() {
    this.playTone(300, 0.8, 'sawtooth', 0.15, 50);
  }

  playMenuClick() {
    this.playTone(1000, 0.04, 'sine', 0.1);
  }

  playMenuHover() {
    this.playTone(600, 0.02, 'sine', 0.06);
  }

  playCoinCollect() {
    if (!this.canPlaySfx('coin')) return;
    this.playTone(1200, 0.08, 'sine', 0.1);
    setTimeout(() => this.playTone(1500, 0.08, 'sine', 0.08), 40);
  }

  playAbilityReady() {
    this.playTone(800, 0.12, 'sine', 0.1, 1000);
  }

  playDamage() {
    if (!this.canPlaySfx('damage')) return;
    this.playNoise(0.1, 0.15);
    this.playTone(80, 0.08, 'sine', 0.12);
  }

  // ====== PET SOUNDS ======
  playPetShoot() {
    if (!this.canPlaySfx('petShoot')) return;
    this.playTone(1400, 0.06, 'square', 0.08, 900);
  }

  playPetDeath() {
    this.playTone(500, 0.4, 'sine', 0.12, 100);
    setTimeout(() => this.playTone(350, 0.2, 'sine', 0.08, 150), 150);
  }

  playPetRespawn() {
    this.playTone(400, 0.12, 'sine', 0.1, 800);
  }

  // ====== DRAMATIC SOUNDS ======
  playDramaticMoment() {
    const notes = [220, 330, 440, 660];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.25, 'sine', 0.15), i * 80);
    });
  }

  playReinforcement() {
    this.playTone(440, 0.12, 'sine', 0.15);
    setTimeout(() => this.playTone(554, 0.12, 'sine', 0.12), 80);
    setTimeout(() => this.playTone(880, 0.2, 'sine', 0.18), 160);
  }

  playBossEnrage() {
    this.playTone(100, 0.4, 'sawtooth', 0.2, 50);
    this.playNoise(0.2, 0.15, 300);
  }

  // ====== VICTORY FANFARE (new) ======
  playVictoryFanfare() {
    if (!this.sfxEnabled || !this.ctx || !this.sfxGain) return;
    // Triumphant ascending fanfare: C-E-G-C(high)-E(high)
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'sine', 0.18);
        // Add a harmony tone a fifth above
        if (i < 3) {
          this.playTone(freq * 1.5, 0.25, 'sine', 0.06);
        }
      }, i * 180);
    });
    // Final chord
    setTimeout(() => {
      this.playTone(523, 0.6, 'sine', 0.12);
      this.playTone(659, 0.6, 'sine', 0.1);
      this.playTone(784, 0.6, 'sine', 0.1);
    }, 180 * 5 + 100);
  }

  // ====== BACKGROUND MUSIC — GAMEPLAY (improved, more dynamic) ======

  startMusic() {
    if (!this.musicEnabled || this.musicPlaying || this.bossMusicPlaying || this.menuMusicPlaying || !this.ctx || !this.musicGain) return;
    this.ensureCtx();
    this.musicPlaying = true;

    const bpm = 140;
    const beatMs = (60 / bpm) * 1000;

    const playKick = () => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.15);
    };

    // OPTIMIZED: Reuse pre-created noise buffer for hihat
    const playHihat = () => {
      if (!this.ctx || !this.musicGain || !this.shortNoiseBuffer) return;
      const source = this.ctx.createBufferSource();
      source.buffer = this.shortNoiseBuffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      source.start(this.ctx.currentTime);
      source.stop(this.ctx.currentTime + 0.04);
    };

    // Snare on beats 2 & 4
    const playSnare = () => {
      if (!this.ctx || !this.musicGain || !this.shortNoiseBuffer) return;
      // Noise component
      const source = this.ctx.createBufferSource();
      source.buffer = this.shortNoiseBuffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 1;
      source.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.musicGain);
      source.start(this.ctx.currentTime);
      source.stop(this.ctx.currentTime + 0.1);
      // Tone component
      const osc = this.ctx.createOscillator();
      const toneGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 180;
      toneGain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      toneGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
      osc.connect(toneGain);
      toneGain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.06);
    };

    // Prominent bass line with filter sweep
    const playBass = (freq: number, duration: number = 0.15) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      // Filter sweep for movement
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + duration);
      filter.Q.value = 5; // Resonance for cool sound
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    };

    // Melody line — simple repeating pattern
    const playMelody = (freq: number) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2500;
      filter.Q.value = 2;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.1);
    };

    // Arpeggio synth
    const playArp = (freq: number) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.08);
    };

    // 16-beat pattern for more rhythmic variation
    const bassNotes = [55, 55, 55, 65, 55, 55, 73, 55, 55, 55, 55, 65, 73, 73, 65, 55];
    const melodyNotes = [330, 0, 392, 0, 440, 0, 392, 330, 330, 0, 0, 392, 440, 0, 392, 0]; // 0 = silence
    const arpNotes = [220, 277, 330, 277, 220, 277, 330, 370, 220, 277, 330, 277, 370, 330, 277, 220];
    let beatIndex = 0;

    this.musicInterval = setInterval(() => {
      if (!this.musicPlaying) return;
      const measure = beatIndex % 16;
      // Kick on 1, 5, 9, 13
      if (measure === 0 || measure === 4 || measure === 8 || measure === 12) playKick();
      // Snare on beats 4, 12
      if (measure === 4 || measure === 12) playSnare();
      // Hihat on every even beat
      if (measure % 2 === 0) playHihat();
      // Bass - more active
      if (measure % 2 === 0 || measure === 3 || measure === 7 || measure === 11 || measure === 15) {
        const dur = measure % 4 === 0 ? 0.2 : 0.1;
        playBass(bassNotes[measure], dur);
      }
      // Melody
      if (melodyNotes[measure] > 0 && measure % 2 === 0) {
        playMelody(melodyNotes[measure]);
      }
      // Arp on every beat
      if (measure % 2 === 0) {
        playArp(arpNotes[measure]);
      }
      beatIndex++;
    }, beatMs / 2); // Half-beat resolution for 16th notes
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  // ====== MENU MUSIC (slower, more atmospheric) ======

  startMenuMusic() {
    if (!this.musicEnabled || this.menuMusicPlaying || this.musicPlaying || this.bossMusicPlaying || !this.ctx || !this.musicGain) return;
    this.ensureCtx();
    this.menuMusicPlaying = true;

    const bpm = 90; // Much slower for atmospheric feel
    const beatMs = (60 / bpm) * 1000;

    const playAmbientPad = (freq: number, duration: number) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value = 1;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    };

    const playMenuBass = (freq: number) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 250;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.4);
    };

    const playMenuKick = () => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.15);
    };

    // Ambient pad progression: Am - F - C - G (in low register)
    const padFreqs = [
      [110, 165, 220],  // Am
      [87, 131, 175],   // F
      [65, 98, 131],    // C
      [98, 147, 196],   // G
    ];
    const bassFreqs = [55, 43, 65, 49]; // A2, F2, C2, G2
    let beatIndex = 0;

    this.menuMusicInterval = setInterval(() => {
      if (!this.menuMusicPlaying) return;
      const measure = beatIndex % 16;

      // Kick every 4 beats
      if (measure === 0 || measure === 8) playMenuKick();
      // Bass on beats 0, 4, 8, 12
      if (measure === 0 || measure === 4 || measure === 8 || measure === 12) {
        const chordIdx = Math.floor(measure / 4);
        playMenuBass(bassFreqs[chordIdx]);
      }
      // Ambient pad — sustained, changes every 4 beats
      if (measure === 0) {
        const chordIdx = Math.floor(beatIndex / 4) % 4;
        const freqs = padFreqs[chordIdx];
        for (const f of freqs) {
          playAmbientPad(f, 2.5);
        }
      }
      // Subtle high ping on beats 2, 6, 10, 14
      if (measure === 2 || measure === 6 || measure === 10 || measure === 14) {
        if (!this.ctx || !this.musicGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880 + Math.sin(beatIndex * 0.1) * 100;
        gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.15);
      }

      beatIndex++;
    }, beatMs);
  }

  stopMenuMusic() {
    this.menuMusicPlaying = false;
    if (this.menuMusicInterval) {
      clearInterval(this.menuMusicInterval);
      this.menuMusicInterval = null;
    }
  }

  // ====== BOSS BATTLE MUSIC (faster, more intense - optimized) ======

  startBossMusic() {
    if (!this.musicEnabled || this.bossMusicPlaying || !this.ctx || !this.musicGain) return;
    this.ensureCtx();
    // Stop regular and menu music first
    this.stopMusic();
    this.stopMenuMusic();
    this.bossMusicPlaying = true;

    const bpm = 180;
    const beatMs = (60 / bpm) * 1000;

    const playBossKick = () => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.12);
    };

    // OPTIMIZED: Reuse pre-created noise buffer
    const playBossHihat = () => {
      if (!this.ctx || !this.musicGain || !this.shortNoiseBuffer) return;
      const source = this.ctx.createBufferSource();
      source.buffer = this.shortNoiseBuffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 10000;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      source.start(this.ctx.currentTime);
      source.stop(this.ctx.currentTime + 0.025);
    };

    const playBossBass = (freq: number) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.12);
      filter.Q.value = 4;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.12);
    };

    const playBossLead = (freq: number) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.08);
    };

    const bassNotes = [41, 41, 49, 41, 55, 55, 49, 41];
    const leadNotes = [330, 0, 440, 0, 330, 0, 494, 440]; // 0 = silence
    let beatIndex = 0;

    this.bossMusicInterval = setInterval(() => {
      if (!this.bossMusicPlaying) return;
      const measure = beatIndex % 8;
      if (measure === 0 || measure === 2 || measure === 4 || measure === 6) playBossKick();
      playBossHihat();
      if (measure % 2 === 0) {
        playBossBass(bassNotes[measure]);
      }
      if (leadNotes[measure] > 0 && measure % 2 === 0) {
        playBossLead(leadNotes[measure]);
      }
      beatIndex++;
    }, beatMs);
  }

  stopBossMusic() {
    this.bossMusicPlaying = false;
    if (this.bossMusicInterval) {
      clearInterval(this.bossMusicInterval);
      this.bossMusicInterval = null;
    }
  }

  isBossMusicPlaying() {
    return this.bossMusicPlaying;
  }

  stopAll() {
    this.stopMusic();
    this.stopBossMusic();
    this.stopMenuMusic();
  }

  // ====== SETTINGS PERSISTENCE ======

  saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      const settings: SoundSettings = {
        masterVolume: this.masterVolume,
        sfxVolume: this.sfxVolume,
        musicVolume: this.musicVolume,
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
      };
      localStorage.setItem(SOUND_SAVE_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
  }

  loadSettings(): SoundSettings {
    try {
      if (typeof window === 'undefined') return { ...DEFAULT_SOUND_SETTINGS };
      const raw = localStorage.getItem(SOUND_SAVE_KEY);
      if (!raw) return { ...DEFAULT_SOUND_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<SoundSettings>;
      const settings = { ...DEFAULT_SOUND_SETTINGS, ...parsed };
      this.masterVolume = settings.masterVolume;
      this.sfxVolume = settings.sfxVolume;
      this.musicVolume = settings.musicVolume;
      this.musicEnabled = settings.musicEnabled;
      this.sfxEnabled = settings.sfxEnabled;
      if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
      if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
      if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
      return settings;
    } catch {
      return { ...DEFAULT_SOUND_SETTINGS };
    }
  }
}

export const soundEngine = new SoundEngine();
