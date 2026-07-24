/**
 * parser.js — TSV question parser and quiz utilities
 */
const Parser = (() => {
  // ── PMP カテゴリ自動ラベリング ──────────────────────────────────────────────
  // PMP ECO (Exam Content Outline) に基づくカテゴリ。
  // 先に書かれたルールが優先される（より具体的なものを上に置く）。
  const LABEL_RULES = [
    ['リスク管理',           /リスク|助成金/],
    ['調達・契約',           /調達|契約|ベンダー|サプライヤー|コントラクター/],
    ['アジャイル実践',       /アジャイル|イテレーション|スプリント|バックログ|レトロスペクティブ|カンバン|スクラム|フィーチャー|ベロシティ|バーン|プロダクト・オーナー/],
    ['品質管理',             /品質|テスト|欠陥|バグ|ユーザー受容/],
    ['ステークホルダー管理', /ステークホルダー/],
    ['スケジュール・コスト', /スケジュール|コスト|予算|スコープ|WBS|EVM|SPI|CPI|クリティカル・パス|バジェット|タスク[A-Z]|遅延/],
    ['チームマネジメント',   /チーム|リーダー|モチベーション|サーバント|コンフリクト|対立|紛争|メンバー|能力不足/],
    ['ガバナンス・変革',     /変更管理|ガバナンス|コンプライアンス|組織変革|規制|監査|変更委員会|CCB|運営委員会|変更要求|フィジビリティ|健康/],
    ['コミュニケーション',   /コミュニケーション|報告書|情報ラジエーター|ダッシュボード/],
  ];

  function autoLabel(title) {
    for (const [lbl, pat] of LABEL_RULES) {
      if (pat.test(title)) return lbl;
    }
    return 'プロジェクト管理（一般）';
  }

  function parseListField(v) {
    if (!v || typeof v !== 'string') return [];
    return v.trim().split('|').map((s) => s.trim()).filter(Boolean);
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Parse a TSV text into normalized question objects.
   * Returns an empty array on failure.
   */
  function parseTsvData(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];
    const header = lines[0].split('\t').map((h) => h.trim());
    return lines.slice(1).map((line, i) => {
      const vals = line.split('\t');
      const rec = {};
      header.forEach((key, idx) => { rec[key] = vals[idx] ?? ''; });
      return normalizeRecord(rec, i + 1);
    });
  }

  function normalizeRecord(r, fallbackId) {
    const q = { ...r };
    q.id = Number(q.id) || fallbackId;
    q.title = (q.title || '').replace(/^\d+\s*\/\s*\d+\s*point\s*/i, '').trim();
    q.explan = (q.explan || '').trim();

    const sc = Number(q.selectionCount || 1);
    q.selectionCount = (Number.isInteger(sc) && sc > 0) ? sc : 1;
    q.isMultiSelect = q.selectionCount > 1;
    q.questionType = String(q.questionType || '').trim().toLowerCase() === 'match' ? 'match' : 'single';
    q.matchRows = parseListField(q.matchRows || '');
    q.matchOptions = parseListField(q.matchOptions || '');
    // ans for match: "2,3,1,4" (1-based option index per row)
    q.ans = (q.ans || '').trim();
    // PMP category label (auto-assigned from question text)
    q.label = autoLabel(q.title);
    return q;
  }

  /**
   * Shuffle answer options within a question.
   * For match questions, options are not shuffled (order is meaningful).
   * Returns a new question object with shuffled options and updated ans.
   */
  function shuffleQuestion(q) {
    if (q.questionType === 'match') return { ...q };

    const keys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
    const ansDigs = (q.ans || '').split('').map(Number).filter((n) => !isNaN(n));

    // Build option list with original A/B/C/D labels
    const opts = keys
      .map((k, idx) => ({
        text: q[k] || '',
        correct: ansDigs.includes(idx + 1),
        originalLabel: String.fromCharCode(65 + idx), // A, B, C ...
      }))
      .filter((o) => o.text);

    const shuffled = shuffleArray(opts);
    const result = { ...q, ans: '' };

    const newAns = [];
    shuffled.forEach((opt, idx) => {
      result['q' + (idx + 1)] = opt.text;
      if (opt.correct) newAns.push(idx + 1);
    });
    // Clear leftover slots
    for (let i = shuffled.length; i < 6; i++) result['q' + (i + 1)] = '';

    result.ans = newAns.sort((a, b) => a - b).join('');
    // Store original label order for post-answer display
    result.optionLabels = shuffled.map((opt) => opt.originalLabel);
    return result;
  }

  /**
   * Check whether a user's answer is correct.
   * selectedValues: for single/multi → array of 1-based option indices (numbers)
   *                 for match → array of selected option indices per row (numbers, same order as matchRows)
   */
  function checkAnswer(question, selectedValues) {
    if (question.questionType === 'match') {
      const expected = (question.ans || '').split(',').map(Number);
      if (expected.some((n) => !n)) return null; // answer unknown
      return (
        expected.length === selectedValues.length &&
        expected.every((v, i) => v === selectedValues[i])
      );
    }
    const expected = (question.ans || '').split('').map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b);
    const actual = [...selectedValues].sort((a, b) => a - b);
    return (
      actual.length === expected.length &&
      actual.every((v, i) => v === expected[i])
    );
  }

  return { parseTsvData, shuffleArray, shuffleQuestion, checkAnswer, autoLabel };
})();
