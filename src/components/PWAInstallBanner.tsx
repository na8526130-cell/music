import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  forceShow?: boolean;
  onClose?: () => void;
}

export const PWAInstallBanner: React.FC<Props> = ({ forceShow, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      const until = localStorage.getItem('zero_pwa_banner_dismissed_until');
      return until ? Number(until) > Date.now() : false;
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    try {
      // Dismiss for 7 days
      localStorage.setItem(
        'zero_pwa_banner_dismissed_until',
        String(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
    } catch {}
    setDismissed(true);
    if (onClose) onClose();
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success && onClose) onClose();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  // If already installed as PWA or dismissed (unless forced via button), do not show banner
  if (isInstalled || (dismissed && !forceShow)) {
    return showIOSModal ? (
      <IOSInstallGuideModal onClose={() => setShowIOSModal(false)} />
    ) : null;
  }

  return (
    <>
      {/* Floating Bottom Promotion Bar */}
      <div className="fixed bottom-24 sm:bottom-28 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
        <div className="bg-[#12131a]/95 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-4 shadow-2xl shadow-black/80 ring-1 ring-white/10 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center shrink-0 shadow-md shadow-rose-950/60 ring-1 ring-rose-400/40">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-white text-xs sm:text-sm font-bold tracking-tight">
                    ホーム画面に追加してアプリ化
                  </h4>
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                    推奨
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5 leading-snug">
                  スリープ時のバックグラウンド再生安定化・通信量節約・全画面起動が可能になります。
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-neutral-500 hover:text-neutral-300 p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
              title="後で"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              {isInstallable ? (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>アプリをインストール</span>
                </>
              ) : isIOS ? (
                <>
                  <Share className="w-3.5 h-3.5" />
                  <span>iPhone / iPadに追加する</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>アプリ化の手順を見る</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="py-2 px-3 text-neutral-400 hover:text-white text-xs font-medium rounded-xl hover:bg-neutral-800/80 transition-colors cursor-pointer"
            >
              後で
            </button>
          </div>
        </div>
      </div>

      {showIOSModal && (
        <IOSInstallGuideModal onClose={() => setShowIOSModal(false)} />
      )}
    </>
  );
};

export const IOSInstallGuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-[#12131a] border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center shadow-md">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">iPhone / iPad でのインストール</h3>
              <p className="text-xs text-neutral-400">ホーム画面に追加してスタンドアロン起動</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          <div className="flex items-start gap-3 bg-neutral-900/80 p-3.5 rounded-2xl border border-neutral-800">
            <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 font-bold flex items-center justify-center shrink-0 text-xs">
              1
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                Safari下部の <Share className="w-4 h-4 text-blue-400 inline" /> 「共有」ボタンをタップ
              </p>
              <p className="text-xs text-neutral-400">
                ブラウザ下部バー（iPadは上部）にある四角から矢印が出ているアイコンを押します。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-900/80 p-3.5 rounded-2xl border border-neutral-800">
            <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 font-bold flex items-center justify-center shrink-0 text-xs">
              2
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                メニューから <PlusSquare className="w-4 h-4 text-emerald-400 inline" /> 「ホーム画面に追加」を選択
              </p>
              <p className="text-xs text-neutral-400">
                共有メニューを少し下にスクロールして「ホーム画面に追加」をタップします。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-900/80 p-3.5 rounded-2xl border border-neutral-800">
            <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 font-bold flex items-center justify-center shrink-0 text-xs">
              3
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                右上の「追加」をタップして完了
              </p>
              <p className="text-xs text-neutral-400">
                ホーム画面にアイコンが追加され、ネイティブアプリ同様に全画面・安定したバックグラウンド再生が利用できます。
              </p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
