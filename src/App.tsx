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

const MainLayout: React.FC = () => {
  const {
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
