import React, { useEffect, useRef, useState } from 'react';
import { equalizer } from '../services/equalizer';
import { usePlayer } from '../context/PlayerContext';
import { Activity, Maximize2, Minimize2, Sparkles, Sliders } from 'lucide-react';

interface SpectrumVisualizerProps {
  className?: string;
  height?: number;
  barCount?: number;
  showControls?: boolean;
  mode?: 'bars' | 'wave' | 'mirror';
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  className = '',
  height = 48,
  barCount = 32,
  showControls = false,
  mode: initialMode = 'bars',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isPlaying } = usePlayer();
  const [visMode, setVisMode] = useState<'bars' | 'wave' | 'mirror'>(initialMode);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;

    const render = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== h * dpr) {
        canvas.width = width * dpr;
        canvas.height = h * dpr;
      }
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, width, h);

      const freqData = equalizer.getFrequencyData(barCount);
      const len = freqData.length;

      if (visMode === 'bars') {
        const barWidth = Math.max(2, (width / len) - 2);
        for (let i = 0; i < len; i++) {
          const val = freqData[i] / 255;
          const barHeight = Math.max(3, val * (h - 4));
          const x = i * (barWidth + 2);
          const y = h - barHeight;

          const grad = ctx.createLinearGradient(0, h, 0, 0);
          grad.addColorStop(0, '#dc2626');
          grad.addColorStop(0.5, '#f59e0b');
          grad.addColorStop(1, '#06b6d4');

          ctx.fillStyle = isPlaying ? grad : '#333338';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
          ctx.fill();

          // Cap indicator
          if (isPlaying && val > 0.3) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, Math.max(0, y - 2), barWidth, 1.5);
          }
        }
      } else if (visMode === 'mirror') {
        // Mirrored center visualizer
        const half = Math.floor(len / 2);
        const barWidth = Math.max(2, (width / len) - 1.5);
        const centerY = h / 2;

        for (let i = 0; i < len; i++) {
          const val = freqData[i] / 255;
          const halfBar = Math.max(2, (val * h) / 2.2);
          const x = i * (barWidth + 1.5);

          const grad = ctx.createLinearGradient(0, centerY - halfBar, 0, centerY + halfBar);
          grad.addColorStop(0, '#ec4899');
          grad.addColorStop(0.5, '#ef4444');
          grad.addColorStop(1, '#8b5cf6');

          ctx.fillStyle = isPlaying ? grad : '#2f2f35';
          ctx.fillRect(x, centerY - halfBar, barWidth, halfBar * 2);
        }
      } else {
        // Smooth neon wave line
        ctx.beginPath();
        const step = width / (len - 1);
        ctx.moveTo(0, h);

        for (let i = 0; i < len; i++) {
          const val = freqData[i] / 255;
          const x = i * step;
          const y = h - val * (h - 6);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = (i - 1) * step;
            const prevVal = freqData[i - 1] / 255;
            const prevY = h - prevVal * (h - 6);
            const cx = (prevX + x) / 2;
            const cy = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cx, cy);
          }
        }

        ctx.strokeStyle = isPlaying ? '#ef4444' : '#44444d';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = isPlaying ? 8 : 0;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, barCount, visMode]);

  return (
    <div className={`relative flex flex-col justify-end group ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ height: `${height}px`, width: '100%' }}
        className="block"
      />

      {showControls && (
        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/80 backdrop-blur-sm p-1 rounded-lg border border-neutral-800 text-[10px]">
          <button
            type="button"
            onClick={() => setVisMode('bars')}
            className={`px-1.5 py-0.5 rounded ${visMode === 'bars' ? 'bg-red-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
          >
            バー
          </button>
          <button
            type="button"
            onClick={() => setVisMode('mirror')}
            className={`px-1.5 py-0.5 rounded ${visMode === 'mirror' ? 'bg-red-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
          >
            ミラー
          </button>
          <button
            type="button"
            onClick={() => setVisMode('wave')}
            className={`px-1.5 py-0.5 rounded ${visMode === 'wave' ? 'bg-red-600 text-white font-bold' : 'text-neutral-400 hover:text-white'}`}
          >
            ウェーブ
          </button>
        </div>
      )}
    </div>
  );
};
