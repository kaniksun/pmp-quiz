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
    { id: 'agile', term: 'アジャイル', aliases: ['アジャイル', 'Agile'], category: '基本概念',
      definition: '変化する要求事項に迅速かつ柔軟に対応するため、短い反復サイクルで計画・実行・レビューを繰り返しながら価値を届ける開発アプローチの総称。' },
    { id: 'predictive', term: '予測型アプローチ', aliases: ['予測型'], category: '基本概念',
      definition: 'スコープ・スケジュール・コストを早期に確定し、変更マネジメントを通じて計画どおりの実行をコントロールする、いわゆるウォーターフォール型のアプローチ。' },
    { id: 'adaptive', term: '適応型アプローチ', aliases: ['適応型'], category: '基本概念',
      definition: '要求事項の変化を前提に、短いサイクルで実装とフィードバックを繰り返しながら計画を継続的に見直すアプローチ。アジャイルの上位概念として使われる。' },
    { id: 'iterative', term: '反復型アプローチ', aliases: ['反復型', 'イテレーティブ'], category: '基本概念',
      definition: '固定のタイムボックスにこだわらず、試作と改良を繰り返しながらソリューションの精度を高めていく開発方式。' },
    { id: 'hybrid', term: 'ハイブリッド・アプローチ', aliases: ['ハイブリッド'], category: '基本概念',
      definition: '予測型と適応型（アジャイル）を組み合わせ、成果物の特性に応じて最適な開発方式を使い分けるアプローチ。' },
    { id: 'scrum', term: 'スクラム', aliases: ['スクラム', 'Scrum'], category: 'フレームワーク',
      definition: '短い固定期間（スプリント）で計画・実行・レビュー・振り返りを繰り返す、代表的なアジャイル・フレームワーク。' },
    { id: 'kanban', term: 'カンバン', aliases: ['カンバン', 'かんばん', 'Kanban'], category: 'フレームワーク',
      definition: '作業項目をボード上で可視化し、仕掛かり中（WIP）の作業を制限しながら継続的にフローを改善する手法。' },
    { id: 'product-owner', term: 'プロダクト・オーナー', aliases: ['プロダクト・オーナー'], category: '役割',
      definition: 'プロダクトの価値を最大化する責任を負い、プロダクト・バックログの優先順位付けや意思決定を行う役割。アジャイル・プロジェクトにおけるスポンサー的な機能も担う。' },
    { id: 'scrum-master', term: 'スクラム・マスター', aliases: ['スクラム・マスター'], category: '役割',
      definition: 'チームを支援し、障害を取り除き、チームが持続可能なペースで作業できるようにするサーバント・リーダー役。' },
    { id: 'servant-leadership', term: 'サーバント・リーダーシップ', aliases: ['サーバント・リーダー', 'サーバント・リーダーシップ'], category: '役割',
      definition: 'リーダーがチームに奉仕し、障害の除去や環境整備を通じてチームの自己組織化と成果を支援する考え方。' },
    { id: 'self-organizing-team', term: '自己組織化チーム', aliases: ['自己組織化'], category: '役割',
      definition: 'チーム自身が作業の進め方や役割分担を決定し、外部からの詳細な指示を受けずに成果を出せるチームのあり方。' },
    { id: 't-shaped-skill', term: 'T字型スキル', aliases: ['T字型スキル', 'T字型'], category: '役割',
      definition: '専門分野を1つ持ちながら、周辺分野にも幅広く対応できるスキルセット。アジャイル・チームの柔軟性を高める。' },
    { id: 'iteration', term: 'イテレーション', aliases: ['イテレーション'], category: 'イベント・サイクル',
      definition: '計画からレビューまでを一区切りとする、固定または短期間の開発サイクル。スプリントとほぼ同義で使われる。' },
    { id: 'sprint', term: 'スプリント', aliases: ['スプリント'], category: 'イベント・サイクル',
      definition: 'スクラムにおけるタイムボックス化された固定期間の反復サイクル。通常1〜4週間。' },
    { id: 'daily-standup', term: '毎日の調整会議', aliases: ['デイリー・スクラム', '毎日の調整会議', 'デイリー・スタンドアップ'], category: 'イベント・サイクル',
      definition: 'チームが毎日短時間集まり、進捗・障害・今後の作業を共有する定例ミーティング。' },
    { id: 'retrospective', term: 'レトロスペクティブ（振り返り）', aliases: ['レトロスペクティブ'], category: 'イベント・サイクル',
      definition: 'イテレーションの終わりに、うまくいった点・改善点を振り返り、次のサイクルの働き方を改善するためのミーティング。' },
    { id: 'iteration-review', term: 'イテレーション・レビュー', aliases: ['イテレーション・レビュー', 'イテレーション・デモ'], category: 'イベント・サイクル',
      definition: '完成した成果物をステークホルダーに披露し、フィードバックを得るためのイベント。' },
    { id: 'timebox', term: 'タイムボックス', aliases: ['タイムボックス'], category: 'イベント・サイクル',
      definition: '作業や会議に固定の時間枠を設定し、その中で完了させる手法。スコープではなく時間を固定するのが特徴。' },
    { id: 'backlog', term: 'プロダクト・バックログ', aliases: ['プロダクト・バックログ', 'バックログ'], category: '成果物・ドキュメント',
      definition: 'プロダクトに必要な機能や要求事項を優先順位付けして並べた一覧。プロダクト・オーナーが管理する。' },
    { id: 'iteration-backlog', term: 'イテレーション・バックログ', aliases: ['イテレーション・バックログ', 'スプリント・バックログ'], category: '成果物・ドキュメント',
      definition: '当該イテレーション（スプリント）で取り組むと決めた作業項目の一覧。' },
    { id: 'backlog-refinement', term: 'バックログの洗練', aliases: ['バックログの洗練', 'バックログ・リファインメント'], category: '成果物・ドキュメント',
      definition: '複雑または大きすぎるバックログ項目を、より小さく明確な単位に分解・整理する継続的な活動。' },
    { id: 'user-story', term: 'ユーザー・ストーリー', aliases: ['ユーザー・ストーリー'], category: '成果物・ドキュメント',
      definition: 'ユーザー視点で「誰が・何を・なぜ」欲しいかを簡潔に記述した要求事項の単位。' },
    { id: 'story-point', term: 'ストーリー・ポイント', aliases: ['ストーリー・ポイント'], category: '見積り・指標',
      definition: 'ユーザー・ストーリーの相対的な規模や複雑さを見積もるための単位。' },
    { id: 'velocity', term: 'ベロシティ', aliases: ['ベロシティ'], category: '見積り・指標',
      definition: '1イテレーションあたりにチームが完了できる作業量（ストーリー・ポイント等）の平均値。将来の計画予測に使う。' },
    { id: 'burndown-chart', term: 'バーンダウン・チャート', aliases: ['バーンダウン'], category: '見積り・指標',
      definition: '残作業量が時間の経過とともにどう減っているかを示すグラフ。計画と実績の差異を可視化する。' },
    { id: 'burnup-chart', term: 'バーンアップ・チャート', aliases: ['バーンアップ'], category: '見積り・指標',
      definition: '完了した作業量とスコープ全体の推移を時系列で示すグラフ。スコープ変動も可視化できる。' },
    { id: 'dod', term: 'Doneの定義（DoD）', aliases: ['Doneの定義', 'DoD'], category: '見積り・指標',
      definition: '作業項目が「完了」とみなされるために満たすべき共通の品質基準。' },
    { id: 'dor', term: 'Readyの定義（DoR）', aliases: ['Readyの定義', 'DoR'], category: '見積り・指標',
      definition: 'バックログ項目が着手可能な状態とみなされるために満たすべき基準（要求事項の明確さなど）。' },
    { id: 'information-radiator', term: '情報ラジエーター', aliases: ['情報ラジエーター'], category: '可視化・コミュニケーション',
      definition: 'チームやプロジェクトの状況を関係者がいつでも見られるように、物理的またはデジタルに常時表示する掲示物。' },
    { id: 'kanban-board', term: 'カンバン・ボード', aliases: ['カンバン・ボード'], category: '可視化・コミュニケーション',
      definition: '作業項目を「未着手・進行中・完了」などの列で可視化するボード。仕掛かり作業の把握に役立つ。' },
    { id: 'mvp', term: '最小実行可能プロダクト（MVP）', aliases: ['最小実行可能プロダクト', 'MVP'], category: 'デリバリー戦略',
      definition: '顧客に価値を届けられる最小限の機能を備えたプロダクトのバージョン。早期リリースと学習を目的とする。' },
    { id: 'incremental-delivery', term: '漸進型デリバリー', aliases: ['漸進型デリバリー', '漸進型開発', '漸進型'], category: 'デリバリー戦略',
      definition: '完成した機能を段階的に少しずつリリースしていく方式。リスクを分散し、早期に価値を提供できる。' },
    { id: 'spike', term: 'スパイク', aliases: ['スパイク'], category: 'デリバリー戦略',
      definition: '不確実性の高い技術的課題や設計方針を検証するために行う、時間を区切った調査・検証作業。' },
    { id: 'product-vision', term: 'プロダクト・ビジョン', aliases: ['プロダクト・ビジョン'], category: 'デリバリー戦略',
      definition: 'プロダクトが目指す将来像や存在意義を示す指針。バックログの優先順位付けの拠り所となる。' },
    { id: 'impact-mapping', term: 'インパクト・マッピング', aliases: ['インパクト・マッピング'], category: '分析手法',
      definition: 'ビジネス目標とユーザー・ストーリーの関連性を図示し、優先順位付けの根拠を明確にする手法。' },
    { id: 'kano-model', term: '狩野モデル', aliases: ['狩野モデル'], category: '分析手法',
      definition: '顧客満足に影響する機能を「当たり前品質」「一元的品質」「魅力的品質」などに分類するフレームワーク。' },
    { id: 'fishbowl-window', term: 'フィッシュボウル・ウインドウ', aliases: ['フィッシュボウル・ウインドウ', 'フィッシュボウル'], category: '可視化・コミュニケーション',
      definition: '離れた拠点のチーム同士を常時映像でつなぎ、あたかも同じ部屋にいるかのように協働できるようにする手法。' },
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
