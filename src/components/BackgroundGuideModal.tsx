import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  X,
  ShieldCheck,
  Smartphone,
  Monitor,
  Headphones,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const BackgroundGuideModal: React.FC = () => {
  const { bgGuideOpen, setBgGuideOpen, triggerDocumentPiP } = usePlayer();

  if (!bgGuideOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setBgGuideOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-[#0f1015] border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">バックグラウンド再生ガイド</h3>
              <p className="text-xs text-neutral-400">
                別タブ・他アプリ操作時やスマホの画面オフ時の利用方法
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBgGuideOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="space-y-4 text-xs text-neutral-300">
          {/* PC / Mac */}
          <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-white text-sm">
              <Monitor className="w-4 h-4 text-emerald-400" />
              <span>PC / Mac の場合（自動対応）</span>
            </div>
            <p className="leading-relaxed text-neutral-300">
              ブラウザで別タブを開いたり、ウィンドウを最小化しても、自動レジューム機能により音楽は自動で再生継続されます。キーボードのメディアキーやBluetooth機器からも操作できます。
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={async () => {
                  const ok = await triggerDocumentPiP();
                  if (ok) setBgGuideOpen(false);
                }}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>PiP（常に最前面の小窓ミニプレイヤー）で起動</span>
              </button>
            </div>
          </div>

          {/* Smartphone iOS / Android */}
          <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800/80 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-white text-sm">
              <Smartphone className="w-4 h-4 text-red-400" />
              <span>iPhone (Safari) / Android (Chrome) の場合</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <p className="leading-relaxed text-neutral-300">
                  <strong className="text-white">画面をスリープにした直後に停止した場合：</strong>
                  <br />
                  スマホの電源ボタンを押して<strong>ロック画面</strong>を表示し、通知欄に表示されている音楽プレイヤーの<strong>「再生（▶）」ボタン</strong>（またはイヤホンのボタン）を1回押してください。画面をオフにしたままバックグラウンドで曲が流れ続けます。
                </p>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <p className="leading-relaxed text-neutral-300">
                  <strong className="text-white">「デスクトップ用サイト（PC版）」の利用：</strong>
                  <br />
                  Safari や Chrome のメニューから「PC版サイト（デスクトップ用Webサイト）を表示」にチェックを入れると、OSによる一時停止制限を受けにくくなり、より確実にバックグラウンド再生できます。
                </p>
              </div>
            </div>
          </div>

          {/* Bluetooth / Earphones */}
          <div className="p-3 rounded-xl bg-neutral-900/40 border border-neutral-800 flex items-center gap-2.5 text-neutral-400">
            <Headphones className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>イヤホンのリモコン操作（再生/一時停止/次の曲）に完全対応しています。</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => setBgGuideOpen(false)}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            了解しました
          </button>
        </div>
      </div>
    </div>
  );
};
