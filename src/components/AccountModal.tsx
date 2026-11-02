import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import {
  X,
  User,
  KeyRound,
  Mail,
  Bell,
  CheckCircle2,
  Cloud,
  Send,
  Loader2,
  LogOut,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  BellRing,
  Activity,
  Users,
} from 'lucide-react';

export const AccountModal: React.FC = () => {
  const {
    currentUser,
    accountModalOpen,
    setAccountModalOpen,
    registerUserAccount,
    loginUserAccount,
    logoutAccount,
    userPlaylists,
    stats,
    onlineCount,
    refreshStats,
    isAdmin,
    setAdminModalOpen,
    adminLoginWithPassword,
  } = usePlayer();

  const [authMode, setAuthMode] = useState<'register' | 'login' | 'admin'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Notification toggles
  const [prefs, setPrefs] = useState({
    releases: true,
    playlists: true,
    lyrics: true,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadNotifications = async (query: string) => {
    if (!query) return;
    setLoadingNotifs(true);
    try {
      const data = await api.getAccountNotifications(query);
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    if (accountModalOpen) {
      refreshStats();
      if (currentUser?.username) {
        loadNotifications(currentUser.username);
      }
    }
  }, [accountModalOpen, currentUser?.username, refreshStats]);

  if (!accountModalOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();
    const cleanMail = email.trim();

    if (!cleanUser || cleanUser.length < 2) {
      showToast('ユーザー名は2文字以上で入力してください');
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      showToast('パスワードは4文字以上で入力してください');
      return;
    }

    setLoading(true);
    try {
      await registerUserAccount(cleanUser, cleanPass, cleanMail);
      showToast(`アカウント「${cleanUser}」を登録しました`);
      setUsername('');
      setPassword('');
      setEmail('');
      loadNotifications(cleanUser);
    } catch (err: any) {
      showToast(err.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      showToast('ユーザー名とパスワードを入力してください');
      return;
    }

    setLoading(true);
    try {
      await loginUserAccount(cleanUser, cleanPass);
      showToast(`「${cleanUser}」としてログインしました`);
      setUsername('');
      setPassword('');
      loadNotifications(cleanUser);
    } catch (err: any) {
      showToast(err.message || 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = adminPassword.trim();
    if (!cleanPass) {
      showToast('管理者パスワードを入力してください');
      return;
    }

    setLoading(true);
    try {
      await adminLoginWithPassword(cleanPass);
      showToast('管理者として認証されました');
      setAdminPassword('');
      setAccountModalOpen(false);
      setAdminModalOpen(true);
    } catch (err: any) {
      showToast(err.message || '管理者パスワードが正しくありません');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!currentUser) return;
    if (!currentUser.email) {
      showToast('通知先のメールアドレスが設定されていません');
      return;
    }

    setSendingNotification(true);
    try {
      await api.sendNotification({
        username: currentUser.username,
        email: currentUser.email,
        subject: '【Zero Music】リアルタイム通知テスト (配信成功)',
        body: `Zero Musicより${currentUser.username}様宛のリアルタイム通知テストです。お気に入り楽曲やプレイリストの最新情報が配信されます。`,
        type: 'test',
      });
      showToast('通知を送信しました');
      loadNotifications(currentUser.username);
    } catch (err: any) {
      showToast(err.message || '通知送信に失敗しました');
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={() => setAccountModalOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-[#111116] border border-neutral-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-red-600/20 text-red-500'
            }`}>
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isAdmin ? '管理者・アカウント設定' : 'アカウント管理'}</span>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    👑 管理者 (ADMIN)
                  </span>
                ) : currentUser ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ログイン中
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
                    ゲストモード
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAdmin ? 'システム統括・アカウント管理・テレメトリ' : 'アカウント登録・ログイン・メール通知設定'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAccountModalOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1 text-neutral-200">
          {/* Real Metrics Banner (オンライン & 総アクセス回数 & アカウント数 - 偽はいらん) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-emerald-950/20 border border-neutral-800 shadow-md">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800/60 text-xs">
              <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>システム稼働実績テレメトリ（偽りなしの実測値）</span>
              </div>
              <button
                type="button"
                onClick={refreshStats}
                className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                title="数値を更新"
              >
                <RefreshCw className="w-3 h-3" />
                <span>更新</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-neutral-950/70 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0 relative">
                  <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-400/90 font-mono uppercase tracking-wider font-semibold">現在オンライン</p>
                  <p className="text-lg font-black text-white font-mono leading-tight">
                    {onlineCount}
                    <span className="text-xs font-normal text-emerald-400 ml-1">人</span>
                  </p>
                </div>
              </div>

              <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center shrink-0">
                  <Activity className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">総アクセス回数</p>
                  <p className="text-lg font-black text-white font-mono leading-tight">
                    {stats.totalAccessCount.toLocaleString()}
                    <span className="text-xs font-normal text-neutral-400 ml-1">回</span>
                  </p>
                </div>
              </div>

              <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">登録アカウント数</p>
                  <p className="text-lg font-black text-white font-mono leading-tight">
                    {stats.totalAccountsCount.toLocaleString()}
                    <span className="text-xs font-normal text-neutral-400 ml-1">人</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {!currentUser ? (
            /* Not logged in: Tab for Register / Login */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-neutral-800 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  新規アカウント登録
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-neutral-800 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ログイン
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('admin')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                    authMode === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow'
                      : 'text-neutral-400 hover:text-amber-400'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>👑 管理者</span>
                </button>
              </div>

              {authMode === 'register' ? (
                /* Registration Form: username, password, email (no example) */
                <form
                  onSubmit={handleRegister}
                  className="space-y-3.5 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800"
                >
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-red-500" />
                      <span>ユーザー名</span>
                      <span className="text-[10px] text-red-400 font-bold ml-1">必須</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ユーザー名"
                      className="w-full bg-neutral-950 border border-neutral-700/80 text-xs sm:text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span>パスワード</span>
                      <span className="text-[10px] text-red-400 font-bold ml-1">必須</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="パスワード"
                      className="w-full bg-neutral-950 border border-neutral-700/80 text-xs sm:text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-cyan-500" />
                      <span>任意のメールアドレス</span>
                      <span className="text-[10px] text-neutral-400 ml-1">任意・通知用</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="メールアドレス"
                      className="w-full bg-neutral-950 border border-neutral-700/80 text-xs sm:text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">
                      メールアドレスを入力すると、新着楽曲やバックアップの通知を受け取ることができます。
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !username.trim() || !password.trim()}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all cursor-pointer mt-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>アカウントを作成して登録</span>
                  </button>
                </form>
              ) : authMode === 'login' ? (
                /* Login Form: username/email, password */
                <form
                  onSubmit={handleLogin}
                  className="space-y-3.5 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800"
                >
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-red-500" />
                      <span>ユーザー名またはメールアドレス</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="ユーザー名またはメールアドレス"
                      className="w-full bg-neutral-950 border border-neutral-700/80 text-xs sm:text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span>パスワード</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="パスワード"
                      className="w-full bg-neutral-950 border border-neutral-700/80 text-xs sm:text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !username.trim() || !password.trim()}
                    className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-2 border border-neutral-700 transition-all cursor-pointer mt-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <KeyRound className="w-4 h-4" />
                    )}
                    <span>ログイン</span>
                  </button>
                </form>
              ) : (
                /* Admin Master Login Form */
                <form
                  onSubmit={handleAdminLogin}
                  className="space-y-3.5 p-5 rounded-2xl bg-gradient-to-b from-amber-950/20 to-neutral-900/60 border border-amber-500/30"
                >
                  <div className="flex items-center gap-2 text-xs text-amber-300 font-bold mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>管理者マスター認証</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    管理者パスワードを入力してログインすると、システム全体統括・ユーザー管理・全体アナウンス配信が可能です。
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span>管理者パスワード</span>
                      <span className="text-[10px] text-amber-400 font-bold ml-1">必須</span>
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="管理者パスワード"
                      className="w-full bg-neutral-950 border border-neutral-700/80 text-xs sm:text-sm text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition-colors font-mono tracking-wider"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !adminPassword.trim()}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer mt-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>管理者として認証してコンソールを開く</span>
                  </button>
                </form>
              )}

              {/* Guest mode reassurance */}
              <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/70 text-xs text-neutral-400 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-red-400 shrink-0" />
                <span>アカウントなし（ゲスト）のままでも、全機能（再生・同期歌詞・プレイリスト）を端末保存でそのままご利用いただけます。</span>
              </div>
            </div>
          ) : (
            /* Logged-in profile view */
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-400">ログイン中のユーザー</p>
                      <p className="text-sm font-bold text-white font-mono truncate">
                        {currentUser.username}
                      </p>
                      {currentUser.email ? (
                        <p className="text-xs text-neutral-400 font-mono truncate">{currentUser.email}</p>
                      ) : (
                        <p className="text-[11px] text-neutral-500">メールアドレス未設定</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={logoutAccount}
                    className="px-3 py-1.5 text-xs text-neutral-300 hover:text-red-400 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    title="ログアウトしてゲストに戻る"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ログアウト</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80 text-xs">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Cloud className="w-4 h-4 text-emerald-400" />
                    <span>プレイリスト {userPlaylists.length}件 同期中</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>クラウド認証済み</span>
                  </div>
                </div>

                {/* Admin Quick Action Card */}
                {isAdmin && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-neutral-900 to-amber-950/30 border border-amber-500/40 flex items-center justify-between gap-3 shadow-lg shadow-amber-500/10 mt-2">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>👑 管理者マスター権限</span>
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          ユーザー管理・全体アナウンス・オフセット補正
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountModalOpen(false);
                        setAdminModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg cursor-pointer transition-all shadow-md shadow-amber-500/20 shrink-0"
                    >
                      コンソールを開く
                    </button>
                  </div>
                )}
              </div>

              {/* Notification Settings */}
              {currentUser.email ? (
                <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-red-500" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        メール通知設定 ({currentUser.email})
                      </h3>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-medium">受信有効</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/60 cursor-pointer transition-colors">
                      <span>お気に入りアーティストの新着リリース・MV配信通知</span>
                      <input
                        type="checkbox"
                        checked={prefs.releases}
                        onChange={(e) => setPrefs({ ...prefs, releases: e.target.checked })}
                        className="accent-red-600 rounded cursor-pointer w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/60 cursor-pointer transition-colors">
                      <span>プレイリスト更新・自動バックアップ完了通知</span>
                      <input
                        type="checkbox"
                        checked={prefs.playlists}
                        onChange={(e) => setPrefs({ ...prefs, playlists: e.target.checked })}
                        className="accent-red-600 rounded cursor-pointer w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-lg bg-neutral-900/80 hover:bg-neutral-800/60 cursor-pointer transition-colors">
                      <span>高精度同期歌詞（LRC）新規対応通知</span>
                      <input
                        type="checkbox"
                        checked={prefs.lyrics}
                        onChange={(e) => setPrefs({ ...prefs, lyrics: e.target.checked })}
                        className="accent-red-600 rounded cursor-pointer w-4 h-4"
                      />
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSendTestNotification}
                      disabled={sendingNotification}
                      className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-white border border-red-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
                    >
                      {sendingNotification ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>登録メールアドレスへテスト通知を送信</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 text-xs text-neutral-400">
                  <p>メールアドレスが登録されていません。通知機能を利用するにはメールアドレスを登録してください。</p>
                </div>
              )}

              {/* Notification History Feed */}
              {currentUser.email && (
                <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-neutral-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        配信通知ログ ({notifications.length}件)
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadNotifications(currentUser.username)}
                      className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingNotifs ? 'animate-spin' : ''}`} />
                      <span>更新</span>
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-neutral-500">
                      まだ送信履歴がありません。
                    </div>
                  ) : (
                    <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800/80 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white truncate">{n.subject}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                              配信完了
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 line-clamp-2">{n.body}</p>
                          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1">
                            <span>{new Date(n.timestamp).toLocaleString('ja-JP')}</span>
                            <span>{n.deliveryMessageId}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <span className="text-[11px] text-neutral-400">
            実績値: 🟢 オンライン {onlineCount}人 / 総アクセス {stats.totalAccessCount.toLocaleString()}回 / アカウント {stats.totalAccountsCount}人
          </span>
          <button
            type="button"
            onClick={() => setAccountModalOpen(false)}
            className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs transition-colors cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
