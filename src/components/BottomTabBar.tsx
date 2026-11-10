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
      className="sm:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-[#000000]/95 backdrop-blur-xl border-t border-neutral-900/80 z-40 flex items-center justify-around px-3"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeView === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigateTo(tab.id as any)}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 min-w-[64px] transition-colors cursor-pointer ${
              isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Icon
              className={`w-5 h-5 transition-transform ${
                isActive ? 'text-red-500 scale-105' : 'text-neutral-500'
              }`}
            />
            <span
              className={`text-[10px] font-medium tracking-tight ${
                isActive ? 'text-white font-bold' : 'text-neutral-400'
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
