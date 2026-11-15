import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Home, Search, Library, Radio, Sparkles } from 'lucide-react';

export const BottomTabBar: React.FC = () => {
  const { activeView, navigateTo } = usePlayer();

  const tabs = [
    { id: 'home', label: 'ホーム', icon: Home },
    { id: 'search', label: '検索', icon: Search },
    { id: 'library', label: 'マイライブラリ', icon: Library },
    { id: 'party', label: 'パーティ', icon: Radio },
  ] as const;

  return (
    <nav
      aria-label="モバイルナビゲーション"
      className="sm:hidden fixed bottom-0 left-0 right-0 h-[60px] bg-gradient-to-t from-black via-black/95 to-black/85 backdrop-blur-xl border-t border-white/5 z-40 grid grid-cols-4 items-center px-2"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigateTo(tab.id as any)}
            className={`flex flex-col items-center justify-center gap-1 min-h-[44px] py-1 px-2 transition-colors cursor-pointer ${
              isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Icon
              className={`w-5 h-5 transition-transform ${
                isActive ? 'text-white scale-105 stroke-[2.4]' : 'text-neutral-400 stroke-[1.8]'
              }`}
            />
            <span
              className={`text-[10px] tracking-tight whitespace-nowrap ${
                isActive ? 'text-white font-bold' : 'text-neutral-400 font-medium'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
