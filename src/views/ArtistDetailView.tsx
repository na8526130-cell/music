import React, { useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { Artist, Track, Album } from '../types/music';
import {
  ArrowLeft,
  Play,
  Heart,
  Plus,
  Loader2,
  Users,
  Disc,
  Calendar,
  Ticket,
  ShoppingBag,
  MessageSquare,
  Send,
} from 'lucide-react';

export const ArtistDetailView: React.FC = () => {
  const {
    selectedEntityId,
    navigateTo,
    playTrack,
    addToQueue,
    toggleLikeTrack,
    likedTrackIds,
    currentTrack,
  } = usePlayer();

  const [header, setHeader] = useState<Artist | null>(null);
  const [topSongs, setTopSongs] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [singles, setSingles] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedEntityId) return;
    let active = true;
    setLoading(true);

    api
      .getArtist(selectedEntityId)
      .then((res) => {
        if (!active) return;
        setHeader(res.header);
        setTopSongs(res.topSongs || []);
        setAlbums(res.albums || []);
        setSingles(res.singles || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedEntityId]);

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center gap-3 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-xs">アーティスト情報を読み込み中...</p>
      </div>
    );
  }

  if (error || !header) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-neutral-400 text-sm">アーティスト情報の読み込みに失敗しました</p>
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="px-4 py-2 bg-neutral-800 text-white text-xs rounded-lg"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigateTo('home')}
        className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>戻る</span>
      </button>

      {/* Artist Profile Header */}
      <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-end gap-6 shadow-2xl">
        <img
          src={header.thumbnail}
          alt={header.name}
          referrerPolicy="no-referrer"
          className="w-36 h-36 sm:w-48 sm:h-48 rounded-full object-cover shadow-2xl bg-neutral-800 shrink-0"
        />

        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold text-red-400">
            <Users className="w-4 h-4 text-red-500" />
            <span>YouTube Music 公式アーティスト</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            {header.name}
          </h1>

          {header.subscribers && (
            <p className="text-sm text-neutral-400 font-medium">
              チャンネル登録者: {header.subscribers}
            </p>
          )}

          {header.description && (
            <p className="text-xs text-neutral-300 max-w-2xl line-clamp-3 leading-relaxed pt-1">
              {header.description}
            </p>
          )}

          {topSongs.length > 0 && (
            <div className="pt-3">
              <button
                type="button"
                onClick={() => playTrack(topSongs[0], topSongs)}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl inline-flex items-center gap-2 shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>トップ楽曲を再生</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white">人気の曲 (Top Songs)</h2>
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl overflow-hidden divide-y divide-neutral-800/60 shadow-xl">
            {topSongs.map((track, idx) => {
              const isCurrent = currentTrack?.id === track.id;
              const isLiked = likedTrackIds.has(track.id);

              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-3.5 px-4 py-3 hover:bg-neutral-800/50 group transition-colors ${
                    isCurrent ? 'bg-red-950/20' : ''
                  }`}
                >
                  <span className="w-5 text-center text-xs font-mono font-bold text-neutral-500">
                    {idx + 1}
                  </span>

                  <div className="relative shrink-0">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-lg object-cover bg-neutral-800"
                    />
                    <button
                      type="button"
                      onClick={() => playTrack(track, topSongs)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      onClick={() => playTrack(track, topSongs)}
                      className={`text-sm font-semibold truncate cursor-pointer hover:underline ${
                        isCurrent ? 'text-red-400' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">{track.artist}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleLikeTrack(track)}
                      className="p-1.5 text-neutral-400 hover:text-red-500"
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => addToQueue(track)}
                      className="p-1.5 text-neutral-400 hover:text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-neutral-400 tabular-nums">
                      {track.duration}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Disc className="w-4 h-4 text-red-500" />
            <span>アルバム</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.map((album) => (
              <div
                key={album.id}
                onClick={() => navigateTo('album', album.id)}
                className="p-3 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-xl cursor-pointer flex flex-col gap-2 transition-all"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-neutral-800 relative group">
                  <img
                    src={album.thumbnail}
                    alt={album.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">{album.title}</h4>
                  {album.year && <p className="text-[11px] text-neutral-400 mt-0.5">{album.year}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Singles & EPs */}
      {singles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Disc className="w-4 h-4 text-neutral-400" />
            <span>シングル & EP</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {singles.map((single) => (
              <div
                key={single.id}
                onClick={() => navigateTo('album', single.id)}
                className="p-3 bg-neutral-900/40 hover:bg-neutral-800/60 border border-neutral-800/80 rounded-xl cursor-pointer flex flex-col gap-2 transition-all"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-neutral-800 relative group">
                  <img
                    src={single.thumbnail}
                    alt={single.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">{single.title}</h4>
                  {single.year && <p className="text-[11px] text-neutral-400 mt-0.5">{single.year}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Live Tour Schedule & Official Goods */}
      <section className="space-y-4 pt-4 border-t border-neutral-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>ライブツアー ＆ イベント告知</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/20 text-red-300 font-mono">
                  OFFICIAL LIVE
                </span>
              </h2>
              <p className="text-xs text-neutral-400">開催予定のツアー日程とチケット情報</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: `${header.name} ARENA TOUR 2026`,
              venue: '東京・有明アリーナ',
              date: '2026.04.18 (土) 開場 17:00',
              status: 'チケット先行受付中',
              statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
            },
            {
              title: `${header.name} ARENA TOUR 2026`,
              venue: '大阪・大阪城ホール',
              date: '2026.04.25 (土) 開場 17:00',
              status: '一般発売まもなく',
              statusColor: 'text-amber-400 border-amber-500/30 bg-amber-950/40',
            },
          ].map((tour, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors flex items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${tour.statusColor}`}>
                  {tour.status}
                </span>
                <h4 className="text-sm font-bold text-white truncate pt-1">{tour.title}</h4>
                <p className="text-xs text-neutral-300 font-medium">{tour.venue}</p>
                <p className="text-[11px] text-neutral-400">{tour.date}</p>
              </div>
              <button
                type="button"
                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5 text-red-400" />
                <span>詳細</span>
              </button>
            </div>
          ))}
        </div>

        {/* Official Goods Preview */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-neutral-200">公式ツアーグッズ</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: 'Tour Official Tee (Black)', price: '¥4,500', tag: '人気No.1' },
              { name: 'Jacquard Muffler Towel', price: '¥2,200', tag: '定番' },
              { name: 'LED Wireless Light Band', price: '¥3,800', tag: '演出連動' },
              { name: 'Limited Vinyl Edition LP', price: '¥5,000', tag: '会場限定' },
            ].map((goods, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/70 hover:border-purple-500/40 transition-colors space-y-2"
              >
                <div className="aspect-square rounded-lg bg-neutral-800/60 border border-neutral-700/40 flex items-center justify-center text-purple-400">
                  <ShoppingBag className="w-8 h-8 opacity-60" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="text-purple-300 font-mono">{goods.tag}</span>
                    <span className="text-white font-bold font-mono">{goods.price}</span>
                  </div>
                  <p className="text-xs font-medium text-neutral-200 truncate">{goods.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fan Community Message Board */}
      <section className="space-y-4 pt-4 border-t border-neutral-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-600/20 text-pink-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{header.name} ファンコミュニティ掲示板</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-600/20 text-pink-300 font-mono">
                  FAN BOARD
                </span>
              </h2>
              <p className="text-xs text-neutral-400">ファン同士で楽曲の感想やツアーの思い出を語り合おう</p>
            </div>
          </div>
        </div>

        {/* Interactive fan board */}
        <FanBoard artistId={header.id} artistName={header.name} />
      </section>
    </div>
  );
};

// Fan Board sub-component
const FanBoard: React.FC<{ artistId: string; artistName: string }> = ({ artistId, artistName }) => {
  const storageKey = `artist_fanboard_${artistId}`;
  const [messages, setMessages] = useState<{ id: string; user: string; text: string; time: string; likes: number }[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: '1',
        user: 'RockListener_99',
        text: `${artistName}の新曲、ラスサビの転調が鳥肌モノでした！毎日リピートしてます。`,
        time: '2時間前',
        likes: 12,
      },
      {
        id: '2',
        user: 'LiveFan_Haru',
        text: '春ツアー東京公演のチケット当たりました！！行く人仲良くしてください🙌',
        time: '5時間前',
        likes: 8,
      },
    ];
  });

  const [inputVal, setInputVal] = useState('');

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const newMsg = {
      id: `msg_${Date.now()}`,
      user: 'あなた',
      text: inputVal.trim(),
      time: 'たった今',
      likes: 0,
    };
    const updated = [newMsg, ...messages];
    setMessages(updated);
    setInputVal('');
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  const handleLike = (id: string) => {
    const updated = messages.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m));
    setMessages(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handlePost} className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={`${artistName}への応援メッセージや感想を投稿...`}
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputVal.trim()}
          className="px-4 py-2.5 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shrink-0 shadow-md shadow-pink-600/20"
        >
          <Send className="w-3.5 h-3.5" />
          <span>投稿</span>
        </button>
      </form>

      <div className="space-y-2.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/70 flex items-start justify-between gap-3"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{msg.user}</span>
                <span className="text-[10px] text-neutral-500">{msg.time}</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">{msg.text}</p>
            </div>
            <button
              type="button"
              onClick={() => handleLike(msg.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-pink-400 transition-colors text-xs shrink-0 cursor-pointer"
            >
              <Heart className="w-3 h-3 fill-pink-500/20 text-pink-400" />
              <span className="font-mono text-[11px]">{msg.likes}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

