import { useState } from 'react';
import { Terminal, Download, Copy, Check, Info } from 'lucide-react';

export function OfflineScriptExporter() {
  const [copied, setCopied] = useState(false);

  const nodeScriptCode = `/**
 * Standalone Carson SA-500 Cruiser Siren Companion App
 * Run this directly in your local command prompt to get responsive global controls, 
 * even when playing Roblox (ERLC) or GTA V in the background!
 * 
 * Instructions:
 * 1. Ensure Node.js is installed on your PC (https://nodejs.org).
 * 2. Create a folder named "cruiser-siren".
 * 3. Save this script inside that folder as "siren.js".
 * 4. Place your custom WAV/MP3 files (yelp.mp3, wail.mp3, horn.mp3, stby.mp3, man_phsr.mp3) in the same folder.
 * 5. Open your Terminal/CMD prompt in that folder and run:
 *    npm install sound-play keypress
 * 6. Launch the app:
 *    node siren.js
 */

const sound = require('sound-play');
const keypress = require('keypress');
const path = require('path');

// Make standard stdin respond to keypress events
keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

console.clear();
console.log("=========================================================");
console.log("    CARSON SA-500 CRUISER SIREN - CMD COMPANION CONTROL   ");
console.log("=========================================================");
console.log(" Loaded Profile: ERLC / GTA V Offline Mod Pack          ");
console.log("---------------------------------------------------------");
console.log(" KEYBINDINGS MAP:");
console.log("   [ T ]   -> TOGGLE SIREN ON/OFF (Wail / Yelp / Standby)");
console.log("   [ V ]   -> MANUAL SIREN (Hold to wind-up / decay)");
console.log("   [ H ]   -> PLAY ELECTRIC AIR HORN BLAST");
console.log("   [ 1 ]   -> SET SELECTOR TO STANDBY (STBY)");
console.log("   [ 2 ]   -> SET SELECTOR TO WAIL");
console.log("   [ 3 ]   -> SET SELECTOR TO YELP");
console.log("   [ 4 ]   -> SET SELECTOR TO PHASER / PHSR");
console.log("   [ ESC ] -> EXIT TERMINAL APP");
console.log("=========================================================");

let currentMode = 'stby'; // stby, wail, yelp, phsr
let isPlaying = false;
let soundPromise = null;
let activeProcess = null;

// Paths to sound files in local directory (matching name requests exactly)
const sounds = {
  wail: path.join(__dirname, 'wail.mp3'),
  yelp: path.join(__dirname, 'yelp.mp3'),
  phsr: path.join(__dirname, 'man_phsr.mp3'),
  horn: path.join(__dirname, 'horn.mp3'),
  stby: path.join(__dirname, 'stby.mp3')
};

function playModeLoop(mode) {
  if (mode === 'stby') {
    stopCurrentSound();
    console.log("[STATUS] Standby Mode Active.");
    return;
  }

  const soundPath = sounds[mode];
  console.log(\`[SIREN] Playing looped mode: \${mode.toUpperCase()}\`);
  
  stopCurrentSound();
  isPlaying = true;

  // Use sound-play to play the file
  sound.play(soundPath).then((process) => {
    activeProcess = process;
    // Loop the sound isPlaying matches
    if (isPlaying && currentMode === mode) {
      playModeLoop(mode);
    }
  }).catch(err => {
    console.log(\`[ERROR] Could not play \${mode}.mp3 - Make sure the file exists in this folder!\`);
  });
}

function stopCurrentSound() {
  isPlaying = false;
  // Node sound players can kill child audio processes
  if (activeProcess) {
    try { activeProcess.kill(); } catch (e) {}
    activeProcess = null;
  }
}

// Keypress listener loop 
process.stdin.on('keypress', (ch, key) => {
  if (!key) return;

  const k = key.name;

  if (key.ctrl && key.name === 'c' || k === 'escape') {
    stopCurrentSound();
    console.log("\\nSiren engine shut down. Good day, Officer!");
    process.exit();
  }

  if (k === 't') {
    if (currentMode === 'stby') {
      currentMode = 'wail';
      playModeLoop('wail');
    } else {
      currentMode = 'stby';
      stopCurrentSound();
      console.log("[TOGGLE] Siren toggled OFF.");
    }
  }

  if (k === 'v') {
    console.log("[MANUAL] Manual Phaser override triggered!");
    sound.play(sounds.phsr);
  }

  if (k === 'h' || k === 'space') {
    console.log("[HORN] AIR HORN BLAST DETONATED!");
    sound.play(sounds.horn);
  }

  if (k === '1') {
    currentMode = 'stby';
    stopCurrentSound();
    console.log("[DIAL] Rotary snap to STANDBY.");
  }
  
  if (k === '2') {
    currentMode = 'wail';
    playModeLoop('wail');
  }

  if (k === '3') {
    currentMode = 'yelp';
    playModeLoop('yelp');
  }

  if (k === '4') {
    currentMode = 'phsr';
    playModeLoop('phsr');
  }
});
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(nodeScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadScriptFile = () => {
    const blob = new Blob([nodeScriptCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'siren.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-xs flex flex-col gap-4 text-[#1A1A1A]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-[#1a1a1a]" />
          <h3 className="font-sans text-sm font-bold text-[#1a1a1a] uppercase tracking-wider">
            CMD/Terminal Standalone App Companion
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            id="copy-code-btn"
            onClick={copyToClipboard}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-mono text-xs font-bold flex items-center gap-1 cursor-pointer border border-[#E5E7EB] shadow-xs"
          >
            {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
          <button
            id="download-code-btn"
            onClick={downloadScriptFile}
            className="px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#333] text-white font-mono text-xs font-bold flex items-center gap-1 cursor-pointer border border-[#1a1a1a] shadow-xs"
          >
            <Download size={12} />
            Download siren.js
          </button>
        </div>
      </div>

      <div className="p-3 bg-slate-50 rounded-lg text-xs font-sans border border-[#E5E7EB] text-slate-500 leading-relaxed flex flex-col gap-2">
        <div className="flex items-start gap-1.5">
          <Info size={14} className="mt-0.5 text-[#1a1a1a] shrink-0" />
          <span>
            <strong className="text-[#1a1a1a]">Global Keybind Solved:</strong> When playing games like ERLC in full screen, browser audio tabs sometimes block keystrokes unless in focus. Running this simple script offline inside CMD prompt or powershell runs as a separate shell process, responding super fast to your mod triggers!
          </span>
        </div>
      </div>

      <div className="relative">
        <pre className="max-h-48 overflow-y-auto bg-slate-50 p-4 rounded-lg font-mono text-[10px] text-slate-500 border border-[#E5E7EB] scrollbar-thin">
          <code>{nodeScriptCode}</code>
        </pre>
        <div className="absolute right-3 bottom-3 text-[10px] font-mono text-slate-500 bg-white border border-[#E5E7EB] px-2 py-0.5 rounded shadow-xs font-bold">
          {nodeScriptCode.split('\n').length} lines Node.JS code
        </div>
      </div>
    </div>
  );
}
