export interface SirenConfig {
  minFreq: number;
  maxFreq: number;
  sweepRate: number; // in Hz (or seconds per cycle)
  waveform: OscillatorType;
}

export interface PresetProfile {
  name: string;
  description: string;
  wail: SirenConfig;
  yelp: SirenConfig;
  phsr: SirenConfig;
  horn: {
    baseFreq1: number;
    baseFreq2: number;
    baseFreq3: number;
    noiseMix: number; // 0 to 1
  };
}

export interface CustomFileSound {
  id: string;
  name: string;
  fileName: string;
  dataUrl: string; // Base64 or local ObjectURL
  isLoop: boolean;
  assignedTo: 'wail' | 'yelp' | 'phsr' | 'horn' | 'manual' | 'none';
}

export interface KeyBindings {
  toggleSiren: string;      // default: 't'
  manualSiren: string;      // default: 'v'
  horn: string;             // default: 'g' or ' ' (Space)
  modeStandby: string;      // default: '1'
  modeWail: string;         // default: '2'
  modeYelp: string;         // default: '3'
  modePhaser: string;       // default: '4'
  secondarySirenToggle: string; // default: 'u' (for dual siren)
}
