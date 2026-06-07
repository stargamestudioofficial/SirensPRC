import { Keyboard, Shield, MonitorPlay } from 'lucide-react';

export function KeybindingsHelp() {
  const bindings = [
    { key: 'T', action: 'Toggle Master Siren Playback (On/Off)', desc: 'Turns wail/yelp on or off instantly.' },
    { key: 'V', action: 'Manual Siren / Phaser Override', desc: 'Activates manual rotor wind-up override; holds or toggles depending on Loop Lock.' },
    { key: 'H', action: 'Electronic Air Horn Blast', desc: 'Piercing dual-frequency SmartSiren blast; holds or toggles depending on Loop Lock.' },
    { key: '1', action: 'Rotary Select -> STANDBY Mode', desc: 'Preps control board back to mute state.' },
    { key: '2', action: 'Rotary Select -> WAIL Mode', desc: 'Slow, dramatic oscillating warning wave (4.5s cycle).' },
    { key: '3', action: 'Rotary Select -> YELP Mode', desc: 'Fast, piercing emergency intersection warning (3.5 Hz).' },
    { key: '4', action: 'Rotary Select -> PHASER Mode', desc: 'Microsecond rapid squeak to break heavy highway traffic.' }
  ];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs flex flex-col gap-4 text-[#1A1A1A]">
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
        <Keyboard size={18} className="text-[#1a1a1a]" />
        <h3 className="font-sans text-sm font-bold text-[#1a1a1a] uppercase tracking-wider">
          Cruiser Hotkey Bindings & Setup Guide
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Table list */}
        <div className="flex flex-col gap-2.5">
          <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
            Keyboard Shortcuts:
          </span>
          <div className="flex flex-col gap-1.5">
            {bindings.map((item) => (
              <div key={item.key} className="flex items-start justify-between bg-slate-50 p-2.5 rounded border border-[#E5E7EB] gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-sans text-xs font-bold text-[#1a1a1a]">{item.action}</span>
                  <span className="text-[10px] text-slate-500 leading-normal font-sans">{item.desc}</span>
                </div>
                <div className="flex items-center justify-center shrink-0">
                  <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5E7EB] text-[#1a1a1a] font-mono text-xs font-bold shadow-xs uppercase">
                    {item.key}
                  </kbd>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Setup and Advice */}
        <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border border-[#E5E7EB] text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-[#1a1a1a] font-bold mb-1.5 font-sans">
              <MonitorPlay size={14} className="text-[#1a1a1a]" />
              <span>Integration with ERLC / Roblox</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-sans mb-3">
              Roblox blocks key entry in other browser windows while active. To play ERLC and trigger real-time vehicle dual-sirens perfectly alongside your gaming:
            </p>
            <ul className="text-[10px] text-[#6B7280] list-disc list-inside flex flex-col gap-1.5 leading-relaxed font-sans font-medium">
              <li>Open this website in a <strong className="text-[#1a1a1a]">Separate Browser Tab</strong> on a second monitor to watch wave sweeps.</li>
              <li>Or download our standalone <strong className="text-[#1a1a1a]">Node.JS Companion Script</strong> (the card below) and double-click to launch in CMD.</li>
              <li>Setup virtual audio devices like <strong className="text-[#1a1a1a]">VB-Audio Cable</strong> to pipe the high-quality synthetic sirens into your Discord or game microphone streams!</li>
            </ul>
          </div>

          <div className="border-t border-[#E5E7EB] pt-3">
            <div className="flex items-center gap-1.5 text-[#1a1a1a] font-bold mb-1.5 font-sans">
              <Shield size={14} className="text-[#1a1a1a]" />
              <span>True Dual-Siren Realism Settings</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
              Real trooper cruisers play dual sounds slightly out of phase to maximize pedestrian alarm distance. To configure this: toggle <strong className="text-[#1a1a1a]">DUAL-TONE</strong> on, switch to <strong className="text-[#1a1a1a]">WAIL</strong> mode, and adjust Siren Speaker B's sweep speed to <strong className="text-[#1a1a1a]">1.08x</strong>. You will hear an incredibly realistic phasing rumble!
            </p>
          </div>

          <div className="border-t border-[#E5E7EB] pt-3">
            <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-1.5 font-sans">
              <MonitorPlay size={14} className="text-blue-700" />
              <span>Active Background Playback & PC App Install</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-sans mb-2">
              🔊 <strong className="text-[#1a1a1a]">Continuous Background Playback</strong>: We've integrated a looping sub-audible media anchor stream. Sirens now keep playing perfectly in the background when you swap tabs, focus on Roblox ERLC, or minimize your browser!
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
              <span className="text-[11px] font-bold text-blue-900 block mb-1">💻 How to play as a PC App:</span>
              <ol className="text-[10px] text-blue-800 list-decimal list-inside flex flex-col gap-1 leading-normal font-sans">
                <li>Load this warning suite in <strong className="text-blue-950">Google Chrome</strong> or <strong className="text-blue-950">Microsoft Edge</strong>.</li>
                <li>Press the <strong className="text-blue-950">three dots menu [⋮]</strong> in the top-right corner.</li>
                <li>Go to <strong className="text-blue-950">Save and share</strong> &rarr; click <strong className="text-blue-950">Install page as app</strong>.</li>
                <li>Pin it to your Desktop or Taskbar. It now runs as a lightweight standalone application!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
