import React from 'react';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import { TopNavbar } from './components/TopNavbar';
import { PlayerBar } from './components/PlayerBar';
import { YouTubePlayer } from './components/YouTubePlayer';
import { LyricsDrawer } from './components/LyricsDrawer';
import { QueueDrawer } from './components/QueueDrawer';
import { InnerTubeInspectorModal } from './components/InnerTubeInspectorModal';
import { BackgroundGuideModal } from './components/BackgroundGuideModal';
import { PlaylistImportModal } from './components/PlaylistImportModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { AccountModal } from './components/AccountModal';
import { AdminConsoleModal } from './components/AdminConsoleModal';
import { HomeExploreView } from './views/HomeExploreView';
import { SearchView } from './views/SearchView';
import { ArtistDetailView } from './views/ArtistDetailView';
import { AlbumDetailView } from './views/AlbumDetailView';
import { LibraryView } from './views/LibraryView';
import { Tv, X, ShieldCheck } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeView,
    playerMode,
    setPlayerMode,
    currentTrack,
    backgroundPlaybackEnabled,
  } = usePlayer();

  return (
    <div className="min-h-screen bg-[#070708] text-neutral-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Navbar */}
      <TopNavbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-36">
        {/* Floating/Docked Video Player Screen when in 'video' mode */}
        {playerMode === 'video' && currentTrack && (
          <div className="mb-8 p-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                <Tv className="w-4 h-4 text-red-500" />
                <span>YouTube ミュージックビデオ再生中: {currentTrack.title}</span>
              </div>
              <div className="flex items-center gap-3">
                {backgroundPlaybackEnabled && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>バックグラウンド再生中</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPlayerMode('cover')}
                  className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>動画を隠す (カバーアートモードへ)</span>
                </button>
              </div>
            </div>

            {/* In video mode, player will size into this container */}
            <div id="yt-video-slot" className="w-full flex justify-center" />
          </div>
        )}

        {/* Dynamic View Content */}
        {activeView === 'home' && <HomeExploreView />}
        {activeView === 'search' && <SearchView />}
        {activeView === 'artist' && <ArtistDetailView />}
        {activeView === 'album' && <AlbumDetailView />}
        {activeView === 'library' && <LibraryView />}
      </main>

      {/* Persistent Single Instance YouTubePlayer (Never unmounted) */}
      <YouTubePlayer />

      {/* Persistent Bottom Player Bar */}
      <PlayerBar />

      {/* Drawers & Modals */}
      <LyricsDrawer />
      <QueueDrawer />
      <InnerTubeInspectorModal />
      <BackgroundGuideModal />
      <PlaylistImportModal />
      <AddToPlaylistModal />
      <AccountModal />
      <AdminConsoleModal />
    </div>
  );
};

export default function App() {
  return (
    <PlayerProvider>
      <MainLayout />
    </PlayerProvider>
  );
}
