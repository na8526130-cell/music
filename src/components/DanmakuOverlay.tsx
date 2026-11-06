import React, { useEffect, useState, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { socialSocket } from '../services/socialSocket';
import { TrackComment } from '../types/social';

interface FlyingComment {
  id: string;
  text: string;
  color: string;
  topPercent: number; // 5% to 75%
  speedSec: number;
}

export const DanmakuOverlay: React.FC = () => {
  const { currentTrack, progress, danmakuEnabled } = usePlayer();
  const [comments, setComments] = useState<TrackComment[]>([]);
  const [activeFlying, setActiveFlying] = useState<FlyingComment[]>([]);
  const processedCommentIds = useRef<Set<string>>(new Set());
  const lastSecondRef = useRef<number>(-1);

  // Load comments when current track changes
  useEffect(() => {
    if (!currentTrack) {
      setComments([]);
      setActiveFlying([]);
      processedCommentIds.current.clear();
      return;
    }

    processedCommentIds.current.clear();
    api.getComments(currentTrack.id).then((res) => {
      setComments(res.comments || []);
    });

    // Listen for real-time comments added by other users
    const unsub = socialSocket.on('comment:new', (payload: any) => {
      if (payload.videoId === currentTrack.id && payload.comment) {
        setComments((prev) => [...prev, payload.comment]);
        // Immediately shoot newly posted comment across screen
        if (danmakuEnabled) {
          triggerFlying(payload.comment);
        }
      }
    });

    return () => {
      unsub();
    };
  }, [currentTrack?.id, danmakuEnabled]);

  const triggerFlying = (cmt: TrackComment) => {
    const lane = Math.floor(Math.random() * 8) * 9 + 8; // 8% to 71%
    const speed = 7 + Math.random() * 3; // 7s to 10s
    const item: FlyingComment = {
      id: `${cmt.id}_${Date.now()}`,
      text: cmt.text,
      color: cmt.color || '#FFFFFF',
      topPercent: lane,
      speedSec: speed,
    };
    setActiveFlying((prev) => [...prev.slice(-30), item]);

    setTimeout(() => {
      setActiveFlying((prev) => prev.filter((f) => f.id !== item.id));
    }, speed * 1000 + 500);
  };

  // Check progress and trigger comments at their matching timestamp
  useEffect(() => {
    if (!danmakuEnabled || !currentTrack || comments.length === 0) return;

    const currentSec = Math.floor(progress);
    if (currentSec === lastSecondRef.current) return;
    lastSecondRef.current = currentSec;

    const matching = comments.filter((c) => {
      const match = Math.floor(c.timestampSec) === currentSec;
      if (match && !processedCommentIds.current.has(c.id)) {
        processedCommentIds.current.add(c.id);
        return true;
      }
      return false;
    });

    matching.forEach((cmt) => {
      triggerFlying(cmt);
    });
  }, [progress, danmakuEnabled, comments, currentTrack]);

  if (!danmakuEnabled || activeFlying.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none">
      {activeFlying.map((item) => (
        <div
          key={item.id}
          className="absolute whitespace-nowrap font-bold text-base md:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-danmaku pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
          style={{
            top: `${item.topPercent}%`,
            color: item.color,
            animationDuration: `${item.speedSec}s`,
          }}
          title={item.text}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
};
