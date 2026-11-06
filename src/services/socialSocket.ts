type SocketListener = (payload: any) => void;

class SocialSocketService {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<SocketListener>> = new Map();
  private reconnectTimer: any = null;
  private isConnecting = false;
  private currentUser: string | null = null;
  private currentVideoId: string | null = null;
  private nowPlaying: { title: string; artist: string; videoId: string } | null = null;

  constructor() {
    this.connect();
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnecting = false;
        if (this.currentUser) {
          this.send('auth', { username: this.currentUser });
        }
        if (this.nowPlaying) {
          this.send('presence', { username: this.currentUser, nowPlaying: this.nowPlaying });
        }
        if (this.currentVideoId) {
          this.send('watch:video', { videoId: this.currentVideoId });
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const type = data.type;
          if (type && this.listeners.has(type)) {
            const handlers = this.listeners.get(type);
            handlers?.forEach((cb) => cb(data));
          }
          // Also invoke wildcard listeners
          if (this.listeners.has('*')) {
            this.listeners.get('*')?.forEach((cb) => cb(data));
          }
        } catch (err) {
          console.warn('[SocialSocket] Error parsing incoming message:', err);
        }
      };

      this.socket.onerror = () => {
        this.isConnecting = false;
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.socket = null;
        // Auto-reconnect with 3-second delay
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };
    } catch {
      this.isConnecting = false;
    }
  }

  public send(type: string, payload: any = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, ...payload }));
    }
  }

  public setUser(username: string | null) {
    this.currentUser = username;
    if (username) {
      this.send('auth', { username });
    }
  }

  public setNowPlaying(track: { title: string; artist: string; videoId: string } | null) {
    this.nowPlaying = track;
    this.currentVideoId = track ? track.videoId : null;
    this.send('presence', { username: this.currentUser, nowPlaying: track });
  }

  public watchVideo(videoId: string) {
    this.currentVideoId = videoId;
    this.send('watch:video', { videoId });
  }

  public joinParty(roomId: string, username: string) {
    this.send('party:join', { roomId, username });
  }

  public leaveParty(roomId: string, username: string) {
    this.send('party:leave', { roomId, username });
  }

  public syncParty(payload: {
    roomId: string;
    currentTrack?: any;
    isPlaying?: boolean;
    positionSec?: number;
    trackChanged?: boolean;
  }) {
    this.send('party:sync', payload);
  }

  public sendPartyChat(roomId: string, text: string, username?: string) {
    this.send('party:chat', { roomId, text, username });
  }

  public on(event: string, callback: SocketListener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off(event: string, callback: SocketListener) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }
}

export const socialSocket = new SocialSocketService();
