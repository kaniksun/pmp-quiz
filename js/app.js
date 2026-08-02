/**
 * app.js — PMP Quiz App (Vue 3 global build, no build tools required)
 *
 * Screens:
 *   home    → load questions, show stats, start quiz
 *   quiz    → question-by-question with explanation
 *   result  → session score breakdown
 *   history → past sessions + overall stats
 */

const { createApp, ref, computed, reactive, onMounted, onUnmounted, watch } = Vue;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

function fmtSec(ms) {
  const s = Math.floor(ms / 1000);
  return s < 60 ? `${s}秒` : `${Math.floor(s / 60)}分${s % 60}秒`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────────────────────────────────────────
const HomeScreen = {
  template: `
    <div class="flex flex-col min-h-screen">
      <!-- Header gradient -->
      <div class="bg-gradient-to-br from-indigo-800 via-indigo-700 to-violet-700 px-5 pt-12 pb-10 text-white relative overflow-hidden">
        <div class="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full"></div>
        <div class="absolute -bottom-12 -left-6 w-52 h-52 bg-white/5 rounded-full"></div>
        <div class="relative">
          <p class="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">PMP Learning</p>
          <h1 class="text-3xl font-bold mb-4">継続が合格への道</h1>
          <!-- Stat pills -->
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div class="text-2xl font-bold">{{ stats.totalAnswers }}</div>
              <div class="text-indigo-200 text-xs mt-0.5">総解答数</div>
            </div>
            <div class="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div class="text-2xl font-bold">{{ stats.accuracy }}<span class="text-sm">%</span></div>
              <div class="text-indigo-200 text-xs mt-0.5">正答率</div>
            </div>
            <div class="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <div class="text-2xl font-bold">{{ stats.streak }}<span class="text-sm">日</span></div>
              <div class="text-indigo-200 text-xs mt-0.5">連続学習</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 bg-gray-50 px-4 py-6 space-y-5">

        <!-- Resume suspended session -->
        <div v-if="suspendedSession" class="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">⏸️</span>
            <p class="font-bold text-amber-800">中断中のセッションがあります</p>
          </div>
          <p class="text-amber-700 text-sm mb-3">
            {{ suspendedSession.questions.length }}問中 {{ suspendedSession.results.length }}問完了 ・ 保存時刻: {{ formatDate(suspendedSession.savedAt) }}
          </p>
          <div class="flex gap-2">
            <button @click="resumeQuiz"
              class="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold py-3 rounded-xl transition-all">
              ↩️ 続きから再開
            </button>
            <button @click="discardSuspended"
              class="px-4 text-amber-600 border-2 border-amber-300 rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors">
              捨てる
            </button>
          </div>
        </div>

        <!-- File Load -->
        <div v-if="!hasQuestions" class="bg-white rounded-2xl shadow-sm p-5">
          <h2 class="font-semibold text-gray-700 mb-3">問題データの読み込み</h2>
          <label class="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 rounded-xl py-8 px-4 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all">
            <span class="text-4xl mb-2">📂</span>
            <span class="font-medium text-gray-700">TSVファイルを選択</span>
            <span class="text-sm text-gray-400 mt-1">exam_sample.tsv</span>
            <input type="file" accept=".tsv" class="hidden" @change="onFileChange">
          </label>
          <p v-if="loadError" class="text-red-500 text-sm mt-2">{{ loadError }}</p>
        </div>

        <!-- Questions ready -->
        <template v-else>
          <!-- Info bar -->
          <div class="flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3">
            <div>
              <span class="text-xs text-gray-400 uppercase tracking-wide">読み込み済み</span>
              <div class="font-semibold text-gray-800">{{ questions.length }} 問</div>
            </div>
            <button @click="showFileInput" class="text-sm text-indigo-500 font-medium">再読み込み</button>
            <input ref="fileInput" type="file" accept=".tsv" class="hidden" @change="onFileChange">
          </div>

          <!-- Count selector -->
          <div class="bg-white rounded-2xl shadow-sm px-4 py-4">
            <p class="text-sm text-gray-500 mb-2">出題数を選択</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="n in countOptions" :key="n"
                @click="selectedCount = n"
                :class="selectedCount === n
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                class="px-4 py-2 rounded-xl text-sm font-semibold transition-all">
                {{ n === questions.length ? '全問' : n + '問' }}
              </button>
            </div>
          </div>

          <!-- Order toggle -->
          <div class="bg-white rounded-2xl shadow-sm px-4 py-4">
            <p class="text-sm text-gray-500 mb-2">出題順</p>
            <div class="flex gap-2">
              <button @click="quizOrder = 'sequential'"
                :class="quizOrder === 'sequential' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all">
                📋 順番どおり
              </button>
              <button @click="quizOrder = 'random'"
                :class="quizOrder === 'random' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all">
                🔀 ランダム
              </button>
            </div>
          </div>

          <!-- Sequential progress / start position -->
          <template v-if="quizOrder === 'sequential'">
            <div class="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 space-y-3">
              <div v-if="sequentialProgress && sequentialProgress.lastIndex > 0" class="flex items-center justify-between">
                <p class="text-sm font-medium text-indigo-700">📍 前回の進捗</p>
                <span class="text-xs font-bold"
                  :class="sequentialProgress.lastIndex >= questions.length ? 'text-green-600' : 'text-indigo-500'">
                  {{ Math.min(sequentialProgress.lastIndex, questions.length) }} / {{ questions.length }} 問
                </span>
              </div>

              <div class="flex flex-wrap gap-2">
                <button v-if="sequentialProgress && sequentialProgress.lastIndex > 0 && sequentialProgress.lastIndex < questions.length"
                  @click="seqStartMode = 'continue'"
                  :class="seqStartMode === 'continue' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'"
                  class="flex-1 py-2 rounded-xl text-sm font-semibold transition-all border border-indigo-100">
                  続きから（{{ sequentialProgress.lastIndex + 1 }}問目〜）
                </button>
                <button @click="seqStartMode = 'custom'"
                  :class="seqStartMode === 'custom' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'"
                  class="flex-1 py-2 rounded-xl text-sm font-semibold transition-all border border-indigo-100">
                  問題番号を指定
                </button>
              </div>

              <div v-if="seqStartMode === 'custom'" class="flex items-center gap-2">
                <span class="text-sm text-gray-600 whitespace-nowrap">開始する問題番号</span>
                <input type="number" min="1" :max="questions.length" v-model.number="customStartNo"
                  @change="clampCustomStartNo"
                  class="w-20 border border-indigo-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <span class="text-sm text-gray-400">/ {{ questions.length }} 問目〜</span>
              </div>

              <div v-if="sequentialProgress && sequentialProgress.lastIndex >= questions.length" class="flex items-center justify-between">
                <span class="text-sm text-green-600 font-medium">🎉 全問完了！</span>
                <button @click="resetSeqProgress" class="text-xs text-indigo-500 font-medium underline">リセット</button>
              </div>
            </div>
          </template>

          <!-- Start buttons -->
          <button @click="startQuiz('main')"
            class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg shadow-lg transition-all">
            {{ quizOrder === 'sequential' ? '📋 順番どおりに出題' : '🔀 ランダム出題' }}
          </button>
          <button @click="startQuiz('weak')" :disabled="!hasHistory"
            class="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            苦手問題を解く
            <span v-if="!hasHistory" class="text-sm font-normal opacity-70">（履歴なし）</span>
          </button>
        </template>

        <!-- History shortcut -->
        <button @click="$emit('navigate', 'history')"
          class="w-full flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 hover:bg-gray-50 transition-colors">
          <span class="text-gray-700 font-medium">📊 学習履歴 &amp; 統計</span>
          <span class="text-gray-400">›</span>
        </button>

        <!-- Glossary shortcut -->
        <button @click="$emit('navigate', 'glossary')"
          class="w-full flex items-center justify-between bg-white rounded-2xl shadow-sm px-4 py-3 hover:bg-gray-50 transition-colors">
          <span class="text-gray-700 font-medium">📖 PMP用語集</span>
          <span class="text-gray-400">›</span>
        </button>

        <!-- Recent sessions -->
        <div v-if="recentSessions.length" class="bg-white rounded-2xl shadow-sm p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-3">最近のセッション</p>
          <div class="divide-y divide-gray-50">
            <div v-for="s in recentSessions" :key="s.id" class="flex items-center justify-between py-2.5">
              <div>
                <div class="text-sm font-medium text-gray-800">{{ formatDate(s.date) }}</div>
                <div class="text-xs text-gray-400">{{ s.totalQuestions }}問</div>
              </div>
              <div class="text-right">
                <div class="font-bold text-lg" :class="s.accuracy >= 70 ? 'text-green-500' : 'text-red-400'">
                  {{ s.accuracy }}%
                </div>
                <div class="text-xs text-gray-400">{{ s.correct }}/{{ s.totalQuestions }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  props: ['questions'],
  emits: ['navigate', 'start-quiz', 'questions-loaded', 'resume'],
  setup(props, { emit }) {
    const stats = ref({ totalAnswers: 0, accuracy: 0, streak: 0 });
    const recentSessions = ref([]);
    const hasHistory = ref(false);
    const loadError = ref('');
    const fileInput = ref(null);
    const selectedCount = ref(10);

    const hasQuestions = computed(() => props.questions.length > 0);
    const quizOrder = ref('sequential');
    const sequentialProgress = ref(null);
    const seqStartMode = ref('custom'); // 'continue' | 'custom' ('custom' with 1 = start from beginning)
    const customStartNo = ref(1);
    const suspendedSession = ref(null);

    const countOptions = computed(() => {
      const n = props.questions.length;
      const candidates = [10, 20, 30, 50, n];
      return [...new Set(candidates.filter((c) => c <= n && c > 0))].sort((a, b) => a - b);
    });

    // Default to "continue" once we know both the saved progress and the
    // question list length (question list may load asynchronously after mount).
    watch(
      () => [sequentialProgress.value, props.questions.length],
      () => {
        if (sequentialProgress.value && sequentialProgress.value.lastIndex > 0
          && props.questions.length > 0 && sequentialProgress.value.lastIndex < props.questions.length) {
          seqStartMode.value = 'continue';
        }
      },
      { immediate: true }
    );

    onMounted(async () => {
      try {
        const s = await DB.getStats();
        stats.value = s;
        recentSessions.value = s.recentSessions;
        hasHistory.value = s.totalAnswers > 0;
      } catch (_) {}

      // Check for sequential progress
      try {
        const seqRaw = localStorage.getItem('pmp-sequential-progress');
        if (seqRaw) sequentialProgress.value = JSON.parse(seqRaw);
      } catch (_) {}

      // Check for a suspended quiz session
      try {
        const raw = localStorage.getItem('pmp-quiz-suspended');
        if (raw) suspendedSession.value = JSON.parse(raw);
      } catch (_) {}

      // Auto-load cached questions if any
      if (!props.questions.length) {
        try {
          const cached = await DB.getCachedQuestions();
          if (cached.length > 0) emit('questions-loaded', cached);
        } catch (_) {}
      }
    });

    function showFileInput() {
      fileInput.value && fileInput.value.click();
    }

    async function onFileChange(e) {
      loadError.value = '';
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const questions = Parser.parseTsvData(text);
        if (!questions.length) { loadError.value = '問題データが見つかりませんでした。'; return; }
        await DB.cacheQuestions(questions);
        emit('questions-loaded', questions);
        selectedCount.value = Math.min(10, questions.length);
      } catch (err) {
        loadError.value = '読み込みエラー: ' + err.message;
      }
    }

    async function startQuiz(mode) {
      const count = Math.min(selectedCount.value, props.questions.length);
      let pool;
      let effectiveMode = mode;
      let seqStartIdx = 0;

      if (mode === 'weak') {
        const weak = await DB.getWeakQuestions();
        if (!weak.length) { alert('苦手問題がありません。先にランダムモードで解いてください。'); return; }
        const ids = new Set(weak.map((q) => q.id));
        pool = Parser.shuffleArray(props.questions.filter((q) => ids.has(q.id))).slice(0, count);
        if (pool.length < count) pool = [...pool, ...Parser.shuffleArray(props.questions.filter((q) => !ids.has(q.id)))].slice(0, count);
      } else if (quizOrder.value === 'sequential') {
        if (seqStartMode.value === 'continue' && sequentialProgress.value && sequentialProgress.value.lastIndex > 0) {
          const prog = sequentialProgress.value.lastIndex;
          seqStartIdx = prog < props.questions.length ? prog : 0;
        } else if (seqStartMode.value === 'custom') {
          const n = Math.min(Math.max(1, customStartNo.value || 1), props.questions.length);
          seqStartIdx = n - 1;
        }
        pool = props.questions.slice(seqStartIdx, seqStartIdx + count);
        if (!pool.length) pool = props.questions.slice(0, count);
        effectiveMode = 'sequential';
      } else {
        pool = Parser.shuffleArray(props.questions).slice(0, count);
        effectiveMode = 'random';
      }

      emit('start-quiz', pool.map(Parser.shuffleQuestion), effectiveMode, seqStartIdx);
    }

    function resumeQuiz() {
      emit('resume', suspendedSession.value);
      suspendedSession.value = null;
    }

    function discardSuspended() {
      localStorage.removeItem('pmp-quiz-suspended');
      suspendedSession.value = null;
    }

    function resetSeqProgress() {
      localStorage.removeItem('pmp-sequential-progress');
      sequentialProgress.value = null;
      seqStartMode.value = 'custom';
      customStartNo.value = 1;
    }

    function clampCustomStartNo() {
      const max = props.questions.length || 1;
      let n = Math.round(Number(customStartNo.value) || 1);
      if (n < 1) n = 1;
      if (n > max) n = max;
      customStartNo.value = n;
    }

    return { stats, recentSessions, hasHistory, loadError, fileInput, selectedCount, quizOrder, sequentialProgress, seqStartMode, customStartNo, suspendedSession, countOptions, hasQuestions, formatDate, showFileInput, onFileChange, startQuiz, resumeQuiz, discardSuspended, resetSeqProgress, clampCustomStartNo };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// QuizScreen
// ─────────────────────────────────────────────────────────────────────────────
const QuizScreen = {
  template: `
    <div class="flex flex-col min-h-screen bg-gray-50">
      <!-- Top bar -->
      <div class="sticky top-0 z-10 bg-indigo-700 text-white px-4 pt-10 pb-4">
        <div class="flex items-center justify-between mb-3">
          <button @click="handleAbort" class="text-indigo-200 text-sm font-medium">← 中断</button>
          <span class="text-sm font-semibold">{{ qno + 1 }} / {{ questions.length }}</span>
          <span class="text-indigo-200 text-sm font-mono">{{ timerText }}</span>
        </div>
        <!-- Progress bar -->
        <div class="h-2 bg-indigo-900/40 rounded-full overflow-hidden">
          <div class="h-2 bg-white/80 rounded-full transition-all duration-500"
            :style="{ width: progressPct + '%' }"></div>
        </div>
      </div>

      <!-- Question card -->
      <div class="flex-1 px-4 py-5 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <!-- Type badge -->
          <div class="flex items-center gap-2 mb-3">
            <span v-if="current.isMultiSelect"
              class="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
              ☑️ 複数選択
            </span>
            <span v-else-if="current.questionType === 'match'"
              class="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">
              対応付け問題
            </span>
            <span v-if="current.label"
              class="text-xs bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">
              {{ current.label }}
            </span>
          </div>
          <p class="text-gray-800 leading-relaxed font-medium">{{ current.title }}</p>
          <p v-if="current.isMultiSelect" class="text-xs text-amber-600 font-semibold mt-2">
            ※ 該当するものをすべて選択してください（選択数のヒントはありません）
          </p>
        </div>

        <!-- Case study reference -->
        <div v-if="caseStudy" class="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 mb-4">
          <button @click="showCaseStudy = !showCaseStudy"
            class="w-full flex items-center justify-between text-indigo-700 font-semibold text-sm">
            <span>📖 {{ caseStudy.title }}</span>
            <span>{{ showCaseStudy ? '▲ 閉じる' : '▼ 確認する' }}</span>
          </button>
          <p v-if="showCaseStudy" class="text-xs text-gray-600 leading-relaxed mt-3 whitespace-pre-line">{{ caseStudy.text }}</p>
        </div>

        <!-- Options: single / multi select -->
        <div v-if="current.questionType !== 'match'" class="space-y-3">
          <div
            v-for="(opt, idx) in optionList" :key="idx"
            @click="phase === 'answering' && toggleOption(idx + 1)"
            :class="optionClass(idx + 1)"
            class="bg-white rounded-2xl shadow-sm px-4 py-3.5 flex items-start gap-3 cursor-pointer select-none border-2 transition-all">
            <!-- Checkbox visual -->
            <div class="mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all"
              :class="optionCheckClass(idx + 1)">
              <!-- 選択した選択肢: 白チェックマーク -->
              <svg v-if="selected.includes(idx + 1)" class="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <!-- 正解だが未選択: 緑ドット（正解マーカー） -->
              <span v-else-if="phase === 'reviewed' && correctIndices.includes(idx + 1)"
                class="w-2.5 h-2.5 rounded-full bg-green-500 block"></span>
            </div>
            <!-- Original label badge (A/B/C/D) — shown only after answering -->
            <span v-if="current.optionLabels && phase === 'reviewed'"
              class="flex-shrink-0 mt-0.5 text-xs font-bold w-5 text-center text-gray-500">
              {{ current.optionLabels[idx] }}
            </span>
            <span class="flex-1 text-gray-700 text-sm leading-relaxed">{{ opt }}</span>
            <!-- Result icon (reviewed state) -->
            <span v-if="phase === 'reviewed'" class="flex-shrink-0 text-xl leading-none self-center">
              <span v-if="correctIndices.includes(idx + 1) && selected.includes(idx + 1)">✅</span>
              <span v-else-if="correctIndices.includes(idx + 1) && !selected.includes(idx + 1)">💡</span>
              <span v-else-if="!correctIndices.includes(idx + 1) && selected.includes(idx + 1)">❌</span>
            </span>
          </div>
        </div>

        <!-- Options: match / dropdown -->
        <div v-else class="space-y-3">
          <div v-for="(row, idx) in current.matchRows" :key="idx"
            class="bg-white rounded-2xl shadow-sm p-4">
            <p class="text-sm font-medium text-gray-700 mb-2">{{ row }}</p>
            <select
              v-model="matchSelected[idx]"
              :disabled="phase === 'reviewed'"
              :class="matchSelectClass(idx)"
              class="w-full border-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none appearance-none">
              <option value="">― 選択してください ―</option>
              <option v-for="(opt, oi) in current.matchOptions" :key="oi" :value="oi + 1">{{ opt }}</option>
            </select>
          </div>
        </div>

        <!-- Explanation (shown after answering) -->
        <transition name="slide-up">
          <div v-if="phase === 'reviewed'" class="mt-4 bg-white rounded-2xl shadow-sm p-5 border-l-4"
            :class="lastCorrect === true ? 'border-green-400' : lastCorrect === false ? 'border-red-400' : 'border-gray-300'">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xl">{{ lastCorrect === true ? '✅' : lastCorrect === false ? '❌' : 'ℹ️' }}</span>
              <span class="font-bold" :class="lastCorrect === true ? 'text-green-600' : lastCorrect === false ? 'text-red-500' : 'text-gray-500'">
                {{ lastCorrect === true ? '正解！' : lastCorrect === false ? '不正解' : '採点なし' }}
              </span>
              <span v-if="current.questionType !== 'match'" class="text-sm text-gray-400 ml-auto">正解: {{ correctTextDisplay }}</span>
            </div>
            <p v-if="current.explan" class="text-gray-600 text-sm leading-relaxed">{{ current.explan }}</p>
            <p v-else class="text-gray-400 text-sm italic">解説なし</p>

            <!-- Related agile terms -->
            <div v-if="relatedTerms.length" class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-400 mb-2">🔤 関連用語</p>
              <div class="flex flex-wrap gap-2">
                <button v-for="t in relatedTerms" :key="t.id" @click="toggleTerm(t.id)"
                  :class="openTermId === t.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'"
                  class="text-xs font-semibold px-3 py-1.5 rounded-full transition-all">
                  {{ t.term }}
                </button>
              </div>
              <div v-if="activeTerm" class="mt-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <p class="text-xs font-bold text-indigo-700 mb-1">{{ activeTerm.term }}</p>
                <p class="text-xs text-gray-600 leading-relaxed">{{ activeTerm.definition }}</p>
                <div v-if="activeTerm.diagram" class="mt-2 bg-white border border-indigo-100 rounded-lg p-2 overflow-x-auto">
                  <div class="max-w-xs mx-auto" v-html="activeTerm.diagram"></div>
                </div>
                <div v-if="activeTerm.example" class="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-2">
                  <p class="text-[11px] font-bold text-amber-600 mb-1">🧮 計算例</p>
                  <p class="text-[11px] text-gray-700 leading-relaxed">{{ activeTerm.example }}</p>
                </div>
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- Bottom action -->
      <div class="px-4 pb-8 pt-2 bg-gray-50">
        <button v-if="phase === 'answering'"
          @click="submitAnswer"
          :disabled="!canSubmit"
          class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          回答する
        </button>
        <button v-else @click="nextQuestion"
          class="w-full bg-gray-800 hover:bg-gray-900 active:scale-95 text-white font-bold py-4 rounded-2xl text-lg shadow-lg transition-all">
          {{ qno + 1 < questions.length ? '次の問題 →' : '結果を見る →' }}
        </button>
      </div>
    </div>
  `,
  props: ['questions', 'initialState', 'mode', 'seqStartIdx'],
  emits: ['complete', 'abort'],
  setup(props, { emit }) {
    const init = props.initialState ?? {};
    const qno = ref(init.qno ?? 0);
    const phase = ref(init.phase ?? 'answering');
    const selected = ref(init.selected ?? []);
    const matchSelected = ref(init.matchSelected ?? []);
    const results = ref(init.results ?? []);
    const lastCorrect = ref(init.lastCorrect ?? null);
    const startTime = ref(Date.now());
    const elapsed = ref(0);
    let isFinalized = false;

    let timerHandle = null;
    let checkpointHandle = null;
    function startTimer() {
      startTime.value = Date.now();
      clearInterval(timerHandle);
      timerHandle = setInterval(() => { elapsed.value = Date.now() - startTime.value; }, 1000);
    }
    function stopTimer() { clearInterval(timerHandle); }

    function buildSuspendState() {
      return {
        questions: props.questions,
        results: results.value,
        qno: qno.value,
        phase: phase.value,
        selected: selected.value,
        matchSelected: matchSelected.value,
        lastCorrect: lastCorrect.value,
        savedAt: new Date().toISOString(),
        mode: props.mode,
        seqStartIdx: props.seqStartIdx,
      };
    }

    function persistCheckpoint() {
      try {
        localStorage.setItem('pmp-quiz-suspended', JSON.stringify(buildSuspendState()));
      } catch (_) {}

      // Keep sequential progress fresh even if the app is background-killed.
      if (props.mode === 'sequential') {
        const nextIdx = Number(props.seqStartIdx || 0) + results.value.length;
        try {
          localStorage.setItem('pmp-sequential-progress', JSON.stringify({ lastIndex: nextIdx }));
        } catch (_) {}
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') persistCheckpoint();
    }

    function onPageHide() {
      persistCheckpoint();
    }

    onMounted(() => {
      startTimer();
      checkpointHandle = setInterval(persistCheckpoint, 15000);
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('pagehide', onPageHide);
    });

    onUnmounted(() => {
      stopTimer();
      clearInterval(checkpointHandle);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      if (!isFinalized) persistCheckpoint();
    });

    const current = computed(() => props.questions[qno.value]);
    const showCaseStudy = ref(false);
    const caseStudy = computed(() => (typeof CaseStudies !== 'undefined' && current.value) ? CaseStudies.forQuestion(current.value.id) : null);
    const openTermId = ref(null);
    const relatedTerms = computed(() => (typeof Glossary !== 'undefined' && current.value && phase.value === 'reviewed') ? Glossary.forQuestion(current.value) : []);
    const activeTerm = computed(() => relatedTerms.value.find((t) => t.id === openTermId.value) || null);
    function toggleTerm(id) {
      openTermId.value = openTermId.value === id ? null : id;
    }

    const timerText = computed(() => {
      const s = Math.floor(elapsed.value / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    });

    const progressPct = computed(() => ((qno.value) / props.questions.length) * 100);

    const optionList = computed(() => {
      const q = current.value;
      return [1, 2, 3, 4, 5, 6].map((i) => q['q' + i]).filter(Boolean);
    });

    const correctIndices = computed(() => {
      const q = current.value;
      if (q.questionType === 'match') return [];
      return (q.ans || '').split('').map(Number).filter((n) => !isNaN(n));
    });

    const correctDisplay = computed(() => correctIndices.value.join(', '));

    const correctTextDisplay = computed(() => {
      const opts = optionList.value;
      return correctIndices.value.map((i) => opts[i - 1] || i).join(' / ');
    });

    const canSubmit = computed(() => {
      if (current.value.questionType === 'match') {
        return matchSelected.value.length === current.value.matchRows.length &&
          matchSelected.value.every((v) => v !== '' && v !== undefined && v !== null);
      }
      return selected.value.length > 0;
    });

    function toggleOption(idx) {
      const q = current.value;
      if (q.isMultiSelect) {
        const i = selected.value.indexOf(idx);
        if (i >= 0) selected.value.splice(i, 1);
        else selected.value.push(idx);
      } else {
        selected.value = [idx];
      }
    }

    function optionClass(idx) {
      if (phase.value === 'answering') {
        return selected.value.includes(idx)
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-transparent hover:border-indigo-200';
      }
      // reviewed
      const isCorrect = correctIndices.value.includes(idx);
      const isSelected = selected.value.includes(idx);
      if (isCorrect && isSelected)  return 'border-green-400 bg-green-50';
      if (isCorrect && !isSelected) return 'border-green-300 bg-green-50/50';
      if (!isCorrect && isSelected) return 'border-red-500 bg-red-100';   // 誤選択: 濃い赤
      return 'border-transparent opacity-40';
    }

    function optionCheckClass(idx) {
      if (phase.value === 'reviewed') {
        const isCorrect  = correctIndices.value.includes(idx);
        const isSelected = selected.value.includes(idx);
        if (isSelected && isCorrect)  return 'bg-green-500 border-green-500';  // 正解を選んだ
        if (isSelected && !isCorrect) return 'bg-red-500 border-red-500';      // 誤選択
        if (!isSelected && isCorrect) return 'border-green-400 bg-white';      // 選ばなかった正解
        return 'border-gray-300';
      }
      if (selected.value.includes(idx)) return 'bg-indigo-600 border-indigo-600';
      return 'border-gray-300';
    }

    function reviewIcon(idx) {
      const isCorrect  = correctIndices.value.includes(idx);
      const isSelected = selected.value.includes(idx);
      if (isCorrect && isSelected)  return '✅';  // 正解を選んだ
      if (isCorrect && !isSelected) return '💡';  // 正解だが未選択（選ぶべきだった）
      if (!isCorrect && isSelected) return '❌';  // 誤選択
      return '';
    }

    function matchSelectClass(idx) {
      if (phase.value === 'answering') return 'border-gray-200 bg-white text-gray-700';
      const expectedAns = (current.value.ans || '').split(',').map(Number);
      const exp = expectedAns[idx];
      const sel = Number(matchSelected.value[idx]);
      if (!exp) return 'border-gray-200 bg-gray-50 text-gray-400';
      return exp === sel ? 'border-green-400 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700';
    }

    function submitAnswer() {
      stopTimer();
      const timeMs = Date.now() - startTime.value;
      const q = current.value;
      let isCorrect;
      let selAnswer;

      if (q.questionType === 'match') {
        selAnswer = matchSelected.value.map(Number);
        isCorrect = Parser.checkAnswer(q, selAnswer);
      } else {
        selAnswer = [...selected.value];
        isCorrect = Parser.checkAnswer(q, selAnswer);
      }

      lastCorrect.value = isCorrect;
      results.value.push({ question: q, selected: selAnswer, isCorrect, timeMs });
      phase.value = 'reviewed';
      persistCheckpoint();
    }

    function handleAbort() {
      stopTimer();
      persistCheckpoint();
      emit('abort');
    }

    function nextQuestion() {
      // Save immediately when the user advances, so iOS background kills
      // right after tapping "next" still keep progress.
      persistCheckpoint();

      if (qno.value + 1 >= props.questions.length) {
        isFinalized = true;
        localStorage.removeItem('pmp-quiz-suspended');
        emit('complete', results.value);
        return;
      }
      qno.value++;
      phase.value = 'answering';
      selected.value = [];
      matchSelected.value = [];
      lastCorrect.value = null;
      elapsed.value = 0;
      showCaseStudy.value = false;
      openTermId.value = null;
      startTimer();
      persistCheckpoint();
    }

    return {
      qno, phase, selected, matchSelected, results, lastCorrect, elapsed,
      current, timerText, progressPct, optionList, correctIndices, correctDisplay, correctTextDisplay, canSubmit,
      caseStudy, showCaseStudy,
      relatedTerms, openTermId, activeTerm, toggleTerm,
      toggleOption, optionClass, optionCheckClass, reviewIcon, matchSelectClass,
      submitAnswer, nextQuestion, handleAbort,
    };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ResultScreen
// ─────────────────────────────────────────────────────────────────────────────
const ResultScreen = {
  template: `
    <div class="flex flex-col min-h-screen bg-gray-50">
      <!-- Score header -->
      <div class="sticky top-0 z-10 bg-gradient-to-br from-indigo-800 to-violet-700 text-white px-5 pt-12 pb-8">
        <p class="text-indigo-200 text-sm mb-2">セッション結果</p>
        <div class="flex items-end gap-3 mb-4">
          <div class="text-6xl font-black">{{ accuracy }}<span class="text-3xl">%</span></div>
          <div class="text-indigo-200 pb-1">正答率</div>
        </div>
        <!-- Ring chart (pure CSS) -->
        <div class="flex items-center gap-4">
          <div class="relative w-20 h-20">
            <svg viewBox="0 0 36 36" class="w-20 h-20 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3"></circle>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="3"
                stroke-dasharray="100" :stroke-dashoffset="100 - accuracy"
                stroke-linecap="round" style="transition:stroke-dashoffset 1s ease;"></circle>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center text-sm font-bold">
              {{ correct }}/{{ total }}
            </div>
          </div>
          <div class="text-sm space-y-1">
            <div>✅ 正解 <span class="font-bold">{{ correct }}</span> 問</div>
            <div>❌ 不正解 <span class="font-bold">{{ total - correct }}</span> 問</div>
            <div>⏱ 平均 <span class="font-bold">{{ avgTime }}</span></div>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="px-4 py-4 flex gap-3">
        <button @click="$emit('retry-wrong')" :disabled="total - correct === 0"
          class="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          ❌ 間違いを復習
        </button>
        <button @click="$emit('home')"
          class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all">
          🏠 ホームへ
        </button>
      </div>

      <!-- Answer list -->
      <div class="flex-1 px-4 pb-10 space-y-3 overflow-y-auto">
        <div v-for="(r, i) in results" :key="i"
          class="bg-white rounded-2xl shadow-sm p-4 border-l-4"
          :class="r.isCorrect === true ? 'border-green-400' : r.isCorrect === false ? 'border-red-400' : 'border-gray-200'">
          <div class="flex items-start gap-2 mb-2">
            <span class="text-lg leading-none flex-shrink-0">{{ r.isCorrect === true ? '✅' : r.isCorrect === false ? '❌' : 'ℹ️' }}</span>
            <p class="text-sm text-gray-700 font-medium leading-snug flex-1">{{ r.question.title }}</p>
          </div>
          <!-- Options summary -->
          <div v-if="r.question.questionType !== 'match'" class="text-xs text-gray-400 space-y-0.5 mt-1 ml-7">
            <div v-for="(opt, idx) in getOpts(r.question)" :key="idx"
              :class="optSummaryClass(r, idx + 1)"
              class="px-2 py-0.5 rounded">
              <span v-if="r.question.optionLabels" class="font-bold mr-1">{{ r.question.optionLabels[idx] }}.</span>{{ opt }}
            </div>
          </div>
          <!-- Explanation toggle -->
          <button v-if="r.question.explan" @click="r._open = !r._open"
            class="mt-2 ml-7 text-xs text-indigo-500 font-medium">
            {{ r._open ? '▲ 解説を閉じる' : '▼ 解説を見る' }}
          </button>
          <p v-if="r._open && r.question.explan" class="mt-2 ml-7 text-xs text-gray-500 leading-relaxed">
            {{ r.question.explan }}
          </p>
          <!-- Related agile terms -->
          <div v-if="r._open && getRelatedTerms(r.question).length" class="mt-2 ml-7">
            <div class="flex flex-wrap gap-2">
              <button v-for="t in getRelatedTerms(r.question)" :key="t.id" @click="r._openTerm = (r._openTerm === t.id ? null : t.id)"
                :class="r._openTerm === t.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'"
                class="text-xs font-semibold px-3 py-1.5 rounded-full transition-all">
                {{ t.term }}
              </button>
            </div>
            <div v-if="r._openTerm" class="mt-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
              <p class="text-xs font-bold text-indigo-700 mb-1">{{ getTermById(r._openTerm).term }}</p>
              <p class="text-xs text-gray-600 leading-relaxed">{{ getTermById(r._openTerm).definition }}</p>
              <div v-if="getTermById(r._openTerm).diagram" class="mt-2 bg-white border border-indigo-100 rounded-lg p-2 overflow-x-auto">
                <div class="max-w-xs mx-auto" v-html="getTermById(r._openTerm).diagram"></div>
              </div>
              <div v-if="getTermById(r._openTerm).example" class="mt-2 bg-amber-50 border border-amber-100 rounded-lg p-2">
                <p class="text-[11px] font-bold text-amber-600 mb-1">🧮 計算例</p>
                <p class="text-[11px] text-gray-700 leading-relaxed">{{ getTermById(r._openTerm).example }}</p>
              </div>
            </div>
          </div>
          <div class="mt-1 ml-7 text-xs text-gray-300">⏱ {{ fmtSec(r.timeMs) }}</div>
        </div>
      </div>
    </div>
  `,
  props: ['results'],
  emits: ['home', 'retry-wrong'],
  setup(props) {
    const total = computed(() => props.results.length);
    const correct = computed(() => props.results.filter((r) => r.isCorrect === true).length);
    const accuracy = computed(() => total.value > 0 ? Math.round((correct.value / total.value) * 100) : 0);
    const avgTime = computed(() => {
      if (!total.value) return '—';
      const avg = props.results.reduce((s, r) => s + r.timeMs, 0) / total.value;
      return fmtSec(avg);
    });

    function getOpts(q) {
      return [1, 2, 3, 4, 5, 6].map((i) => q['q' + i]).filter(Boolean);
    }

    function optSummaryClass(r, idx) {
      const expArr = (r.question.ans || '').split('').map(Number).filter((n) => !isNaN(n));
      const selArr = Array.isArray(r.selected) ? r.selected.map(Number) : [];
      const isCorrectOpt = expArr.includes(idx);
      const isSelected = selArr.includes(idx);
      if (isCorrectOpt && isSelected) return 'bg-green-100 text-green-700 font-medium';
      if (isCorrectOpt) return 'bg-green-50 text-green-600';
      if (isSelected) return 'bg-red-100 text-red-600 line-through';
      return 'text-gray-400';
    }

    function getRelatedTerms(question) {
      return (typeof Glossary !== 'undefined') ? Glossary.forQuestion(question) : [];
    }

    function getTermById(id) {
      return (typeof Glossary !== 'undefined') ? Glossary.getById(id) : null;
    }

    return { total, correct, accuracy, avgTime, getOpts, optSummaryClass, getRelatedTerms, getTermById, fmtSec };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HistoryScreen
// ─────────────────────────────────────────────────────────────────────────────
const HistoryScreen = {
  template: `
    <div class="flex flex-col min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-gradient-to-br from-indigo-800 to-violet-700 text-white px-5 pt-10 pb-6">
        <div class="flex items-center gap-2 mb-4">
          <button @click="$emit('back')" class="text-indigo-200 text-sm">← 戻る</button>
        </div>
        <h1 class="text-2xl font-bold mb-4">学習履歴</h1>
        <!-- Overview cards -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-white/10 backdrop-blur rounded-xl p-3">
            <div class="text-2xl font-bold">{{ stats.totalSessions }}</div>
            <div class="text-xs text-indigo-200">セッション数</div>
          </div>
          <div class="bg-white/10 backdrop-blur rounded-xl p-3">
            <div class="text-2xl font-bold">{{ stats.accuracy }}<span class="text-sm">%</span></div>
            <div class="text-xs text-indigo-200">総合正答率</div>
          </div>
          <div class="bg-white/10 backdrop-blur rounded-xl p-3">
            <div class="text-2xl font-bold">{{ stats.totalAnswers }}</div>
            <div class="text-xs text-indigo-200">総解答数</div>
          </div>
          <div class="bg-white/10 backdrop-blur rounded-xl p-3">
            <div class="text-2xl font-bold">{{ stats.streak }}<span class="text-sm">日</span></div>
            <div class="text-xs text-indigo-200">連続学習</div>
          </div>
        </div>
      </div>

      <div class="flex-1 px-4 py-5 space-y-4 overflow-y-auto">

        <!-- Bar chart of recent sessions -->
        <div v-if="sessions.length" class="bg-white rounded-2xl shadow-sm p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-3">直近の正答率推移</p>
          <div class="overflow-x-auto pb-1">
            <div class="flex items-end gap-1.5 h-28" :style="{ minWidth: chartData.length * 44 + 'px' }">
              <div v-for="(s, i) in chartData" :key="i"
                class="flex flex-col items-center gap-1" style="flex: 1; min-width: 36px;">
                <span class="text-xs text-gray-400 leading-none">{{ s.accuracy }}%</span>
                <div class="w-full rounded-t-md transition-all"
                  :class="s.accuracy >= 70 ? 'bg-green-400' : s.accuracy >= 50 ? 'bg-amber-400' : 'bg-red-400'"
                  :style="{ height: Math.max(4, s.accuracy * 0.72) + 'px' }"></div>
                <span class="text-xs text-gray-300 leading-none">{{ s.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Label stats -->
        <div v-if="labelStats.length" class="bg-white rounded-2xl shadow-sm p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">カテゴリ別正答率</p>
          <p class="text-xs text-gray-300 mb-3">低い順（苦手カテゴリが上に表示されます）</p>
          <div class="space-y-3">
            <div v-for="s in labelStats" :key="s.label">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-medium text-gray-700">{{ s.label }}</span>
                <span class="text-sm font-bold"
                  :class="s.accuracy >= 70 ? 'text-green-500' : s.accuracy >= 50 ? 'text-amber-500' : 'text-red-500'">
                  {{ s.accuracy }}%
                </span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700"
                    :class="s.accuracy >= 70 ? 'bg-green-400' : s.accuracy >= 50 ? 'bg-amber-400' : 'bg-red-400'"
                    :style="{ width: s.accuracy + '%' }"></div>
                </div>
                <span class="text-xs text-gray-400 w-14 text-right">{{ s.correct }}/{{ s.total }}問</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Weak questions list -->
        <div v-if="weakQuestions.length" class="bg-white rounded-2xl shadow-sm p-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs text-gray-400 uppercase tracking-wide">苦手問題 TOP{{ weakQuestions.length }}</p>
            <button @click="exportWeakCsv"
              class="text-xs text-indigo-500 font-semibold border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors">
              📥 CSVエクスポート
            </button>
          </div>
          <div class="divide-y divide-gray-50">
            <div v-for="(q, i) in weakQuestions" :key="i" class="py-3">
              <div class="flex items-start justify-between gap-3">
                <p class="text-sm text-gray-700 flex-1 leading-snug line-clamp-2">{{ q.title }}</p>
                <span class="flex-shrink-0 text-sm font-bold"
                  :class="q.wrongRate >= 0.7 ? 'text-red-500' : 'text-amber-500'">
                  {{ Math.round(q.wrongRate * 100) }}%
                </span>
              </div>
              <div class="mt-1 flex items-center gap-2">
                <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full"
                    :class="q.wrongRate >= 0.7 ? 'bg-red-400' : 'bg-amber-400'"
                    :style="{ width: Math.round(q.wrongRate * 100) + '%' }"></div>
                </div>
                <span class="text-xs text-gray-400">{{ q.wrong }}/{{ q.attempts }}問</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Cross-device transfer -->
        <div class="bg-white rounded-2xl shadow-sm p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">端末間データ移行</p>
          <p class="text-xs text-gray-400 mb-3">JSON形式で書き出し・取り込みができます（iPhone ↔ PCなど）</p>
          <div class="flex gap-2">
            <button @click="exportHistoryJson"
              class="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-600 font-semibold text-sm py-2.5 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-colors">
              📤 書き出し
            </button>
            <label class="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 font-semibold text-sm py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer">
              📥 取り込み
              <input type="file" accept=".json" class="hidden" @change="importHistoryJson">
            </label>
          </div>
          <p v-if="importMessage" class="mt-2 text-xs font-medium text-center"
            :class="importMessage.ok ? 'text-emerald-600' : 'text-red-500'">
            {{ importMessage.text }}
          </p>
        </div>

        <!-- Session log -->
        <div class="bg-white rounded-2xl shadow-sm p-4">
          <p class="text-xs text-gray-400 uppercase tracking-wide mb-3">セッション一覧</p>
          <div v-if="!sessions.length" class="text-center py-8 text-gray-300 text-sm">
            まだ記録がありません
          </div>
          <div v-else class="divide-y divide-gray-50">
            <div v-for="s in sessions" :key="s.id"
              class="py-3 flex items-center justify-between">
              <div>
                <div class="text-sm font-medium text-gray-700">{{ formatDate(s.date) }}</div>
                <div class="text-xs text-gray-400">{{ s.totalQuestions }}問 ／ {{ modeLabel(s.mode) }}</div>
              </div>
              <div class="text-right">
                <div class="font-bold text-lg"
                  :class="s.accuracy >= 70 ? 'text-green-500' : s.accuracy >= 50 ? 'text-amber-500' : 'text-red-400'">
                  {{ s.accuracy }}%
                </div>
                <div class="text-xs text-gray-400">{{ s.correct }}/{{ s.totalQuestions }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Clear data -->
        <button @click="confirmClear"
          class="w-full text-red-400 text-sm py-3 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
          学習データをリセット
        </button>
      </div>
    </div>
  `,
  emits: ['back'],
  setup(_, { emit }) {
    const stats = ref({ totalSessions: 0, totalAnswers: 0, accuracy: 0, streak: 0, recentSessions: [] });
    const sessions = ref([]);
    const weakQuestions = ref([]);
    const labelStats = ref([]);
    const importMessage = ref(null);

    onMounted(async () => {
      await loadData();
    });

    async function loadData() {
      try {
        const [s, w, all, lb] = await Promise.all([
          DB.getStats(), DB.getWeakQuestions(), DB.getSessions(), DB.getLabelStats(),
        ]);
        stats.value = s;
        weakQuestions.value = w.slice(0, 10);
        sessions.value = all.reverse();
        labelStats.value = lb;
      } catch (_) {}
    }

    const chartData = computed(() => {
      return sessions.value.slice(0, 10).reverse().map((s, i) => ({
        accuracy: s.accuracy,
        label: String(i + 1),
      }));
    });

    async function confirmClear() {
      if (!confirm('全ての学習データを削除しますか？この操作は取り消せません。')) return;
      await DB.clearAll();
      stats.value = { totalSessions: 0, totalAnswers: 0, accuracy: 0, streak: 0, recentSessions: [] };
      sessions.value = [];
      weakQuestions.value = [];
      labelStats.value = [];
    }

    function modeLabel(mode) {
      switch (mode) {
        case 'weak': return '苦手モード';
        case 'sequential': return '順番どおり';
        case 'retry': return '間違い復習';
        case 'resumed': return '再開';
        default: return 'ランダム';
      }
    }

    async function exportWeakCsv() {
      const all = await DB.getWeakQuestions();
      if (!all.length) { alert('エクスポートできる苦手問題データがありません。'); return; }
      const header = ['問題ID', '問題タイトル', 'カテゴリ', '誤答率(%)', '試行回数', '誤答回数'];
      const rows = all.map((q) => [
        q.id,
        `"${(q.title || '').replace(/"/g, '""')}"`,
        `"${(q.label || '').replace(/"/g, '""')}"`,
        Math.round(q.wrongRate * 100),
        q.attempts,
        q.wrong,
      ]);
      const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pmp_weak_questions_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    /**
     * Export full history as JSON for cross-device import.
     * Includes all weak question stats and the question metadata needed
     * to reconstruct the history on another device.
     */
    async function exportHistoryJson() {
      const all = await DB.getWeakQuestions();
      if (!all.length) { alert('エクスポートできる苦手問題データがありません。'); return; }
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        weakStats: all.map((q) => ({
          id: q.id,
          attempts: q.attempts,
          wrong: q.wrong,
        })),
        // Include minimal question metadata so the new device can show titles
        // and use weak-mode quiz even before loading the TSV file.
        questions: all.map((q) => {
          // eslint-disable-next-line no-unused-vars
          const { wrongRate, attempts, wrong, ...qData } = q;
          return qData;
        }),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pmp_history_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    /**
     * Import history JSON exported from another device.
     * Creates synthetic answer records so weak-question stats are reconstructed.
     */
    async function importHistoryJson(e) {
      importMessage.value = null;
      const file = e.target.files[0];
      if (!file) return;
      // Reset so the same file can be selected again
      e.target.value = '';
      let data;
      try {
        data = JSON.parse(await file.text());
      } catch (_) {
        importMessage.value = { ok: false, text: 'ファイルの読み込みに失敗しました（無効なJSON）。' };
        return;
      }
      if (!data || data.version !== 1 || !Array.isArray(data.weakStats)) {
        importMessage.value = { ok: false, text: '対応していないファイル形式です。' };
        return;
      }
      try {
        // Restore question metadata (upsert — keeps existing data if already loaded)
        if (Array.isArray(data.questions) && data.questions.length) {
          await DB.mergeQuestions(data.questions);
        }
        // Build synthetic answer records from weakStats
        const answerRows = [];
        for (const stat of data.weakStats) {
          if (!stat.id || !Number.isFinite(stat.attempts) || !Number.isFinite(stat.wrong)) continue;
          const wrong = Math.min(stat.wrong, stat.attempts);
          const correct = stat.attempts - wrong;
          for (let i = 0; i < wrong; i++) {
            answerRows.push({ questionId: stat.id, isCorrect: false });
          }
          for (let i = 0; i < correct; i++) {
            answerRows.push({ questionId: stat.id, isCorrect: true });
          }
        }
        if (!answerRows.length) {
          importMessage.value = { ok: false, text: 'インポートできるデータがありませんでした。' };
          return;
        }
        // Save as one synthetic session
        const total = data.weakStats.reduce((s, q) => s + (q.attempts || 0), 0);
        const wrongTotal = data.weakStats.reduce((s, q) => s + (q.wrong || 0), 0);
        const correctTotal = total - wrongTotal;
        const sessionId = await DB.saveSession({
          totalQuestions: total,
          correct: correctTotal,
          incorrect: wrongTotal,
          accuracy: total > 0 ? Math.round((correctTotal / total) * 100) : 0,
          mode: 'imported',
        });
        await DB.saveAnswers(answerRows.map((r) => ({ ...r, sessionId })));
        await loadData();
        importMessage.value = { ok: true, text: `✅ ${data.weakStats.length}件の苦手問題履歴を取り込みました。` };
      } catch (err) {
        importMessage.value = { ok: false, text: 'インポート中にエラーが発生しました: ' + err.message };
      }
    }

    return { stats, sessions, weakQuestions, labelStats, chartData, importMessage, formatDate, confirmClear, modeLabel, exportWeakCsv, exportHistoryJson, importHistoryJson };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// GlossaryScreen
// ─────────────────────────────────────────────────────────────────────────────
const GlossaryScreen = {
  template: `
    <div class="flex flex-col min-h-screen bg-gray-50">
      <!-- Header -->
      <div class="sticky top-0 z-10 bg-gradient-to-br from-indigo-800 to-violet-700 px-5 pt-12 pb-6 text-white">
        <button @click="$emit('back')" class="text-indigo-200 text-sm font-medium mb-3">← 戻る</button>
        <h1 class="text-2xl font-bold mb-3">📖 PMP用語集</h1>
        <input v-model="query" type="text" placeholder="用語を検索..."
          class="w-full rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300">
      </div>

      <!-- Term list -->
      <div class="flex-1 px-4 py-5 space-y-5 overflow-y-auto">
        <p v-if="!filteredCategories.length" class="text-center text-gray-400 text-sm py-10">該当する用語が見つかりませんでした。</p>
        <div v-for="cat in filteredCategories" :key="cat" class="space-y-2">
          <p class="text-xs font-bold text-indigo-500 uppercase tracking-wide">{{ cat }}</p>
          <div v-for="t in byCategory(cat)" :key="t.id" class="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button @click="openId = (openId === t.id ? null : t.id)"
              class="w-full flex items-center justify-between px-4 py-3 text-left">
              <span class="font-semibold text-gray-800 text-sm">{{ t.term }}</span>
              <span class="text-gray-400 text-xs">{{ openId === t.id ? '▲' : '▼' }}</span>
            </button>
            <div v-if="openId === t.id" class="px-4 pb-4">
              <p class="text-sm text-gray-600 leading-relaxed">{{ t.definition }}</p>
              <div v-if="t.diagram" class="mt-3 bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-x-auto">
                <p class="text-xs font-bold text-gray-400 mb-2">🗺 図解</p>
                <div class="max-w-xs mx-auto" v-html="t.diagram"></div>
              </div>
              <div v-if="t.example" class="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p class="text-xs font-bold text-amber-600 mb-1">🧮 計算例</p>
                <p class="text-xs text-gray-700 leading-relaxed">{{ t.example }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  emits: ['back'],
  setup() {
    const query = ref('');
    const openId = ref(null);

    const filteredTerms = computed(() => {
      const q = query.value.trim();
      const terms = (typeof Glossary !== 'undefined') ? Glossary.all() : [];
      if (!q) return terms;
      return terms.filter((t) => t.term.includes(q) || (t.aliases || []).some((a) => a.includes(q)) || t.definition.includes(q));
    });

    const filteredCategories = computed(() => [...new Set(filteredTerms.value.map((t) => t.category))]);

    function byCategory(cat) {
      return filteredTerms.value.filter((t) => t.category === cat);
    }

    return { query, openId, filteredCategories, byCategory };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────────────────────────────────────
createApp({
  components: { HomeScreen, QuizScreen, ResultScreen, HistoryScreen, GlossaryScreen },
  template: `
    <div>
      <transition name="fade" mode="out-in">
        <HomeScreen v-if="screen === 'home'" key="home"
          :questions="questions"
          @navigate="navigate"
          @questions-loaded="onQuestionsLoaded"
          @start-quiz="onStartQuiz"
          @resume="onResumeQuiz" />

        <QuizScreen v-else-if="screen === 'quiz'" key="quiz"
          :questions="quizQuestions"
          :initialState="quizInitialState"
          :mode="quizMode"
          :seqStartIdx="quizSeqStartIdx"
          @complete="onQuizComplete"
          @abort="screen = 'home'" />

        <ResultScreen v-else-if="screen === 'result'" key="result"
          :results="quizResults"
          @home="screen = 'home'"
          @retry-wrong="retryWrong" />

        <HistoryScreen v-else-if="screen === 'history'" key="history"
          @back="screen = 'home'" />

        <GlossaryScreen v-else-if="screen === 'glossary'" key="glossary"
          @back="screen = 'home'" />
      </transition>
    </div>
  `,
  setup() {
    const screen = ref('home');
    const questions = ref([]);
    const quizQuestions = ref([]);
    const quizResults = ref([]);
    const quizMode = ref('random');
    const quizSeqStartIdx = ref(0);
    const quizInitialState = ref(null);

    function navigate(target) { screen.value = target; }

    function onQuestionsLoaded(qs) { questions.value = qs; }

    function onStartQuiz(pool, mode, seqStartIdx = 0) {
      quizQuestions.value = pool;
      quizMode.value = mode;
      quizSeqStartIdx.value = seqStartIdx;
      quizResults.value = [];
      quizInitialState.value = null;
      localStorage.removeItem('pmp-quiz-suspended');
      screen.value = 'quiz';
    }

    function onResumeQuiz(state) {
      quizQuestions.value = state.questions;
      quizMode.value = state.mode || 'resumed';
      quizSeqStartIdx.value = state.seqStartIdx || 0;
      quizResults.value = [];
      quizInitialState.value = state;
      screen.value = 'quiz';
    }

    async function onQuizComplete(results) {
      quizResults.value = results.map((r) => ({ ...r, _open: false, _openTerm: null }));

      const total = results.length;
      const correct = results.filter((r) => r.isCorrect === true).length;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      try {
        const sessionId = await DB.saveSession({
          totalQuestions: total,
          correct,
          incorrect: total - correct,
          accuracy,
          mode: quizMode.value,
          durationMs: results.reduce((s, r) => s + r.timeMs, 0),
        });

        const answers = results.map((r) => ({
          sessionId,
          questionId: r.question.id,
          isCorrect: r.isCorrect === true,
          selected: JSON.stringify(r.selected),
          timeMs: r.timeMs,
        }));
        await DB.saveAnswers(answers);
      } catch (_) {}

      // Save sequential progress
      if (quizMode.value === 'sequential') {
        try {
          const nextIdx = quizSeqStartIdx.value + results.length;
          localStorage.setItem('pmp-sequential-progress', JSON.stringify({ lastIndex: nextIdx }));
        } catch (_) {}
      }

      screen.value = 'result';
    }

    function retryWrong() {
      const wrong = quizResults.value.filter((r) => r.isCorrect !== true).map((r) => r.question);
      if (!wrong.length) return;
      quizQuestions.value = wrong.map(Parser.shuffleQuestion);
      quizMode.value = 'retry';
      quizSeqStartIdx.value = 0;
      quizResults.value = [];
      localStorage.removeItem('pmp-quiz-suspended');
      screen.value = 'quiz';
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    return { screen, questions, quizQuestions, quizResults, quizInitialState, quizMode, quizSeqStartIdx, navigate, onQuestionsLoaded, onStartQuiz, onResumeQuiz, onQuizComplete, retryWrong };
  },
}).mount('#app');
