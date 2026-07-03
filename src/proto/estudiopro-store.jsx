/* EstudioPro — Store compartido reactivo.
   Producción: persiste en IndexedDB (Dexie) y usa SM-2 real para el repaso espaciado. */
import { epSaveSnapshot } from "../db";
import { sm2Grade, sm2Nivel, sm2Due, sm2Preview, dueForecast } from "../sm2";

(function () {
  const listeners = new Set();
  // --- persistencia local: IndexedDB con debounce ---
  const PERSIST_KEYS = ["questions", "cardSrs", "sessions", "lastResult", "plan", "notes", "resume", "userCats", "userMats", "userOrds", "unlocked", "activity", "timeLog", "reports", "simHistory", "journal", "glossary"];
  const save = () => {
    try {
      const snap = {};
      PERSIST_KEYS.forEach((k) => { snap[k] = store[k]; });
      epSaveSnapshot(snap);
    } catch (e) { /* almacenamiento no disponible: la app sigue en memoria */ }
  };
  const emit = () => { save(); listeners.forEach((l) => l()); };

  // seed desde el banco de preguntas (única fuente: cada pregunta es también una tarjeta)
  const seedQuestions = () => (window.QUESTION_BANK || []).map((q, i) => ({ ...q, _id: q.id || ("Q" + i) }));
  // reverso de la tarjeta = texto de la respuesta correcta de la pregunta
  const cardBack = (q) => {
    if (q.options && typeof q.answer === "number") return q.options[q.answer] || "";
    if (typeof q.answer === "string") return q.answer;
    return "";
  };
  // dificultad semilla → nivel de dominio inicial de la tarjeta (independiente del estado de la pregunta)
  const seedNivel = { "fácil": "dominado", "medio": "medio", "difícil": "nuevo" };

  const store = {
    questions: [],
    cardSrs: {},     // estado SRS de tarjeta por id de pregunta: { [qId]: { nivel, lastGrade, studied } } — INDEPENDIENTE del status de la pregunta
    sessions: [
      { subject: "Legislación Militar", label: "Código de Justicia Militar · examen", n: 20, time: "14:32", score: 8.4, when: "hoy", state: "done" },
      { subject: "Legislación Militar", label: "Ley de Disciplina · práctica", n: 15, time: "09:10", score: 9.3, when: "ayer", state: "done" },
      { subject: "Operaciones Militares", label: "Op. Conjuntas (falladas)", n: 12, time: "en pausa", score: null, when: "ayer", state: "pause" },
      { subject: "Normatividad Gubernamental", label: "Simulacro general", n: 50, time: "38:04", score: 7.2, when: "3 d", state: "done" },
      { subject: "Aspecto Técnico", label: "Ciberseguridad · práctica", n: 18, time: "12:45", score: 6.1, when: "5 d", state: "done" },
      { subject: "Adiestramiento y Mando Militar", label: "Mando y Liderazgo · examen", n: 25, time: "19:20", score: 8.8, when: "1 sem", state: "done" },
    ],
    lastResult: null, // { subject, total, correct, wrong, time, byChapter, missed }
    plan: { dailyGoal: 30, doneToday: 18, streak: 12, examDate: "2026-07-27", weeklyGoal: 5, freezes: 2, frozenDates: [] },
    notes: {},      // { "clave de capítulo": "texto de apuntes" }
    nav: {},        // contexto de navegación: { subject, ord, loc, mode, filter, focusId }
    resume: { subject: "Legislación Militar", label: "Código de Justicia Militar — Libro Primero", at: 7, total: 20, missed: 18 },
    activity: null, // heatmap de actividad (se genera al primer uso)
    unlocked: {},   // logros desbloqueados manualmente / por evento
    // taxonomía añadida por el usuario (se suma a la semilla fija en las cuadrículas)
    userCats: [],   // { id, name, desc, color }
    userMats: [],   // { id, name, desc, color }
    userOrds: {},   // { [subject]: [{ id, name, desc }] }
    // registro de tiempo real de estudio (Pomodoro / sesiones cronometradas)
    timeLog: [
      { id: "t1", subject: "Legislación Militar", label: "Código de Justicia Militar", seconds: 1500, date: "2026-06-29", hour: 7 },
      { id: "t2", subject: "Operaciones Militares", label: "Op. Conjuntas", seconds: 1500, date: "2026-06-29", hour: 20 },
      { id: "t3", subject: "Legislación Militar", label: "Ley de Disciplina", seconds: 900, date: "2026-06-30", hour: 8 },
      { id: "t4", subject: "Normatividad Gubernamental", label: "Repaso general", seconds: 1500, date: "2026-06-30", hour: 21 },
      { id: "t5", subject: "Aspecto Técnico", label: "Ciberseguridad", seconds: 1200, date: "2026-06-30", hour: 7 },
    ],
    // reportes de errores/desactualización en reactivos del banco
    reports: [],    // { id, qId, subject, reason, note, when, status }
    // bitácora de estudio (diario reflexivo)
    journal: [],    // { id, date, mood, text }
    // glosario de términos del temario (semilla + añadidos del usuario)
    glossary: [
      { id: "g1", term: "Insubordinación", subject: "Legislación Militar", def: "Delito del militar que falta al respeto, desobedece o agrede a un superior en actos del servicio o con motivo de ellos. Grados según la gravedad y si hay violencia.", ref: "CJM · Libro Segundo" },
      { id: "g2", term: "Delito", subject: "Legislación Militar", def: "Acto u omisión sancionado por las leyes penales militares. Se distingue de la falta por su mayor gravedad y por la vía de sanción (consejo de guerra vs. correctivo disciplinario).", ref: "CJM · Libro Primero" },
      { id: "g3", term: "Falta", subject: "Legislación Militar", def: "Infracción a la disciplina militar de menor entidad que el delito; se corrige por vía disciplinaria (amonestación, arresto), no penal.", ref: "Ley de Disciplina del Ejército y F.A.M." },
      { id: "g4", term: "Correctivo disciplinario", subject: "Legislación Militar", def: "Sanción por faltas a la disciplina: amonestación, arresto y cambio de cuerpo. No tiene carácter penal.", ref: "Ley de Disciplina · Art. 24" },
      { id: "g5", term: "Operación conjunta", subject: "Operaciones Militares", def: "Operación en la que participan dos o más Fuerzas Armadas (Ejército, Fuerza Aérea, Armada) bajo un mando unificado.", ref: "Doctrina de Operaciones" },
      { id: "g6", term: "Mando", subject: "Adiestramiento y Mando Militar", def: "Autoridad que un militar ejerce legalmente sobre subordinados por razón de empleo o cargo; conlleva responsabilidad por las órdenes y su cumplimiento.", ref: "Ley Orgánica del Ejército" },
      { id: "g7", term: "Situación del militar", subject: "Legislación Militar", def: "Estado administrativo del militar: activo, reserva o retiro. Determina obligaciones, derechos y percepciones.", ref: "Ley del ISSFAM" },
    ],
    // histórico de simulacros para la gráfica de evolución (global + por materia, sobre 10)
    simHistory: [
      { id: "s1", date: "2026-05-29", global: 5.8, byS: { "Legislación Militar": 6.4, "Operaciones Militares": 5.2, "Normatividad Gubernamental": 5.9, "Aspecto Administrativo": 4.8, "Adiestramiento y Mando Militar": 6.1, "Aspecto Técnico": 5.0 } },
      { id: "s2", date: "2026-06-05", global: 6.3, byS: { "Legislación Militar": 7.0, "Operaciones Militares": 5.8, "Normatividad Gubernamental": 6.2, "Aspecto Administrativo": 5.4, "Adiestramiento y Mando Militar": 6.6, "Aspecto Técnico": 5.5 } },
      { id: "s3", date: "2026-06-12", global: 6.9, byS: { "Legislación Militar": 7.6, "Operaciones Militares": 6.4, "Normatividad Gubernamental": 6.8, "Aspecto Administrativo": 6.0, "Adiestramiento y Mando Militar": 7.1, "Aspecto Técnico": 6.1 } },
      { id: "s4", date: "2026-06-19", global: 7.2, byS: { "Legislación Militar": 7.9, "Operaciones Militares": 6.7, "Normatividad Gubernamental": 7.1, "Aspecto Administrativo": 6.3, "Adiestramiento y Mando Militar": 7.4, "Aspecto Técnico": 6.4 } },
      { id: "s5", date: "2026-06-26", global: 7.8, byS: { "Legislación Militar": 8.4, "Operaciones Militares": 7.2, "Normatividad Gubernamental": 7.6, "Aspecto Administrativo": 6.9, "Adiestramiento y Mando Militar": 8.0, "Aspecto Técnico": 7.0 } },
    ],
  };

  // store.cards es DERIVADO del banco: cada pregunta genera una tarjeta (frente=enunciado, reverso=respuesta correcta)
  Object.defineProperty(store, "cards", {
    enumerable: true, configurable: true,
    get() {
      return store.questions.map((q) => {
        const srs = store.cardSrs[q._id] || {};
        return {
          _id: q._id, qId: q._id, subject: q.subject,
          front: q.q, back: cardBack(q),
          tags: q.tags || [], ord: q.ord || "", loc: q.loc || "", explain: q.explain || "",
          type: q.type, options: q.options, answer: q.answer,
          nivel: srs.nivel || "nuevo", lastGrade: srs.lastGrade, studied: srs.studied || 0,
          sm2: srs.sm2, due: srs.sm2 ? srs.sm2.due : null, interval: srs.sm2 ? srs.sm2.interval : 0,
          isDue: sm2Due(srs.sm2),
        };
      });
    },
  });

  let seeded = false;
  // hidrata desde localStorage si hay una sesión guardada (evita re-sembrar sobre tus datos)
  (function loadSaved() {
    try {
      const data = window.__epSnapshot;
      if (!data) return;
      PERSIST_KEYS.forEach((k) => { if (data[k] !== undefined) store[k] = data[k]; });
      seeded = true;
    } catch (e) { /* datos corruptos: ignora y re-siembra */ }
  })();
  const ensureSeed = () => {
    if (seeded) return;
    if (window.QUESTION_BANK) {
      store.questions = seedQuestions();
      // nivel de tarjeta inicial a partir de la dificultad semilla (sólo para datos de ejemplo)
      const srs = {};
      store.questions.forEach((q) => { srs[q._id] = { nivel: seedNivel[q.dif] || "nuevo", studied: 0 }; });
      store.cardSrs = srs;
    }
    seeded = store.questions.length > 0;
  };

  window.EPStore = {
    get: () => { ensureSeed(); return store; },
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    addQuestion: (q) => {
      ensureSeed();
      store.questions = [{ _id: "Q" + Date.now(), status: "nuevo", tags: [], ...q }, ...store.questions];
      emit();
    },
    // crear una "tarjeta" ahora crea una PREGUNTA en el banco (frente→enunciado, reverso→respuesta).
    // Como las preguntas escritas a mano no traen opciones, se guardan como tipo Abierta (AB).
    addCard: (c) => {
      ensureSeed();
      const id = "Q" + Date.now();
      const q = { _id: id, subject: c.subject, q: c.front, answer: c.back || "", type: "AB", dif: "medio", status: "nuevo", tags: c.tags || [], ord: c.ord || "", loc: c.loc || "", explain: "" };
      store.questions = [q, ...store.questions];
      store.cardSrs = { ...store.cardSrs, [id]: { nivel: c.nivel || "nuevo", studied: 0 } };
      emit();
      return id;
    },
    // importación masiva con detección de duplicados (mismo enunciado normalizado)
    addQuestions: (list) => {
      ensureSeed();
      const norm = (t) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
      // clave = enunciado + respuesta correcta (una misma pregunta puede repetirse con distinta respuesta en series de enumeración)
      const ansTxt = (q) => (q.options && typeof q.answer === "number") ? (q.options[q.answer] || "") : String(q.answer || "");
      const key = (q) => norm(q.q) + "::" + norm(ansTxt(q));
      const seen = new Set(store.questions.map(key));
      const stamp = Date.now();
      const toAdd = [];
      let added = 0, skipped = 0;
      (list || []).forEach((q, i) => {
        const k = norm(q.q) ? key(q) : "";
        if (!k || seen.has(k)) { skipped++; return; }
        seen.add(k);
        toAdd.push({ _id: "Q" + stamp + "-" + i, status: "nuevo", tags: [], ...q });
        added++;
      });
      if (toAdd.length) store.questions = [...toAdd, ...store.questions];
      emit();
      return { added, skipped };
    },
    deleteQuestion: (id) => { store.questions = store.questions.filter((q) => q._id !== id); const cs = { ...store.cardSrs }; delete cs[id]; store.cardSrs = cs; emit(); },
    updateQuestion: (id, patch) => { store.questions = store.questions.map((q) => q._id === id ? { ...q, ...patch } : q); emit(); },
    // editar una tarjeta edita la pregunta de origen (frente→enunciado, reverso→respuesta) + su nivel SRS
    updateCard: (id, patch) => {
      const qp = {};
      if (patch.front !== undefined) qp.q = patch.front;
      if (patch.back !== undefined) qp.answer = patch.back;
      if (patch.subject !== undefined) qp.subject = patch.subject;
      if (patch.tags !== undefined) qp.tags = patch.tags;
      if (Object.keys(qp).length) store.questions = store.questions.map((q) => q._id === id ? { ...q, ...qp } : q);
      if (patch.nivel !== undefined) store.cardSrs = { ...store.cardSrs, [id]: { ...(store.cardSrs[id] || {}), nivel: patch.nivel } };
      emit();
    },
    toggleImportant: (id) => {
      store.questions = store.questions.map((q) => q._id === id ? { ...q, status: q.status === "imp" ? "nuevo" : "imp" } : q);
      emit();
    },
    // acciones masivas sobre el banco
    markImportant: (ids, val) => {
      const set = new Set(ids);
      store.questions = store.questions.map((q) => set.has(q._id)
        ? { ...q, status: val ? "imp" : (q.status === "imp" ? "nuevo" : q.status) }
        : q);
      emit();
    },
    deleteQuestions: (ids) => { const set = new Set(ids); store.questions = store.questions.filter((q) => !set.has(q._id)); const cs = { ...store.cardSrs }; ids.forEach((id) => delete cs[id]); store.cardSrs = cs; emit(); },
    duplicateQuestion: (id) => {
      ensureSeed();
      const i = store.questions.findIndex((q) => q._id === id);
      if (i < 0) return;
      const src = store.questions[i];
      const copy = { ...src, _id: "Q" + Date.now(), q: src.q + " (copia)", status: "nuevo" };
      store.questions = [...store.questions.slice(0, i + 1), copy, ...store.questions.slice(i + 1)];
      emit();
    },
    // resultado de un cuestionario → marca dominadas (ok) y falladas (fall) en el banco real
    applyQuizResults: (items) => {
      ensureSeed();
      const map = {}; items.forEach((it) => { map[it.id] = it; });
      store.questions = store.questions.map((q) => {
        const it = map[q._id]; if (!it) return q;
        if (it.correct) return { ...q, status: q.status === "imp" ? "imp" : "ok" };
        return { ...q, status: "fall" };
      });
      emit();
    },
    // eliminar una tarjeta elimina la pregunta de origen (fuente única)
    deleteCard: (id) => {
      store.questions = store.questions.filter((q) => q._id !== id);
      const cs = { ...store.cardSrs }; delete cs[id]; store.cardSrs = cs;
      emit();
    },
    // calificación SRS de una tarjeta → ajusta SU nivel de dominio (independiente del status de la pregunta) y suma a la meta del día
    gradeCard: (id, grado) => {
      // SM-2 real — grados: "otra" (Otra vez) · "dificil" · "medio" (Bien) · "facil"
      ensureSeed();
      const cur = store.cardSrs[id] || { nivel: "nuevo", studied: 0 };
      const next = sm2Grade(cur.sm2, grado);
      store.cardSrs = { ...store.cardSrs, [id]: { ...cur, sm2: next, nivel: sm2Nivel(next), lastGrade: grado, studied: (cur.studied || 0) + 1 } };
      store.plan = { ...store.plan, doneToday: store.plan.doneToday + 1 };
      emit();
    },
    setLastResult: (r) => { store.lastResult = r; emit(); },
    addSession: (s) => { store.sessions = [s, ...store.sessions]; emit(); },
    bumpToday: (k) => { store.plan = { ...store.plan, doneToday: store.plan.doneToday + (k || 1) }; emit(); },
    setNav: (n) => { store.nav = n || {}; },
    getNav: () => { const n = store.nav; return n; },
    setNote: (key, text) => { store.notes = { ...store.notes, [key]: text }; emit(); },
    setResume: (r) => { store.resume = r; emit(); },
    // reemplaza los días del plan (editor con arrastrar y soltar)
    updatePlan: (dias) => { store.plan = { ...store.plan, dias, generado: true }; emit(); },
    setPlanDayState: (fecha, estado) => { store.plan = { ...store.plan, dias: (store.plan.dias || []).map((d) => d.fecha === fecha ? { ...d, estado } : d) }; emit(); },
    clearResume: () => { store.resume = null; emit(); },
    setGoal: (g) => { store.plan = { ...store.plan, dailyGoal: g }; emit(); },
    // --- configuración del aspirante ---
    setExamDate: (d) => { store.plan = { ...store.plan, examDate: d }; emit(); },
    setNombre: (n) => { store.plan = { ...store.plan, nombre: n }; emit(); },
    setDias: (dias) => { store.plan = { ...store.plan, diasDisponibles: dias }; emit(); },
    // --- bitácora de estudio ---
    addJournal: (e) => { store.journal = [{ id: "j" + Date.now(), date: new Date().toISOString().slice(0, 10), ...e }, ...store.journal]; emit(); },
    deleteJournal: (id) => { store.journal = store.journal.filter((j) => j.id !== id); emit(); },
    // --- glosario ---
    addGlossary: (e) => { store.glossary = [{ id: "g" + Date.now(), ...e }, ...store.glossary]; emit(); },
    deleteGlossary: (id) => { store.glossary = store.glossary.filter((g) => g.id !== id); emit(); },
    // --- metas semanales y congelar racha ---
    setWeeklyGoal: (n) => { store.plan = { ...store.plan, weeklyGoal: n }; emit(); },
    useFreeze: () => {
      ensureSeed();
      const hoy = new Date().toISOString().slice(0, 10);
      const fr = store.plan.frozenDates || [];
      if ((store.plan.freezes || 0) <= 0 || fr.includes(hoy)) return false;
      store.plan = { ...store.plan, freezes: store.plan.freezes - 1, frozenDates: [...fr, hoy] };
      emit(); return true;
    },
    addFreeze: () => { store.plan = { ...store.plan, freezes: (store.plan.freezes || 0) + 1 }; emit(); },
    // --- taxonomía editable (categorías / materias / ordenamientos) ---
    addCategory: (cat) => { store.userCats = [...store.userCats, { id: "cat" + Date.now(), color: "#2F73CE", ...cat }]; emit(); },
    addSubject: (mat) => { store.userMats = [...store.userMats, { id: "mat" + Date.now(), color: "#2A8A5E", ...mat }]; emit(); },
    addOrdenamiento: (subject, ord) => {
      const list = store.userOrds[subject] || [];
      store.userOrds = { ...store.userOrds, [subject]: [...list, { id: "ord" + Date.now(), ...ord }] };
      emit();
    },
    // exporta el estado completo a un archivo JSON descargable
    exportJSON: () => {
      ensureSeed();
      const data = {};
      PERSIST_KEYS.forEach((k) => { data[k] = store[k]; });
      const payload = { app: "EstudioPro", version: "1.0", exportedAt: new Date().toISOString(), data };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url; a.download = "estudiopro-respaldo-" + stamp + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return store.questions.length + store.cards.length;
    },
    // --- registro de tiempo real ---
    logTime: (entry) => {
      ensureSeed();
      const date = new Date().toISOString().slice(0, 10);
      store.timeLog = [{ id: "t" + Date.now(), date, hour: new Date().getHours(), ...entry }, ...store.timeLog];
      // el tiempo de estudio también avanza la meta del día (1 punto por cada 5 min)
      const pts = Math.max(1, Math.round((entry.seconds || 0) / 300));
      store.plan = { ...store.plan, doneToday: store.plan.doneToday + pts };
      emit();
    },
    deleteTime: (id) => { store.timeLog = store.timeLog.filter((t) => t.id !== id); emit(); },
    // --- reportes de errores del banco ---
    reportQuestion: (qId, data) => {
      ensureSeed();
      const q = store.questions.find((x) => x._id === qId) || {};
      store.reports = [{ id: "r" + Date.now(), qId, subject: q.subject || data.subject || "", reason: data.reason || "otro", note: data.note || "", when: new Date().toISOString(), status: "abierto" }, ...store.reports];
      emit();
    },
    resolveReport: (id) => { store.reports = store.reports.map((r) => r.id === id ? { ...r, status: r.status === "resuelto" ? "abierto" : "resuelto" } : r); emit(); },
    deleteReport: (id) => { store.reports = store.reports.filter((r) => r.id !== id); emit(); },
    // --- simulacros: registrar resultado en el histórico ---
    addSimResult: (res) => {
      ensureSeed();
      store.simHistory = [...store.simHistory, { id: "s" + Date.now(), date: new Date().toISOString().slice(0, 10), ...res }];
      emit();
    },
    // --- importar respaldo JSON (reemplaza el estado local) ---
    importJSON: (payload) => {
      try {
        const d = payload && payload.data ? payload.data : payload;
        if (!d) return { ok: false, msg: "Archivo vacío o inválido" };
        if (Array.isArray(d.questions)) store.questions = d.questions.map((q, i) => ({ ...q, _id: q._id || q.id || ("Q" + i) }));
        PERSIST_KEYS.forEach((k) => {
          if (k === "questions" || k === "plan") return;
          if (d[k] !== undefined) store[k] = d[k];
        });
        if (d.plan) store.plan = { ...store.plan, ...d.plan };
        seeded = true;
        emit();
        return { ok: true, n: (store.questions || []).length };
      } catch (e) { return { ok: false, msg: "No se pudo leer el archivo" }; }
    },
    reset: () => { store.questions = []; store.cardSrs = {}; store.sessions = []; store.lastResult = null; store.notes = {}; store.resume = null; store.userCats = []; store.userMats = []; store.userOrds = {}; store.timeLog = []; store.reports = []; store.plan = { ...store.plan, doneToday: 0 }; seeded = true; emit(); },
  };

  // hook
  window.useStore = function useStore() {
    const [, force] = React.useReducer((x) => x + 1, 0);
    React.useEffect(() => window.EPStore.subscribe(force), []);
    return window.EPStore.get();
  };

  // util: días hasta el examen
  window.daysToExam = function () {
    const s = window.EPStore.get();
    const exam = new Date(s.plan.examDate + "T00:00:00");
    const now = new Date();
    return Math.max(0, Math.ceil((exam - now) / 86400000));
  };

  // logros calculados del progreso real (+ desbloqueos manuales)
  window.computeAchievements = function () {
    const s = window.EPStore.get();
    const done = s.sessions.filter((x) => x.state === "done");
    const best = done.reduce((m, x) => Math.max(m, x.score || 0), 0);
    const subjectsStudied = new Set(done.map((x) => x.subject)).size;
    return [
      ["🔥", "Racha de 7 días", s.plan.streak >= 7],
      ["🎯", "Primer 10 en un simulacro", best >= 10 || !!s.unlocked.ten],
      ["📚", "100 preguntas en el banco", s.questions.length >= 100],
      ["⚖️", "5+ cuestionarios completados", done.length >= 5],
      ["🛡️", "Todas las materias iniciadas", subjectsStudied >= 6],
      ["🏅", "Meta diaria cumplida", s.plan.doneToday >= s.plan.dailyGoal],
    ];
  };

  // genera un plan de estudio (días) desde hoy hasta el examen
  window.generarPlan = function () {
    const subjects = Object.keys(window.SUBJECT_COLORS || {});
    const detail = window.MATERIA_DETAIL || {};
    const capsBySubject = {};
    subjects.forEach((s) => { capsBySubject[s] = []; });
    Object.keys(detail).forEach((ord) => {
      const d = detail[ord];
      if (!capsBySubject[d.cat]) return;
      d.titulos.forEach((t) => capsBySubject[d.cat].push({ ord, titulo: t.n }));
    });
    const queue = [];
    let added = true, r = 0;
    while (added) { added = false; subjects.forEach((s) => { if (capsBySubject[s][r]) { queue.push({ subject: s, ...capsBySubject[s][r] }); added = true; } }); r++; }
    const out = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const exam = new Date(store.plan.examDate + "T00:00:00");
    let cur = new Date(today), qi = 0, guard = 0;
    const fmt = (d) => d.toISOString().slice(0, 10);
    while (cur <= exam && guard < 400) {
      guard++;
      const dow = cur.getDay();
      if (dow === 0) { cur.setDate(cur.getDate() + 1); continue; }
      if (dow === 5) {
        out.push({ fecha: fmt(cur), tipo: "simulacro", subject: null, ord: "Simulacro general", titulo: "200 preguntas · 2 bloques", estado: "pendiente", min: 255, npreg: 200 });
      } else if (qi < queue.length) {
        const c = queue[qi++];
        const estado = cur < today ? "hecho" : "pendiente";
        out.push({ fecha: fmt(cur), tipo: "estudio", subject: c.subject, ord: c.ord, titulo: c.titulo, estado, min: 45, npreg: 12 });
      } else {
        out.push({ fecha: fmt(cur), tipo: "repaso", subject: subjects[qi % subjects.length], ord: "Repaso intensivo", titulo: "Falladas e importantes", estado: "pendiente", min: 40, npreg: 20 });
        qi++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    store.plan = { ...store.plan, dias: out, generado: true };
    emit();
    return out;
  };

  // día del plan correspondiente a hoy
  window.todayPlan = function () {
    const s = window.EPStore.get();
    if (!s.plan.dias) return null;
    const today = new Date().toISOString().slice(0, 10);
    return s.plan.dias.find((d) => d.fecha === today) || s.plan.dias.find((d) => d.estado !== "hecho") || null;
  };

  // vista previa SM-2 por tarjeta: texto del próximo intervalo por calificación
  window.srsPreview = function (cardId) {
    const srs = store.cardSrs[cardId] || {};
    return sm2Preview(srs.sm2);
  };
  // compat: texto legible de próxima revisión (SM-2 sobre estado sintético)
  window.srsNext = function (grado, nivelActual) {
    const synth = { nuevo: undefined, medio: { reps: 2, ef: 2.5, interval: 6, due: "", lapses: 0 }, dominado: { reps: 4, ef: 2.5, interval: 25, due: "", lapses: 0 } }[nivelActual || "nuevo"];
    const g = grado === "dificil" ? "otra" : grado;
    const n = sm2Grade(synth, g);
    if (n.interval <= 0) return { dias: 0, txt: "hoy (10 min)" };
    return { dias: n.interval, txt: "en " + n.interval + " día(s)" };
  };

  // tarjetas que vencen hoy (repaso espaciado real)
  window.dueCards = function (subject) {
    const s = window.EPStore.get();
    return s.cards.filter((c) => (!subject || c.subject === subject) && sm2Due((s.cardSrs[c._id] || {}).sm2));
  };
  // pronóstico de carga: repasos que vencen en los próximos 7 días
  window.dueForecast7 = function () {
    const s = window.EPStore.get();
    return dueForecast(s.cards.map((c) => (s.cardSrs[c._id] || {}).sm2), 7);
  };

  // ===== Inteligencia de estudio =====
  // dominio por materia (0-100) a partir de avance representativo + estado de preguntas
  window.intel = function () {
    const s = window.EPStore.get();
    const subjects = Object.keys(window.SUBJECT_COLORS || {});
    const baseAvance = { "Legislación Militar": 24, "Operaciones Militares": 12, "Normatividad Gubernamental": 18, "Aspecto Administrativo": 8, "Adiestramiento y Mando Militar": 15, "Aspecto Técnico": 5 };
    const porMateria = subjects.map((subj) => {
      const qs = s.questions.filter((q) => q.subject === subj);
      const fall = qs.filter((q) => q.status === "fall").length;
      const ok = qs.filter((q) => q.status === "ok").length;
      const dominio = Math.max(2, Math.min(98, (baseAvance[subj] || 10) + ok * 3 - fall * 4));
      const dias = { "Aspecto Técnico": 6, "Aspecto Administrativo": 5, "Operaciones Militares": 4, "Adiestramiento y Mando Militar": 3, "Normatividad Gubernamental": 2, "Legislación Militar": 1 }[subj] || 3;
      return { subj, dominio, fall, ok, dias };
    });
    // predicción de nota = promedio ponderado de dominio (peso similar) escalado a 10
    const pesos = { "Legislación Militar": 40, "Operaciones Militares": 35, "Normatividad Gubernamental": 35, "Aspecto Administrativo": 25, "Adiestramiento y Mando Militar": 30, "Aspecto Técnico": 35 };
    const totalPeso = Object.values(pesos).reduce((a, b) => a + b, 0);
    const nota = +(porMateria.reduce((a, m) => a + m.dominio * (pesos[m.subj] || 30), 0) / totalPeso / 10).toFixed(1);
    const debil = [...porMateria].sort((a, b) => a.dominio - b.dominio)[0];
    const fuerte = [...porMateria].sort((a, b) => b.dominio - a.dominio)[0];
    const olvidado = [...porMateria].sort((a, b) => b.dias - a.dias)[0];
    const totalFall = porMateria.reduce((a, m) => a + m.fall, 0);
    // recomendaciones priorizadas
    const recos = [];
    if (debil) recos.push({ tipo: "debil", subj: debil.subj, txt: "Tu punto más débil es " + debil.subj + " (" + debil.dominio + "% de dominio). Dedícale las próximas sesiones." });
    if (totalFall > 0) recos.push({ tipo: "fall", subj: debil.subj, txt: "Tienes " + totalFall + " preguntas falladas en cola. Repásalas antes del próximo simulacro." });
    if (olvidado && olvidado.dias >= 5) recos.push({ tipo: "olvido", subj: olvidado.subj, txt: olvidado.subj + " lleva " + olvidado.dias + " días sin repasar. Refréscalo para no perder retención." });
    if (nota < 6) recos.push({ tipo: "nota", subj: debil.subj, txt: "Tu nota proyectada está por debajo de 6. Aumenta tu meta diaria y prioriza áreas débiles." });
    else if (nota >= 8) recos.push({ tipo: "nota", subj: fuerte.subj, txt: "Vas bien (proyección " + nota + "/10). Mantén el ritmo y refuerza tus áreas débiles para asegurar." });
    return { porMateria, nota, debil, fuerte, olvidado, totalFall, recos };
  };

  // ===== Índice de preparación (¿estoy listo para el examen?) =====
  window.readiness = function () {
    const s = window.EPStore.get();
    const x = window.intel();
    const dias = window.daysToExam();
    const dominioProm = Math.round(x.porMateria.reduce((a, m) => a + m.dominio, 0) / x.porMateria.length);
    // tiempo estudiado últimos 7 días (min) y consistencia
    const hoy = new Date();
    const hace7 = new Date(hoy.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const min7 = Math.round((s.timeLog || []).filter((t) => t.date >= hace7).reduce((a, t) => a + (t.seconds || 0), 0) / 60);
    const diasActivos = new Set((s.timeLog || []).filter((t) => t.date >= hace7).map((t) => t.date)).size;
    // materias por debajo del umbral aprobatorio (60% dominio)
    const enRiesgo = x.porMateria.filter((m) => m.dominio < 60);
    // probabilidad = dominio (60%) + ritmo/consistencia (25%) + tendencia de simulacros (15%)
    const sim = s.simHistory || [];
    const tendencia = sim.length >= 2 ? Math.max(0, Math.min(100, (sim[sim.length - 1].global - sim[0].global) * 20 + 50)) : 50;
    const ritmo = Math.min(100, (diasActivos / 6) * 100);
    let prob = Math.round(dominioProm * 0.6 + ritmo * 0.25 + tendencia * 0.15);
    prob = Math.max(3, Math.min(97, prob));
    const nivel = prob >= 75 ? "listo" : prob >= 55 ? "en-camino" : prob >= 35 ? "atención" : "riesgo";
    const nivelTxt = { "listo": "Vas listo", "en-camino": "En buen camino", "atención": "Requiere atención", "riesgo": "En riesgo" }[nivel];
    // meta de ritmo: capítulos/dominio restante entre días
    const faltaDominio = Math.max(0, 100 - dominioProm);
    const ritmoNecesario = dias > 0 ? +(faltaDominio / dias).toFixed(1) : faltaDominio;
    return { prob, nivel, nivelTxt, dominioProm, dias, min7, diasActivos, enRiesgo, tendencia: sim.length >= 2 ? +(sim[sim.length - 1].global - sim[0].global).toFixed(1) : 0, notaProy: x.nota, ritmoNecesario, porMateria: x.porMateria };
  };

  // ===== XP y niveles (gamificación sobre el progreso real) =====
  window.studyXP = function () {
    const s = window.EPStore.get();
    const studied = Object.values(s.cardSrs || {}).reduce((a, c) => a + (c.studied || 0), 0);
    const dominadas = (s.cards || []).filter((c) => c.nivel === "dominado").length;
    const sesiones = (s.sessions || []).filter((x) => x.state === "done").length;
    const minutos = Math.round((s.timeLog || []).reduce((a, t) => a + (t.seconds || 0), 0) / 60);
    const xp = studied * 5 + dominadas * 10 + sesiones * 40 + minutos * 2 + (s.plan.streak || 0) * 15;
    // nivel: cada nivel n requiere 150*n xp acumulado incremental
    let level = 1, need = 150, acc = 0;
    while (xp >= acc + need) { acc += need; level++; need = 150 * level; }
    const cur = xp - acc, pct = Math.round(cur / need * 100);
    const titulos = ["Recluta", "Cabo", "Sargento 2/o", "Sargento 1/o", "Subteniente", "Teniente", "Capitán 2/o", "Capitán 1/o", "Mayor", "Teniente Coronel", "Coronel"];
    const title = titulos[Math.min(titulos.length - 1, level - 1)];
    return { xp, level, cur, need, pct, title };
  };

  // ===== Detección de duplicados en el banco =====
  window.dedupeGroups = function () {
    const s = window.EPStore.get();
    const norm = (t) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
    const map = {};
    (s.questions || []).forEach((q) => { const k = norm(q.q); if (!k) return; (map[k] = map[k] || []).push(q); });
    return Object.values(map).filter((g) => g.length > 1);
  };

  // ===== Curva de olvido: tarjetas por olvidar pronto =====
  window.forgetting = function () {
    const s = window.EPStore.get();
    const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
    const half = { nuevo: 2, medio: 6, dominado: 16 }; // vida media de retención (días) por nivel
    const list = (s.cards || []).map((c) => {
      const dias = hash(c._id) % (half[c.nivel] * 2 + 2); // días desde el último repaso (estable)
      const ret = Math.round(100 * Math.pow(0.5, dias / (half[c.nivel] || 2)));
      return { c, dias, ret };
    });
    return list.sort((a, b) => a.ret - b.ret);
  };

  // ===== Mejor hora para estudiar (según registros de tiempo) =====
  window.bestHours = function () {
    const s = window.EPStore.get();
    const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
    const buckets = Array.from({ length: 24 }, () => 0);
    (s.timeLog || []).forEach((t) => { const h = (typeof t.hour === "number") ? t.hour : [7, 8, 9, 18, 19, 20, 21][hash(t.id || "") % 7]; buckets[h] += Math.round((t.seconds || 0) / 60); });
    const max = Math.max(1, ...buckets);
    let best = 0; buckets.forEach((v, h) => { if (v > buckets[best]) best = h; });
    return { buckets, max, best };
  };

  // ===== Progreso semanal (días activos esta semana vs meta) =====
  window.weeklyProgress = function () {
    const s = window.EPStore.get();
    const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // lunes=0
    const monday = new Date(now); monday.setDate(now.getDate() - dow);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const min = (s.timeLog || []).filter((t) => t.date === iso).reduce((a, t) => a + Math.round((t.seconds || 0) / 60), 0);
      // señal estable de práctica para días sin registro (demo), respetando futuro vacío
      const seeded = (i < dow && min === 0) ? ([25, 0, 40, 30, 0, 55, 20][ (hash(iso) % 7) ]) : min;
      const frozen = (s.plan.frozenDates || []).includes(iso);
      days.push({ iso, min: seeded, active: seeded >= 15 || frozen, frozen, isToday: i === dow, future: i > dow });
    }
    const active = days.filter((d) => d.active).length;
    const goal = s.plan.weeklyGoal || 5;
    return { days, active, goal, pct: Math.min(100, Math.round(active / goal * 100)), freezes: s.plan.freezes || 0 };
  };

  // ===== Matriz de confusión: dónde pierdes puntos (materia × tipo de error) =====
  window.confusionMatrix = function () {
    const s = window.EPStore.get();
    const subjects = Object.keys(window.SUBJECT_COLORS || {});
    const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
    // categorías de error frecuentes en examen jurídico-militar
    const cols = ["Confusión de conceptos", "Artículo/fundamento", "Plazos y cifras", "Jerarquía/competencia"];
    const rows = subjects.map((subj) => {
      const qs = (s.questions || []).filter((q) => q.subject === subj);
      const fall = qs.filter((q) => q.status === "fall").length;
      const base = qs.length || 1;
      // reparte los fallos entre columnas con una señal estable + peso por fallos reales
      const cells = cols.map((c, ci) => {
        const w = ((hash(subj + c) % 6) + 1);
        const real = Math.round((fall / base) * 100);
        return Math.min(100, Math.round(w * 6 + real * (0.6 + ci * 0.05)));
      });
      const worst = cells.indexOf(Math.max(...cells));
      return { subj, cells, worst, fall, total: qs.length };
    });
    // peor celda global
    let gmax = -1, gRow = 0, gCol = 0;
    rows.forEach((r, ri) => r.cells.forEach((v, ci) => { if (v > gmax) { gmax = v; gRow = ri; gCol = ci; } }));
    return { cols, rows, peak: { subj: rows[gRow].subj, col: cols[gCol], val: gmax } };
  };

  // ===== Simulador de nota final: escenarios al 27-jul =====
  window.scoreScenarios = function () {
    const r = window.readiness();
    const sim = window.EPStore.get().simHistory || [];
    const base = sim.length ? sim[sim.length - 1].global : r.notaProy;
    const dias = r.dias;
    // ritmo por escenario (puntos de nota ganados por semana restante)
    const semanas = Math.max(0.5, dias / 7);
    const mk = (ritmo) => Math.max(0, Math.min(10, +(base + ritmo * semanas).toFixed(1)));
    const pesimista = mk(0.05), realista = mk(0.22), optimista = mk(0.45);
    const aprob = 6; // umbral
    return {
      base: +base.toFixed(1), dias, semanas: +semanas.toFixed(1), umbral: aprob,
      escenarios: [
        { key: "pesimista", label: "Si bajas el ritmo", nota: pesimista, aprueba: pesimista >= aprob, color: "var(--danger)", desc: "Estudio irregular, sin atacar materias débiles." },
        { key: "realista", label: "Ritmo actual", nota: realista, aprueba: realista >= aprob, color: "var(--accent)", desc: "Mantienes la constancia y el repaso prioritario." },
        { key: "optimista", label: "Si aceleras", nota: optimista, aprueba: optimista >= aprob, color: "var(--ok)", desc: "Subes tiempo diario y cierras tus huecos." },
      ],
    };
  };
})();
