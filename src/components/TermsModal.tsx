import React, { useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import {
  X,
  FileText,
  ShieldCheck,
  Eye,
  Lock,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export const TermsModal: React.FC = () => {
  const { termsModalOpen, setTermsModalOpen } = usePlayer();
  const [activeTab, setActiveTab] = useState<'terms' | 'dm_audit' | 'community' | 'privacy'>('terms');

  if (!termsModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={() => setTermsModalOpen(false)}
    >
      <div
        className="w-full max-w-3xl bg-[#0b0b0e] border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Zero Music サービス利用規約 & ガイドライン</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                  v2.0 改定版
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                本サービスをご利用いただくにあたっての利用条件・プライバシー規程・DM監視監査ポリシー
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTermsModalOpen(false)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-3 border-b border-neutral-800/80 bg-neutral-950/60 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'terms'
                ? 'text-red-400 border-red-500'
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>利用規約（全文）</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dm_audit')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'dm_audit'
                ? 'text-purple-400 border-purple-500'
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>DM・通信監査ポリシー</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 font-mono">
              管理者閲覧
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'community'
                ? 'text-red-400 border-red-500'
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>コミュニティ利用規程</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'privacy'
                ? 'text-red-400 border-red-500'
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>プライバシーポリシー</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-neutral-300 text-xs sm:text-sm leading-relaxed space-y-5">
          {/* TAB 1: Terms */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs">
                本規約は、Zero Music（以下「当サービス」）が提供する音楽再生、歌詞同期、プレイリスト共有、リスニングルーム、DM（ダイレクトメッセージ）、弾幕コメント機能の利用条件を定めるものです。利用者は、当サービスを利用することにより、本規約の全条項に同意したものとみなされます。
              </div>

              <section className="space-y-1.5">
                <h3 className="font-bold text-white text-sm">第1条（目的およびサービスの定義）</h3>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  当サービスは、ユーザーが正規に公開されている音楽コンテンツを探索・試聴し、歌詞と同期しながら個人用プレイリストを構築、または他ユーザーと安全に音楽体験を共有するためのWebプラットフォームです。
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-white text-sm">第2条（外部サービスAPIおよび著作権の準拠）</h3>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  1. 当サービスの楽曲再生機能は、YouTube API Servicesおよび各著作権保有者による公式配信ストリームを利用しています。ユーザーは当サービスの利用にあたり、
                  <a
                    href="https://www.youtube.com/t/terms"
                    target="_blank"
                    rel="noreferrer"
                    className="text-red-400 hover:underline mx-1 inline-flex items-center gap-0.5"
                  >
                    YouTube 利用規約 <ExternalLink className="w-3 h-3 inline" />
                  </a>
                  および
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="text-red-400 hover:underline mx-1 inline-flex items-center gap-0.5"
                  >
                    Google プライバシーポリシー <ExternalLink className="w-3 h-3 inline" />
                  </a>
                  に従うものとします。
                </p>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  2. 音楽、動画、アートワーク、歌詞の著作権および隣接権は、原著作権者および正当な権利者に帰属します。私的使用の範囲を超えた複製や無断転載・再配布は禁止します。
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-white text-sm">第3条（アカウント登録とパスワード責任）</h3>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  1. ユーザーは自己の責任においてアカウント名およびパスワードを厳重に管理するものとし、第三者への譲渡、貸与、共用はできません。
                </p>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  2. 当サービスは、パスワードの漏洩または不正使用に起因するいかなる損害についても一切の責任を負いません。
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-white text-sm">第4条（禁止事項）</h3>
                <p className="text-neutral-400 text-xs leading-relaxed">ユーザーは以下の各号に該当する行為を行ってはなりません。</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-neutral-400 pl-2">
                  <li>公序良俗に反する言動、他者への名誉毀損、誹謗中傷、脅迫、ストーカー行為</li>
                  <li>スパム、不正URL、フィッシング詐欺リンク、宣伝広告を目的とした投稿</li>
                  <li>他のユーザーや当サービス運営者になりすます行為</li>
                  <li>ボットやクローラーを用いたサーバーへの過剰なリクエスト、サービスの妨害</li>
                  <li>弾幕コメントやDM、リスニングルームにおける嫌がらせや荒らし行為</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-bold text-white text-sm">第5条（規約違反に対する措置）</h3>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  運営管理者は、ユーザーが本規約に違反したと判断した場合、事前の通知なしに該当投稿の強制削除、アカウントの即時凍結（Ban）、IPアドレス制限等の厳格な措置を実施することができます。
                </p>
              </section>
            </div>
          )}

          {/* TAB 2: DM & Surveillance Policy */}
          {activeTab === 'dm_audit' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/40 text-purple-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span>ダイレクトメッセージ（DM）管理者監査および監視権限について</span>
                </div>
                <p className="leading-relaxed">
                  Zero Musicでは、青少年保護、誹謗中傷・ハラスメント抑止、違法URL送信の防止、および安全なコミュニティ維持を目的として、**システム管理者（Admin）が全ユーザー間のダイレクトメッセージ送受信内容をすべて閲覧・監査・強制削除できる設計**を採用しています。
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-xs sm:text-sm">1. 監査の対象となる情報</h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-neutral-400 pl-2">
                  <li>ダイレクトメッセージ（DM）の送受信者、タイムスタンプ、本文テキスト</li>
                  <li>DM内で送受信されたシェア楽曲カード情報（曲名・アーティスト名・動画ID）</li>
                  <li>DM内で交換されたプレイリスト情報および収録曲</li>
                  <li>メッセージに付与された絵文字リアクションおよび既読ログ</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-xs sm:text-sm">2. 監査の実施目的</h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-neutral-400 pl-2">
                  <li>ユーザーからの通報を受けた際の事実関係の調査およびトラブルの早期解決</li>
                  <li>詐欺、フィッシングサイト誘導、違法コンテンツ配布、恐喝等の犯罪的行為の未然防止</li>
                  <li>自動NGワードフィルターを回避した迷惑メッセージや嫌がらせメッセージの検知・強制削除</li>
                  <li>悪質ユーザーに対するアカウント停止（Ban）処置のための証拠保全</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-xs sm:text-sm">3. 利用者の同意と承諾</h4>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  ユーザーは当サービスのアカウントを作成、またはDM機能を利用することにより、管理者による上記の閲覧・監視・監査および必要に応じたメッセージ削除措置に対して無条件に同意したものとします。
                </p>
              </section>
            </div>
          )}

          {/* TAB 3: Community Guidelines */}
          {activeTab === 'community' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs">
                Zero Musicはすべての音楽ファンが心地よく音楽を語り合えるコミュニティを目指しています。弾幕コメント、リスニングパーティー、DMを利用する際は以下のガイドラインを遵守してください。
              </div>

              <section className="space-y-1.5">
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>歓迎される利用行動</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-neutral-400 pl-2">
                  <li>「02:15 ここのギターソロ神！」など、音楽への愛や感動を共有するタイムスタンプコメント</li>
                  <li>作業中やリラックスタイムに好きな曲を流して一緒に楽しむリスニングパーティーの開催</li>
                  <li>友達や音楽仲間へのプレイリストやおすすめ曲のリッチカード送信</li>
                  <li>アーティストや制作関係者への敬意を持ったコメント投稿</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span>禁止される荒らし・迷惑行為</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-neutral-400 pl-2">
                  <li>画面を埋め尽くすような過度な連続投稿や無意味な文字列の連投（弾幕荒らし）</li>
                  <li>特定のアーティストや他ユーザーに対する攻撃的・差別的な暴言・誹謗中傷</li>
                  <li>リスニングパーティールームでの不快な音源の強制再生や迷惑行為</li>
                  <li>相手が望まない過度なDM送信（拒否された場合は即時停止してください）</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-white text-xs sm:text-sm">通報とブロック機能の活用</h4>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  不快なユーザーやコメントを発見した場合は、各コメントの「通報」ボタンやプロフィールからの「ブロック」機能をご利用ください。通報内容は管理者へ即座に送信され、迅速に対処されます。
                </p>
              </section>
            </div>
          )}

          {/* TAB 4: Privacy Policy */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <section className="space-y-1.5">
                <h4 className="font-bold text-white text-xs sm:text-sm">1. 取得する情報</h4>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  当サービスは、ユーザー登録時に入力されたユーザー名、パスワード（ハッシュ化保護）、任意で登録されたメールアドレス、作成されたプレイリスト、再生統計、コメント、およびメッセージ履歴を適切に保存・管理します。
                </p>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-white text-xs sm:text-sm">2. 情報の利用目的</h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-neutral-400 pl-2">
                  <li>クラウドプレイリスト同期およびパーソナライズされた音楽体験の提供</li>
                  <li>リアルタイム同時試聴（リスニングパーティー）およびDM通知の配信</li>
                  <li>不正アクセス防止、モデレーション、およびシステムの安定運用</li>
                </ul>
              </section>

              <section className="space-y-1.5">
                <h4 className="font-bold text-white text-xs sm:text-sm">3. 第三者への開示</h4>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  法令に基づく適法な開示請求がある場合を除き、取得した個人情報をユーザーの事前の承諾なく第三者に提供・販売することはありません。
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero Music は安心・健全な音楽体験をお届けします</span>
          </div>
          <button
            type="button"
            onClick={() => setTermsModalOpen(false)}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-red-600/20"
          >
            同意して閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
