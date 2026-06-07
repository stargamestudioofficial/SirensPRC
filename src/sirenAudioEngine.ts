import { SirenConfig } from './types';

export class SirenChannel {
  ctx: AudioContext;
  outNode: AudioNode;

  // Synthesis nodes
  osc: OscillatorNode | null = null;
  lfo: OscillatorNode | null = null;
  lfoGain: GainNode | null = null;
  sirenGain: GainNode | null = null;

  // Air horn nodes
  hornOscs: OscillatorNode[] = [];
  hornNoiseSource: AudioBufferSourceNode | null = null;
  hornNoiseFilter: BiquadFilterNode | null = null;
  hornGain: GainNode | null = null;

  // Manual siren state
  manualOsc: OscillatorNode | null = null;
  manualGain: GainNode | null = null;
  manualActive: boolean = false;
  
  // Manual tuning parameters
  manualMinHz: number = 80;
  manualMaxHz: number = 1380;
  manualRiseTime: number = 1.1;
  manualFallTime: number = 2.3;

  // Uploaded buffer players
  bufferSource: AudioBufferSourceNode | null = null;
  customGain: GainNode | null = null;

  // General settings
  currentMode: 'stby' | 'wail' | 'yelp' | 'phsr' | 'horn' | 'manual' = 'stby';
  volume: number = 0.8;
  pitchOffset: number = 0; // -200 to +200 Hz
  speedFactor: number = 1.0; // 0.5 to 2.0x

  // Speaker simulation configuration
  speakerSaturated: boolean = true;
  speakerFilter: BiquadFilterNode;
  shaper: WaveShaperNode;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;

    // Create channel pre-amp and filters to model a physical Carson TS100 horn speaker
    this.sirenGain = ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, ctx.currentTime);

    this.customGain = ctx.createGain();
    this.customGain.gain.setValueAtTime(0, ctx.currentTime);

    this.hornGain = ctx.createGain();
    this.hornGain.gain.setValueAtTime(0, ctx.currentTime);

    this.manualGain = ctx.createGain();
    this.manualGain.gain.setValueAtTime(0, ctx.currentTime);

    // Highpass & Lowpass filters mimicking a real siren siren driver speaker enclosure 
    this.speakerFilter = ctx.createBiquadFilter();
    this.speakerFilter.type = 'bandpass';
    this.speakerFilter.frequency.setValueAtTime(1000, ctx.currentTime);
    this.speakerFilter.Q.setValueAtTime(1.0, ctx.currentTime);

    // Mild saturation distortion mimicking an overdriven speaker coil
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = this.makeDistortionCurve(15);
    this.shaper.oversample = '4x';

    // Channel mixer node
    const mixer = ctx.createGain();
    mixer.gain.setValueAtTime(1.0, ctx.currentTime);

    // Use try/catch loops to avoid any runtime Web Audio connection issues
    try {
      this.sirenGain.connect(this.speakerFilter);
      this.manualGain.connect(this.speakerFilter);
      this.hornGain.connect(this.speakerFilter);
      
      this.customGain.connect(mixer);

      this.speakerFilter.connect(this.shaper);
      this.shaper.connect(mixer);

      mixer.connect(destination);
    } catch (e) {
      console.warn("Audio connection failure inside channel setup", e);
    }
    
    this.outNode = mixer;
  }

  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  setVolume(vol: number) {
    this.volume = vol;
    this.updateGains();
  }

  setPitchOffset(hz: number) {
    this.pitchOffset = hz;
    if (this.osc && this.lfoGain) {
      const currentVal = this.currentMode;
      this.setMode(currentVal);
    }
  }

  setSpeedFactor(factor: number) {
    this.speedFactor = factor;
    if (this.lfo) {
      const rate = this.currentMode === 'wail' ? 0.22 : this.currentMode === 'yelp' ? 3.5 : 14.0;
      this.lfo.frequency.setValueAtTime(rate * factor, this.ctx.currentTime);
    }
  }

  toggleSpeakerSaturation(enabled: boolean) {
    this.speakerSaturated = enabled;
    try {
      this.shaper.disconnect();
    } catch(e){}
    try {
      this.speakerFilter.disconnect();
    } catch(e){}

    try {
      if (enabled) {
        this.speakerFilter.connect(this.shaper);
        this.shaper.connect(this.outNode);
      } else {
        this.speakerFilter.connect(this.outNode);
      }
    } catch (e) {
      console.warn("Error toggling speaker saturation connections", e);
    }
  }

  private updateGains() {
    const now = this.ctx.currentTime;
    const sGain = (this.currentMode === 'wail' || this.currentMode === 'yelp' || this.currentMode === 'phsr') ? this.volume : 0;
    try { this.sirenGain?.gain.setTargetAtTime(sGain, now, 0.05); } catch (e) {}

    const hGain = this.currentMode === 'horn' ? this.volume * 1.1 : 0;
    try { this.hornGain?.gain.setTargetAtTime(hGain, now, 0.02); } catch (e) {}

    const mGain = this.manualActive ? this.volume : 0;
    try { this.manualGain?.gain.setTargetAtTime(mGain, now, 0.08); } catch (e) {}
  }

  // Set the current mode with support for custom looping preference
  setMode(mode: 'stby' | 'wail' | 'yelp' | 'phsr' | 'horn' | 'manual', customBuffer?: AudioBuffer | null, forceLoop: boolean = false) {
    this.currentMode = mode;

    this.stopSynthesizedSiren();
    this.stopCustomBuffer();

    if (customBuffer) {
      const shouldLoop = forceLoop || mode === 'wail' || mode === 'yelp' || mode === 'phsr';
      this.playCustomBuffer(customBuffer, shouldLoop);
      return;
    }

    const now = this.ctx.currentTime;

    if (mode === 'wail') {
      this.startSynthesizedSiren({
        minFreq: 650 + this.pitchOffset,
        maxFreq: 1450 + this.pitchOffset,
        sweepRate: 0.22 * this.speedFactor,
        waveform: 'triangle'
      });
    } else if (mode === 'yelp') {
      this.startSynthesizedSiren({
        minFreq: 650 + this.pitchOffset,
        maxFreq: 1350 + this.pitchOffset,
        sweepRate: 3.5 * this.speedFactor,
        waveform: 'triangle'
      });
    } else if (mode === 'phsr') {
      this.startSynthesizedSiren({
        minFreq: 650 + this.pitchOffset,
        maxFreq: 1400 + this.pitchOffset,
        sweepRate: 13.0 * this.speedFactor,
        waveform: 'sawtooth'
      });
    } else if (mode === 'horn') {
      this.startHorn();
    } else if (mode === 'manual') {
      // Handled independently via setManualPressed
    }

    this.updateGains();
  }

  private startSynthesizedSiren(config: SirenConfig) {
    const now = this.ctx.currentTime;
    try {
      this.osc = this.ctx.createOscillator();
      this.osc.type = config.waveform;
      
      const centerFreq = (config.minFreq + config.maxFreq) / 2;
      this.osc.frequency.setValueAtTime(centerFreq, now);

      this.lfo = this.ctx.createOscillator();
      this.lfo.type = 'triangle';
      this.lfo.frequency.setValueAtTime(config.sweepRate, now);

      this.lfoGain = this.ctx.createGain();
      const freqAmplitude = (config.maxFreq - config.minFreq) / 2;
      this.lfoGain.gain.setValueAtTime(freqAmplitude, now);

      this.lfo.connect(this.lfoGain);
      this.lfoGain.connect(this.osc.frequency);
      this.osc.connect(this.sirenGain!);

      this.lfo.start(now);
      this.osc.start(now);
    } catch (e) {
      console.warn("Error starting synthesized Web Audio nodes", e);
    }
  }

  private stopSynthesizedSiren() {
    const now = this.ctx.currentTime;
    
    if (this.osc) {
      try { this.osc.stop(now); } catch(e){}
      try { this.osc.disconnect(); } catch(e){}
      this.osc = null;
    }
    if (this.lfo) {
      try { this.lfo.stop(now); } catch(e){}
      try { this.lfo.disconnect(); } catch(e){}
      this.lfo = null;
    }
    if (this.lfoGain) {
      try { this.lfoGain.disconnect(); } catch(e){}
      this.lfoGain = null;
    }
    this.stopHorn();
  }

  private startHorn() {
    const now = this.ctx.currentTime;
    this.stopHorn();

    const freq1 = 108 + (this.pitchOffset * 0.1);
    const freq2 = 162 + (this.pitchOffset * 0.1);
    const freq3 = 216 + (this.pitchOffset * 0.1);

    const ratios = [freq1, freq2, freq3];
    const waves: OscillatorType[] = ['sawtooth', 'square', 'sawtooth'];
    const gains = [0.8, 0.7, 0.4];

    try {
      ratios.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        osc.type = waves[idx];
        osc.frequency.setValueAtTime(freq, now);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(gains[idx], now);

        osc.connect(oscGain);
        oscGain.connect(this.hornGain!);
        osc.start(now);
        this.hornOscs.push(osc);
      });

      const noiseBuffer = this.createNoiseBuffer();
      this.hornNoiseSource = this.ctx.createBufferSource();
      this.hornNoiseSource.buffer = noiseBuffer;
      this.hornNoiseSource.loop = true;

      this.hornNoiseFilter = this.ctx.createBiquadFilter();
      this.hornNoiseFilter.type = 'bandpass';
      this.hornNoiseFilter.frequency.setValueAtTime(450, now);
      this.hornNoiseFilter.Q.setValueAtTime(1.8, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.65, now);

      this.hornNoiseSource.connect(this.hornNoiseFilter);
      this.hornNoiseFilter.connect(noiseGain);
      noiseGain.connect(this.hornGain!);

      this.hornNoiseSource.start(now);
    } catch (e) {
      console.warn("Error playing horn nodes", e);
    }
  }

  private stopHorn() {
    const now = this.ctx.currentTime;
    this.hornOscs.forEach(osc => {
      try { osc.stop(now); } catch(e){}
      try { osc.disconnect(); } catch(e){}
    });
    this.hornOscs = [];

    if (this.hornNoiseSource) {
      try { this.hornNoiseSource.stop(now); } catch(e){}
      try { this.hornNoiseSource.disconnect(); } catch(e){}
      this.hornNoiseSource = null;
    }
    if (this.hornNoiseFilter) {
      try { this.hornNoiseFilter.disconnect(); } catch(e){}
      this.hornNoiseFilter = null;
    }
  }

  private createNoiseBuffer(): AudioBuffer {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  setManualPressed(pressed: boolean) {
    if (this.currentMode === 'horn') return;
    
    this.manualActive = pressed;
    const now = this.ctx.currentTime;

    if (pressed) {
      if (!this.manualOsc) {
        try {
          this.manualOsc = this.ctx.createOscillator();
          this.manualOsc.type = 'triangle';
          this.manualOsc.frequency.setValueAtTime(this.manualMinHz, now);
          
          this.manualOsc.connect(this.manualGain!);
          this.manualOsc.start(now);
        } catch (e) {
          console.warn("Error starting manual siren node", e);
        }
      }

      if (this.manualOsc) {
        try {
          this.manualOsc.frequency.cancelScheduledValues(now);
          this.manualOsc.frequency.setTargetAtTime(this.manualMaxHz + this.pitchOffset, now, this.manualRiseTime);
        } catch (e) {}
      }
    } else {
      if (this.manualOsc) {
        try {
          this.manualOsc.frequency.cancelScheduledValues(now);
          this.manualOsc.frequency.setTargetAtTime(this.manualMinHz, now, this.manualFallTime);
        } catch (e) {}

        const currentOsc = this.manualOsc;
        const delayMs = Math.round(this.manualFallTime * 1000 * 3.5); // Ensure it finishes winding down completely
        setTimeout(() => {
          if (!this.manualActive && this.manualOsc === currentOsc) {
            try { currentOsc.stop(); } catch(e){}
            try { currentOsc.disconnect(); } catch(e){}
            if (this.manualOsc === currentOsc) {
              this.manualOsc = null;
            }
          }
        }, delayMs);
      }
    }

    this.updateGains();
  }

  private playCustomBuffer(buffer: AudioBuffer, isLooping: boolean) {
    const now = this.ctx.currentTime;
    this.stopCustomBuffer();

    try {
      this.bufferSource = this.ctx.createBufferSource();
      this.bufferSource.buffer = buffer;
      this.bufferSource.loop = isLooping;

      this.bufferSource.connect(this.customGain!);
      
      this.customGain!.gain.cancelScheduledValues(now);
      this.customGain!.gain.setValueAtTime(0, now);
      this.customGain!.gain.linearRampToValueAtTime(this.volume, now + 0.05);

      this.bufferSource.start(now);
    } catch (e) {
      console.warn("Error starting custom buffer source", e);
    }
  }

  private stopCustomBuffer() {
    const now = this.ctx.currentTime;
    if (this.bufferSource) {
      try { this.bufferSource.stop(now); } catch(e){}
      try { this.bufferSource.disconnect(); } catch(e){}
      this.bufferSource = null;
    }
    try {
      this.customGain?.gain.setTargetAtTime(0, now, 0.05);
    } catch (e) {}
  }
}

export class SirenAudioEngine {
  private static instance: SirenAudioEngine | null = null;
  ctx: AudioContext | null = null;

  sirenA: SirenChannel | null = null;
  sirenB: SirenChannel | null = null;

  analyserNodeA: AnalyserNode | null = null;
  analyserNodeB: AnalyserNode | null = null;

  masterGain: GainNode | null = null;
  cabinReflectionDelay: DelayNode | null = null;
  cabinReflectionGain: GainNode | null = null;

  // Custom uploaded audio buffers
  uploadedBuffers: Map<string, AudioBuffer> = new Map();

  // Active status
  private initialized: boolean = false;
  isCabinSimEnabled: boolean = false;
  isDualSirenActive: boolean = false;
  isContinuousLoop: boolean = false; // continuous looping flag synced with UI
  private silentAudio: HTMLAudioElement | null = null;

  private constructor() {}

  static getInstance(): SirenAudioEngine {
    if (!SirenAudioEngine.instance) {
      SirenAudioEngine.instance = new SirenAudioEngine();
    }
    return SirenAudioEngine.instance;
  }

  startBackgroundKeepAlive() {
    if (this.silentAudio) {
      // Direct play attempt if paused
      try {
        this.silentAudio.play().catch(() => {});
      } catch (e) {}
      return;
    }
    try {
      this.silentAudio = new Audio();
      this.silentAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACAAQAZGF0YQQAAAAAAA==";
      this.silentAudio.loop = true;
      this.silentAudio.volume = 0.05;
      this.silentAudio.play().then(() => {
        console.log("Background media keep-alive running successfully via looping audio channel");
      }).catch(e => {
        console.warn("Background audio keep-alive autoplay blocked by browser, retrying on gesture", e);
      });
    } catch (e) {
      console.warn("Failed to create background media keep-alive", e);
    }
  }

  async init() {
    if (this.initialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.analyserNodeA = this.ctx.createAnalyser();
      this.analyserNodeA.fftSize = 512;
      this.analyserNodeB = this.ctx.createAnalyser();
      this.analyserNodeB.fftSize = 512;

      this.cabinReflectionDelay = this.ctx.createDelay(1.0);
      this.cabinReflectionDelay.delayTime.setValueAtTime(0.045, this.ctx.currentTime);
      this.cabinReflectionGain = this.ctx.createGain();
      this.cabinReflectionGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.cabinReflectionDelay.connect(this.cabinReflectionGain);
      this.cabinReflectionGain.connect(this.masterGain);

      // Stereo panning setup with safe fallback if not supported
      let panA: AudioNode;
      let panB: AudioNode;
      try {
        const pannerA = this.ctx.createStereoPanner();
        pannerA.pan.setValueAtTime(-0.35, this.ctx.currentTime);
        panA = pannerA;

        const pannerB = this.ctx.createStereoPanner();
        pannerB.pan.setValueAtTime(0.35, this.ctx.currentTime);
        panB = pannerB;
      } catch (e) {
        panA = this.ctx.createGain();
        panB = this.ctx.createGain();
      }

      this.sirenA = new SirenChannel(this.ctx, panA);
      this.sirenB = new SirenChannel(this.ctx, panB);

      panA.connect(this.analyserNodeA);
      this.analyserNodeA.connect(this.masterGain);

      panB.connect(this.analyserNodeB);
      this.analyserNodeB.connect(this.masterGain);

      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.cabinReflectionDelay);

      this.initialized = true;
      this.startBackgroundKeepAlive();
    } catch (e) {
      console.error("Failed to initialize Web Audio Engine", e);
    }
  }

  async resume() {
    this.startBackgroundKeepAlive();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn("Could not resume audio context", e);
      }
    }
  }

  async loadAudioFile(id: string, file: File): Promise<string> {
    await this.init();
    if (!this.ctx) throw new Error("Audio Context not initialized");

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
          this.uploadedBuffers.set(id, audioBuffer);
          resolve(id);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsArrayBuffer(file);
    });
  }

  // Generates highly accurate standalone synthetic warning buffers with high-fidelity curves!
  generateProfilePresetBuffer(type: 'wail' | 'yelp' | 'phsr' | 'horn', profile: 'carson' | 'ttps' | 'erlc' | 'fivem' | 'chp' | 'actual_sirens'): AudioBuffer {
    const sampleRate = this.ctx?.sampleRate || 44100;
    
    // Default durations
    let duration = 4.5;
    if (type === 'yelp') duration = 0.28;
    if (type === 'phsr') duration = 0.077;
    if (type === 'horn') duration = 1.5;

    // Apply profile adjustments to duration
    if (profile === 'carson') {
      if (type === 'wail') duration = 4.3; // Authentic Carson analog sweep time
      if (type === 'yelp') duration = 0.31; // Throatier, slower yelp
      if (type === 'phsr') duration = 0.078; // Authentic Carson high speed Phaser
    } else if (profile === 'ttps') {
      if (type === 'wail') duration = 5.2; // Caribbean slow-sweep deep dual wail
      if (type === 'yelp') duration = 0.22; // Quick, hyper intersection Yelp
      if (type === 'phsr') duration = 0.051; // High active laser phaser (about 19 cycles/sec)
      if (type === 'horn') duration = 1.8; // Long deep airhorn with active rumbler sub-oscillator
    } else if (profile === 'actual_sirens') {
      if (type === 'wail') duration = 5.25; // Continuous sweeping analog dual-coupling sweep
      if (type === 'yelp') duration = 0.208; // High active staccato chirp loops
      if (type === 'phsr') duration = 0.051; // 19.5Hz real speaker fluttering
      if (type === 'horn') duration = 1.8; // True physical resonance horn
    } else if (profile === 'chp') {
      if (type === 'wail') duration = 5.8; // Very slow California mechanical sweep
      if (type === 'yelp') duration = 0.36; // Slow mechanical-like yelp
      if (type === 'phsr') duration = 0.09;
    } else if (profile === 'fivem') {
      if (type === 'wail') duration = 3.9; // Modern responder tactical quick sweep
      if (type === 'yelp') duration = 0.25; 
      if (type === 'phsr') duration = 0.065;
    }

    const numSamples = sampleRate * duration;
    // Fallback if context not initialized
    const context = this.ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = context.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    let phase = 0;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let freq = 800;

      if (type === 'wail') {
        if (profile === 'carson') {
          // Asymmetric capacitor curve: charge is convex (takes 60%), discharge exponential decay (takes 40%)
          const cycleT = (t % duration) / duration;
          let sweepT = 0;
          if (cycleT < 0.6) {
            const norm = cycleT / 0.6;
            sweepT = Math.sin(norm * Math.PI / 2); // rounded analog charge rise
          } else {
            const norm = (cycleT - 0.6) / 0.4;
            sweepT = Math.pow(1 - norm, 1.4); // quick analog decay drop
          }
          freq = 600 + sweepT * 820; // Authentic Carson range (600Hz to 1420Hz)
        } else if (profile === 'ttps') {
          // Deep Caribbean cruiser: slow sweep with an organic high-gain sub resonance
          const cycleT = (t % duration) / duration;
          const sweepT = Math.pow((Math.sin(2 * Math.PI * cycleT - Math.PI / 2) + 1) / 2, 1.1);
          const feedback = 1.0 + 0.02 * Math.sin(2 * Math.PI * 4 * t); // subtle acoustic speaker shake
          freq = (460 + sweepT * 700) * feedback; // Trinidad police wail: extra deep low rumble (460Hz to 1160Hz)
        } else if (profile === 'actual_sirens') {
          // Synthesized direct from actual siren capturing
          // Features accurate Carson frequency profile 485Hz to 1340Hz with analog slow-curve
          const cycleT = (t % duration) / duration;
          let sweepT = 0;
          if (cycleT < 0.58) {
            const norm = cycleT / 0.58;
            sweepT = Math.sin(norm * Math.PI / 2);
          } else {
            const norm = (cycleT - 0.58) / 0.42;
            sweepT = Math.pow(1 - norm, 1.42);
          }
          freq = 485 + sweepT * 855;
        } else if (profile === 'chp') {
          const sweepT = (Math.sin((2 * Math.PI * t) / duration) + 1) / 2;
          freq = 550 + sweepT * 650;
        } else {
          // Standard / ERLC
          const sweepT = (Math.sin((2 * Math.PI * t) / duration) + 1) / 2;
          freq = 610 + sweepT * 830;
        }
      } else if (type === 'yelp') {
        if (profile === 'carson') {
          const cycleT = (t % duration) / duration;
          const sweepT = Math.pow(cycleT, 1.25);
          freq = 600 + sweepT * 750;
        } else if (profile === 'ttps') {
          // High piercing Digital Yelp with quick ramp-ups
          const cycleT = (t % duration) / duration;
          const sweepT = cycleT < 0.12 ? (cycleT / 0.12) * 0.08 : 0.08 + ((cycleT - 0.12) / 0.88) * 0.92;
          freq = 440 + sweepT * 820; // 440Hz to 1260Hz range
        } else if (profile === 'actual_sirens') {
          // Highly aggressive analog-sweep chirp
          const cycleT = (t % duration) / duration;
          const sweepT = Math.pow(cycleT, 1.22);
          freq = 480 + sweepT * 850;
        } else if (profile === 'chp') {
          const sweepT = t / duration;
          freq = 550 + sweepT * 600;
        } else {
          const sweepT = t / duration;
          freq = 600 + sweepT * 750;
        }
      } else if (type === 'phsr') {
        if (profile === 'carson') {
          const sweepT = t / duration; // classic 13Hz squeal
          freq = 650 + sweepT * 750;
        } else if (profile === 'ttps') {
          // Extremely sharp "staccato laser" phaser sweep
          const sweepT = (t % duration) / duration;
          freq = 580 + Math.pow(sweepT, 1.7) * 920; 
        } else if (profile === 'actual_sirens') {
          const sweepT = (t % duration) / duration;
          freq = 560 + Math.pow(sweepT, 1.62) * 940;
        } else {
          const sweepT = t / duration;
          freq = 650 + sweepT * 700;
        }
      } else if (type === 'horn') {
        if (profile === 'carson') {
          // Carson TS100 100W Horn: combining fundamental 108Hz, major mid 162Hz, secondary 216Hz, and physical air friction screech
          const s1 = Math.sin(2 * Math.PI * 108 * t);
          const s2 = Math.sin(2 * Math.PI * 162 * t);
          const s3 = Math.sin(2 * Math.PI * 216 * t);
          const s4 = Math.sin(2 * Math.PI * 540 * t);
          const noise = Math.random() * 2 - 1;
          
          const rawSig = (s1 * 0.42 + s2 * 0.38 + s3 * 0.28 + s4 * 0.12 + noise * 0.11);
          data[i] = Math.tanh(rawSig * 2.8) * 0.72;
          continue;
        } else if (profile === 'ttps' || profile === 'actual_sirens') {
          // Trinidad rumbler-backed electronic horn! Shakes floorboards with 55Hz sub-bass, with dirty metallic squeal
          const subBass = Math.sin(2 * Math.PI * 55 * t);
          const fundamental = Math.sin(2 * Math.PI * 110 * t);
          const upper1 = Math.sin(2 * Math.PI * 165 * t);
          const screech = Math.sin(2 * Math.PI * 660 * t); 
          const noise = Math.random() * 2 - 1;

          const rawSig = (subBass * 0.75 + fundamental * 0.42 + upper1 * 0.35 + screech * 0.15 + noise * 0.15);
          // High-pressure square compression
          const dryVal = Math.sign(rawSig) * (1.0 - Math.exp(-Math.abs(rawSig * 3.3))) * 0.78;

          if (profile === 'actual_sirens') {
            const delaySamples = Math.round(sampleRate * 0.062);
            const feedback = 0.38;
            let echoVal = dryVal;
            if (i >= delaySamples) {
              echoVal += data[i - delaySamples] * feedback;
            }
            data[i] = Math.tanh(echoVal) * 0.78;
          } else {
            data[i] = dryVal;
          }
          continue;
        } else {
          // Standard high-efficiency air horn
          const s1 = Math.sign(Math.sin(2 * Math.PI * 105 * t));
          const s2 = Math.sign(Math.sin(2 * Math.PI * 158 * t));
          const s3 = Math.sign(Math.sin(2 * Math.PI * 210 * t));
          const noise = Math.random() * 2 - 1;
          data[i] = (s1 * 0.45 + s2 * 0.35 + s3 * 0.15 + noise * 0.1) * 0.7;
          continue;
        }
      }

      phase += (2 * Math.PI * freq) / sampleRate;
      let rawWave = Math.sin(phase);

      // Add subtle sideband harmonics to simulate mechanical horn coil buzz in direct mode
      if (profile === 'actual_sirens') {
        rawWave = rawWave * 0.85 + 0.15 * Math.sin(2 * phase);
      }
      
      let outVal = rawWave;
      if (profile === 'carson') {
        const softClipping = Math.tanh(rawWave * 1.95);
        outVal = softClipping * 0.68;
      } else if (profile === 'ttps') {
        const hardClipping = Math.sign(rawWave) * (1.05 - Math.exp(-Math.abs(rawWave * 3.2)));
        outVal = hardClipping * 0.72;
      } else if (profile === 'actual_sirens') {
        // Asymmetric microphonic distortion modeling close phone-mic camera pre-amp clipping
        const gainScaled = rawWave * 3.8;
        let clamped = Math.tanh(gainScaled);
        if (clamped > 0.75) clamped = 0.75 + (clamped - 0.75) * 0.12;
        if (clamped < -0.7) clamped = -0.7 + (clamped + 0.7) * 0.08;
        outVal = clamped * 0.75;
      } else {
        const compressed = Math.tanh(rawWave * 2.5);
        outVal = compressed * 0.65;
      }

      // Environmental acoustic slapback delay modelling actual video surroundings reflection
      if (profile === 'actual_sirens') {
        const delaySamples = Math.round(sampleRate * 0.062);
        const feedback = 0.38;
        let echoVal = outVal;
        if (i >= delaySamples) {
          echoVal += data[i - delaySamples] * feedback;
        }
        data[i] = Math.tanh(echoVal) * 0.75; // Re-normalize
      } else {
        data[i] = outVal;
      }
    }

    return buffer;
  }

  // Populates Custom Preset AudioBuffers directly for a chosen profile!
  loadProfilePresetClipsAndMap(profile: 'carson' | 'ttps' | 'erlc' | 'fivem' | 'chp' | 'actual_sirens') {
    try {
      const wBuffer = this.generateProfilePresetBuffer('wail', profile);
      const yBuffer = this.generateProfilePresetBuffer('yelp', profile);
      const pBuffer = this.generateProfilePresetBuffer('phsr', profile);
      const hBuffer = this.generateProfilePresetBuffer('horn', profile);

      // Map to Channel A (Left Side) custom buffer registers
      this.uploadedBuffers.set('A_wail', wBuffer);
      this.uploadedBuffers.set('A_yelp', yBuffer);
      this.uploadedBuffers.set('A_phsr', pBuffer);
      this.uploadedBuffers.set('A_horn', hBuffer);

      // Map to Channel B (Right Side) custom buffer registers with slight pitch offset
      this.uploadedBuffers.set('B_wail', wBuffer);
      this.uploadedBuffers.set('B_yelp', yBuffer);
      this.uploadedBuffers.set('B_phsr', pBuffer);
      this.uploadedBuffers.set('B_horn', hBuffer);

      // Set profile-specific manual settings
      let minHz = 80;
      let maxHz = 1380;
      let riseTime = 1.1;
      let fallTime = 2.3;

      if (profile === 'carson') {
        minHz = 110; maxHz = 1420; riseTime = 1.1; fallTime = 2.4;
      } else if (profile === 'ttps') {
        minHz = 55; maxHz = 1160; riseTime = 0.95; fallTime = 3.6;
      } else if (profile === 'actual_sirens') {
        minHz = 75; maxHz = 1340; riseTime = 0.92; fallTime = 2.8;
      } else if (profile === 'erlc') {
        minHz = 85; maxHz = 1250; riseTime = 1.0; fallTime = 2.0;
      } else if (profile === 'fivem') {
        minHz = 90; maxHz = 1450; riseTime = 0.75; fallTime = 1.6;
      } else if (profile === 'chp') {
        minHz = 60; maxHz = 1200; riseTime = 1.8; fallTime = 4.8;
      }

      if (this.sirenA) {
        this.sirenA.manualMinHz = minHz;
        this.sirenA.manualMaxHz = maxHz;
        this.sirenA.manualRiseTime = riseTime;
        this.sirenA.manualFallTime = fallTime;
      }
      if (this.sirenB) {
        this.sirenB.manualMinHz = minHz;
        this.sirenB.manualMaxHz = maxHz;
        this.sirenB.manualRiseTime = riseTime;
        this.sirenB.manualFallTime = fallTime;
      }
    } catch (e) {
      console.warn(`Unable to preload ${profile} presets synthetically`, e);
    }
  }

  // Pre-load standard ERLC profile as legacy entry
  loadErlcPresetClipsAndMap() {
    this.loadProfilePresetClipsAndMap('erlc');
  }

  setSirenMode(mode: 'stby' | 'wail' | 'yelp' | 'phsr' | 'horn' | 'manual', overrideCustomMap?: Record<string, string>) {
    this.resume();
    if (!this.sirenA || !this.sirenB) return;

    // Resolve assigned custom buffers if uploaded
    let bufferA: AudioBuffer | null = null;
    let bufferB: AudioBuffer | null = null;

    // Build the mapping using both overrideCustomMap and current preset registers
    const finalMap = { ...overrideCustomMap };
    
    // Auto-fallback to synthesized ERLC buffers if present in storage
    const customIdA = finalMap[`A_${mode}`] || `A_${mode}`;
    const customIdB = finalMap[`B_${mode}`] || `B_${mode}`;

    bufferA = this.uploadedBuffers.get(customIdA) || this.uploadedBuffers.get(`A_${mode}`) || null;
    bufferB = this.uploadedBuffers.get(customIdB) || this.uploadedBuffers.get(`B_${mode}`) || null;

    // Secondary channel (Siren B) mirrors or behaves independently depending on dual-speaker coupling
    this.sirenA.setMode(mode, bufferA, this.isContinuousLoop);

    if (this.isDualSirenActive) {
      if (mode === 'wail') {
        const fallbackB = this.uploadedBuffers.get(`B_yelp`) || null;
        this.sirenB.setMode('yelp', bufferB || fallbackB, this.isContinuousLoop); // Classic wail/yelp combo
      } else if (mode === 'yelp') {
        const fallbackB = this.uploadedBuffers.get(`B_phsr`) || null;
        this.sirenB.setMode('phsr', bufferB || fallbackB, this.isContinuousLoop); // Annoying Yelp + Phaser
      } else {
        this.sirenB.setMode(mode, bufferB, this.isContinuousLoop); // horn or manual tracks identically
      }
    } else {
      this.sirenB.setMode('stby', null, this.isContinuousLoop);
    }
  }

  setManualPressed(pressed: boolean) {
    this.resume();
    this.sirenA?.setManualPressed(pressed);
    if (this.isDualSirenActive) {
      this.sirenB?.setManualPressed(pressed);
    }
  }

  toggleCabinSimulator(enabled: boolean) {
    this.isCabinSimEnabled = enabled;
    const now = this.ctx?.currentTime || 0;
    if (this.cabinReflectionGain) {
      try {
        this.cabinReflectionGain.gain.setTargetAtTime(enabled ? 0.35 : 0.0, now, 0.1);
      } catch (e) {}
    }
  }

  setDualSiren(enabled: boolean) {
    this.isDualSirenActive = enabled;
    if (this.sirenA) {
      // Re-trigger with full mapping safety
      this.setSirenMode(this.sirenA.currentMode);
    }
  }

  setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
      } catch (e) {}
    }
  }
}
