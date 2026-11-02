import React, { useState, useEffect, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import {
  X,
  ShieldCheck,
  Activity,
  Users,
  ListMusic,
  BellRing,
  Trash2,
  KeyRound,
  Sliders,
  Send,
  RefreshCw,
  Server,
  Database,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  LogOut,
  TrendingUp,
  Search,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Clock,
  Music2,
  Headphones,
  CheckCircle,
  FileText,
} from 'lucide-react';

export const AdminConsoleModal: React.FC = () => {
  const {
    isAdmin,
    adminModalOpen,
    setAdminModalOpen,
    adminLoginWithPassword,
    logoutAccount,
    refreshTrackOffsets,
    refreshStats,
    currentTrack,
  } = usePlayer();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'ranking' | 'traffic' | 'diagnostics' | 'users' | 'offsets' | 'broadcast' | 'maintenance'
  >('overview');

  // Login form for admin if not authenticated
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Overview data
  const [overviewData, setOverviewData] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ping test state
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  // Track offset state
  const [offsetVideoId, setOffsetVideoId] = useState('');
  const [offsetTitle, setOffsetTitle] = useState('');
  const [offsetSecVal, setOffsetSecVal] = useState('0');
  const [savingOffset, setSavingOffset] = useState(false);

  // Broadcast email state
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // User actions
  const [userPasswordReset, setUserPasswordReset] = useState<{ username: string; newPass: string } | null>(
    null
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchOverview = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingOverview(true);
    try {
      const data = await api.getAdminOverview();
      setOverviewData(data);
    } catch (err: any) {
      console.warn('Admin overview fetch error:', err);
    } finally {
      setLoadingOverview(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (adminModalOpen && isAdmin) {
      fetchOverview();
    }
  }, [adminModalOpen, isAdmin, fetchOverview]);

  if (!adminModalOpen) return null;

  // Direct login as Admin inside console modal
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      await adminLoginWithPassword(adminPassInput.trim());
      setAdminPassInput('');
      showToast('管理者として認証されました');
      fetchOverview();
    } catch (err: any) {
      setLoginError(err.message || 'パスワードが正しくありません');
    } finally {
      setLoginLoading(false);
    }
  };

  // Test InnerTube API Ping
  const handleTestPing = async () => {
    setPinging(true);
    setPingResult(null);
    const start = performance.now();
    try {
      const res = await api.getHealth();
      const ms = Math.round(performance.now() - start);
      setPingResult(`疎通正常: ${ms}ms (${res.status || 'OK'})`);
      fetchOverview();
    } catch (err: any) {
      setPingResult(`疎通エラー: ${err.message}`);
    } finally {
      setPinging(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`ユーザー「${username}」を完全に削除しますか？`)) return;
    try {
      await api.deleteUser(username);
      showToast(`ユーザー「${username}」を削除しました`);
      fetchOverview();
      refreshStats();
    } catch (err: any) {
      showToast(err.message || '削除に失敗しました');
    }
  };

  // Reset User Password
  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPasswordReset) return;
    try {
      await api.resetUserPassword(userPasswordReset.username, userPasswordReset.newPass);
      showToast(`「${userPasswordReset.username}」のパスワードをリセットしました`);
      setUserPasswordReset(null);
    } catch (err: any) {
      showToast(err.message || 'リセットに失敗しました');
    }
  };

  // Save Track Offset (Global offset tuning for intro-less songs, etc.)
  const handleSaveTrackOffset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offsetVideoId.trim()) return;
    setSavingOffset(true);
    try {
      await api.setTrackOffset({
        videoId: offsetVideoId.trim(),
        offsetSec: parseFloat(offsetSecVal) || 0,
        title: offsetTitle.trim() || offsetVideoId.trim(),
      });
      showToast(`楽曲 [${offsetVideoId}] の同期オフセットを設定しました`);
      setOffsetVideoId('');
      setOffsetTitle('');
      setOffsetSecVal('0');
      refreshTrackOffsets();
      fetchOverview();
    } catch (err: any) {
      showToast(err.message || 'オフセット設定に失敗しました');
    } finally {
      setSavingOffset(false);
    }
  };

  // Delete Track Offset
  const handleDeleteTrackOffset = async (videoId: string) => {
    try {
      await api.setTrackOffset({ videoId, offsetSec: 0, remove: true });
      showToast(`楽曲 [${videoId}] の補正を解除しました`);
      refreshTrackOffsets();
      fetchOverview();
    } catch (err: any) {
      showToast(err.message || '解除に失敗しました');
    }
  };

  // Broadcast Email
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastBody.trim()) return;
    setSendingBroadcast(true);
    try {
      const res = await api.broadcastNotification(broadcastSubject, broadcastBody);
      showToast(res.message || '一斉配信を完了しました');
      setBroadcastSubject('');
      setBroadcastBody('');
      fetchOverview();
    } catch (err: any) {
      showToast(err.message || '一斉配信に失敗しました');
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Clear Cache
  const handleClearCache = async () => {
    try {
      const res = await api.clearLyricsCache();
      showToast(res.message);
      fetchOverview();
    } catch (err: any) {
      showToast(err.message || 'キャッシュ消去に失敗しました');
    }
  };

  // Export JSON
  const handleExportData = () => {
    if (!overviewData) return;
    const blob = new Blob([JSON.stringify(overviewData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeromusic_full_analytics_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('システムデータをダウンロードしました');
  };

  const totalDeviceCount =
    (overviewData?.traffic?.clientDevices?.desktop || 0) +
    (overviewData?.traffic?.clientDevices?.mobile || 0) +
    (overviewData?.traffic?.clientDevices?.tablet || 0) || 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={() => setAdminModalOpen(false)}
    >
      <div
        className="w-full max-w-5xl bg-[#0b0b0e] border border-amber-500/30 rounded-2xl shadow-2xl relative overflow-hidden max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800/80 bg-neutral-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white tracking-wide">
                  Zero Music <span className="text-amber-400">管理者コンソール & 詳細分析テレメトリ</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ROOT ADMIN
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                実データ集計・再生行動分析・トラフィック診断・楽曲オフセット補正
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={fetchOverview}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                title="データを再読み込み"
              >
                <RefreshCw className={`w-4 h-4 ${loadingOverview ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setAdminModalOpen(false)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* If not authenticated: dedicated login */}
        {!isAdmin ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
              <KeyRound className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-lg font-bold text-white">管理者マスター認証</h3>
              <p className="text-xs text-neutral-400">
                管理者専用パスワード（<span className="font-mono text-amber-400">@zeromusic</span>）を入力してください。
              </p>
            </div>

            <form onSubmit={handleAdminAuth} className="w-full max-w-sm space-y-3">
              <input
                type="password"
                value={adminPassInput}
                onChange={(e) => setAdminPassInput(e.target.value)}
                placeholder="管理者パスワード"
                className="w-full bg-neutral-900 border border-neutral-700 text-sm text-white px-4 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-center tracking-widest font-mono"
                autoFocus
                required
              />

              {loginError && (
                <p className="text-xs text-red-400 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{loginError}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={loginLoading || !adminPassInput}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
              >
                {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>管理者としてログイン</span>
              </button>
            </form>
          </div>
        ) : (
          /* Logged-In Admin Dashboard */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-56 bg-neutral-950/80 border-b md:border-b-0 md:border-r border-neutral-800/80 p-2 sm:p-2.5 flex md:flex-col gap-1 overflow-x-auto shrink-0 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'overview'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>総合稼働概要</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ranking')}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'ranking'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>再生 & 検索分析</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('traffic')}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'traffic'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>端末・環境診断</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('diagnostics')}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'diagnostics'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>API & エラー監視</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'users'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ユーザー管理 ({overviewData?.accounts?.length ?? 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('offsets')}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'offsets'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>楽曲オフセット補正</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('broadcast')}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'broadcast'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>メール一斉配信</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('maintenance')}
                className={`w-full text-left px-3 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'maintenance'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>システム保守</span>
              </button>

              <div className="mt-auto pt-2 border-t border-neutral-900 hidden md:block">
                <button
                  type="button"
                  onClick={() => {
                    logoutAccount();
                    showToast('管理者からログアウトしました');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-neutral-900 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ログアウト</span>
                </button>
              </div>
            </div>

            {/* Content Pane */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-neutral-200">
              {/* Tab 1: Overview & Metrics */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <span>全システム稼働実績テレメトリ（全数実データ・偽りなし）</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      サーバー実ストレージより集計された正確なアクセス・再生・稼働テレメトリです。
                    </p>
                  </div>

                  {/* 9 Stats Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-emerald-500/40 relative overflow-hidden">
                      <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                        <span className="text-emerald-300 font-semibold">現在オンライン中</span>
                        <div className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </div>
                      </div>
                      <p className="text-xl font-black text-white font-mono">
                        {overviewData?.stats?.onlineCount ?? 1}
                        <span className="text-xs text-emerald-400 ml-1 font-normal">人接続</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                      <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                        <span>総アクセス回数</span>
                        <Activity className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <p className="text-xl font-black text-white font-mono">
                        {overviewData?.stats?.totalAccessCount?.toLocaleString() ?? 0}
                        <span className="text-xs text-neutral-400 ml-1 font-normal">回</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                      <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                        <span>登録アカウント数</span>
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <p className="text-xl font-black text-white font-mono">
                        {overviewData?.stats?.totalAccountsCount?.toLocaleString() ?? 0}
                        <span className="text-xs text-neutral-400 ml-1 font-normal">人</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                      <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                        <span>総楽曲再生数</span>
                        <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <p className="text-xl font-black text-white font-mono">
                        {overviewData?.stats?.totalTracksPlayed?.toLocaleString() ?? 0}
                        <span className="text-xs text-neutral-400 ml-1 font-normal">曲</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                      <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                        <span>総再生時間</span>
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <p className="text-xl font-black text-white font-mono">
                        {overviewData?.stats?.totalPlaybackMinutes?.toLocaleString() ?? 0}
                        <span className="text-xs text-neutral-400 ml-1 font-normal">分</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                      <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                        <span>クラウドプレイリスト</span>
                        <ListMusic className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <p className="text-xl font-black text-white font-mono">
                        {overviewData?.stats?.totalPlaylistsCount?.toLocaleString() ?? 0}
                        <span className="text-xs text-neutral-400 ml-1 font-normal">個</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                      <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                        <span>歌詞表示回数</span>
                        <Music2 className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <p className="text-xl font-black text-white font-mono">
                        {overviewData?.stats?.totalLyricsViews?.toLocaleString() ?? 0}
                        <span className="text-xs text-neutral-400 ml-1 font-normal">回</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                      <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                        <span>LRC同期成功率</span>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <p className="text-xl font-black text-emerald-400 font-mono">
                        {overviewData?.stats?.lyricsMatchRate ?? 100}
                        <span className="text-xs text-neutral-400 ml-1 font-normal">%</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800">
                      <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                        <span>配信通知ログ</span>
                        <BellRing className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <p className="text-xl font-black text-white font-mono">
                        {overviewData?.stats?.totalNotificationsCount?.toLocaleString() ?? 0}
                        <span className="text-xs text-neutral-400 ml-1 font-normal">件</span>
                      </p>
                    </div>
                  </div>

                  {/* System Environment */}
                  <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-500 block text-[10px] font-mono uppercase">Node.js ランタイム</span>
                      <span className="font-mono text-white">{overviewData?.system?.nodeVersion || 'v22'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px] font-mono uppercase">プロセス連続稼働</span>
                      <span className="font-mono text-white">
                        {Math.floor((overviewData?.system?.uptimeSeconds || 0) / 60)} 分
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px] font-mono uppercase">メモリ使用量</span>
                      <span className="font-mono text-white">{overviewData?.system?.memoryUsageMb || 0} MB</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px] font-mono uppercase">歌詞メモリキャッシュ</span>
                      <span className="font-mono text-emerald-400">
                        {overviewData?.system?.lyricsCacheSize || 0} 曲保持中
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Ranking & Search Trends */}
              {activeTab === 'ranking' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <span>再生ランキング & 検索クエリトレンド</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      実際に再生された楽曲の回数ランキングと、ユーザーが入力した検索キーワードの集計です。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Top Tracks */}
                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Headphones className="w-4 h-4 text-cyan-400" />
                          <span>再生回数 TOP15</span>
                        </span>
                        <span className="text-[11px] text-neutral-500">再生ログ実データ</span>
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {!overviewData?.topTracks || overviewData.topTracks.length === 0 ? (
                          <div className="py-8 text-center text-xs text-neutral-500">
                            再生ログはまだありません
                          </div>
                        ) : (
                          overviewData.topTracks.map((t: any, idx: number) => (
                            <div
                              key={t.videoId}
                              className="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <span
                                  className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 font-mono ${
                                    idx === 0
                                      ? 'bg-amber-500 text-black'
                                      : idx === 1
                                      ? 'bg-neutral-300 text-black'
                                      : idx === 2
                                      ? 'bg-amber-700 text-white'
                                      : 'bg-neutral-800 text-neutral-400'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                {t.thumbnail && (
                                  <img
                                    src={t.thumbnail}
                                    alt=""
                                    className="w-8 h-8 rounded object-cover bg-neutral-800 shrink-0"
                                  />
                                )}
                                <div className="truncate">
                                  <p className="font-semibold text-white truncate">{t.title}</p>
                                  <p className="text-[11px] text-neutral-400 truncate">{t.artist}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 font-mono">
                                <span className="font-bold text-amber-400 text-sm">{t.playCount}</span>
                                <span className="text-[10px] text-neutral-500 ml-1">回</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Top Searches */}
                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <Search className="w-4 h-4 text-emerald-400" />
                          <span>人気検索キーワード TOP15</span>
                        </span>
                        <span className="text-[11px] text-neutral-500">入力クエリ集計</span>
                      </div>

                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {!overviewData?.topSearches || overviewData.topSearches.length === 0 ? (
                          <div className="py-8 text-center text-xs text-neutral-500">
                            検索クエリログはまだありません
                          </div>
                        ) : (
                          overviewData.topSearches.map((s: any, idx: number) => (
                            <div
                              key={s.query}
                              className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <span className="w-5 h-5 rounded-md bg-neutral-800 text-neutral-400 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">
                                  #{idx + 1}
                                </span>
                                <span className="font-semibold text-neutral-200 truncate">{s.query}</span>
                              </div>
                              <div className="text-right shrink-0 font-mono">
                                <span className="font-bold text-emerald-400">{s.count}</span>
                                <span className="text-[10px] text-neutral-500 ml-1">回検索</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Traffic & Environment Diagnostics */}
              {activeTab === 'traffic' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-amber-400" />
                      <span>リアルタイム接続・端末環境 & 時間帯別トラフィック</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      現在リアルタイム接続中のクライアント一覧および訪問者の端末・ブラウザ・OSの内訳です。
                    </p>
                  </div>

                  {/* Real-time Active Connected Clients list */}
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          現在オンライン中の実クライアント ({overviewData?.activeSessions?.length || 1}端末)
                        </h4>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        ハートビート実セッション（偽りなし）
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {(overviewData?.activeSessions || []).map((sess: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-200">
                              <span className="font-bold text-white truncate">{sess.username || 'ゲスト'}</span>
                              <span className="text-neutral-500 text-[10px]">({sess.sessionId})</span>
                            </div>
                            <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
                              <span>{sess.device}</span>
                              <span>•</span>
                              <span>{sess.browser}</span>
                              <span>•</span>
                              <span>{sess.os}</span>
                            </div>
                          </div>
                          <div className="text-right text-[10px] font-mono shrink-0">
                            <span className="text-emerald-400 block">{sess.lastSeenSecondsAgo}秒前</span>
                            <span className="text-neutral-500 block">接続{sess.connectedDurationSeconds}秒</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Device breakdown cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-mono">PC / デスクトップ</span>
                        <p className="text-base font-bold text-white font-mono">
                          {overviewData?.traffic?.clientDevices?.desktop || 0}
                          <span className="text-xs text-neutral-500 ml-1.5 font-normal">
                            ({Math.round(((overviewData?.traffic?.clientDevices?.desktop || 0) / totalDeviceCount) * 100)}%)
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-mono">スマートフォン</span>
                        <p className="text-base font-bold text-white font-mono">
                          {overviewData?.traffic?.clientDevices?.mobile || 0}
                          <span className="text-xs text-neutral-500 ml-1.5 font-normal">
                            ({Math.round(((overviewData?.traffic?.clientDevices?.mobile || 0) / totalDeviceCount) * 100)}%)
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                        <Tablet className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 uppercase font-mono">タブレット</span>
                        <p className="text-base font-bold text-white font-mono">
                          {overviewData?.traffic?.clientDevices?.tablet || 0}
                          <span className="text-xs text-neutral-500 ml-1.5 font-normal">
                            ({Math.round(((overviewData?.traffic?.clientDevices?.tablet || 0) / totalDeviceCount) * 100)}%)
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Browser & OS Share */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Browser share */}
                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                      <span className="text-xs font-bold text-white block pb-1 border-b border-neutral-800">
                        ブラウザ種別シェア
                      </span>
                      <div className="space-y-1.5 pt-1 text-xs font-mono">
                        {!overviewData?.traffic?.clientBrowsers || Object.keys(overviewData.traffic.clientBrowsers).length === 0 ? (
                          <div className="py-4 text-center text-neutral-500">データ集計中</div>
                        ) : (
                          Object.entries(overviewData.traffic.clientBrowsers).map(([browser, count]: [string, any]) => (
                            <div key={browser} className="flex items-center justify-between p-1.5 rounded bg-neutral-950/70">
                              <span className="text-neutral-300">{browser}</span>
                              <span className="text-amber-400 font-bold">{count} アクセス</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* OS share */}
                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                      <span className="text-xs font-bold text-white block pb-1 border-b border-neutral-800">
                        オペレーティングシステム (OS) シェア
                      </span>
                      <div className="space-y-1.5 pt-1 text-xs font-mono">
                        {!overviewData?.traffic?.clientOS || Object.keys(overviewData.traffic.clientOS).length === 0 ? (
                          <div className="py-4 text-center text-neutral-500">データ集計中</div>
                        ) : (
                          Object.entries(overviewData.traffic.clientOS).map(([os, count]: [string, any]) => (
                            <div key={os} className="flex items-center justify-between p-1.5 rounded bg-neutral-950/70">
                              <span className="text-neutral-300">{os}</span>
                              <span className="text-cyan-400 font-bold">{count} アクセス</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hourly 24h Distribution */}
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                    <span className="text-xs font-bold text-white block">時間帯別アクセス分布 (24時間)</span>
                    <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 items-end h-24 pt-4 border-b border-neutral-800">
                      {Array.from({ length: 24 }).map((_, h) => {
                        const count = overviewData?.traffic?.hourlyVisits?.[String(h)] || 0;
                        const maxH = Math.max(
                          1,
                          ...Object.values(overviewData?.traffic?.hourlyVisits || {}).map((v) => Number(v) || 0)
                        );
                        const heightPercent = Math.max(8, Math.round((count / maxH) * 100));
                        return (
                          <div key={h} className="flex flex-col items-center h-full justify-end group relative">
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className="w-full bg-amber-500/80 rounded-t group-hover:bg-amber-400 transition-all"
                            />
                            <span className="text-[9px] font-mono text-neutral-500 mt-1">{h}</span>
                            {/* Tooltip */}
                            <div className="absolute -top-7 hidden group-hover:block px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-white font-mono whitespace-nowrap z-10 border border-neutral-700 shadow">
                              {h}時: {count}回
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: API & Error Diagnostics */}
              {activeTab === 'diagnostics' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Server className="w-4 h-4 text-amber-400" />
                        <span>InnerTube API 疎通ログ & 再生エラー監視</span>
                      </h3>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        YouTube InnerTubeクライアントのリアルタイム呼び出し所要時間とエラーの自動記録です。
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestPing}
                        disabled={pinging}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-neutral-700 transition-colors"
                      >
                        {pinging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5 text-amber-400" />}
                        <span>API 疎通テスト (Ping)</span>
                      </button>
                    </div>
                  </div>

                  {pingResult && (
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{pingResult}</span>
                    </div>
                  )}

                  {/* Lyrics Sync Hits breakdown */}
                  <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-500 block text-[10px] font-mono">歌詞検索総数</span>
                      <span className="font-mono text-white font-bold">{overviewData?.lyricsStats?.views || 0} 回</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px] font-mono">高精度LRC同期ヒット</span>
                      <span className="font-mono text-emerald-400 font-bold">{overviewData?.lyricsStats?.syncedHits || 0} 回</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px] font-mono">通常テキスト歌詞ヒット</span>
                      <span className="font-mono text-amber-400 font-bold">{overviewData?.lyricsStats?.plainHits || 0} 回</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px] font-mono">歌詞未検出</span>
                      <span className="font-mono text-red-400 font-bold">{overviewData?.lyricsStats?.notFound || 0} 回</span>
                    </div>
                  </div>

                  {/* Recent InnerTube API Call Logs */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                      直近 InnerTube API 疎通ログ (直近15件)
                    </span>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-xl border border-neutral-800/80 bg-neutral-950 p-2 font-mono text-[11px]">
                      {!overviewData?.recentApiLogs || overviewData.recentApiLogs.length === 0 ? (
                        <div className="py-4 text-center text-neutral-500 text-xs">API呼び出しログはありません</div>
                      ) : (
                        overviewData.recentApiLogs.map((log: any) => (
                          <div
                            key={log.id}
                            className="p-2 rounded bg-neutral-900/70 border border-neutral-800/60 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  log.status === 'success' ? 'bg-emerald-400' : 'bg-red-500'
                                }`}
                              />
                              <span className="text-amber-300 font-semibold truncate">{log.endpoint}</span>
                              {log.itemCount !== undefined && (
                                <span className="text-neutral-400 text-[10px]">({log.itemCount}件)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-neutral-400 shrink-0">
                              <span>{log.durationMs}ms</span>
                              <span>{new Date(log.timestamp).toLocaleTimeString('ja-JP')}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Playback Errors */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                      再生エラー・埋め込みブロック発生ログ
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-neutral-800 bg-neutral-950 p-2 font-mono text-[11px]">
                      {!overviewData?.playbackErrors || overviewData.playbackErrors.length === 0 ? (
                        <div className="py-4 text-center text-neutral-500 text-xs">
                          エラーは発生していません（全曲正常再生中）
                        </div>
                      ) : (
                        overviewData.playbackErrors.map((err: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-red-950/20 border border-red-500/30 flex items-center justify-between gap-3 text-xs text-red-300"
                          >
                            <div className="truncate">
                              <span className="font-bold text-white truncate">{err.title || err.videoId}</span>
                              <span className="text-[10px] text-red-400 block truncate">{err.error}</span>
                            </div>
                            <span className="text-[10px] text-neutral-500 shrink-0">
                              {new Date(err.timestamp).toLocaleTimeString('ja-JP')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 5: Users Management */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>登録ユーザー一覧 ({overviewData?.accounts?.length ?? 0}アカウント)</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      登録された全アカウントの確認・削除・パスワード初期化が可能です。
                    </p>
                  </div>

                  {/* Password Reset Modal/Prompt Inline */}
                  {userPasswordReset && (
                    <form
                      onSubmit={handleResetUserPassword}
                      className="p-4 rounded-xl bg-neutral-900 border border-amber-500/40 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in"
                    >
                      <div className="text-xs text-neutral-300">
                        ユーザー「<strong className="text-white">{userPasswordReset.username}</strong>」の新パスワード:
                      </div>
                      <input
                        type="password"
                        value={userPasswordReset.newPass}
                        onChange={(e) =>
                          setUserPasswordReset({ ...userPasswordReset, newPass: e.target.value })
                        }
                        placeholder="新しいパスワード"
                        className="flex-1 bg-neutral-950 border border-neutral-700 text-xs text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                        required
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-lg cursor-pointer"
                        >
                          更新
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserPasswordReset(null)}
                          className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs rounded-lg cursor-pointer"
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="overflow-x-auto rounded-xl border border-neutral-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-950 border-b border-neutral-800 text-[11px] font-mono text-neutral-400 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">ユーザー名</th>
                          <th className="py-2.5 px-3">メールアドレス</th>
                          <th className="py-2.5 px-3">プレイリスト</th>
                          <th className="py-2.5 px-3">登録日時</th>
                          <th className="py-2.5 px-3">最終アクセス</th>
                          <th className="py-2.5 px-3 text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/80">
                        {!overviewData?.accounts || overviewData.accounts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-neutral-500 text-xs">
                              登録されたアカウントはまだありません
                            </td>
                          </tr>
                        ) : (
                          overviewData.accounts.map((acc: any) => (
                            <tr key={acc.id} className="hover:bg-neutral-900/50 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-white">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center text-white text-[10px]">
                                    {acc.username.charAt(0).toUpperCase()}
                                  </div>
                                  <span>{acc.username}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-neutral-400 font-mono">
                                {acc.email ? (
                                  <span className="text-emerald-400">{acc.email}</span>
                                ) : (
                                  <span className="text-neutral-500">未設定</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-300 font-mono">
                                {acc.playlistsCount} 個
                              </td>
                              <td className="py-2.5 px-3 text-neutral-400 font-mono text-[11px]">
                                {new Date(acc.registeredAt).toLocaleDateString('ja-JP')}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-400 font-mono text-[11px]">
                                {acc.lastActive
                                  ? new Date(acc.lastActive).toLocaleString('ja-JP', {
                                      month: 'numeric',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '未記録'}
                              </td>
                              <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setUserPasswordReset({ username: acc.username, newPass: '' })
                                  }
                                  className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                                  title="パスワードを再設定"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(acc.username)}
                                  className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
                                  title="アカウントを削除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 6: Track Offset Override (Global tuning for intro-less songs) */}
              {activeTab === 'offsets' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span>楽曲別・歌詞同期オフセット調整マスター</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      「イントロのない曲」「MV版と音源版の開始タイミング差」がある楽曲に対し、管理者側でグローバル補正値（秒）を登録します。全ユーザーに自動適用されます。
                    </p>
                  </div>

                  {/* Add form */}
                  <form onSubmit={handleSaveTrackOffset} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                    {currentTrack && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="text-neutral-400">現在再生中:</span>
                          <span className="font-semibold text-white truncate">{currentTrack.title}</span>
                          <span className="text-neutral-500 text-[10px] font-mono shrink-0">({currentTrack.id})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOffsetVideoId(currentTrack.id);
                            setOffsetTitle(`${currentTrack.title} - ${currentTrack.artist}`);
                          }}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[11px] font-semibold cursor-pointer shrink-0 transition-colors"
                        >
                          この曲を入力
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">YouTube Video ID (必須)</label>
                        <input
                          type="text"
                          value={offsetVideoId}
                          onChange={(e) => setOffsetVideoId(e.target.value)}
                          placeholder="例: m9SMT5ipbxk"
                          className="w-full bg-neutral-950 border border-neutral-700 text-xs text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">楽曲タイトル / メモ</label>
                        <input
                          type="text"
                          value={offsetTitle}
                          onChange={(e) => setOffsetTitle(e.target.value)}
                          placeholder="曲名 (省略可)"
                          className="w-full bg-neutral-950 border border-neutral-700 text-xs text-white px-3 py-2 rounded-lg focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1">
                          オフセット補正 (秒 / マイナスで早める)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={offsetSecVal}
                          onChange={(e) => setOffsetSecVal(e.target.value)}
                          placeholder="例: -0.8 または 1.2"
                          className="w-full bg-neutral-950 border border-neutral-700 text-xs text-white px-3 py-2 rounded-lg font-mono focus:outline-none focus:border-amber-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Quick offset presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                      <span className="text-[11px] text-neutral-400 mr-1">クイック補正プリセット:</span>
                      {[-1.5, -1.0, -0.8, -0.5, 0.0, 0.5, 1.0, 1.5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setOffsetSecVal(String(val))}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
                            parseFloat(offsetSecVal) === val
                              ? 'bg-amber-500 text-black border-amber-500 font-bold'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          {val > 0 ? `+${val}` : val}秒{val === -0.8 || val === -1.0 ? ' (イントロ無)' : ''}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingOffset || !offsetVideoId.trim()}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        {savingOffset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
                        <span>補正値を登録</span>
                      </button>
                    </div>
                  </form>

                  {/* Registered Offsets Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-neutral-300">登録済み補正値一覧</h4>
                    <div className="rounded-xl border border-neutral-800 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-950 border-b border-neutral-800 text-[11px] font-mono text-neutral-400 uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Video ID</th>
                            <th className="py-2.5 px-3">曲名 / メモ</th>
                            <th className="py-2.5 px-3">オフセット値</th>
                            <th className="py-2.5 px-3 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                          {!overviewData?.trackOffsets || Object.keys(overviewData.trackOffsets).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-neutral-500 text-xs">
                                登録された楽曲オフセット補正値はありません
                              </td>
                            </tr>
                          ) : (
                            Object.entries(overviewData.trackOffsets).map(([vid, info]: [string, any]) => (
                              <tr key={vid} className="hover:bg-neutral-900/40">
                                <td className="py-2 px-3 font-mono text-amber-300">{vid}</td>
                                <td className="py-2 px-3 text-white">{info.title || vid}</td>
                                <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                                  {info.offsetSec > 0 ? `+${info.offsetSec}` : info.offsetSec} 秒
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTrackOffset(vid)}
                                    className="p-1.5 text-neutral-400 hover:text-red-400 rounded cursor-pointer"
                                    title="補正を解除"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: Broadcast Notification */}
              {activeTab === 'broadcast' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-amber-400" />
                      <span>メール登録ユーザーへの一斉通知配信</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      メールアドレスを登録している全ユーザーへ、アップデートや特集の案内を一斉配信します。
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-neutral-300">
                        送信対象アカウント: <strong className="text-white font-mono">{overviewData?.accounts?.filter((a: any) => a.hasEmail)?.length || 0}</strong> 人 (メール設定済み)
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      全{overviewData?.accounts?.length || 0}アカウント中
                    </span>
                  </div>

                  <form onSubmit={handleSendBroadcast} className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        メール件名 / タイトル
                      </label>
                      <input
                        type="text"
                        value={broadcastSubject}
                        onChange={(e) => setBroadcastSubject(e.target.value)}
                        placeholder="例: 【Zero Music】新機能リリース・プレイリスト同期のご案内"
                        className="w-full bg-neutral-950 border border-neutral-700 text-xs sm:text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-300 mb-1">
                        通知本文メッセージ
                      </label>
                      <textarea
                        rows={4}
                        value={broadcastBody}
                        onChange={(e) => setBroadcastBody(e.target.value)}
                        placeholder="ユーザー宛ての本文を入力..."
                        className="w-full bg-neutral-950 border border-neutral-700 text-xs sm:text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={sendingBroadcast || !broadcastSubject.trim() || !broadcastBody.trim()}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-600/20"
                      >
                        {sendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>全メール登録ユーザーへ一斉送信</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab 8: Maintenance */}
              {activeTab === 'maintenance' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-amber-400" />
                      <span>システム保守 & データエクスポート</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      サーバー内部キャッシュの消去や、全ユーザー・全設定のJSONバックアップを行います。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                      <h4 className="text-xs font-bold text-white">歌詞キャッシュ消去</h4>
                      <p className="text-xs text-neutral-400">
                        サーバーに一時キャッシュされているLRC同期歌詞データを消去し、最新の同期データを再取得させます。
                      </p>
                      <button
                        type="button"
                        onClick={handleClearCache}
                        className="mt-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        キャッシュを消去
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                      <h4 className="text-xs font-bold text-white">JSONバックアップエクスポート</h4>
                      <p className="text-xs text-neutral-400">
                        総アクセス数、アカウント一覧、オフセット補正値、通知ログを含む全データをファイル保存します。
                      </p>
                      <button
                        type="button"
                        onClick={handleExportData}
                        className="mt-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>データJSONをダウンロード</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-800/80 bg-neutral-950 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <span className="font-mono text-[11px] text-neutral-500">
            認証ステータス: {isAdmin ? '管理者セッション有効 (Pass: @zeromusic)' : '未認証'}
          </span>
          <button
            type="button"
            onClick={() => setAdminModalOpen(false)}
            className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
