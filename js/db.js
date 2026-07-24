/**
 * db.js — IndexedDB wrapper (raw API, no external dependency)
 * Stores: sessions, answers, questions (cache)
 */
const DB = (() => {
  const NAME = 'pmp-quiz';
  const VERSION = 1;

  let _db = null;

  function _open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('sessions')) {
          const s = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
          s.createIndex('date', 'date');
        }
        if (!db.objectStoreNames.contains('answers')) {
          const a = db.createObjectStore('answers', { keyPath: 'id', autoIncrement: true });
          a.createIndex('sessionId', 'sessionId');
          a.createIndex('questionId', 'questionId');
        }
        if (!db.objectStoreNames.contains('questions')) {
          db.createObjectStore('questions', { keyPath: 'id' });
        }
      };
    });
  }

  const _ready = _open();

  function _req(r) {
    return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }

  function _getAll(storeName) {
    return _ready.then(() => _req(_db.transaction(storeName).objectStore(storeName).getAll()));
  }

  function _getAllFromIndex(storeName, index, key) {
    return _ready.then(() =>
      _req(_db.transaction(storeName).objectStore(storeName).index(index).getAll(key))
    );
  }

  function _put(storeName, record) {
    return _ready.then(() =>
      _req(_db.transaction(storeName, 'readwrite').objectStore(storeName).put(record))
    );
  }

  function _add(storeName, record) {
    return _ready.then(() =>
      _req(_db.transaction(storeName, 'readwrite').objectStore(storeName).add(record))
    );
  }

  function _clearAndPutAll(storeName, records) {
    return _ready.then(() => new Promise((resolve, reject) => {
      const tx = _db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      records.forEach((r) => store.put(r));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    }));
  }

  function _addAll(storeName, records) {
    return _ready.then(() => new Promise((resolve, reject) => {
      const tx = _db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      records.forEach((r) => store.add(r));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    }));
  }

  // ---- Public API ----

  return {
    /** Save a quiz session and return its auto-generated id */
    async saveSession(data) {
      return _add('sessions', { ...data, date: new Date().toISOString() });
    },

    /** Get all sessions, newest first */
    async getSessions() {
      const all = await _getAll('sessions');
      return all.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    /** Save an array of answer records (each must include sessionId, questionId, isCorrect) */
    async saveAnswers(answers) {
      return _addAll('answers', answers);
    },

    /** Get answers for a specific session */
    async getAnswersBySession(sessionId) {
      return _getAllFromIndex('answers', 'sessionId', sessionId);
    },

    /** Replace all cached questions */
    async cacheQuestions(questions) {
      return _clearAndPutAll('questions', questions);
    },

    /** Retrieve all cached questions */
    async getCachedQuestions() {
      return _getAll('questions');
    },

    /** Aggregate stats across all sessions/answers */
    async getStats() {
      const [sessions, answers] = await Promise.all([_getAll('sessions'), _getAll('answers')]);
      const total = answers.length;
      const correct = answers.filter((a) => a.isCorrect).length;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      // Consecutive-day streak
      const dates = [...new Set(sessions.map((s) => s.date.slice(0, 10)))].sort().reverse();
      let streak = 0;
      const today = new Date();
      for (const d of dates) {
        const expected = new Date(today);
        expected.setDate(today.getDate() - streak);
        if (d === expected.toISOString().slice(0, 10)) {
          streak++;
        } else {
          break;
        }
      }

      return {
        totalSessions: sessions.length,
        totalAnswers: total,
        correctAnswers: correct,
        accuracy,
        streak,
        recentSessions: sessions.slice(0, 5),
      };
    },

    /**
     * Return cached questions ordered by incorrect rate (worst first).
     * Only includes questions that have been answered at least once incorrectly.
     */
    async getWeakQuestions() {
      const [answers, allQ] = await Promise.all([_getAll('answers'), _getAll('questions')]);
      const qMap = {};
      for (const q of allQ) qMap[q.id] = q;

      const stats = {};
      for (const a of answers) {
        if (!stats[a.questionId]) stats[a.questionId] = { total: 0, wrong: 0 };
        stats[a.questionId].total++;
        if (!a.isCorrect) stats[a.questionId].wrong++;
      }

      return Object.entries(stats)
        .filter(([id, s]) => s.wrong > 0 && qMap[id])
        .map(([id, s]) => ({
          ...qMap[id],
          wrongRate: s.wrong / s.total,
          attempts: s.total,
          wrong: s.wrong,
        }))
        .sort((a, b) => b.wrongRate - a.wrongRate);
    },

    /**
     * Compute per-label accuracy stats from all answers.
     * Uses q.label if cached; falls back to Parser.autoLabel at runtime.
     * Returns array sorted by accuracy ascending (weakest label first).
     */
    async getLabelStats() {
      const [answers, allQ] = await Promise.all([_getAll('answers'), _getAll('questions')]);
      const qMap = {};
      for (const q of allQ) qMap[q.id] = q;

      function resolveLabel(q) {
        if (q.label) return q.label;
        // Fallback for questions cached before labeling was introduced
        if (typeof Parser !== 'undefined' && Parser.autoLabel) return Parser.autoLabel(q.title || '');
        return 'プロジェクト管理（一般）';
      }

      const stats = {};
      for (const a of answers) {
        const q = qMap[a.questionId];
        if (!q) continue;
        const lbl = resolveLabel(q);
        if (!stats[lbl]) stats[lbl] = { total: 0, correct: 0 };
        stats[lbl].total++;
        if (a.isCorrect) stats[lbl].correct++;
      }

      return Object.entries(stats)
        .map(([label, s]) => ({
          label,
          total: s.total,
          correct: s.correct,
          accuracy: Math.round((s.correct / s.total) * 100),
        }))
        .sort((a, b) => a.accuracy - b.accuracy);
    },

    /** Delete all data (for reset) */
    async clearAll() {
      await Promise.all([
        _clearAndPutAll('sessions', []),
        _clearAndPutAll('answers', []),
        _clearAndPutAll('questions', []),
      ]);
    },
  };
})();
