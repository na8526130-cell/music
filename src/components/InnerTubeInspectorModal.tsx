import React, { useState, useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { api } from '../services/api';
import { InnerTubeLog } from '../types/music';
import {
  X,
  Terminal,
  Activity,
  Play,
  Copy,
  Check,
  RefreshCw,
  Code2,
  ChevronDown,
  ChevronRight,
  Layers,
  Send,
} from 'lucide-react';

export const InnerTubeInspectorModal: React.FC = () => {
  const { inspectorOpen, setInspectorOpen, currentTrack } = usePlayer();

  const [logs, setLogs] = useState<InnerTubeLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [health, setHealth] = useState<any>(null);

  // Tester state
  const [testAction, setTestAction] = useState<string>('music.search');
  const [testQuery, setTestQuery] = useState<string>('Official髭男dism');
  const [testType, setTestType] = useState<string>('song');
  const [testId, setTestId] = useState<string>('');
  const [testExecuting, setTestExecuting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  // Expanded log IDs
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const [logData, healthData] = await Promise.all([
        api.getInnerTubeLogs(),
        api.getHealth(),
      ]);
      setLogs(logData.logs || []);
      setHealth(healthData);
    } catch (e) {
      console.warn('Failed to fetch logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (!inspectorOpen) return;
    fetchLogs();
    if (currentTrack && !testId) {
      setTestId(currentTrack.id);
    }
  }, [inspectorOpen]);

  if (!inspectorOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestExecuting(true);
    setTestResult(null);
    try {
      const res = await api.executeInnerTube({
        action: testAction,
        query: testQuery,
        id: testId || currentTrack?.id || '',
        type: testType,
      });
      setTestResult(res);
      fetchLogs();
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setTestExecuting(false);
    }
  };

  const handleCopyJson = (obj: any) => {
    navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      onClick={() => setInspectorOpen(false)}
    >
      <div
        className="w-full max-w-5xl h-[88vh] bg-[#0d0e12] border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800/80 bg-[#12141a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                YouTube Music InnerTube API 診断コンソール
              </h2>
              <p className="text-xs text-neutral-400">
                LuanRT/YouTube.js (Innertube) · Server-Authoritative Architecture
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>更新</span>
            </button>
            <button
              type="button"
              onClick={() => setInspectorOpen(false)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-6 py-2.5 bg-neutral-900/40 border-b border-neutral-800/60 flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white font-medium">InnerTube セッション:</span>
              <span className="text-emerald-400">オンライン (接続済)</span>
            </div>
            <div className="hidden sm:inline text-neutral-600">·</div>
            <div>
              <span className="text-neutral-500">ライブラリ:</span>{' '}
              <span className="text-neutral-300 font-mono">youtubei.js v18.3.0</span>
            </div>
            <div className="hidden sm:inline text-neutral-600">·</div>
            <div>
              <span className="text-neutral-500">記録ログ数:</span>{' '}
              <span className="text-neutral-300 font-mono tabular-nums">{logs.length}件</span>
            </div>
          </div>

          <div className="text-[11px] text-neutral-500 font-mono">
            {health?.status === 'ok' ? 'All Endpoints Ready' : 'Connecting...'}
          </div>
        </div>

        {/* Content Split: Interactive Tester & Recent Request Logs */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left / Tester (5 cols) */}
          <div className="lg:col-span-5 border-r border-neutral-800/80 p-5 overflow-y-auto flex flex-col gap-4 bg-[#0e0f14]/60">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Code2 className="w-4 h-4 text-red-500" />
              <span>InnerTube リクエスト実行テスト</span>
            </div>
            <p className="text-xs text-neutral-400">
              任意のInnerTubeメソッドと引数を指定して、YouTube Musicの生レスポンスを直接確認できます。
            </p>

            <form onSubmit={handleExecute} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  エンドポイント (Action)
                </label>
                <select
                  value={testAction}
                  onChange={(e) => setTestAction(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                >
                  <option value="music.search">innertube.music.search (楽曲検索)</option>
                  <option value="music.getLyrics">innertube.music.getLyrics (歌詞取得)</option>
                  <option value="music.getRelated">innertube.music.getRelated (関連おすすめ)</option>
                  <option value="music.getArtist">innertube.music.getArtist (アーティスト詳細)</option>
                  <option value="music.getAlbum">innertube.music.getAlbum (アルバム詳細)</option>
                  <option value="music.getPlaylist">innertube.music.getPlaylist (プレイリスト詳細)</option>
                  <option value="music.getExplore">innertube.music.getExplore (トレンド・新着)</option>
                  <option value="getSearchSuggestions">innertube.getSearchSuggestions (サジェスト)</option>
                </select>
              </div>

              {testAction === 'music.search' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      検索キーワード (Query)
                    </label>
                    <input
                      type="text"
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.target.value)}
                      placeholder="例: 米津玄師, YOASOBI, Vaundy..."
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      フィルター種別 (Type)
                    </label>
                    <select
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                    >
                      <option value="song">Song (楽曲)</option>
                      <option value="video">Video (動画)</option>
                      <option value="album">Album (アルバム)</option>
                      <option value="artist">Artist (アーティスト)</option>
                      <option value="playlist">Playlist (プレイリスト)</option>
                    </select>
                  </div>
                </>
              )}

              {['music.getLyrics', 'music.getRelated', 'music.getArtist', 'music.getAlbum', 'music.getPlaylist'].includes(
                testAction
              ) && (
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    対象 ID (Video ID / Browse ID)
                  </label>
                  <input
                    type="text"
                    value={testId}
                    onChange={(e) => setTestId(e.target.value)}
                    placeholder="例: m9SMT5ipbxk または現在の再生中ID"
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-red-500"
                  />
                  {currentTrack && (
                    <button
                      type="button"
                      onClick={() => setTestId(currentTrack.id)}
                      className="mt-1 text-[11px] text-red-400 hover:underline"
                    >
                      再生中の楽曲ID ({currentTrack.id}) を挿入
                    </button>
                  )}
                </div>
              )}

              {testAction === 'getSearchSuggestions' && (
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    プレフィックス文字列
                  </label>
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="例: Ado"
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={testExecuting}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20"
              >
                {testExecuting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>InnerTube API 通信中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>リクエスト送信 (Execute)</span>
                  </>
                )}
              </button>
            </form>

            {/* Test result output box */}
            {testResult && (
              <div className="flex-1 flex flex-col min-h-[160px] bg-neutral-950 border border-neutral-800 rounded-lg p-3 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 mb-2">
                  <span className="text-[11px] font-mono text-emerald-400">
                    Response ({testResult.durationMs || 0}ms)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyJson(testResult)}
                    className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedResult ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>コピー</span>
                  </button>
                </div>
                <pre className="flex-1 text-[11px] font-mono text-neutral-300 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Right / Request Stream Logs (7 cols) */}
          <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[#0a0a0d]">
            <div className="px-5 py-3 border-b border-neutral-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>直近の InnerTube API 実行ログ (Real-time Logs)</span>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">
                自動記録中 (Auto-logged)
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 py-12">
                  <Layers className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs">ログはまだ記録されていません</p>
                  <p className="text-[11px] text-neutral-600">
                    楽曲を検索または再生するとInnerTube APIログがここに流れます。
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogIds.has(log.id);
                  return (
                    <div
                      key={log.id}
                      className="bg-neutral-900/70 border border-neutral-800/80 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors"
                    >
                      <div
                        onClick={() => toggleExpand(log.id)}
                        className="px-4 py-3 flex items-center justify-between cursor-pointer select-none gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              log.status === 'success'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                                : 'bg-red-950/80 text-red-400 border border-red-800/50'
                            }`}
                          >
                            {log.status === 'success' ? '200 OK' : 'ERR'}
                          </span>
                          <span className="text-xs font-mono font-semibold text-white truncate">
                            {log.endpoint}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-neutral-400">
                          <span className="tabular-nums text-neutral-300">
                            {log.durationMs}ms
                          </span>
                          <span className="text-[11px] text-neutral-500 hidden sm:inline">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      {/* Expandable JSON detail */}
                      {isExpanded && (
                        <div className="px-4 py-3 bg-neutral-950 border-t border-neutral-800/80 space-y-2 text-xs">
                          <div>
                            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
                              リクエスト パラメータ:
                            </span>
                            <pre className="p-2 rounded bg-neutral-900 border border-neutral-800/60 font-mono text-[11px] text-neutral-300 overflow-x-auto">
                              {JSON.stringify(log.params, null, 2)}
                            </pre>
                          </div>

                          {log.error && (
                            <div>
                              <span className="text-[11px] font-mono text-red-400 uppercase tracking-wider block mb-1">
                                エラー情報:
                              </span>
                              <div className="p-2 rounded bg-red-950/40 border border-red-800/60 text-xs text-red-300">
                                {log.error}
                              </div>
                            </div>
                          )}

                          {log.sampleResponse && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider">
                                  レスポンス サンプル:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyJson(log.sampleResponse)}
                                  className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>コピー</span>
                                </button>
                              </div>
                              <pre className="p-2 rounded bg-neutral-900 border border-neutral-800/60 font-mono text-[11px] text-neutral-300 max-h-48 overflow-auto">
                                {JSON.stringify(log.sampleResponse, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
