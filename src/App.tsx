import { useState, useEffect } from 'react';
import { Shield, Smartphone, Zap } from 'lucide-react';
import { SirenAudioEngine } from './sirenAudioEngine';
import { CarsonCruiserSiren } from './components/CarsonCruiserSiren';
import { SirenVisualizer } from './components/SirenVisualizer';
import { DualSirenControls } from './components/DualSirenControls';
import { KeybindingsHelp } from './components/KeybindingsHelp';
import { OfflineScriptExporter } from './components/OfflineScriptExporter';

export default function App() {
  const [currentMode, setMode] = useState<'stby' | 'wail' | 'yelp' | 'phsr' | 'horn' | 'manual'>('stby');
  const [isCabinetSim, setIsCabinetSim] = useState(false);
  const [isDualSiren, setIsDualSiren] = useState(true);
  const [globalVolume, setGlobalVolume] = useState(0.75);
  
  // High-fidelity phasing beat tuning variables
  const [pitchOffsetA, setPitchOffsetA] = useState(0);
  const [pitchOffsetB, setPitchOffsetB] = useState(35); // offset to make Siren B sound gorgeously out-of-phase!
  const [speedA, setSpeedA] = useState(1.0);
  const [speedB, setSpeedB] = useState(1.06); // offsets the relative lfo sweep cycle to build beautiful acoustic beat frequencies!
  const [speakerSat, setSpeakerSat] = useState(true);

  // Mapped custom uploaded files references
  const [customMapping, setCustomMapping] = useState<Record<string, { id: string; name: string }>>({});

  // Continuous play / loop lock
  const [isContinuousLoop, setIsContinuousLoop] = useState(false);

  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isMobileMdt, setIsMobileMdt] = useState(false);

  const engine = SirenAudioEngine.getInstance();

  // Detect mobile user agent for automatic MDT console routing
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
        setIsMobileMdt(true);
      }
    }
  }, []);

  // Sync background MediaSession controls
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && isEngineReady) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Cruiser Dual-Tone Siren Panel',
        artist: 'System Calibration Unit active',
        album: 'Carson SA-500 Authentic Emulation',
        artwork: [
          { src: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=120&auto=format&fit=crop', sizes: '128x128', type: 'image/jpeg' },
        ]
      });

      try {
        navigator.mediaSession.setActionHandler('play', () => {
          setMode('wail');
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          setMode('stby');
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          setMode('yelp');
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          setMode('phsr');
        });
      } catch (e) {
        console.warn("MediaSession handlers active", e);
      }
    }
  }, [isEngineReady]);

  // Initialize and keep Web Audio parameters in absolute sync
  const bootstrapAudio = async () => {
    try {
      await engine.init();
      await engine.resume();
      setIsEngineReady(true);
    } catch (e) {
      console.warn("Audio Context init pending user interaction.", e);
    }
  };

  // Synchronize audio engine variables to react states smoothly
  useEffect(() => {
    if (!isEngineReady) return;

    // Compile simple flat target string keys to pass custom uploaded buffer slots
    const customMapKeys: Record<string, string> = {};
    Object.keys(customMapping).forEach((k) => {
      customMapKeys[k] = customMapping[k].id;
    });

    engine.setSirenMode(currentMode, customMapKeys);
  }, [currentMode, customMapping, isEngineReady]);

  useEffect(() => {
    if (!isEngineReady) return;
    engine.isContinuousLoop = isContinuousLoop;
    // Re-trigger current mode to update playing loops instantly
    const customMapKeys: Record<string, string> = {};
    Object.keys(customMapping).forEach((k) => {
      customMapKeys[k] = customMapping[k].id;
    });
    engine.setSirenMode(currentMode, customMapKeys);
  }, [isContinuousLoop, currentMode, customMapping, isEngineReady]);

  useEffect(() => {
    if (!isEngineReady) return;
    engine.toggleCabinSimulator(isCabinetSim);
  }, [isCabinetSim, isEngineReady]);

  useEffect(() => {
    if (!isEngineReady) return;
    engine.setDualSiren(isDualSiren);
  }, [isDualSiren, isEngineReady]);

  useEffect(() => {
    if (!isEngineReady) return;
    engine.setMasterVolume(globalVolume);
  }, [globalVolume, isEngineReady]);

  useEffect(() => {
    if (!isEngineReady || !engine.sirenA) return;
    engine.sirenA.setPitchOffset(pitchOffsetA);
  }, [pitchOffsetA, isEngineReady]);

  useEffect(() => {
    if (!isEngineReady || !engine.sirenB) return;
    engine.sirenB.setPitchOffset(pitchOffsetB);
  }, [pitchOffsetB, isEngineReady]);

  useEffect(() => {
    if (!isEngineReady || !engine.sirenA) return;
    engine.sirenA.setSpeedFactor(speedA);
  }, [speedA, isEngineReady]);

  useEffect(() => {
    if (!isEngineReady || !engine.sirenB) return;
    engine.sirenB.setSpeedFactor(speedB);
  }, [speedB, isEngineReady]);

  useEffect(() => {
    if (!isEngineReady || !engine.sirenA || !engine.sirenB) return;
    engine.sirenA.toggleSpeakerSaturation(speakerSat);
    engine.sirenB.toggleSpeakerSaturation(speakerSat);
  }, [speakerSat, isEngineReady]);

  // Hook global keys inside focused window (t = toggle, 1,2,3,4 = dial mode selectors) - H key is only for horn inside Carson component!
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      
      // Auto-unlock AudioContext on first keyboard button interaction
      if (!isEngineReady) {
        bootstrapAudio();
      }

      if (k === 't') {
        setMode((prev) => (prev === 'stby' ? 'wail' : 'stby'));
      } else if (k === '1') {
        setMode('stby');
      } else if (k === '2') {
        setMode('wail');
      } else if (k === '3') {
        setMode('yelp');
      } else if (k === '4') {
        setMode('phsr');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEngineReady, currentMode]);

  const handleCustomFileLoaded = (mode: string, channel: 'A' | 'B', fileId: string, name: string) => {
    const mapKey = `${channel}_${mode}`;
    setCustomMapping((prev) => ({
      ...prev,
      [mapKey]: { id: fileId, name }
    }));
    // Re-trigger current mode to instantly use loaded buffer
    bootstrapAudio();
  };

  const handleClearCustomMapping = (mapKey: string) => {
    setCustomMapping((prev) => {
      const next = { ...prev };
      delete next[mapKey];
      return next;
    });
  };

  const handleLoadPresetProfile = (profile: 'carson' | 'ttps' | 'erlc' | 'fivem' | 'chp' | 'yt_direct') => {
    // 1. Initialize and synthesize buffers programmatically for chosen profile
    engine.loadProfilePresetClipsAndMap(profile);

    const names = {
      carson: 'Carson SA-500 Preset',
      ttps: 'Trinidad Police Preset',
      yt_direct: 'yIS9KuxCFF8 Direct Preset',
      erlc: 'Calibrated ERLC Preset',
      fivem: 'FiveM Custom Preset',
      chp: 'CHP California Preset'
    };
    const activeLabel = names[profile] || 'Custom Synthesized Preset';

    // 2. Map targets inside react so they are visible inside Upload Hub lists
    setCustomMapping({
      "A_wail": { id: "A_wail", name: `Wail [${activeLabel}]` },
      "A_yelp": { id: "A_yelp", name: `Yelp [${activeLabel}]` },
      "A_phsr": { id: "A_phsr", name: `Phaser [${activeLabel}]` },
      "A_horn": { id: "A_horn", name: `Airhorn [${activeLabel}]` },
      "B_wail": { id: "B_wail", name: `Wail [${activeLabel}]` },
      "B_yelp": { id: "B_yelp", name: `Yelp [${activeLabel}]` },
      "B_phsr": { id: "B_phsr", name: `Phaser [${activeLabel}]` },
      "B_horn": { id: "B_horn", name: `Airhorn [${activeLabel}]` }
    });

    // 3. Connect/Boot AudioContext seamlessly
    bootstrapAudio();
  };

  return (
    <div 
      className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] p-4 md:p-8 flex flex-col gap-6 font-sans antialiased"
      onClick={() => {
        if (!isEngineReady) bootstrapAudio();
      }}
    >
      {/* Decorative top header / banner */}
      <header className="max-w-5xl w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E5E7EB] pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-xs cursor-pointer" onClick={() => setIsMobileMdt(!isMobileMdt)}>
            <Shield className="text-[#1a1a1a] h-6 w-6" />
          </div>
          <div>
            <h1 id="app-title-header" className="font-sans font-bold text-[#1A1A1A] tracking-tight text-xl select-all">
              Cruiser Dual-Tone Siren Soundboard
            </h1>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase tracking-widest font-semibold">
              Vehicle Mod & Roblox ERLC Calibration Deck
            </p>
          </div>
        </div>

        {/* Browser user gesture status box */}
        <div className="flex flex-wrap items-center gap-2">
          {isEngineReady && (
            <button
              onClick={() => setIsMobileMdt(!isMobileMdt)}
              className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-slate-50 shadow-2xs font-mono text-[10px] font-bold text-slate-700 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Smartphone size={11} className="text-blue-600" />
              <span>{isMobileMdt ? 'STANDARD LAYOUT' : 'MOBILE HANDSET CAD'}</span>
            </button>
          )}

          {!isEngineReady ? (
            <div className="px-3.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 font-mono text-[10px] font-bold select-none cursor-pointer flex items-center gap-2 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>🚨 STANDBY — CLICK ANYWHERE TO BOOT AUDIO ENGINE 🚨</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-slate-50 text-slate-600 font-mono text-[10px] font-bold select-none flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span>TS100 SPEAKER COILS ARMED (STEREOPHONIC)</span>
            </div>
          )}
        </div>
      </header>

      {isMobileMdt ? (
        /* Immersive CAD Handheld mobile phone dashboard controller view */
        <div className="flex-1 max-w-sm mx-auto w-full flex flex-col gap-5 p-4 bg-slate-100 text-white rounded-2xl border border-slate-200 shadow-xl self-center my-auto transition-all">
          
          {/* Glowing Top Warning Bar in CAD Handheld */}
          <div className="h-2 flex rounded overflow-hidden">
            <div className={`flex-1 transition-colors duration-200 ${currentMode !== 'stby' ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
            <div className={`flex-1 transition-colors duration-200 ${currentMode !== 'stby' ? 'bg-blue-500 animate-pulse delay-100' : 'bg-slate-300'}`} />
          </div>

          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded bg-amber-500/10 text-amber-600">
                <Shield size={16} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-[#1A1A1A] tracking-tight uppercase">MDT CRUISER CAD</h2>
                <span className="text-[8px] text-slate-500 font-mono font-bold tracking-wider">HANDHELD SIREN LINKED</span>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMdt(false)}
              className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase rounded border border-slate-200 bg-white hover:bg-slate-55 text-slate-800 cursor-pointer shadow-xs transition-all"
            >
              Exit Handset
            </button>
          </div>

          {/* Live Active Status Line */}
          <div className="flex items-center gap-2 justify-center py-2.5 bg-slate-50 rounded border border-slate-200 font-mono text-xs font-black text-center shadow-inner">
            <span className={`h-2.5 w-2.5 rounded-full ${currentMode === 'stby' ? 'bg-amber-500' : 'bg-red-600 animate-bounce'}`} />
            <span className="uppercase text-slate-700 tracking-wide font-black">
              ACTIVE: {currentMode === 'stby' ? 'STANDBY / RAD' : currentMode.toUpperCase()}
            </span>
          </div>

          {/* 4 Extra-Large Warning Presets */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(30);
                setMode(currentMode === 'wail' ? 'stby' : 'wail');
              }}
              className={`relative h-24 rounded-xl border font-bold font-mono tracking-wide text-xs flex flex-col items-center justify-center gap-2 transition cursor-pointer select-none shadow-xs ${
                currentMode === 'wail' 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md' 
                  : 'bg-white border-slate-200 text-slate-750 hover:bg-slate-50'
              }`}
            >
              <span className="text-xl">🚨</span>
              <span className="font-extrabold uppercase">1. WAIL COIL</span>
            </button>

            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(30);
                setMode(currentMode === 'yelp' ? 'stby' : 'yelp');
              }}
              className={`relative h-24 rounded-xl border font-bold font-mono tracking-wide text-xs flex flex-col items-center justify-center gap-2 transition cursor-pointer select-none shadow-xs ${
                currentMode === 'yelp' 
                  ? 'bg-red-600 border-red-400 text-white shadow-md' 
                  : 'bg-white border-slate-200 text-slate-750 hover:bg-slate-50'
              }`}
            >
              <span className="text-xl">⚡</span>
              <span className="font-extrabold uppercase">2. YELP CHIRP</span>
            </button>

            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(30);
                setMode(currentMode === 'phsr' ? 'stby' : 'phsr');
              }}
              className={`relative h-24 rounded-xl border font-bold font-mono tracking-wide text-xs flex flex-col items-center justify-center gap-2 transition cursor-pointer select-none shadow-xs ${
                currentMode === 'phsr' 
                  ? 'bg-purple-600 border-purple-400 text-white shadow-md' 
                  : 'bg-white border-slate-200 text-slate-750 hover:bg-slate-50'
              }`}
            >
              <span className="text-xl">🪐</span>
              <span className="font-extrabold uppercase">3. LASER/PHSR</span>
            </button>

            <button
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(50);
                setMode('stby');
              }}
              className={`relative h-24 rounded-xl border font-bold font-mono tracking-wide text-xs flex flex-col items-center justify-center gap-2 transition cursor-pointer select-none shadow-xs ${
                currentMode === 'stby' 
                  ? 'bg-slate-800 border-slate-600 text-white shadow-inner' 
                  : 'bg-slate-200/50 border-slate-100 text-slate-400'
              }`}
            >
              <span className="text-xl font-medium">🔇</span>
              <span className="font-extrabold uppercase">4. STANDBY</span>
            </button>
          </div>

          {/* Big Touch Paddles for Horn & Manual */}
          <div className="grid grid-cols-2 gap-3">
            {/* Huge Horn button */}
            <button
              onMouseDown={() => {
                if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
                engine.setSirenMode('horn');
              }}
              onMouseUp={() => {
                engine.setSirenMode(currentMode);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
                engine.setSirenMode('horn');
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                engine.setSirenMode(currentMode);
              }}
              className="h-24 rounded-xl bg-slate-900 active:bg-slate-950 text-white font-bold border border-slate-700 font-mono text-xs flex flex-col items-center justify-center cursor-pointer select-none shadow-md"
            >
              <span className="text-xl">📣</span>
              <span className="mt-1 font-extrabold">HORN BLAST</span>
            </button>

            {/* Huge Manual button */}
            <button
              onMouseDown={() => {
                if (navigator.vibrate) navigator.vibrate(40);
                engine.setManualPressed(true);
              }}
              onMouseUp={() => {
                engine.setManualPressed(false);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                if (navigator.vibrate) navigator.vibrate(40);
                engine.setManualPressed(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                engine.setManualPressed(false);
              }}
              className="h-24 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold border border-amber-300 font-mono text-xs flex flex-col items-center justify-center cursor-pointer select-none shadow-md"
            >
              <span className="text-xl">⚠️</span>
              <span className="mt-1 font-extrabold text-slate-900">MANUAL CAP</span>
            </button>
          </div>

          {/* Gain slider */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 font-bold">
              <span className="font-extrabold text-[#1a1a1a]">MDT GAIN AMPLIFIER</span>
              <span>{Math.round(globalVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={globalVolume}
              onChange={(e) => setGlobalVolume(parseFloat(e.target.value))}
              className="w-full accent-[#1a1a1a] bg-slate-305 h-2 rounded cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1 text-[10px]">
            <button
              onClick={() => setIsDualSiren(!isDualSiren)}
              className={`py-2 px-1 rounded border text-center font-mono font-bold transition cursor-pointer shadow-2xs ${
                isDualSiren 
                  ? 'bg-purple-600 border-purple-500 text-white' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              DUAL-TONE: {isDualSiren ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setIsContinuousLoop(!isContinuousLoop)}
              className={`py-2 px-1 rounded border text-center font-mono font-bold transition cursor-pointer shadow-2xs ${
                isContinuousLoop 
                  ? 'bg-emerald-600 border-emerald-500 text-white' 
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              LOOP LOCK: {isContinuousLoop ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      ) : (
        /* Main Grid content center */
        <main className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* QR Code Handset side-dock card */}
          <div className="lg:col-span-12 bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="p-2 border border-[#E5E7EB] rounded-xl bg-slate-50 shrink-0">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(window.location.href)}`} 
                referrerPolicy="no-referrer"
                alt="Siren Connect QR Code" 
                className="w-[110px] h-[110px] object-contain select-none pointer-events-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xs font-bold text-[#1A1A1A] uppercase tracking-wide flex items-center justify-center md:justify-start gap-1.5">
                <Smartphone size={13} className="text-blue-600 animate-bounce" />
                Dual-Tone Handset Console Coupling Mode
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed font-sans max-w-2xl">
                Avoid Alt-Tabbing while driving! Point your physical phone/tablet camera at your desktop screen to instantly project all siren triggers onto a dashboard-mounted CAD control microphone.
              </p>
              <div className="flex gap-2 justify-center md:justify-start mt-0.5">
                <button
                  onClick={() => setIsMobileMdt(true)}
                  className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded border border-slate-700 bg-[#1a1a1a] hover:bg-[#333] text-white flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <Smartphone size={11} />
                  Simulate Handset Layout
                </button>
              </div>
            </div>
          </div>

          {/* Left Column: Carson physical mimic and spectrum visualization */}
          <section className="lg:col-span-6 flex flex-col gap-5 w-full">
            {/* Live Audio Visualizer */}
            <SirenVisualizer />

            {/* Interactive Carson Control Unit Console Mock */}
            <CarsonCruiserSiren
              currentMode={currentMode}
              setMode={setMode}
              isCabinetSim={isCabinetSim}
              toggleCabinetSim={() => setIsCabinetSim(!isCabinetSim)}
              isDualSiren={isDualSiren}
              toggleDualSiren={() => setIsDualSiren(!isDualSiren)}
              globalVolume={globalVolume}
              onVolumeChange={setGlobalVolume}
              isContinuousLoop={isContinuousLoop}
              toggleContinuousLoop={() => setIsContinuousLoop(!isContinuousLoop)}
            />
          </section>

          {/* Right Column: Platform Calibration, Tuning, File uploads */}
          <section className="lg:col-span-6 flex flex-col gap-5 w-full">
            <DualSirenControls
              pitchOffsetA={pitchOffsetA}
              setPitchOffsetA={setPitchOffsetA}
              pitchOffsetB={pitchOffsetB}
              setPitchOffsetB={setPitchOffsetB}
              speedA={speedA}
              setSpeedA={setSpeedA}
              speedB={speedB}
              setSpeedB={setSpeedB}
              speakerSat={speakerSat}
              setSpeakerSat={setSpeakerSat}
              onCustomFileLoaded={handleCustomFileLoaded}
              customMapping={customMapping}
              clearCustomMapping={handleClearCustomMapping}
              onLoadPresetProfile={handleLoadPresetProfile}
            />
          </section>

          {/* Full-width helpers layout footer */}
          <footer className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Keybindings helper card */}
            <KeybindingsHelp />

            {/* Downloadable stand-alone Node terminal script exporter */}
            <OfflineScriptExporter />
          </footer>

        </main>
      )}

      {/* Outer subtle platform meta labels */}
      <div className="max-w-5xl w-full mx-auto flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono select-none pt-4 mt-auto border-t border-[#E5E7EB]">
        <span>SPECTRUM PHASE ANALYSIS DECK v1.6.0</span>
        <span>NO RE-TRANSMISSION COPIES. AUDIBLE LICENSE INTACT.</span>
      </div>
    </div>
  );
}
