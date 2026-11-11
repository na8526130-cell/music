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
import { EqualizerModal } from './components/EqualizerModal';
import { ShareModal } from './components/ShareModal';
import { MiniFloatingPlayer } from './components/MiniFloatingPlayer';
import { HomeExploreView } from './views/HomeExploreView';
import { SearchView } from './views/SearchView';
import { ArtistDetailView } from './views/ArtistDetailView';
import { AlbumDetailView } from './views/AlbumDetailView';
import { LibraryView } from './views/LibraryView';
import { ListeningPartyView } from './views/ListeningPartyView';
import { DanmakuOverlay } from './components/DanmakuOverlay';
import { TrackCommentsModal } from './components/TrackCommentsModal';
import { DirectMessageModal } from './components/DirectMessageModal';
import { SocialNotificationDrawer } from './components/SocialNotificationDrawer';
import { TermsModal } from './components/TermsModal';
import { StoryCardGeneratorModal } from './components/StoryCardGeneratorModal';
import { IntroQuizModal } from './components/IntroQuizModal';
import { MusicMatchModal } from './components/MusicMatchModal';
import { CollabPlaylistModal } from './components/CollabPlaylistModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FullScreenPlayerModal } from './components/FullScreenPlayerModal';
import { BottomTabBar } from './components/BottomTabBar';
import { ListeningWrappedModal } from './components/ListeningWrappedModal';

const MainLayout: React.FC = () => {
  const {
    toastNotification,
    activeView,
    playerMode,
    setPlayerMode,
    currentTrack,
    backgroundPlaybackEnabled,
    eqModalOpen,
    setEqModalOpen,
    shareModalOpen,
    setShareModalOpen,
    shareModalPayload,
    commentsModalOpen,
    setCommentsModalOpen,
    dmModalOpen,
    setDmModalOpen,
    openDmWithUser,
    notificationDrawerOpen,
    setNotificationDrawerOpen,
    storyModalOpen,
    setStoryModalOpen,
    quizModalOpen,
    setQuizModalOpen,
    matchModalOpen,
    setMatchModalOpen,
    collabModalOpen,
    setCollabModalOpen,
    currentLyrics,
  } = usePlayer();

  return (
    <div className="min-h-screen bg-[#070708] text-neutral-100 flex flex-col font-sans selection:bg-red-600 selection:text-white relative">
      {/* Real-time Floating Danmaku Screen Layer */}
      <DanmakuOverlay />

      {/* Toast Notification Banner (Auto-fallback alerts & system messages) */}
      {toastNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-2.5 text-xs sm:text-sm font-semibold pointer-events-auto ${
              toastNotification.type === 'warning'
                ? 'bg-amber-950/95 border-amber-600/60 text-amber-200 shadow-amber-950/60 ring-1 ring-amber-500/30'
                : toastNotification.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-600/60 text-emerald-200 shadow-emerald-950/60 ring-1 ring-emerald-500/30'
                : 'bg-neutral-900/95 border-neutral-700 text-white shadow-black/80 ring-1 ring-white/10'
            }`}
          >
            <span>{toastNotification.message}</span>
          </div>
        </div>
      )}

      {/* Offline Status Connectivity Banner */}
      <OfflineIndicator />

      {/* Top Navbar */}
      <TopNavbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-36">
        {/* Dynamic View Content */}
        {activeView === 'home' && <HomeExploreView />}
        {activeView === 'search' && <SearchView />}
        {activeView === 'artist' && <ArtistDetailView />}
        {activeView === 'album' && <AlbumDetailView />}
        {activeView === 'library' && <LibraryView />}
        {activeView === 'party' && <ListeningPartyView />}
      </main>

      {/* Persistent Single Instance YouTubePlayer (Never unmounted) */}
      <YouTubePlayer />

      {/* Persistent Bottom Player Bar */}
      <PlayerBar />

      {/* Spotify Bottom Navigation Bar */}
      <BottomTabBar />

      {/* Spotify Full-Screen Now Playing Modal */}
      <FullScreenPlayerModal />

      {/* Floating Mini Player (follows across all screens & views) */}
      <MiniFloatingPlayer />

      {/* Drawers & Modals */}
      <LyricsDrawer />
      <QueueDrawer />
      <InnerTubeInspectorModal />
      <BackgroundGuideModal />
      <PlaylistImportModal />
      <AddToPlaylistModal />
      <AccountModal />
      <AdminConsoleModal />
      <EqualizerModal isOpen={eqModalOpen} onClose={() => setEqModalOpen(false)} />
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        initialType={shareModalPayload?.type || 'track'}
        playlistToShare={shareModalPayload?.playlist}
      />
      <TrackCommentsModal
        isOpen={commentsModalOpen}
        onClose={() => setCommentsModalOpen(false)}
      />
      <DirectMessageModal
        isOpen={dmModalOpen}
        onClose={() => setDmModalOpen(false)}
      />
      <SocialNotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        onOpenDmWithUser={(user) => openDmWithUser(user)}
      />
      <TermsModal />
      <StoryCardGeneratorModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        track={currentTrack}
        lyrics={currentLyrics}
      />
      <IntroQuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
      />
      <MusicMatchModal
        isOpen={matchModalOpen}
        onClose={() => setMatchModalOpen(false)}
      />
      <CollabPlaylistModal
        isOpen={collabModalOpen}
        onClose={() => setCollabModalOpen(false)}
      />

      {/* Spotify Wrapped Modal */}
      <ListeningWrappedModal />

      {/* In-App PWA Install Promotion Banner */}
      <PWAInstallBanner />
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
