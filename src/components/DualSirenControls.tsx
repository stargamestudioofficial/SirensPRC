import React, { useState, useRef } from 'react';
import { Upload, Trash2, Sliders, Waves, Settings, ShieldAlert, Check } from 'lucide-react';
import { SirenAudioEngine } from '../sirenAudioEngine';

interface DualSirenProps {
  pitchOffsetA: number;
  setPitchOffsetA: (hz: number) => void;
  pitchOffsetB: number;
  setPitchOffsetB: (hz: number) => void;
  speedA: number;
  setSpeedA: (factor: number) => void;
  speedB: number;
  setSpeedB: (factor: number) => void;
  speakerSat: boolean;
  setSpeakerSat: (enabled: boolean) => void;
  onCustomFileLoaded: (mode: string, channel: 'A' | 'B', fileId: string, name: string) => void;
  customMapping: Record<string, { id: string; name: string }>;
  clearCustomMapping: (mapKey: string) => void;
  onLoadPresetProfile: (profile: 'carson' | 'ttps' | 'erlc' | 'fivem' | 'chp' | 'actual_sirens') => void;
}

export function DualSirenControls({
  pitchOffsetA,
  setPitchOffsetA,
  pitchOffsetB,
  setPitchOffsetB,
  speedA,
  setSpeedA,
  speedB,
  setSpeedB,
  speakerSat,
  setSpeakerSat,
  onCustomFileLoaded,
  customMapping,
  clearCustomMapping,
  onLoadPresetProfile
}: DualSirenProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'engine'>('presets');
  const [selectedPlatform, setSelectedPlatform] = useState('carson');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const assignChannelRef = useRef<'A' | 'B'>('A');
  const assignModeRef = useRef<'wail' | 'yelp' | 'phsr' | 'horn'>('wail');

  const engine = SirenAudioEngine.getInstance();

  const platforms = {
    carson: {
      name: 'Carson SA-500 Classic',
      desc: 'Authentic analog capacitor charging sweeps (600Hz-1420Hz), throatier slow yelps, and high-frequency metal megaphone coil harmonics.',
      wailHz: 600,
      yelpHz: 3.1,
      phaserHz: 12.8,
    },
    ttps: {
      name: 'Trinidad & Tobago Police',
      desc: 'Powerful Caribbean dual siren rumble! Massive 55Hz chassis-shaking rumbler airhorns, deep slow wails, and screeching 19Hz staccato phaser stutter.',
      wailHz: 480,
      yelpHz: 4.8,
      phaserHz: 19.5,
    },
    actual_sirens: {
      name: 'Actual Sirens',
      desc: 'Authentic, raw concrete slapback reflections, extreme voice-coil driver clipping, analog slow-rise charging sweeps, and heavy sub-rumbler bass sweeps.',
      wailHz: 485,
      yelpHz: 4.8,
      phaserHz: 19.5,
    },
    erlc: {
      name: 'Roblox ERLC Calibrated',
      desc: 'Perfect matching Liberty County siren. Best with Dual-Tone enabled, driving a complementary Wail/Yelp split or dual wail beating.',
      wailHz: 630,
      yelpHz: 3.4,
      phaserHz: 12.5,
    },
    fivem: {
      name: 'FiveM / GTA V Police',
      desc: 'Highly compressed, crisp tactical environment with aggressive high-gain chirps, quick sweeps, and deep speaker cabinet resonance.',
      wailHz: 680,
      yelpHz: 4.2,
      phaserHz: 15.0,
    },
    chp: {
      name: 'CHP California Patrol',
      desc: 'Smooth mechanical-hybrid, iconic super-slow winding 5.8s wail, slower yelps, and smooth airhorns with bypassed metal-compressor clipping.',
      wailHz: 550,
      yelpHz: 2.8,
      phaserHz: 10.0,
    }
  };

  const handlePlatformSelect = (key: keyof typeof platforms) => {
    setSelectedPlatform(key);
    
    // Set parameters based on platform spec
    if (key === 'carson') {
      setPitchOffsetA(0);
      setPitchOffsetB(35); // Slight out of phase Carson beating
      setSpeedA(1.0);
      setSpeedB(1.04);
      setSpeakerSat(true);
    } else if (key === 'ttps') {
      setPitchOffsetA(-90); // Extra deep fundamental A
      setPitchOffsetB(60);  // High piercing tone B
      setSpeedA(0.95);      // Slow, commanding wail A
      setSpeedB(1.22);      // Intense, rapid yelp B
      setSpeakerSat(true);   // Raw saturated driver
    } else if (key === 'actual_sirens') {
      setPitchOffsetA(-115); // Deep base capture offset A
      setPitchOffsetB(45);   // High frequency reflection B
      setSpeedA(0.95);       // Slower heavier analog rise A
      setSpeedB(1.22);       // Frantic staccato Yelp-beating B
      setSpeakerSat(true);   // Extreme camera microphone overdrive clipping
    } else if (key === 'erlc') {
      setPitchOffsetA(0);
      setPitchOffsetB(45); // slight dual-siren offset
      setSpeedA(1.0);
      setSpeedB(1.08); // slightly faster second siren for ERLC beat effect
      setSpeakerSat(true);
    } else if (key === 'fivem') {
      setPitchOffsetA(75);
      setPitchOffsetB(120);
      setSpeedA(1.15);
      setSpeedB(1.25);
      setSpeakerSat(true);
    } else if (key === 'chp') {
      setPitchOffsetA(-90);
      setPitchOffsetB(-60);
      setSpeedA(0.85);
      setSpeedB(0.9);
      setSpeakerSat(false);
    }
  };

  const triggerUploadClick = (channel: 'A' | 'B', mode: 'wail' | 'yelp' | 'phsr' | 'horn') => {
    assignChannelRef.current = channel;
    assignModeRef.current = mode;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadFeedback(null);

    const channel = assignChannelRef.current;
    const mode = assignModeRef.current;
    const baseId = `${channel}_${mode}`;

    try {
      // Decode with audio context and save in singleton engine
      await engine.loadAudioFile(baseId, file);
      onCustomFileLoaded(mode, channel, baseId, file.name);
      setUploadFeedback(`Successfully assigned "${file.name}" to Siren ${channel} ${mode.toUpperCase()}!`);
      setTimeout(() => setUploadFeedback(null), 4000);
    } catch (err) {
      setUploadFeedback(`Error parsing file: Make sure it's a valid MP3 or WAV file.`);
      setTimeout(() => setUploadFeedback(null), 4000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerLoadPresets = () => {
    onLoadPresetProfile(selectedPlatform as any);
    const platformName = platforms[selectedPlatform as keyof typeof platforms]?.name || selectedPlatform;
    setUploadFeedback(`Successfully synthesized and pre-loaded premium authentic ${platformName} audio loops directly to all warning mode channels!`);
    setTimeout(() => setUploadFeedback(null), 5000);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mt-4 flex flex-col gap-4 shadow-xs text-[#1A1A1A]">
      
      {/* Navigation tabs */}
      <div className="flex border-b border-[#E5E7EB] gap-1">
        <button
          id="tab-presets-btn"
          onClick={() => setActiveTab('presets')}
          className={`px-4 py-2 font-mono text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
            activeTab === 'presets' 
              ? 'bg-slate-50 text-[#1a1a1a] border-x border-t border-[#E5E7EB] -mb-[1px]' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ShieldAlert size={12} />
            Platform Presets
          </div>
        </button>
        <button
          id="tab-upload-btn"
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-mono text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
            activeTab === 'upload' 
              ? 'bg-slate-50 text-[#1a1a1a] border-x border-t border-[#E5E7EB] -mb-[1px]' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Upload size={12} />
            Dual Siren Uploads
          </div>
        </button>
        <button
          id="tab-engine-btn"
          onClick={() => setActiveTab('engine')}
          className={`px-4 py-2 font-mono text-xs font-bold rounded-t-lg transition-all cursor-pointer ${
            activeTab === 'engine' 
              ? 'bg-slate-50 text-[#1a1a1a] border-x border-t border-[#E5E7EB] -mb-[1px]' 
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Sliders size={12} />
            Frequency Tuner
          </div>
        </button>
      </div>

      {/* Hidden file selector */}
      <input
        id="siren-audio-uploader-input"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*"
        className="hidden"
      />

      {/* Upload/Assignment Action Indicator Log */}
      {uploadFeedback && (
        <div className={`p-3 rounded-lg text-xs font-mono border ${
          uploadFeedback.includes('Error') 
            ? 'bg-red-50 border-red-200 text-red-700' 
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          <div className="flex items-start gap-2">
            <div className="mt-0.5 font-bold">ℹ Log:</div>
            <div>{uploadFeedback}</div>
          </div>
        </div>
      )}

      {/* Contents based on active tab */}
      {activeTab === 'presets' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 font-sans leading-relaxed">
            Quickly calibrate your speaker parameters to match popular platform physics. Dual siren beating occurs automatically in ERLC mode to create that rich, heavy wobble.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(platforms) as Array<keyof typeof platforms>).map((key) => {
              const item = platforms[key];
              const isSelected = selectedPlatform === key;
              return (
                <button
                  key={key}
                  id={`preset-${key}-btn`}
                  onClick={() => handlePlatformSelect(key)}
                  className={`p-3.5 rounded-lg border text-left transition-all flex flex-col gap-1.5 cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-50 border-[#1a1a1a] text-[#1a1a1a]' 
                      : 'bg-white border-[#E5E7EB] text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-mono text-xs font-bold text-[#1a1a1a]">{item.name}</span>
                    {isSelected && <Check size={14} className="text-[#1a1a1a]" />}
                  </div>
                  <span className="text-[10px] text-slate-500 leading-normal font-sans">{item.desc}</span>
                </button>
              );
            })}
          </div>

          {selectedPlatform && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-sans">
              <div className="flex-1">
                <span className="text-xs font-bold text-red-800 block">⚡ Synthesize & Load {platforms[selectedPlatform as keyof typeof platforms]?.name} Loops</span>
                <span className="text-[10px] text-red-600 font-medium">Instantly compile, generate, and map 4 premium continuous-looping electronic warning audio files (Wail, Yelp, Phaser, and Horn) directly to the dual channels!</span>
              </div>
              <button
                id="load-erlc-preset-sounds-btn"
                onClick={triggerLoadPresets}
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs border border-red-700"
              >
                <Waves size={11} />
                Load Preset Sounds
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-slate-50 border border-[#E5E7EB] rounded-lg text-xs text-[#1a1a1a] flex flex-col gap-1.5 font-sans leading-relaxed">
            <span className="font-mono font-bold uppercase tracking-wider block text-slate-700">★ Dual Custom Siren Upload Hub</span>
            <span className="text-slate-500 text-[11px]">You can upload custom audio files (e.g. yelp.mp3, wail.mp3, yelp.wav) to Siren Channel A (Left) and Siren Channel B (Right) to create custom dual sirens! Loops are set automatically to make sure wail/yelp/phaser behave correctly.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Primary Channel A */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 flex flex-col gap-3">
              <span className="font-mono text-xs font-bold text-red-600 border-b border-[#E5E7EB] pb-1.5 block">
                SIREN CHANNEL A (LEFT SIDE SPEAKER)
              </span>
              
              {['wail', 'yelp', 'phsr', 'horn'].map((mode) => {
                const mapKey = `A_${mode}`;
                const fileMapped = customMapping[mapKey];

                return (
                  <div key={mode} className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-[#E5E7EB] text-xs">
                    <span className="font-mono font-bold text-[#1a1a1a] uppercase">{mode}</span>
                    <div className="flex items-center gap-2">
                       {fileMapped ? (
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#E5E7EB] max-w-[140px] overflow-hidden truncate font-mono">
                          <span className="text-[10px] text-green-700 font-medium max-w-[110px] truncate" title={fileMapped.name}>
                            {fileMapped.name}
                          </span>
                          <button
                            id={`clear-a-${mode}`}
                            onClick={() => clearCustomMapping(mapKey)}
                            className="text-red-500 hover:text-red-700 transition cursor-pointer scale-90"
                            title="Remove mapped sound"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`upload-a-${mode}`}
                          onClick={() => triggerUploadClick('A', mode as any)}
                          className="px-2.5 py-1 rounded bg-white text-[#1a1a1a] border border-[#E5E7EB] hover:bg-slate-50 text-[10px] transition font-mono flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <Upload size={10} />
                          Upload Sound
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Secondary Channel B */}
            <div className="bg-white rounded-lg border border-[#E5E7EB] p-4 flex flex-col gap-3">
              <span className="font-mono text-xs font-bold text-blue-600 border-b border-[#E5E7EB] pb-1.5 block">
                SIREN CHANNEL B (RIGHT SIDE SPEAKER)
              </span>
              
              {['wail', 'yelp', 'phsr', 'horn'].map((mode) => {
                const mapKey = `B_${mode}`;
                const fileMapped = customMapping[mapKey];

                return (
                  <div key={mode} className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-[#E5E7EB] text-xs">
                    <span className="font-mono font-bold text-[#1a1a1a] uppercase">{mode}</span>
                    <div className="flex items-center gap-2">
                       {fileMapped ? (
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#E5E7EB] max-w-[140px] overflow-hidden truncate font-mono">
                          <span className="text-[10px] text-green-700 font-medium max-w-[110px] truncate" title={fileMapped.name}>
                            {fileMapped.name}
                          </span>
                          <button
                            id={`clear-b-${mode}`}
                            onClick={() => clearCustomMapping(mapKey)}
                            className="text-red-500 hover:text-red-700 transition cursor-pointer scale-90"
                            title="Remove mapped sound"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`upload-b-${mode}`}
                          onClick={() => triggerUploadClick('B', mode as any)}
                          className="px-2.5 py-1 rounded bg-white text-[#1a1a1a] border border-[#E5E7EB] hover:bg-slate-50 text-[10px] transition font-mono flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <Upload size={10} />
                          Upload Sound
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {activeTab === 'engine' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs font-mono">
          
          {/* Frequencies Siren 1 */}
          <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg border border-[#E5E7EB]">
            <span className="text-red-600 font-bold tracking-wide uppercase block text-[10px]">SIREN SPEAKER A INDEPENDENT MIX</span>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>PITCH OFFSET:</span>
                <span>{pitchOffsetA > 0 ? `+${pitchOffsetA}` : pitchOffsetA} Hz</span>
              </div>
              <input
                id="freq-range-a"
                type="range"
                min="-200"
                max="250"
                step="5"
                value={pitchOffsetA}
                onChange={(e) => setPitchOffsetA(parseInt(e.target.value))}
                className="w-full accent-red-600 bg-slate-200 h-1 rounded cursor-pointer animate-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>CYCLES SWEEP RATE:</span>
                <span>{speedA.toFixed(2)}x</span>
              </div>
              <input
                id="speed-range-a"
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={speedA}
                onChange={(e) => setSpeedA(parseFloat(e.target.value))}
                className="w-full accent-red-600 bg-slate-200 h-1 rounded cursor-pointer animate-none"
              />
            </div>
          </div>

          {/* Frequencies Siren 2 */}
          <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg border border-[#E5E7EB]">
            <span className="text-blue-600 font-bold tracking-wide uppercase block text-[10px]">SIREN SPEAKER B INDEPENDENT MIX</span>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>PITCH OFFSET:</span>
                <span>{pitchOffsetB > 0 ? `+${pitchOffsetB}` : pitchOffsetB} Hz</span>
              </div>
              <input
                id="freq-range-b"
                type="range"
                min="-200"
                max="250"
                step="5"
                value={pitchOffsetB}
                onChange={(e) => setPitchOffsetB(parseInt(e.target.value))}
                className="w-full accent-blue-600 bg-slate-200 h-1 rounded cursor-pointer animate-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>CYCLES SWEEP RATE:</span>
                <span>{speedB.toFixed(2)}x</span>
              </div>
              <input
                id="speed-range-b"
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={speedB}
                onChange={(e) => setSpeedB(parseFloat(e.target.value))}
                className="w-full accent-blue-600 bg-slate-200 h-1 rounded cursor-pointer animate-none"
              />
            </div>
          </div>

          {/* Electronic saturation box */}
          <div className="col-span-1 md:col-span-2 p-3 bg-slate-50 border border-[#E5E7EB] rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <div className="flex flex-col font-sans">
              <span className="font-bold text-[#1a1a1a] text-xs">Overdriven Coil Saturation (100W TS100 Speaker)</span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 leading-normal">Mimics physical metal megaphone horn harmonics compression to produce a realistic raspy squeal rather than sterile electronic waves.</span>
            </div>
            <button
              id="speaker-sat-toggle"
              onClick={() => setSpeakerSat(!speakerSat)}
              className={`px-3 py-1.5 rounded text-[10px] font-bold border transition cursor-pointer whitespace-nowrap ${
                speakerSat 
                  ? 'bg-red-50 text-red-700 border-red-200' 
                  : 'bg-white text-slate-600 border-[#E5E7EB] hover:bg-slate-100'
              }`}
            >
              {speakerSat ? 'SATURATION: ON (100W SURGE)' : 'SATURATION: OFF (BYPASS)'}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
