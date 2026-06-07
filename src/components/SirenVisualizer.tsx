import { useEffect, useRef } from 'react';
import { SirenAudioEngine } from '../sirenAudioEngine';

export function SirenVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = SirenAudioEngine.getInstance();

    const dataArrayA = new Uint8Array(256);
    const dataArrayB = new Uint8Array(256);

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      // Clean off-white minimalist background
      ctx.fillStyle = 'rgba(248, 249, 250, 1)';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle light gray grid coordinate lines
      ctx.strokeStyle = 'rgba(229, 231, 235, 0.8)';
      ctx.lineWidth = 1;

      // Vertical grid lines
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      // Horizontal center lines
      for (let i = 0; i < height; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Draw center divider
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      // Retrieve waveform data from engine
      if (engine.analyserNodeA) {
        engine.analyserNodeA.getByteTimeDomainData(dataArrayA);
      } else {
        dataArrayA.fill(128);
      }

      if (engine.analyserNodeB) {
        engine.analyserNodeB.getByteTimeDomainData(dataArrayB);
      } else {
        dataArrayB.fill(128);
      }

      // 1. Draw Left Waveform (Siren A) in Vibrant Red
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(220, 38, 38)'; // red
      ctx.shadowBlur = 0; // disable glowing shadows in minimalist layouts
      ctx.beginPath();

      let sliceWidth = (width / 2) / 256;
      let x = 0;

      for (let i = 0; i < 256; i++) {
        const v = dataArrayA[i] / 128.0;
        const y = (v * (height / 2));

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }
      ctx.lineTo(width / 2, height / 2);
      ctx.stroke();

      // 2. Draw Right Waveform (Siren B) in Dynamic Blue
      ctx.strokeStyle = 'rgb(37, 99, 235)'; // blue
      ctx.beginPath();

      x = width / 2;
      for (let i = 0; i < 256; i++) {
        const v = dataArrayB[i] / 128.0;
        const y = (v * (height / 2));

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Reset shadows for outline text indicators
      ctx.fillStyle = 'rgba(220, 38, 38, 0.85)';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SIREN CHANNEL A (LEFT - RED)', 12, 18);

      ctx.fillStyle = 'rgba(37, 99, 235, 0.85)';
      ctx.fillText('SIREN CHANNEL B (RIGHT - BLUE)', (width / 2) + 12, 18);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#E5E7EB] bg-[#F8F9FA] p-1 shadow-xs">
      <div className="absolute top-2 right-3 z-10 flex items-center gap-1.5 font-mono text-[9px] text-[#1a1a1a] font-bold select-none">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
        </span>
        LIVE WAVE ANALYSIS
      </div>
      <canvas
        ref={canvasRef}
        width={480}
        height={110}
        id="siren-osc-canvas"
        className="w-full h-[110px] block"
      />
    </div>
  );
}
