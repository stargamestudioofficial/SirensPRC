import { useState, useEffect } from 'react';
import { Volume2, Power, Zap, Compass, VolumeX, Repeat } from 'lucide-react';
import { SirenAudioEngine } from '../sirenAudioEngine';

interface CarsonProps {
  currentMode: 'stby' | 'wail' | 'yelp' | 'phsr' | 'horn' | 'manual';
  setMode: (mode: 'stby' | 'wail' | 'yelp' | 'phsr' | 'horn' | 'manual') => void;
  isCabinetSim: boolean;
  toggleCabinetSim: () => void;
  isDualSiren: boolean;
  toggleDualSiren: () => void;
  globalVolume: number;
  onVolumeChange: (v: number) => void;
  isContinuousLoop: boolean;
  toggleContinuousLoop: () => void;
}

export function CarsonCruiserSiren({
  currentMode,
  setMode,
  isCabinetSim,
  toggleCabinetSim,
  isDualSiren,
  toggleDualSiren,
  globalVolume,
  onVolumeChange,
  isContinuousLoop,
  toggleContinuousLoop
}: CarsonProps) {
  const [isPowered, setIsPowered] = useState(true);
  const [isManualHeld, setIsManualHeld] = useState(false);
  const [isHornHeld, setIsHornHeld] = useState(false);
  const [radialAngle, setRadialAngle] = useState(0);

  const engine = SirenAudioEngine.getInstance();

  const modes = [
    { key: 'stby', label: 'RAD/STBY', angle: -70 },
    { key: 'wail', label: 'WAIL', angle: -25 },
    { key: 'yelp', label: 'YELP', angle: 20 },
    { key: 'phsr', label: 'PHASER', angle: 65 }
  ];

  // Map internal state to dial perspective
  useEffect(() => {
    const activeMode = modes.find(m => m.key === currentMode);
    if (activeMode) {
      setRadialAngle(activeMode.angle);
    }
  }, [currentMode]);

  const handleDialClick = (modeKey: 'stby' | 'wail' | 'yelp' | 'phsr') => {
    if (!isPowered) return;
    setMode(modeKey);
  };

  const cycleModeForward = () => {
    if (!isPowered) return;
    const currentIndex = modes.findIndex(m => m.key === currentMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex].key as any);
  };

  const cycleModeBackward = () => {
    if (!isPowered) return;
    const currentIndex = modes.findIndex(m => m.key === currentMode);
    const prevIndex = currentIndex === 0 ? modes.length - 1 : currentIndex - 1;
    setMode(modes[prevIndex].key as any);
  };

  // Toggle or hold actions for MANUAL
  const handleManualMouseDown = () => {
    if (!isPowered) return;
    if (isContinuousLoop) {
      const nextVal = !isManualHeld;
      setIsManualHeld(nextVal);
      engine.setManualPressed(nextVal);
    } else {
      setIsManualHeld(true);
      engine.setManualPressed(true);
    }
  };

  const handleManualMouseUp = () => {
    if (isContinuousLoop) return; // ignore mouseup on continuous toggle mode
    setIsManualHeld(false);
    engine.setManualPressed(false);
  };

  // Toggle or hold actions for HORN
  const handleHornMouseDown = () => {
    if (!isPowered) return;
    if (isContinuousLoop) {
      const nextVal = !isHornHeld;
      setIsHornHeld(nextVal);
      if (nextVal) {
        engine.setSirenMode('horn');
      } else {
        const priorRotaryMode = modes.find(m => m.key === currentMode) ? currentMode : 'stby';
        engine.setSirenMode(priorRotaryMode as any);
      }
    } else {
      setIsHornHeld(true);
      engine.setSirenMode('horn');
    }
  };

  const handleHornMouseUp = () => {
    if (isContinuousLoop) return; // ignore mouseup on continuous toggle mode
    setIsHornHeld(false);
    const priorRotaryMode = modes.find(m => m.key === currentMode) ? currentMode : 'stby';
    engine.setSirenMode(priorRotaryMode as any);
  };

  // Sync keyboard handlers cleanly - only bound to 'H' for horn (Roblox space exiting vehicle issue solved)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!isPowered) return;

      if (k === 'v') {
        if (isContinuousLoop) {
          // Toggle on keydown
          const nextVal = !isManualHeld;
          setIsManualHeld(nextVal);
          engine.setManualPressed(nextVal);
        } else {
          if (!isManualHeld) {
            setIsManualHeld(true);
            engine.setManualPressed(true);
          }
        }
      }
      if (k === 'h') {
        e.preventDefault();
        if (isContinuousLoop) {
          // Toggle on keydown
          const nextVal = !isHornHeld;
          setIsHornHeld(nextVal);
          if (nextVal) {
            engine.setSirenMode('horn');
          } else {
            const priorRotaryMode = modes.find(m => m.key === currentMode) ? currentMode : 'stby';
            engine.setSirenMode(priorRotaryMode as any);
          }
        } else {
          if (!isHornHeld) {
            setIsHornHeld(true);
            engine.setSirenMode('horn');
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'v') {
        if (!isContinuousLoop) {
          setIsManualHeld(false);
          engine.setManualPressed(false);
        }
      }
      if (k === 'h') {
        if (!isContinuousLoop) {
          setIsHornHeld(false);
          const priorRotaryMode = modes.find(m => m.key === currentMode) ? currentMode : 'stby';
          engine.setSirenMode(priorRotaryMode as any);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentMode, isPowered, isManualHeld, isHornHeld, isContinuousLoop]);

  // Master power toggle
  const togglePower = () => {
    const nextPower = !isPowered;
    setIsPowered(nextPower);
    if (!nextPower) {
      engine.setSirenMode('stby');
      engine.setMasterVolume(0);
      setIsHornHeld(false);
      setIsManualHeld(false);
    } else {
      engine.setMasterVolume(globalVolume);
      engine.setSirenMode(currentMode);
    }
  };

  return (
    <div className="relative bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs flex flex-col gap-6 select-none max-w-xl mx-auto overflow-hidden text-[#1A1A1A]">
      {/* Top Warning Lights - highly polished minimalist indicator strips */}
      <div className="absolute top-0 left-0 right-0 h-1 flex">
        <div className={`flex-1 transition-colors duration-150 ${
          isPowered && currentMode !== 'stby' 
            ? (currentMode === 'yelp' || currentMode === 'phsr' ? 'animate-pulse bg-red-500' : 'bg-red-500/80')
            : 'bg-slate-200'
        }`} />
        <div className={`flex-1 transition-colors duration-150 ${
          isPowered && currentMode !== 'stby'
            ? (currentMode === 'yelp' || currentMode === 'phsr' ? 'animate-pulse bg-blue-500 delay-75' : 'bg-blue-500/80')
            : 'bg-slate-200'
        }`} />
      </div>

      {/* Carson SA-500 Brand Logo and Faceplate Header */}
      <div className="flex justify-between items-center border-b border-[#E5E7EB] pb-3 mt-1">
        <div>
          <h2 id="carson-brand-header" className="font-sans font-bold tracking-widest text-[#1A1A1A] text-lg select-all">
            CARSON
          </h2>
          <p className="font-mono text-[9px] text-[#6B7280] tracking-widest uppercase font-semibold">
            SA-500 Cruiser Siren Control Center
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Status Indicator LED */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-[#E5E7EB]">
            <span className={`inline-block h-2 w-2 rounded-full ${
              isPowered 
                ? (currentMode === 'stby' ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]' : 'bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]') 
                : 'bg-slate-300'
            }`} />
            <span className="font-mono text-[9px] text-[#6B7280] font-bold">
              {isPowered ? (currentMode === 'stby' ? 'STBY' : currentMode.toUpperCase()) : 'OFF'}
            </span>
          </div>
          {/* Main Power Key Button */}
          <button
            id="power-switch-button"
            onClick={togglePower}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isPowered 
                ? 'bg-[#1a1a1a] text-white border-[#1a1a1a] hover:bg-[#333]' 
                : 'bg-slate-100 text-slate-400 border-[#E5E7EB] hover:bg-slate-200'
            }`}
            title="Siren Power (RAD/STBY)"
          >
            <Power size={13} />
          </button>
        </div>
      </div>

      {/* Control Knobs & Switch Console Area */}
      <div className="grid grid-cols-12 gap-4 items-center py-4 bg-slate-50 p-4 rounded-xl border border-[#E5E7EB]">
        
        {/* Left Side: Volume & Speaker Emulation Options */}
        <div className="col-span-4 flex flex-col gap-3 items-center border-r border-[#E5E7EB] pr-3">
          {/* Volume Control Dial */}
          <div className="flex flex-col items-center w-full mb-1">
            <label className="font-mono text-[9px] text-[#6B7280] mb-1 uppercase tracking-widest font-bold block text-center">
              Siren Gain
            </label>
            <div className="flex items-center gap-2 w-full">
              {globalVolume === 0 ? <VolumeX size={14} className="text-slate-400 animate-pulse" /> : <Volume2 size={14} className="text-[#1a1a1a]" />}
              <input
                id="siren-volume-knob"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={globalVolume}
                disabled={!isPowered}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-[#1a1a1a] bg-slate-200 hover:bg-slate-300 h-1.5 rounded-lg cursor-pointer disabled:opacity-40"
              />
            </div>
            <span className="font-mono text-[9px] text-[#6B7280] font-semibold mt-1">
              {Math.round(globalVolume * 100)}%
            </span>
          </div>

          {/* Cabin Simulation Switch */}
          <button
            id="cabin-sim-btn"
            onClick={toggleCabinetSim}
            disabled={!isPowered}
            className={`w-full py-1.5 px-2 rounded-lg border text-left font-mono text-[10px] transition-all flex items-center justify-between cursor-pointer ${
              isCabinetSim 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-1.5 font-bold">
              <Compass size={11} />
              Cabin Acoustic
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${isCabinetSim ? 'bg-blue-600 shadow-[0_0_4px_rgba(37,99,235,0.6)]' : 'bg-slate-300'}`} />
          </button>

          {/* Dual Speaker Coupled config */}
          <button
            id="dual-siren-btn"
            onClick={toggleDualSiren}
            disabled={!isPowered}
            className={`w-full py-1.5 px-2 rounded-lg border text-left font-mono text-[10px] transition-all flex items-center justify-between cursor-pointer ${
              isDualSiren 
                ? 'bg-purple-50 border-purple-200 text-purple-700' 
                : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-1.5 font-bold">
              <Zap size={11} />
              Dual-Tone
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${isDualSiren ? 'bg-purple-600 shadow-[0_0_4px_rgba(147,51,234,0.6)] animate-pulse' : 'bg-slate-300'}`} />
          </button>

          {/* Continuous Loop Mode / Loop Lock */}
          <button
            id="continuous-loop-btn"
            onClick={toggleContinuousLoop}
            disabled={!isPowered}
            className={`w-full py-1.5 px-2 rounded-lg border text-left font-mono text-[10px] transition-all flex items-center justify-between cursor-pointer ${
              isContinuousLoop 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:bg-slate-100'
            }`}
            title="Loop sounds continuously until toggled off again"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <Repeat size={11} />
              Loop Lock
            </span>
            <span className={`h-1.5 w-1.5 rounded-full ${isContinuousLoop ? 'bg-emerald-600 shadow-[0_0_4px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-slate-300'}`} />
          </button>
        </div>

        {/* Center: Rotary Select Indicator Dial */}
        <div className="col-span-5 flex flex-col items-center justify-center p-2">
          <label className="font-mono text-[9px] text-[#6B7280] mb-3 uppercase tracking-widest font-bold block text-center">
            Siren Selector
          </label>
          
          <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-white border border-[#E5E7EB] shadow-xs">
            {/* Center Dial Knob - Rotates to focus on the active state */}
            <div 
              className="absolute w-14 h-14 rounded-full bg-linear-to-b from-slate-50 to-slate-100 shadow-xs border border-slate-200 flex items-center justify-center transition-transform duration-300"
              style={{ transform: `rotate(${radialAngle}deg)` }}
            >
              {/* Radial pointer notch direction line */}
              <div className="absolute top-1 w-0.5 h-3 bg-red-500 rounded-full" />
            </div>

            {/* Dial Labels surrounding */}
            {modes.map((m) => (
              <button
                key={m.key}
                onClick={() => handleDialClick(m.key as any)}
                disabled={!isPowered}
                className={`absolute font-mono text-[8px] font-bold tracking-tight select-none transition-colors cursor-pointer hover:text-[#1A1A1A] ${
                  currentMode === m.key && isPowered 
                    ? (m.key === 'wail' ? 'text-blue-600 font-extrabold' : m.key === 'yelp' ? 'text-red-600 font-extrabold' : m.key === 'phsr' ? 'text-purple-600 font-extrabold' : 'text-[#1A1A1A] font-extrabold') 
                    : 'text-[#9CA3AF]'
                }`}
                style={{
                  transform: `rotate(${m.angle}deg) translate(0, -38px) rotate(${-m.angle}deg)`
                }}
              >
                {m.key === 'stby' ? 'STBY' : m.key.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Quick cycle tabs */}
          <div className="flex gap-1.5 mt-2">
            <button 
              id="cycle-prev" 
              onClick={cycleModeBackward} 
              disabled={!isPowered}
              className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-[#E5E7EB] text-[9px] text-[#6B7280] font-bold disabled:opacity-40"
            >
              ◀
            </button>
            <span className="text-[10px] font-mono text-[#6B7280] font-bold self-center">Switch</span>
            <button 
              id="cycle-next" 
              onClick={cycleModeForward} 
              disabled={!isPowered}
              className="px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 border border-[#E5E7EB] text-[9px] text-[#6B7280] font-bold disabled:opacity-40"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Right Side: Momentary Spring Paddles (MAN and HORN) */}
        <div className="col-span-3 flex flex-col gap-4 items-center justify-center border-l border-[#E5E7EB] pl-3">
          {/* Manual Siren Lever Switch (MAN) */}
          <div className="flex flex-col items-center">
            <label className="font-mono text-[8px] text-[#6B7280] uppercase tracking-widest mb-1 font-bold">
              Manual [V]
            </label>
            <button
              id="manual-siren-paddle"
              onMouseDown={handleManualMouseDown}
              onMouseUp={handleManualMouseUp}
              onMouseLeave={handleManualMouseUp}
              onTouchStart={handleManualMouseDown}
              onTouchEnd={handleManualMouseUp}
              disabled={!isPowered}
              className={`w-12 h-14 rounded-lg border transition-all cursor-pointer ${
                isManualHeld 
                  ? 'bg-slate-100 border-[#1A1A1A] text-[#1A1A1A] font-extrabold translate-y-[1px]' 
                  : 'bg-white border-[#E5E7EB] text-[#1A1A1A] hover:bg-slate-50'
              } disabled:opacity-30 disabled:pointer-events-none`}
            >
              <div className="flex flex-col items-center font-mono font-bold text-[10px]">
                <span>MAN</span>
                <span className="text-[7px] text-[#6B7280]">{isContinuousLoop ? (isManualHeld ? 'ACTIVE' : 'LOCK') : 'HOLD'}</span>
              </div>
            </button>
          </div>

          {/* Electronic Air Horn (HORN) */}
          <div className="flex flex-col items-center">
            <label className="font-mono text-[8px] text-[#6B7280] uppercase tracking-widest mb-1 font-bold">
              Horn [H]
            </label>
            <button
              id="air-horn-paddle"
              onMouseDown={handleHornMouseDown}
              onMouseUp={handleHornMouseUp}
              onMouseLeave={handleHornMouseUp}
              onTouchStart={handleHornMouseDown}
              onTouchEnd={handleHornMouseUp}
              disabled={!isPowered}
              className={`w-12 h-14 rounded-lg border transition-all cursor-pointer ${
                isHornHeld 
                  ? 'bg-slate-900 border-slate-900 text-white font-extrabold translate-y-[1px]' 
                  : 'bg-white border-[#E5E7EB] text-[#1A1A1A] hover:bg-slate-50'
              } disabled:opacity-30 disabled:pointer-events-none`}
            >
              <div className="flex flex-col items-center font-mono font-bold text-[10px]">
                <span>HORN</span>
                <span className="text-[7px] opacity-70">{isContinuousLoop ? (isHornHeld ? 'ACTIVE' : 'LOCK') : 'BLAST'}</span>
              </div>
            </button>
          </div>

        </div>

      </div>

      {/* Bottom informational bar */}
      <div className="flex justify-between items-center text-[10px] font-mono text-[#9CA3AF] font-bold">
        <span>Carson Model: SA-500-10 12V</span>
        <span>Output: 100W Impedance</span>
      </div>
    </div>
  );
}
