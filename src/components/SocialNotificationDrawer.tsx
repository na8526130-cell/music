import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { socialSocket } from '../services/socialSocket';
import { SocialNotification, ActivityFeedItem } from '../types/social';
import {
  X,
  Bell,
  Check,
  Heart,
  MessageSquare,
  Radio,
  UserPlus,
  Disc3,
  Clock,
  Sparkles,
  Play,
  Volume2,
} from 'lucide-react';

export const SocialNotificationDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenDmWithUser?: (username: string) => void;
}> = ({ isOpen, onClose, onOpenDmWithUser }) => {
  const { currentUser, playTrack } = usePlayer();
  const [activeTab, setActiveTab] = useState<'notifications' | 'feed'>('notifications');
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    if (currentUser) {
      api.getSocialNotifications(currentUser.username).then((res) => {
        setNotifications(res.notifications || []);
      });
    }
    api.getActivityFeed().then((res) => {
      setFeed(res.feed || []);
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    loadData();

    const unsubNotif = socialSocket.on('notification:new', (payload: any) => {
      if (payload.notification) {
        setNotifications((prev) => [payload.notification, ...prev]);
      }
    });

    return () => {
      unsubNotif();
    };
  }, [isOpen, currentUser?.username]);

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    await api.markSocialNotificationsRead(currentUser.username);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#101014] border-l border-neutral-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-white text-base">通知 & アクティビティ</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'bg-neutral-800 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>通知</span>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-mono">
                {notifications.filter((n) => !n.read).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'feed'
                ? 'bg-neutral-800 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>みんなの動き</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'notifications' ? (
            notifications.length === 0 ? (
              <div className="py-16 text-center text-neutral-500">
                <Bell className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
                <p className="text-xs">新しい通知はありません</p>
              </div>
            ) : (
              <>
                <div className="flex justify-end pb-1">
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-neutral-400 hover:text-emerald-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>すべて既読にする</span>
                  </button>
                </div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (n.type === 'dm' && onOpenDmWithUser) {
                        onClose();
                        onOpenDmWithUser(n.sender);
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      n.read
                        ? 'bg-neutral-900/40 border-neutral-800/80 text-neutral-300'
                        : 'bg-red-950/20 border-red-500/30 text-white shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'dm' ? (
                          <MessageSquare className="w-4 h-4 text-cyan-400" />
                        ) : n.type === 'comment_like' ? (
                          <Heart className="w-4 h-4 text-rose-400 fill-current" />
                        ) : n.type === 'follow' ? (
                          <UserPlus className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Radio className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold leading-tight mb-0.5">{n.title}</h4>
                        <p className="text-xs text-neutral-400 leading-relaxed">{n.body}</p>
                        <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )
          ) : feed.length === 0 ? (
            <div className="py-16 text-center text-neutral-500">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-neutral-600" />
              <p className="text-xs">アクティビティがありません</p>
            </div>
          ) : (
            feed.map((f) => (
              <div
                key={f.id}
                className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-300 shrink-0">
                  {f.username[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="font-bold text-white">{f.username}</span>
                    <span className="text-neutral-400">
                      {f.action === 'commented'
                        ? 'が弾幕コメントを投稿'
                        : f.action === 'played'
                        ? 'が楽曲を再生'
                        : f.action === 'liked'
                        ? 'がお気に入り追加'
                        : 'がプレイリストを作成'}
                    </span>
                  </div>
                  <h5 className="text-xs font-semibold text-neutral-200 truncate mt-0.5">
                    {f.targetTitle}
                  </h5>
                  {f.targetSubtitle && (
                    <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                      {f.targetSubtitle}
                    </p>
                  )}
                  <span className="text-[9px] text-neutral-500 font-mono mt-1 block">
                    {new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
