/**
 * glossary.js — アジャイル用語集
 *
 * データ形式（ハイブリッド方式）:
 *   各用語は { id, term, aliases, category, definition, relatedQuestionIds? } を持つ。
 *   - aliases: 解説文中で自動検出するためのキーワード（表記ゆれを含む）。
 *   - relatedQuestionIds: 自動検出で拾いきれない場合に、手動で関連付ける問題ID（任意・省略可）。
 *
 * 用語の関連付けは、原則として解説文（explan）中のキーワード自動検出で行い、
 * 必要な問題だけ relatedQuestionIds で補正する。
 */
const Glossary = (() => {
  const TERMS = [
  // --- 基本概念 ---
  { id: 'agile', term: 'アジャイル', aliases: ['アジャイル', 'Agile'], category: '基本概念',
    definition: '変化する要求事項に迅速かつ柔軟に対応するため、短い反復サイクルで計画・実行・レビューを繰り返しながら価値を届ける開発アプローチの総称。' },
  { id: 'predictive', term: '予測型アプローチ', aliases: ['予測型', 'ウォーターフォール'], category: '基本概念',
    definition: 'スコープ・スケジュール・コストを早期に確定し、変更マネジメントを通じて計画どおりの実行をコントロールする、いわゆるウォーターフォール型のアプローチ。' },
  { id: 'adaptive', term: '適応型アプローチ', aliases: ['適応型'], category: '基本概念',
    definition: '要求事項の変化を前提に、短いサイクルで実装とフィードバックを繰り返しながら計画を継続的に見直すアプローチ。アジャイルの上位概念として使われる。' },
  { id: 'iterative', term: '反復型アプローチ', aliases: ['反復型', 'イテレーティブ'], category: '基本概念',
    definition: '固定のタイムボックスにこだわらず、試作と改良を繰り返しながらソリューションの精度を高めていく開発方式。' },
  { id: 'hybrid', term: 'ハイブリッド・アプローチ', aliases: ['ハイブリッド'], category: '基本概念',
    definition: '予測型と適応型（アジャイル）を組み合わせ、成果物の特性やリスクに応じて最適な開発方式を使い分けるアプローチ。' },

  // --- フレームワーク ---
  { id: 'scrum', term: 'スクラム', aliases: ['スクラム', 'Scrum'], category: 'フレームワーク',
    definition: '短い固定期間（スプリント）で計画・実行・レビュー・振り返りを繰り返す、代表的なアジャイル・フレームワーク。',
    diagram: '<svg viewBox="0 0 300 230" class="w-full h-auto"><defs><marker id="arrScrum" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#818cf8"/></marker></defs><line x1="150" y1="34" x2="246" y2="96" stroke="#a5b4fc" marker-end="url(#arrScrum)"/><line x1="246" y1="96" x2="208" y2="196" stroke="#a5b4fc" marker-end="url(#arrScrum)"/><line x1="208" y1="196" x2="92" y2="196" stroke="#a5b4fc" marker-end="url(#arrScrum)"/><line x1="92" y1="196" x2="54" y2="96" stroke="#a5b4fc" marker-end="url(#arrScrum)"/><line x1="54" y1="96" x2="150" y2="34" stroke="#a5b4fc" marker-end="url(#arrScrum)"/><circle cx="150" cy="34" r="30" fill="#eef2ff" stroke="#6366f1"/><text x="150" y="31" font-size="8" text-anchor="middle" fill="#4338ca"><tspan x="150" dy="0">プロダクト</tspan><tspan x="150" dy="10">バックログ</tspan></text><circle cx="246" cy="96" r="30" fill="#eef2ff" stroke="#6366f1"/><text x="246" y="93" font-size="8" text-anchor="middle" fill="#4338ca"><tspan x="246" dy="0">スプリント</tspan><tspan x="246" dy="10">計画</tspan></text><circle cx="208" cy="196" r="34" fill="#eef2ff" stroke="#6366f1"/><text x="208" y="190" font-size="7.5" text-anchor="middle" fill="#4338ca"><tspan x="208" dy="0">スプリント実行</tspan><tspan x="208" dy="10">(デイリースクラム)</tspan></text><circle cx="92" cy="196" r="30" fill="#eef2ff" stroke="#6366f1"/><text x="92" y="193" font-size="8" text-anchor="middle" fill="#4338ca"><tspan x="92" dy="0">スプリント</tspan><tspan x="92" dy="10">レビュー</tspan></text><circle cx="54" cy="96" r="32" fill="#eef2ff" stroke="#6366f1"/><text x="54" y="99" font-size="7.5" text-anchor="middle" fill="#4338ca">レトロスペクティブ</text></svg>' },
  { id: 'kanban', term: 'カンバン', aliases: ['カンバン', 'かんばん', 'Kanban'], category: 'フレームワーク',
    definition: '作業項目をボード上で可視化し、仕掛かり中（WIP）の作業を制限しながら継続的にフローを改善する手法。' },
  { id: 'xp', term: 'エクストリーム・プログラミング', aliases: ['XP', 'Extreme Programming'], category: 'フレームワーク',
    definition: 'ペアプログラミングや継続的インテグレーションなど、ソフトウェア開発の技術的プラクティスに重点を置いたアジャイル手法。' },

  // --- 役割・チームマネジメント ---
  { id: 'product-owner', term: 'プロダクト・オーナー', aliases: ['プロダクト・オーナー', 'PO'], category: '役割・チーム',
    definition: 'プロダクトの価値を最大化する責任を負い、プロダクト・バックログの優先順位付けや意思決定を行う役割。アジャイルにおける顧客代理・ビジネス責任者。' },
  { id: 'scrum-master', term: 'スクラム・マスター', aliases: ['スクラム・マスター', 'SM'], category: '役割・チーム',
    definition: 'チームを支援し、障害を取り除き、チームが持続可能なペースで作業できるようにするサーバント・リーダー役。' },
  { id: 'servant-leadership', term: 'サーバント・リーダーシップ', aliases: ['サーバント・リーダー', 'サーバント・リーダーシップ'], category: '役割・チーム',
    definition: 'リーダーがチームに奉仕し、障害の除去や環境整備を通じてチームの自己組織化と成果を支援する指導スタイル。PMPで推奨されるマインドセット。' },
  { id: 'self-organizing-team', term: '自己組織化チーム', aliases: ['自己組織化', '自己管理型チーム'], category: '役割・チーム',
    definition: 'チーム自身が作業の進め方や役割分担を決定し、外部からの指示を受けずに自発的に成果を出せるチーム。' },
  { id: 't-shaped-skill', term: 'T字型スキル', aliases: ['T字型スキル', 'T字型'], category: '役割・チーム',
    definition: '1つの深い専門性を持ちつつ、周辺分野の業務にも柔軟に協力できるスキルセット。チームのボトルネック解消に貢献する。' },
  { id: 'emotional-intelligence', term: '感情知能（EQ）', aliases: ['感情知能', 'EQ', 'EI'], category: '役割・チーム',
    definition: '自分と他者の感情を認識・理解・管理し、対人関係やチームのモチベーションを良好に保つ能力。' },
  { id: 'tuckman-ladder', term: 'タックマンモデル', aliases: ['タックマンモデル', 'チーム発達段階'], category: '役割・チーム',
    definition: 'チームの成長過程を示すモデル（形成期→混乱期→統一期→機能期→散会期）。リーダーシップスタイルの変更基準となる。',
    diagram: '<svg viewBox="0 0 320 90" class="w-full h-auto"><defs><marker id="arrTm" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#818cf8"/></marker></defs><line x1="60" y1="30" x2="68" y2="30" stroke="#a5b4fc" marker-end="url(#arrTm)"/><line x1="124" y1="30" x2="132" y2="30" stroke="#a5b4fc" marker-end="url(#arrTm)"/><line x1="188" y1="30" x2="196" y2="30" stroke="#a5b4fc" marker-end="url(#arrTm)"/><line x1="252" y1="30" x2="260" y2="30" stroke="#a5b4fc" marker-end="url(#arrTm)"/><rect x="4" y="10" width="56" height="40" rx="6" fill="#eef2ff" stroke="#6366f1"/><text x="32" y="34" font-size="9" text-anchor="middle" fill="#4338ca">形成期</text><rect x="68" y="10" width="56" height="40" rx="6" fill="#eef2ff" stroke="#6366f1"/><text x="96" y="34" font-size="9" text-anchor="middle" fill="#4338ca">混乱期</text><rect x="132" y="10" width="56" height="40" rx="6" fill="#eef2ff" stroke="#6366f1"/><text x="160" y="34" font-size="9" text-anchor="middle" fill="#4338ca">統一期</text><rect x="196" y="10" width="56" height="40" rx="6" fill="#eef2ff" stroke="#6366f1"/><text x="224" y="34" font-size="9" text-anchor="middle" fill="#4338ca">機能期</text><rect x="260" y="10" width="56" height="40" rx="6" fill="#f5f3ff" stroke="#a78bfa"/><text x="288" y="34" font-size="9" text-anchor="middle" fill="#6d28d9">散会期</text></svg>' },
  { id: 'conflict-management', term: 'コンフリクト・マネジメント', aliases: ['対立解消', 'コンフリクト管理'], category: '役割・チーム',
    definition: 'チーム内の意見対立を解決する手法（協働/問題解決、妥協、歩み寄り、強制、回避）。問題解決（協働）が最も望ましい。',
    diagram: '<svg viewBox="0 0 260 220" class="w-full h-auto"><line x1="40" y1="10" x2="40" y2="190" stroke="#9ca3af"/><line x1="40" y1="190" x2="240" y2="190" stroke="#9ca3af"/><text x="10" y="20" font-size="8" fill="#6b7280">自己主張度高</text><text x="4" y="195" font-size="8" fill="#6b7280">自己主張度低</text><text x="150" y="208" font-size="8" fill="#6b7280" text-anchor="middle">協調度（相手への配慮）→</text><circle cx="75" cy="35" r="24" fill="#fef2f2" stroke="#f87171"/><text x="75" y="38" font-size="8" text-anchor="middle" fill="#b91c1c">強制</text><circle cx="205" cy="35" r="26" fill="#ecfdf5" stroke="#34d399"/><text x="205" y="38" font-size="8" text-anchor="middle" fill="#047857">協働</text><circle cx="140" cy="100" r="22" fill="#fffbeb" stroke="#fbbf24"/><text x="140" y="103" font-size="8" text-anchor="middle" fill="#b45309">妥協</text><circle cx="75" cy="165" r="22" fill="#f3f4f6" stroke="#9ca3af"/><text x="75" y="168" font-size="8" text-anchor="middle" fill="#4b5563">回避</text><circle cx="205" cy="165" r="24" fill="#eff6ff" stroke="#60a5fa"/><text x="205" y="163" font-size="7.5" text-anchor="middle" fill="#1d4ed8"><tspan x="205" dy="0">歩み寄り</tspan><tspan x="205" dy="9">(受容)</tspan></text></svg>' },
  { id: 'ground-rules', term: '基本ルール（グラウンド・ルール）', aliases: ['基本ルール', 'グラウンド・ルール', 'チーム・憲章'], category: '役割・チーム',
    definition: 'チームメンバー間での期待行動やコミュニケーション、行動規範を明文化した合意事項。混乱防止に効果的。' },
  { id: 'raci-chart', term: 'RACIチャート', aliases: ['RACI', 'RACIマトリクス'], category: '役割・チーム',
    definition: 'タスクごとに「実行責任者(R)」「説明責任者(A)」「協働/相談先(C)」「報告先(I)」を明確にする責任割り当てマトリクス。',
    diagram: '<svg viewBox="0 0 300 130" class="w-full h-auto"><rect x="10" y="10" width="280" height="112" fill="none" stroke="#9ca3af"/><line x1="90" y1="10" x2="90" y2="122" stroke="#9ca3af"/><line x1="160" y1="10" x2="160" y2="122" stroke="#9ca3af"/><line x1="230" y1="10" x2="230" y2="122" stroke="#9ca3af"/><line x1="10" y1="38" x2="290" y2="38" stroke="#9ca3af"/><line x1="10" y1="66" x2="290" y2="66" stroke="#9ca3af"/><line x1="10" y1="94" x2="290" y2="94" stroke="#9ca3af"/><text x="50" y="27" font-size="9" text-anchor="middle" fill="#374151" font-weight="bold">タスク</text><text x="125" y="27" font-size="9" text-anchor="middle" fill="#374151" font-weight="bold">PM</text><text x="195" y="27" font-size="9" text-anchor="middle" fill="#374151" font-weight="bold">スポンサー</text><text x="260" y="27" font-size="9" text-anchor="middle" fill="#374151" font-weight="bold">チーム</text><text x="50" y="55" font-size="9" text-anchor="middle" fill="#374151">要件定義</text><text x="125" y="55" font-size="10" text-anchor="middle" fill="#4338ca" font-weight="bold">A</text><text x="195" y="55" font-size="10" text-anchor="middle" fill="#6b7280">I</text><text x="260" y="55" font-size="10" text-anchor="middle" fill="#047857" font-weight="bold">R</text><text x="50" y="83" font-size="9" text-anchor="middle" fill="#374151">設計</text><text x="125" y="83" font-size="10" text-anchor="middle" fill="#4338ca" font-weight="bold">A</text><text x="195" y="83" font-size="10" text-anchor="middle" fill="#b45309">C</text><text x="260" y="83" font-size="10" text-anchor="middle" fill="#047857" font-weight="bold">R</text><text x="50" y="111" font-size="9" text-anchor="middle" fill="#374151">テスト</text><text x="125" y="111" font-size="10" text-anchor="middle" fill="#b45309">C</text><text x="195" y="111" font-size="10" text-anchor="middle" fill="#6b7280">I</text><text x="260" y="111" font-size="10" text-anchor="middle" fill="#047857" font-weight="bold">R</text></svg>' },

  // --- イベント・サイクル ---
  { id: 'iteration', term: 'イテレーション', aliases: ['イテレーション'], category: 'イベント・サイクル',
    definition: '計画からレビューまでを一区切りとする、固定または短期間の開発サイクル。スプリントと同義。' },
  { id: 'sprint', term: 'スプリント', aliases: ['スプリント'], category: 'イベント・サイクル',
    definition: 'スクラムにおけるタイムボックス化された固定期間の反復サイクル。通常1〜4週間で設定される。' },
  { id: 'daily-standup', term: '毎日の調整会議', aliases: ['デイリー・スクラム', '毎日の調整会議', 'デイリー・スタンドアップ'], category: 'イベント・サイクル',
    definition: 'チームが毎日15分程度集まり、進捗・障害・当日の作業計画を共有する定例ミーティング。' },
  { id: 'retrospective', term: 'レトロスペクティブ（振り返り）', aliases: ['レトロスペクティブ', '振り返り'], category: 'イベント・サイクル',
    definition: 'イテレーション終了時に、プロセスや働き方を振り返り、次サイクルでの継続的な改善（カイゼン）を決定する会議。' },
  { id: 'iteration-review', term: 'イテレーション・レビュー', aliases: ['イテレーション・レビュー', 'スプリント・レビュー', 'デモ'], category: 'イベント・サイクル',
    definition: '完成した成果物をステークホルダーに実演展示し、フィードバックを得てバックログを調整するイベント。' },
  { id: 'timebox', term: 'タイムボックス', aliases: ['タイムボックス'], category: 'イベント・サイクル',
    definition: '会議やタスクに対して設定する厳格な制限時間枠。時間を固定し、その時間内で達成可能な最大成果を目指す。' },

  // --- 成果物・ドキュメント ---
  { id: 'project-charter', term: 'プロジェクト憲章', aliases: ['プロジェクト憲章', 'Project Charter'], category: '成果物・ドキュメント',
    definition: 'プロジェクトの存在を正式に認可し、プロジェクト・マネジャーに組織のリソースを投入する権限を与える公式文書。' },
  { id: 'backlog', term: 'プロダクト・バックログ', aliases: ['プロダクト・バックログ', 'バックログ'], category: '成果物・ドキュメント',
    definition: 'プロダクトに必要な機能・要求事項を優先順位付けして並べた一元管理リスト。POが所有・維持する。' },
  { id: 'iteration-backlog', term: 'イテレーション・バックログ', aliases: ['イテレーション・バックログ', 'スプリント・バックログ'], category: '成果物・ドキュメント',
    definition: '当該イテレーション（スプリント）で取り組むとチームが約束した作業項目の一覧および達成計画。' },
  { id: 'backlog-refinement', term: 'バックログの洗練', aliases: ['バックログの洗練', 'リファインメント', 'バックログ・グルーミング'], category: '成果物・ドキュメント',
    definition: '大きすぎるバックログ項目を詳細化・見積り・優先順位の調整を行い、着手可能な状態に整備する活動。' },
  { id: 'user-story', term: 'ユーザー・ストーリー', aliases: ['ユーザー・ストーリー'], category: '成果物・ドキュメント',
    definition: '「＜誰が＞＜何を＞＜なぜ＞望むか」という形式で、エンドユーザーの視点から要求事項を記述した簡潔な単位。' },
  { id: 'wbs', term: '作業分解構成案（WBS）', aliases: ['WBS', '作業分解構成案'], category: '成果物・ドキュメント',
    definition: 'プロジェクト成果物を管理しやすい小さな構成要素（ワーク・パッケージ）へ階層的に要素分解した図・表。',
    diagram: '<svg viewBox="0 0 320 160" class="w-full h-auto"><rect x="120" y="6" width="80" height="26" rx="6" fill="#eef2ff" stroke="#6366f1"/><text x="160" y="24" font-size="10" text-anchor="middle" fill="#4338ca">プロジェクト</text><line x1="160" y1="32" x2="70" y2="62" stroke="#a5b4fc"/><line x1="160" y1="32" x2="250" y2="62" stroke="#a5b4fc"/><rect x="30" y="62" width="80" height="26" rx="6" fill="#eef2ff" stroke="#6366f1"/><text x="70" y="80" font-size="9" text-anchor="middle" fill="#4338ca">成果物A</text><rect x="210" y="62" width="80" height="26" rx="6" fill="#eef2ff" stroke="#6366f1"/><text x="250" y="80" font-size="9" text-anchor="middle" fill="#4338ca">成果物B</text><line x1="70" y1="88" x2="35" y2="118" stroke="#c7d2fe"/><line x1="70" y1="88" x2="105" y2="118" stroke="#c7d2fe"/><line x1="250" y1="88" x2="215" y2="118" stroke="#c7d2fe"/><line x1="250" y1="88" x2="285" y2="118" stroke="#c7d2fe"/><rect x="5" y="118" width="60" height="26" rx="5" fill="#f5f3ff" stroke="#a78bfa"/><text x="35" y="135" font-size="8" text-anchor="middle" fill="#6d28d9">WP1</text><rect x="75" y="118" width="60" height="26" rx="5" fill="#f5f3ff" stroke="#a78bfa"/><text x="105" y="135" font-size="8" text-anchor="middle" fill="#6d28d9">WP2</text><rect x="185" y="118" width="60" height="26" rx="5" fill="#f5f3ff" stroke="#a78bfa"/><text x="215" y="135" font-size="8" text-anchor="middle" fill="#6d28d9">WP3</text><rect x="255" y="118" width="60" height="26" rx="5" fill="#f5f3ff" stroke="#a78bfa"/><text x="285" y="135" font-size="8" text-anchor="middle" fill="#6d28d9">WP4</text></svg>' },
  { id: 'scope-baseline', term: 'スコープ・ベースライン', aliases: ['スコープ・ベースライン'], category: '成果物・ドキュメント',
    definition: '承認された「プロジェクト記述書」「WBS」「WBS辞書」のセット。実績測定や変更管理の基準となる。' },
  { id: 'stakeholder-register', term: 'ステークホルダー登録簿', aliases: ['ステークホルダー登録簿'], category: '成果物・ドキュメント',
    definition: 'プロジェクトに関与・影響を受ける人物や組織の評価、関心度、影響度、関与戦略を記録した一覧表。' },
  { id: 'lessons-learned-register', term: '教訓登録簿', aliases: ['教訓登録簿', 'Lessons Learned'], category: '成果物・ドキュメント',
    definition: 'プロジェクトプロセスを通じて得られた成功要因や失敗・改善点を記録し、将来の改善に役立てる文書。' },

  // --- 見積り・指標・パフォーマンス ---
  { id: 'story-point', term: 'ストーリー・ポイント', aliases: ['ストーリー・ポイント'], category: '見積り・指標',
    definition: 'ユーザー・ストーリーの相対的な規模・作業量・不確実性・複雑さを見積もるための無次元の単位。' },
  { id: 'velocity', term: 'ベロシティ', aliases: ['ベロシティ'], category: '見積り・指標',
    definition: '1イテレーションあたりにチームが完了できた作業量（ポイント数）の実績平均値。今後のリリース計画予測に使用。',
    example: '例：直近3回のイテレーションで完了したストーリー・ポイントが18、22、20だった場合、ベロシティ＝(18+22+20)÷3＝20ポイント/イテレーション。残りバックログが100ポイントなら、100÷20＝5イテレーションで完了すると予測できる。' },
  { id: 'burndown-chart', term: 'バーンダウン・チャート', aliases: ['バーンダウン'], category: '見積り・指標',
    definition: '残り作業量が時間の経過に伴ってどう減少しているかを示すグラフ。進捗の遅れを早期発見できる。',
    diagram: '<svg viewBox="0 0 280 170" class="w-full h-auto"><line x1="30" y1="10" x2="30" y2="140" stroke="#9ca3af"/><line x1="30" y1="140" x2="260" y2="140" stroke="#9ca3af"/><text x="4" y="14" font-size="7" fill="#6b7280">残作業量</text><text x="230" y="155" font-size="7" fill="#6b7280">時間</text><line x1="30" y1="20" x2="260" y2="140" stroke="#a5b4fc" stroke-dasharray="4 3"/><polyline points="30,20 80,48 130,85 180,100 230,122 260,140" fill="none" stroke="#ef4444" stroke-width="2"/><circle cx="12" cy="150" r="4" fill="#a5b4fc"/><text x="20" y="153" font-size="7" fill="#6b7280">理想線</text><circle cx="70" cy="150" r="4" fill="#ef4444"/><text x="78" y="153" font-size="7" fill="#6b7280">実績（遅延気味）</text></svg>' },
  { id: 'burnup-chart', term: 'バーンアップ・チャート', aliases: ['バーンアップ'], category: '見積り・指標',
    definition: '完成した累積作業量と全体スコープの推移を時系列で示すグラフ。スコープの追加・変更が視覚的にわかりやすい。',
    diagram: '<svg viewBox="0 0 280 160" class="w-full h-auto"><line x1="30" y1="10" x2="30" y2="140" stroke="#9ca3af"/><line x1="30" y1="140" x2="260" y2="140" stroke="#9ca3af"/><text x="4" y="14" font-size="7" fill="#6b7280">作業量</text><text x="230" y="155" font-size="7" fill="#6b7280">時間</text><polyline points="30,40 140,40 140,25 260,25" fill="none" stroke="#818cf8" stroke-width="2"/><polyline points="30,140 80,120 130,95 180,75 230,50 260,35" fill="none" stroke="#10b981" stroke-width="2"/><circle cx="12" cy="150" r="4" fill="#818cf8"/><text x="20" y="153" font-size="7" fill="#6b7280">総スコープ</text><circle cx="90" cy="150" r="4" fill="#10b981"/><text x="98" y="153" font-size="7" fill="#6b7280">完了済み作業</text></svg>' },
  { id: 'dod', term: 'Doneの定義（DoD）', aliases: ['Doneの定義', 'DoD', '完成の定義'], category: '見積り・指標',
    definition: '作業項目や成果物が「完了」したとみなされるために満たすべき品質・検証の共通基準。' },
  { id: 'dor', term: 'Readyの定義（DoR）', aliases: ['Readyの定義', 'DoR', '準備完了の定義'], category: '見積り・指標',
    definition: 'バックログ項目がスプリントでの開発に着手可能と判断されるために必要な要件（定義の明確化など）。' },
  { id: 'evm', term: 'アーンド・バリュー・マネジメント（EVM）', aliases: ['EVM', 'アーンドバリュー分析'], category: '見積り・指標',
    definition: 'スコープ・スケジュール・コストの進捗と実績値を金額に換算して統合的に評価・予測するパフォーマンス管理手法。',
    example: '例：計画では10日間で¥1,000,000の作業を完了する予定だった。5日目終了時点で、PV（計画値）＝¥500,000、EV（出来高）＝¥400,000、AC（実コスト）＝¥450,000だった場合、CPI＝EV÷AC＝400,000÷450,000≈0.89（予算超過）、SPI＝EV÷PV＝400,000÷500,000＝0.80（スケジュール遅延）となる。',
    diagram: '<svg viewBox="0 0 200 170" class="w-full h-auto"><line x1="10" y1="150" x2="190" y2="150" stroke="#9ca3af"/><rect x="20" y="10" width="40" height="140" fill="#a5b4fc"/><text x="40" y="164" font-size="8" text-anchor="middle" fill="#374151">PV</text><text x="40" y="6" font-size="7" text-anchor="middle" fill="#4338ca">¥500,000</text><rect x="80" y="38" width="40" height="112" fill="#f87171"/><text x="100" y="164" font-size="8" text-anchor="middle" fill="#374151">EV</text><text x="100" y="34" font-size="7" text-anchor="middle" fill="#b91c1c">¥400,000</text><rect x="140" y="24" width="40" height="126" fill="#fbbf24"/><text x="160" y="164" font-size="8" text-anchor="middle" fill="#374151">AC</text><text x="160" y="20" font-size="7" text-anchor="middle" fill="#b45309">¥450,000</text></svg>' },
  { id: 'pv', term: '計画値（PV）', aliases: ['PV', 'Planned Value'], category: '見積り・指標',
    definition: '指定された日までに完了する予定であった作業に割り当てられていた承認済みの予算（計画コスト）。',
    example: '例：5日目終了時点で計画上完了しているはずだった作業の予算がPV＝¥500,000（総予算¥1,000,000の10日プロジェクトの折り返し地点）。' },
  { id: 'ev', term: '出来高（EV）', aliases: ['EV', 'Earned Value'], category: '見積り・指標',
    definition: '実際に完了した作業に対して承認されていた予算額。獲得した価値を示す。',
    example: '例：同じプロジェクトで、5日目終了時点で実際に完了していた作業に割り当てられていた予算はEV＝¥400,000（計画の80%相当の作業しか終わっていない）。' },
  { id: 'ac', term: '実コスト（AC）', aliases: ['AC', 'Actual Cost'], category: '見積り・指標',
    definition: '指定された日までに実行した作業のために実際に発生したコストの総額。',
    example: '例：同じプロジェクトで、5日目終了時点までにその作業のため実際に支出した金額はAC＝¥450,000。' },
  { id: 'cpi', term: 'コスト効率指数（CPI）', aliases: ['CPI'], category: '見積り・指標',
    definition: 'コスト効率を示す指標（EV ÷ AC）。1.0以上なら予算内、1.0未満なら予算オーバー。',
    example: '例：EV＝¥400,000、AC＝¥450,000のとき、CPI＝400,000÷450,000≈0.89。1.0を下回るため、投じた費用に対して得られた成果が少なく、予算超過の傾向を示す。' },
  { id: 'spi', term: 'スケジュール効率指数（SPI）', aliases: ['SPI'], category: '見積り・指標',
    definition: 'スケジュール効率を示す指標（EV ÷ PV）。1.0以上なら進捗良好、1.0未満なら計画より遅延。',
    example: '例：EV＝¥400,000、PV＝¥500,000のとき、SPI＝400,000÷500,000＝0.80。1.0を下回るため、計画よりも進捗が遅れていることを示す。' },
  { id: 'cpm', term: 'クリティカル・パス法（CPM）', aliases: ['クリティカル・パス法', 'CPM', 'クリティカルパス'], category: '見積り・指標',
    definition: 'プロジェクトの最長経路（トータルフロートがゼロの経路）を特定し、最短完了期間を算出するスケジュール分析手法。',
    example: '例：Start→A（2日）→B（5日）→End（3日）の経路が合計10日で最長（クリティカル・パス、赤）。Start→A→C（3日）→End（4日）の経路は合計9日（灰色）のため、この経路には10－9＝1日分のトータルフロート（余裕）がある。',
    diagram: '<svg viewBox="0 0 280 140" class="w-full h-auto"><defs><marker id="arrCpm" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#9ca3af"/></marker><marker id="arrCpmR" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#ef4444"/></marker></defs><line x1="34" y1="70" x2="78" y2="70" stroke="#ef4444" stroke-width="2" marker-end="url(#arrCpmR)"/><text x="56" y="64" font-size="8" text-anchor="middle" fill="#ef4444">2日</text><line x1="102" y1="63" x2="158" y2="37" stroke="#ef4444" stroke-width="2" marker-end="url(#arrCpmR)"/><text x="130" y="42" font-size="8" text-anchor="middle" fill="#ef4444">5日</text><line x1="102" y1="77" x2="158" y2="103" stroke="#9ca3af" marker-end="url(#arrCpm)"/><text x="130" y="100" font-size="8" text-anchor="middle" fill="#6b7280">3日</text><line x1="182" y1="37" x2="238" y2="63" stroke="#ef4444" stroke-width="2" marker-end="url(#arrCpmR)"/><text x="210" y="42" font-size="8" text-anchor="middle" fill="#ef4444">3日</text><line x1="182" y1="103" x2="238" y2="77" stroke="#9ca3af" marker-end="url(#arrCpm)"/><text x="210" y="100" font-size="8" text-anchor="middle" fill="#6b7280">4日</text><circle cx="20" cy="70" r="16" fill="#eef2ff" stroke="#6366f1"/><text x="20" y="73" font-size="8" text-anchor="middle" fill="#4338ca">Start</text><circle cx="90" cy="70" r="16" fill="#eef2ff" stroke="#6366f1"/><text x="90" y="73" font-size="8" text-anchor="middle" fill="#4338ca">A</text><circle cx="170" cy="30" r="16" fill="#fef2f2" stroke="#ef4444"/><text x="170" y="33" font-size="8" text-anchor="middle" fill="#b91c1c">B</text><circle cx="170" cy="110" r="16" fill="#f3f4f6" stroke="#9ca3af"/><text x="170" y="113" font-size="8" text-anchor="middle" fill="#4b5563">C</text><circle cx="250" cy="70" r="16" fill="#eef2ff" stroke="#6366f1"/><text x="250" y="73" font-size="8" text-anchor="middle" fill="#4338ca">End</text></svg>' },

  // --- 可視化・コミュニケーション ---
  { id: 'information-radiator', term: '情報ラジエーター', aliases: ['情報ラジエーター'], category: '可視化',
    definition: 'チームや関係者が意識しなくても最新の状況が視覚的に飛び込んでくるように物理的・デジタルに常時設置された掲示物。' },
  { id: 'kanban-board', term: 'カンバン・ボード', aliases: ['カンバン・ボード'], category: '可視化',
    definition: '作業項目を「未着手・進行中・完了」などのステータス別に列で配置し、仕掛かり作業（WIP）を視覚管理するボード。',
    diagram: '<svg viewBox="0 0 300 170" class="w-full h-auto"><rect x="10" y="10" width="88" height="150" rx="6" fill="#f9fafb" stroke="#d1d5db"/><text x="54" y="26" font-size="10" text-anchor="middle" fill="#374151" font-weight="bold">Todo</text><rect x="106" y="10" width="88" height="150" rx="6" fill="#eef2ff" stroke="#818cf8"/><text x="150" y="26" font-size="9" text-anchor="middle" fill="#4338ca" font-weight="bold">Doing (WIP:3)</text><rect x="202" y="10" width="88" height="150" rx="6" fill="#ecfdf5" stroke="#34d399"/><text x="246" y="26" font-size="10" text-anchor="middle" fill="#047857" font-weight="bold">Done</text><rect x="18" y="36" width="72" height="24" rx="4" fill="#fff" stroke="#e5e7eb"/><rect x="18" y="68" width="72" height="24" rx="4" fill="#fff" stroke="#e5e7eb"/><rect x="114" y="36" width="72" height="24" rx="4" fill="#fff" stroke="#c7d2fe"/><rect x="114" y="68" width="72" height="24" rx="4" fill="#fff" stroke="#c7d2fe"/><rect x="114" y="100" width="72" height="24" rx="4" fill="#fff" stroke="#c7d2fe"/><rect x="210" y="36" width="72" height="24" rx="4" fill="#fff" stroke="#a7f3d0"/><rect x="210" y="68" width="72" height="24" rx="4" fill="#fff" stroke="#a7f3d0"/></svg>' },
  { id: 'fishbowl-window', term: 'フィッシュボウル・ウインドウ', aliases: ['フィッシュボウル・ウインドウ', 'フィッシュボウル'], category: '可視化',
    definition: '離れた拠点間をビデオカメラで常時接続し、同一空間にいるかのような自発的コミュニケーションを促す手法。' },
  { id: 'osmotic-communication', term: '浸透的コミュニケーション', aliases: ['浸透的コミュニケーション', 'Osmotic Communication'], category: '可視化',
    definition: '同じ執務空間にいることで、他者の会話やバックグラウンド情報が意識せず自然と耳に入り共有される現象。' },

  // --- デリバリー戦略・価値実現 ---
  { id: 'mvp', term: '最小実行可能プロダクト（MVP）', aliases: ['最小実行可能プロダクト', 'MVP'], category: 'デリバリー戦略',
    definition: 'アーリーアダプターに価値を提供し、実際のフィードバックを得て仮説検証・学習するために必要な最小限の機能を持つプロダクト。' },
  { id: 'mmp', term: '最小商用可能プロダクト（MMP）', aliases: ['最小商用可能プロダクト', 'MMP'], category: 'デリバリー戦略',
    definition: '一般市場の顧客に向けてリリースし、ビジネス成果を収益化できる最小限の完成度を持つプロダクト。' },
  { id: 'incremental-delivery', term: '漸進型デリバリー', aliases: ['漸進型デリバリー', 'インクリメンタル'], category: 'デリバリー戦略',
    definition: '完成した製品のパーツや機能を段階的にリリースし、早期に顧客に価値を提供・回収するアプローチ。' },
  { id: 'spike', term: 'スパイク', aliases: ['スパイク'], category: 'デリバリー戦略',
    definition: '不確実性が高く見積もりが困難な技術課題やビジネス要件の調査・リスク軽減のために設けるタイムボックス化された検証タスク。' },
  { id: 'product-vision', term: 'プロダクト・ビジョン', aliases: ['プロダクト・ビジョン'], category: 'デリバリー戦略',
    definition: 'プロダクトの長期的な目的、ターゲット層、解決する課題を明確にした将来像。優先順位付けの羅針盤。' },

  // --- リスク・変更マネジメント ---
  { id: 'risk-register', term: 'リスク登録簿', aliases: ['リスク登録簿', 'Risk Register'], category: 'リスク・変更',
    definition: '特定されたリスクの詳細、発生確率、影響度、所有者、定めたリスク対応戦略などを記録・追跡するドキュメント。' },
  { id: 'risk-response-strategies', term: 'リスク対応戦略', aliases: ['リスク対応戦略', '脅威への対応', '好機への対応'], category: 'リスク・変更',
    definition: 'マイナスリスク（回避・転嫁・軽減・受容）およびプラスリスク/好機（活用・共有・強化・受容）に対する具体的な行動方針。',
    diagram: '<svg viewBox="0 0 300 120" class="w-full h-auto"><text x="4" y="12" font-size="9" fill="#b91c1c" font-weight="bold">脅威（マイナスリスク）</text><rect x="8" y="18" width="62" height="28" rx="5" fill="#fef2f2" stroke="#fca5a5"/><text x="39" y="36" font-size="9" text-anchor="middle" fill="#b91c1c">回避</text><rect x="82" y="18" width="62" height="28" rx="5" fill="#fef2f2" stroke="#fca5a5"/><text x="113" y="36" font-size="9" text-anchor="middle" fill="#b91c1c">転嫁</text><rect x="156" y="18" width="62" height="28" rx="5" fill="#fef2f2" stroke="#fca5a5"/><text x="187" y="36" font-size="9" text-anchor="middle" fill="#b91c1c">軽減</text><rect x="230" y="18" width="62" height="28" rx="5" fill="#fef2f2" stroke="#fca5a5"/><text x="261" y="36" font-size="9" text-anchor="middle" fill="#b91c1c">受容</text><text x="4" y="66" font-size="9" fill="#047857" font-weight="bold">好機（プラスリスク）</text><rect x="8" y="72" width="62" height="28" rx="5" fill="#ecfdf5" stroke="#6ee7b7"/><text x="39" y="90" font-size="9" text-anchor="middle" fill="#047857">活用</text><rect x="82" y="72" width="62" height="28" rx="5" fill="#ecfdf5" stroke="#6ee7b7"/><text x="113" y="90" font-size="9" text-anchor="middle" fill="#047857">共有</text><rect x="156" y="72" width="62" height="28" rx="5" fill="#ecfdf5" stroke="#6ee7b7"/><text x="187" y="90" font-size="9" text-anchor="middle" fill="#047857">強化</text><rect x="230" y="72" width="62" height="28" rx="5" fill="#ecfdf5" stroke="#6ee7b7"/><text x="261" y="90" font-size="9" text-anchor="middle" fill="#047857">受容</text></svg>' },
  { id: 'change-control-board', term: '変更管理委員会（CCB）', aliases: ['CCB', '変更管理委員会'], category: 'リスク・変更',
    definition: 'プロジェクトのベースラインに対する変更申請を評価、承認、延期、または却下する正式な権限を持つグループ。',
    diagram: '<svg viewBox="0 0 300 140" class="w-full h-auto"><defs><marker id="arrCcb" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#818cf8"/></marker></defs><rect x="110" y="6" width="80" height="30" rx="6" fill="#eef2ff" stroke="#6366f1"/><text x="150" y="26" font-size="9" text-anchor="middle" fill="#4338ca">変更要求</text><line x1="150" y1="36" x2="150" y2="48" stroke="#a5b4fc" marker-end="url(#arrCcb)"/><rect x="105" y="50" width="90" height="30" rx="6" fill="#eef2ff" stroke="#6366f1"/><text x="150" y="70" font-size="9" text-anchor="middle" fill="#4338ca">CCBレビュー</text><line x1="150" y1="80" x2="55" y2="102" stroke="#a5b4fc" marker-end="url(#arrCcb)"/><line x1="150" y1="80" x2="150" y2="102" stroke="#a5b4fc" marker-end="url(#arrCcb)"/><line x1="150" y1="80" x2="245" y2="102" stroke="#a5b4fc" marker-end="url(#arrCcb)"/><rect x="16" y="104" width="78" height="30" rx="6" fill="#ecfdf5" stroke="#34d399"/><text x="55" y="124" font-size="9" text-anchor="middle" fill="#047857">承認</text><rect x="111" y="104" width="78" height="30" rx="6" fill="#fef2f2" stroke="#fca5a5"/><text x="150" y="124" font-size="9" text-anchor="middle" fill="#b91c1c">却下</text><rect x="206" y="104" width="78" height="30" rx="6" fill="#fffbeb" stroke="#fcd34d"/><text x="245" y="124" font-size="9" text-anchor="middle" fill="#b45309">延期</text></svg>' },

  // --- 分析手法・フレームワーク ---
  { id: 'impact-mapping', term: 'インパクト・マッピング', aliases: ['インパクト・マッピング'], category: '分析手法',
    definition: 'ビジネス目標、アクター、インパクト、成果物・ストーリーをマインドマップ形式で結びつけ、目的主導でバックログを分析する手法。' },
  { id: 'kano-model', term: '狩野モデル', aliases: ['狩野モデル', 'Kano Model'], category: '分析手法',
    definition: '機能を「当たり前品質」「一元的品質」「魅力的品質」などに分類し、顧客満足度に与える影響度から優先順位を判断する手法。' },
  { id: 'root-cause-analysis', term: '根本原因分析（RCA）', aliases: ['根本原因分析', 'RCA', 'なぜなぜ分析', 'フィッシュボーン'], category: '分析手法',
    definition: '問題の表面的な症状だけでなく、事象を引き起こした本質的な因果関係（根本原因）を特定して是正する分析手法。' },

  // --- ガバナンス・ビジネス環境 ---
  { id: 'business-case', term: 'ビジネス・ケース', aliases: ['ビジネス・ケース', 'Business Case'], category: 'ビジネス環境',
    definition: 'プロジェクト投資の妥当性を証明するために、期待される費用対効果やビジネス価値を分析した妥当性評価文書。' },
  { id: 'benefits-management-plan', term: 'ベネフィット・マネジメント計画書', aliases: ['ベネフィット・マネジメント計画書'], category: 'ビジネス環境',
    definition: 'プロジェクトによって創出されるビジネス成果・ベネフィットの創造、維持、最大化の手順と計測指標を定義した計画。' },
  { id: 'eef', term: '組織体の環境要因（EEF）', aliases: ['EEF', '組織体の環境要因'], category: 'ビジネス環境',
    definition: 'プロジェクトチームの制御外であり、プロジェクトに影響・制約・指示を与える内外の環境条件（企業文化、市場動向、インフラ等）。' },
  { id: 'opa', term: '組織のプロセス資産（OPA）', aliases: ['OPA', '組織のプロセス資産'], category: 'ビジネス環境',
    definition: '組織が蓄積してきた計画、プロセス、ポリシー、標準手順、過去の知識ベースやテンプレートなどの内部資産。' },
  { id: 'compliance', term: 'コンプライアンス', aliases: ['コンプライアンス', '法令順守'], category: 'ビジネス環境',
    definition: '法的要件、業界基準、安全規格、内部規定などにプロジェクトの活動や成果物が適合していることを確認・維持すること。' }
  ];

  /**
   * テキスト中に含まれる用語（エイリアス一致）を検出する。
   * @param {string} text
   */
  function findMatches(text) {
    if (!text) return [];
    const found = [];
    for (const t of TERMS) {
      const keywords = (t.aliases && t.aliases.length) ? t.aliases : [t.term];
      if (keywords.some((kw) => kw && text.includes(kw))) found.push(t);
    }
    return found;
  }

  /**
   * 指定された問題に関連する用語一覧を返す（解説文の自動検出 + 手動関連付けの合算）。
   * @param {object} question - { id, explan, title } を持つ問題オブジェクト
   */
  function forQuestion(question) {
    if (!question) return [];
    const auto = findMatches(question.explan);
    const manual = TERMS.filter((t) => Array.isArray(t.relatedQuestionIds) && t.relatedQuestionIds.includes(question.id));
    const map = new Map();
    [...auto, ...manual].forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }

  function getById(id) {
    return TERMS.find((t) => t.id === id) || null;
  }

  function all() {
    return [...TERMS].sort((a, b) => a.term.localeCompare(b.term, 'ja'));
  }

  function categories() {
    return [...new Set(TERMS.map((t) => t.category))];
  }

  return { TERMS, findMatches, forQuestion, getById, all, categories };
})();
