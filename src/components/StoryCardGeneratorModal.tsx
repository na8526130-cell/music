import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Share2, Copy, Sparkles, Music, Check } from 'lucide-react';
import { Track, LyricsData, SyncedLine } from '../types/music';

interface StoryCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
  lyrics: LyricsData | null;
}

export const StoryCardGeneratorModal: React.FC<StoryCardGeneratorModalProps> = ({
  isOpen,
  onClose,
  track,
  lyrics,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<string>('');
  const [themeColor, setThemeColor] = useState<string>('#ef4444'); // red default
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Auto-fill first favorite lyric line if available
  useEffect(() => {
    if (lyrics && lyrics.syncedLyrics && lyrics.syncedLyrics.length > 0) {
      const meaningfulLine = lyrics.syncedLyrics.find((l: SyncedLine) => l.text.trim().length > 3);
      if (meaningfulLine) {
        setSelectedQuote(meaningfulLine.text);
      }
    } else {
      setSelectedQuote('君と聴くこのメロディが、ずっと続けばいいのに。');
    }
  }, [lyrics, track?.id]);

  // Redraw canvas whenever track, quote, or theme changes
  useEffect(() => {
    if (!isOpen || !track || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1080 x 1920 Instagram Story Resolution
    canvas.width = 1080;
    canvas.height = 1920;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#0a0a0f');
    bgGrad.addColorStop(0.35, '#12121e');
    bgGrad.addColorStop(0.7, '#1b0d18');
    bgGrad.addColorStop(1, '#050508');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Glowing nebula circles
    const radGrad1 = ctx.createRadialGradient(250, 450, 10, 250, 450, 600);
    radGrad1.addColorStop(0, `${themeColor}66`);
    radGrad1.addColorStop(1, 'transparent');
    ctx.fillStyle = radGrad1;
    ctx.fillRect(0, 0, 1080, 1920);

    const radGrad2 = ctx.createRadialGradient(850, 1400, 20, 850, 1400, 700);
    radGrad2.addColorStop(0, '#8b5cf655');
    radGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = radGrad2;
    ctx.fillRect(0, 0, 1080, 1920);

    // Load track image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = track.thumbnail;

    const renderCard = () => {
      // Top Zero Music Branding
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ZERO MUSIC • NOW PLAYING', 540, 180);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('https://zeromusic.app', 540, 225);

      // Artwork card shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 45;
      ctx.shadowOffsetY = 25;

      // Cover Art (680 x 680 with rounded corners)
      const artX = (1080 - 680) / 2;
      const artY = 320;
      const artSize = 680;
      const radius = 48;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(artX + radius, artY);
      ctx.arcTo(artX + artSize, artY, artX + artSize, artY + artSize, radius);
      ctx.arcTo(artX + artSize, artY + artSize, artX, artY + artSize, radius);
      ctx.arcTo(artX, artY + artSize, artX, artY, radius);
      ctx.arcTo(artX, artY, artX + artSize, artY, radius);
      ctx.closePath();
      ctx.clip();

      try {
        ctx.drawImage(img, artX, artY, artSize, artSize);
      } catch {
        ctx.fillStyle = '#262626';
        ctx.fillRect(artX, artY, artSize, artSize);
      }
      ctx.restore();

      // Reset shadows
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Track Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      const truncatedTitle = track.title.length > 24 ? track.title.slice(0, 23) + '…' : track.title;
      ctx.fillText(truncatedTitle, 540, 1100);

      // Artist Name
      ctx.fillStyle = themeColor;
      ctx.font = '600 36px -apple-system, BlinkMacSystemFont, sans-serif';
      const truncatedArtist = track.artist.length > 32 ? track.artist.slice(0, 31) + '…' : track.artist;
      ctx.fillText(truncatedArtist, 540, 1165);

      // Audio Spectrum Waveform graphic
      const waveY = 1260;
      const barCount = 38;
      const barWidth = 14;
      const barGap = 8;
      const totalWaveWidth = barCount * (barWidth + barGap);
      const startX = (1080 - totalWaveWidth) / 2;

      for (let i = 0; i < barCount; i++) {
        const heightFactor = Math.sin((i / barCount) * Math.PI) * 0.8 + 0.2;
        const pseudoRand = ((i * 17) % 10) / 10;
        const barH = 30 + heightFactor * 75 * (0.6 + pseudoRand * 0.4);
        const bx = startX + i * (barWidth + barGap);

        ctx.fillStyle = i % 2 === 0 ? themeColor : '#ffffffcc';
        ctx.beginPath();
        ctx.roundRect(bx, waveY - barH / 2, barWidth, barH, 7);
        ctx.fill();
      }

      // Quote / Lyrics Box
      if (selectedQuote.trim()) {
        const quoteBoxY = 1420;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(140, quoteBoxY, 800, 240, 32);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Quotation mark icon
        ctx.fillStyle = themeColor;
        ctx.font = 'bold 70px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText('“', 180, quoteBoxY + 75);

        // Quote text (word wrapped)
        ctx.fillStyle = '#f3f4f6';
        ctx.font = '500 34px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
        ctx.textAlign = 'left';

        const maxLineWidth = 680;
        const words = selectedQuote;
        let line = '';
        let currentY = quoteBoxY + 95;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxLineWidth && n > 0) {
            ctx.fillText(line, 220, currentY);
            line = words[n];
            currentY += 48;
            if (currentY > quoteBoxY + 190) break;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 220, currentY);
      }

      // Footer
      ctx.fillStyle = '#6b7280';
      ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Swipe up to listen on Zero Music 🎧', 540, 1800);
    };

    img.onload = renderCard;
    img.onerror = renderCard;
  }, [isOpen, track, selectedQuote, themeColor]);

  if (!isOpen || !track) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${track.title.replace(/[\/\\?%*:|"<>]/g, '_')}_story.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'story.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${track.title} - ${track.artist}`,
            text: `Zero Musicで「${track.title}」を再生中！`,
            files: [file],
          });
        } else {
          // Fallback to clipboard
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      });
    } catch {
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-2xl">
        {/* Left: Preview Canvas */}
        <div className="p-6 bg-neutral-950 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-neutral-800/80">
          <div className="relative w-48 sm:w-56 aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border border-neutral-700/80 ring-4 ring-neutral-800/50">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-[11px] text-neutral-500 font-mono mt-3">
            9:16 Instagram Stories (1080×1920)
          </span>
        </div>

        {/* Right: Controls & Quote editor */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto max-h-[500px] md:max-h-none space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ストーリーズ画像生成</h3>
                  <p className="text-xs text-neutral-400">InstagramやX、LINEで映える楽曲カード</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quote Selector / Input */}
            <div className="mt-5 space-y-3">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>お気に入りのフレーズ / 歌詞フレーズ</span>
                <span className="text-[10px] text-neutral-500">{selectedQuote.length}/60文字</span>
              </label>
              <textarea
                value={selectedQuote}
                maxLength={60}
                onChange={(e) => setSelectedQuote(e.target.value)}
                placeholder="心に刺さる歌詞やコメントを入力..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-red-500 resize-none h-20"
              />

              {/* Quick lyric presets from actual synced lyrics if available */}
              {lyrics && lyrics.syncedLyrics && lyrics.syncedLyrics.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-neutral-400 font-medium">歌詞からワンタップ引用:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {lyrics.syncedLyrics
                      .filter((l: SyncedLine) => l.text.trim().length > 4)
                      .slice(0, 6)
                      .map((line: SyncedLine, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedQuote(line.text)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-[11px] text-neutral-300 hover:text-white text-left truncate max-w-[200px] border border-neutral-700/50 transition-colors"
                        >
                          "{line.text}"
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Theme accent picker */}
            <div className="mt-5 space-y-2">
              <label className="text-xs font-semibold text-neutral-300">ネオンアクセントカラー</label>
              <div className="flex items-center gap-2.5">
                {[
                  { label: 'Red', color: '#ef4444' },
                  { label: 'Purple', color: '#a855f7' },
                  { label: 'Cyan', color: '#06b6d4' },
                  { label: 'Emerald', color: '#10b981' },
                  { label: 'Amber', color: '#f59e0b' },
                  { label: 'Pink', color: '#ec4899' },
                ].map((th) => (
                  <button
                    key={th.color}
                    type="button"
                    onClick={() => setThemeColor(th.color)}
                    style={{ backgroundColor: th.color }}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      themeColor === th.color ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-neutral-800 flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? '生成中...' : '画像を保存 (PNG)'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">コピー完了</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>共有 / コピー</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
