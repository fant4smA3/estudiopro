#!/usr/bin/env node
/* Genera un estado de estudio COMPLETO al ~80% de avance para probar el sistema:
   - ~50 reactivos por capítulo de cada materia, derivados del temario real
     (MATERIA_DETAIL): ubicación de apartados, títulos y temas. No inventa contenido
     de leyes/manuales; son drills de estructura del temario, etiquetados "temario".
   - Se suman las 263 preguntas reales del banco de Aspecto Técnico.
   - Progreso real de mecanismo: estados SM-2 con fechas/intervalos, sesiones,
     registros de tiempo, actividad diaria (racha), simulacros con tendencia,
     plan con semanas pasadas cumplidas. Las pantallas CALCULAN sobre estos datos.
   Salida: respaldo importable (pantalla Respaldo) — reemplaza el estado local.

   Uso: node scripts/generar-progreso.mjs [salida.json]  (por defecto public/data/progreso-prueba.json) */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = process.argv[2] || join(ROOT, "public/data/progreso-prueba.json");

// --- temario real (evalúa el módulo del prototipo con un window simulado) ---
const w = {};
new Function("window", readFileSync(join(ROOT, "src/proto/estudiopro-data.jsx"), "utf8"))(w);
const DETAIL = w.MATERIA_DETAIL;
const MATERIAS = ["Legislación Militar", "Operaciones Militares", "Normatividad Gubernamental", "Aspecto Administrativo", "Adiestramiento y Mando Militar", "Aspecto Técnico"];

// --- RNG determinista (mulberry32): el archivo es reproducible ---
let seed = 20260714;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(HOY); d.setDate(d.getDate() - n); return d; };
const HOY = new Date(); HOY.setHours(12, 0, 0, 0);

// ================== 1) BANCO: drills del temario (~50 por capítulo) ==================
// catálogo plano: cada capítulo con su contexto
const caps = [];
Object.entries(DETAIL).forEach(([ord, info]) => {
  info.titulos.forEach((t) => {
    t.caps.forEach(([capName, capDesc]) => {
      caps.push({ materia: info.cat, ord, titulo: t.n, cap: capName, desc: capDesc });
    });
  });
});
const ordsDe = (materia) => Object.entries(DETAIL).filter(([, i]) => i.cat === materia).map(([o]) => o);
const TODOS_ORDS = Object.keys(DETAIL);
const titulosDe = (ord) => DETAIL[ord].titulos.map((t) => t.n);
const capsDe = (ord) => { const out = []; DETAIL[ord].titulos.forEach((t) => t.caps.forEach(([n, d]) => out.push({ n, d, titulo: t.n }))); return out; };

const uniq = (arr) => { const seen = new Set(); return arr.filter((x) => { const k = x.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; }); };
// arma opciones: correcta + 3 distractores del pool (rellena con el pool global)
const arma = (correcta, pool, globalPool) => {
  const distr = uniq(shuffle(pool).filter((x) => x.trim().toLowerCase() !== correcta.trim().toLowerCase())).slice(0, 3);
  for (const g of shuffle(globalPool || [])) {
    if (distr.length >= 3) break;
    if (g.trim().toLowerCase() !== correcta.trim().toLowerCase() && !distr.some((d) => d.trim().toLowerCase() === g.trim().toLowerCase())) distr.push(g);
  }
  const options = shuffle([correcta, ...distr.slice(0, 3)]);
  return { options, answer: options.indexOf(correcta) };
};

const F_ORD = [ // ¿en qué ordenamiento está el apartado?
  (c) => `¿En qué ordenamiento del temario se ubica el apartado «${c.cap}»?`,
  (c) => `El apartado «${c.cap}» (${c.materia}) forma parte de:`,
  (c) => `Para estudiar «${c.cap}» debes consultar:`,
  (c) => `Según el temario de la promoción, «${c.cap}» corresponde al ordenamiento:`,
  (c) => `Identifica el ordenamiento que contiene el apartado «${c.cap}»:`,
];
const F_TIT = [ // ¿a qué título/parte pertenece?
  (c) => `Dentro de ${c.ord}, ¿a qué título o parte pertenece «${c.cap}»?`,
  (c) => `En ${c.ord}, el apartado «${c.cap}» se localiza en:`,
  (c) => `¿Qué título o parte de ${c.ord} incluye «${c.cap}»?`,
  (c) => `Ubica en ${c.ord} la sección a la que pertenece «${c.cap}»:`,
  (c) => `Conforme al índice de ${c.ord}, «${c.cap}» está dentro de:`,
];
const F_TEMA = [ // ¿de qué trata el capítulo?
  (c) => `Conforme al temario (${c.ord} · ${c.titulo}), el apartado «${c.cap}» comprende:`,
  (c) => `¿Cuál es el tema central del apartado «${c.cap}» de ${c.ord}?`,
  (c) => `En ${c.ord}, «${c.cap}» aborda principalmente:`,
  (c) => `El contenido que estudia «${c.cap}» (${c.titulo}) es:`,
  (c) => `De acuerdo con el programa, «${c.cap}» se refiere a:`,
];
const F_INV = [ // ¿qué apartado trata sobre X?
  (c) => `¿Qué apartado de ${c.titulo} (${c.ord}) trata sobre «${sinPunto(c.desc)}»?`,
  (c) => `En ${c.ord}, el tema «${sinPunto(c.desc)}» se estudia en el apartado:`,
  (c) => `Identifica el apartado de ${c.ord} cuyo contenido es «${sinPunto(c.desc)}»:`,
  (c) => `Dentro de ${c.titulo}, ¿dónde se aborda «${sinPunto(c.desc)}»?`,
  (c) => `El temario asigna «${sinPunto(c.desc)}» al apartado:`,
];
function sinPunto(s) { return (s || "").replace(/\.$/, ""); }

const questions = [];
let qSeq = 0;
const seenQ = new Set();
const pushQ = (q) => {
  const k = (q.q + "::" + (q.options ? q.options[q.answer] : q.answer)).toLowerCase();
  if (seenQ.has(k)) return false;
  seenQ.add(k);
  questions.push({ _id: "QT" + String(++qSeq).padStart(5, "0"), status: "nuevo", ...q });
  return true;
};

caps.forEach((c) => {
  const otrosOrds = ordsDe(c.materia).filter((o) => o !== c.ord);
  const titulos = titulosDe(c.ord);
  const hermanos = capsDe(c.ord).filter((x) => x.n !== c.cap);
  const globalCaps = caps.filter((x) => x.ord !== c.ord);
  const difs = ["fácil", "medio", "medio", "difícil"];
  let n = 0;
  for (let ronda = 1; ronda <= 2 && n < 50; ronda++) {
    const sufijo = ronda === 2 ? " · segunda vuelta" : "";
    for (let f = 0; f < 5 && n < 50; f++) {
      for (let v = 0; v < 5 && n < 50; v++) {
        let item = null;
        if (f === 0) { // ordenamiento
          const { options, answer } = arma(c.ord, otrosOrds, TODOS_ORDS);
          item = { q: F_ORD[v](c) + sufijo, options, answer, type: "OM" };
        } else if (f === 1 && titulos.length > 1) { // título
          const { options, answer } = arma(c.titulo, titulos.filter((t) => t !== c.titulo), TODOS_ORDS.flatMap(titulosDe));
          item = { q: F_TIT[v](c) + sufijo, options, answer, type: "OM" };
        } else if (f === 2) { // tema (desc)
          const { options, answer } = arma(sinPunto(c.desc), hermanos.map((h) => sinPunto(h.d)), globalCaps.map((g) => sinPunto(g.desc)));
          item = { q: F_TEMA[v](c) + sufijo, options, answer, type: "OM" };
        } else if (f === 3) { // inverso (cap por desc)
          const { options, answer } = arma(c.cap, hermanos.map((h) => h.n), globalCaps.map((g) => g.cap));
          item = { q: F_INV[v](c) + sufijo, options, answer, type: "OM" };
        } else { // VF: mitad verdaderas, mitad con título/ord equivocado
          const falso = v % 2 === 1;
          const donde = falso ? (otrosOrds.length ? pick(otrosOrds) : pick(TODOS_ORDS.filter((o) => o !== c.ord))) : c.ord;
          item = {
            q: `«${c.cap}» es un apartado de ${donde} en el temario de ${c.materia}.` + sufijo,
            options: ["Verdadero", "Falso"], answer: falso ? 1 : 0, type: "VF",
            explain: falso ? `Ese apartado pertenece a ${c.ord} (${c.titulo}).` : `Correcto: se ubica en ${c.titulo}.`,
          };
        }
        if (!item) continue;
        if (pushQ({
          subject: c.materia, ord: c.ord, loc: c.titulo + " · " + c.cap,
          type: item.type, dif: difs[(n + v) % 4], tags: ["temario"],
          q: item.q, options: item.options, answer: item.answer,
          explain: item.explain || `Temario: ${c.ord} → ${c.titulo} → ${c.cap} (${sinPunto(c.desc)}).`,
          ref: "Temario Promoción 2026 · " + c.ord,
        })) continue;
        n++;
      }
    }
  }
});

// banco real de Aspecto Técnico (curado)
const at = JSON.parse(readFileSync(join(ROOT, "public/data/banco-aspecto-tecnico.json"), "utf8"));
at.forEach((q, i) => pushQ({ ...q, _id: "QAT" + String(i + 1).padStart(4, "0") }));

// ================== 2) PROGRESO SM-2 (~80% estudiado, con materia débil) ==================
const AVANCE = { "Legislación Militar": 0.93, "Operaciones Militares": 0.91, "Aspecto Técnico": 0.90, "Aspecto Administrativo": 0.87, "Adiestramiento y Mando Militar": 0.84, "Normatividad Gubernamental": 0.62 };
const cardSrs = {};
questions.forEach((q) => {
  if (rnd() >= (AVANCE[q.subject] || 0.8)) return; // sin estudiar
  const r = rnd();
  let sm2, nivel, lastGrade, studied;
  if (r < 0.75) { // dominada
    const interval = 21 + Math.floor(rnd() * 40);
    const restante = Math.floor(rnd() * interval);
    sm2 = { reps: 3 + Math.floor(rnd() * 4), ef: +(2.3 + rnd() * 0.4).toFixed(2), interval, due: iso(daysAgo(-restante)), lapses: rnd() < 0.25 ? 1 : 0 };
    nivel = "dominado"; lastGrade = rnd() < 0.4 ? "facil" : "medio"; studied = 3 + Math.floor(rnd() * 5);
    q.status = rnd() < 0.06 ? "imp" : "ok";
  } else if (r < 0.94) { // en camino
    const interval = 1 + Math.floor(rnd() * 6);
    sm2 = { reps: 1 + Math.floor(rnd() * 2), ef: +(2.2 + rnd() * 0.4).toFixed(2), interval, due: iso(daysAgo(Math.floor(rnd() * 4) - interval + 1)), lapses: rnd() < 0.2 ? 1 : 0 };
    nivel = "medio"; lastGrade = rnd() < 0.3 ? "dificil" : "medio"; studied = 1 + Math.floor(rnd() * 3);
    q.status = rnd() < 0.15 ? "fall" : (rnd() < 0.05 ? "imp" : "ok");
  } else { // fallada reciente: vence hoy o ya venció
    sm2 = { reps: 0, ef: +(1.9 + rnd() * 0.4).toFixed(2), interval: 0, due: iso(daysAgo(Math.floor(rnd() * 3))), lapses: 1 + Math.floor(rnd() * 2) };
    nivel = "nuevo"; lastGrade = "otra"; studied = 1 + Math.floor(rnd() * 3);
    q.status = "fall";
  }
  cardSrs[q._id] = { nivel, lastGrade, studied, sm2 };
});

// ================== 3) HISTORIAL: tiempo, actividad (racha), sesiones, simulacros ==================
const timeLog = [], activity = {}, sessions = [];
let tSeq = 0;
for (let back = 56; back >= 0; back--) {
  const fecha = iso(daysAgo(back));
  const enRacha = back <= 15;                       // últimos 16 días: racha viva
  if (!enRacha && rnd() < 0.22) continue;           // antes: ~1 día de descanso por semana
  const bloques = rnd() < 0.3 ? 2 : 1;
  let minutosDia = 0;
  for (let b = 0; b < bloques; b++) {
    const materia = pick(MATERIAS);
    const seconds = (20 + Math.floor(rnd() * 55)) * 60;
    minutosDia += Math.round(seconds / 60);
    timeLog.push({ id: "t" + (++tSeq), subject: materia, label: pick(["Sesión de estudio", "Repaso de tarjetas", "Bloque de enfoque"]), seconds, date: fecha, hour: pick([6, 7, 19, 20, 20, 21, 21, 22]) });
  }
  activity[fecha] = minutosDia;
  if (rnd() < 0.78 || enRacha) { // la mayoría de los días hubo cuestionario
    const materia = pick(MATERIAS);
    const progreso = 1 - back / 56;                 // la nota mejora con el tiempo
    const score = +Math.min(10, 5.4 + progreso * 3.4 + rnd() * 1.4 - (materia === "Normatividad Gubernamental" ? 1.2 : 0)).toFixed(1);
    const nq = pick([12, 15, 20, 20, 25, 30]);
    sessions.push({ subject: materia, label: materia + " · práctica", n: nq, time: String(8 + Math.floor(rnd() * 20)).padStart(2, "0") + ":" + String(Math.floor(rnd() * 60)).padStart(2, "0"), score, date: fecha, state: "done" });
  }
}
timeLog.reverse(); sessions.reverse(); // más recientes primero (como los guarda la app)

const simHistory = [];
for (let s = 0; s < 7; s++) {
  const fecha = iso(daysAgo(49 - s * 7));
  const base = 5.8 + s * 0.45;
  const byS = {};
  MATERIAS.forEach((m) => { byS[m] = +Math.max(3, Math.min(10, base + rnd() * 1.2 - 0.5 - (m === "Normatividad Gubernamental" ? 1.4 : 0))).toFixed(1); });
  const global = +(Object.values(byS).reduce((a, b) => a + b, 0) / MATERIAS.length).toFixed(1);
  simHistory.push({ id: "s" + (s + 1), date: fecha, global, byS, n: 200, min: 235 + Math.floor(rnd() * 30) });
}

// ================== 4) PLAN: 3 semanas pasadas cumplidas + días hasta el examen ==================
const EXAM = "2026-07-27";
const dias = [];
const cursor = daysAgo(21);
const cola = shuffle(caps.slice());
let ci = 0;
while (iso(cursor) <= EXAM && dias.length < 90) {
  const dow = cursor.getDay();
  const fecha = iso(cursor);
  if (dow !== 0) {
    const pasado = fecha < iso(HOY);
    if (dow === 5) {
      dias.push({ fecha, tipo: "simulacro", subject: null, ord: "Simulacro general", titulo: "200 preguntas · 2 bloques", estado: pasado ? "hecho" : "pendiente", min: 255, npreg: 200 });
    } else {
      const c = cola[ci++ % cola.length];
      const estado = pasado ? (rnd() < 0.85 ? "hecho" : "parcial") : "pendiente";
      dias.push({ fecha, tipo: pasado && rnd() < 0.2 ? "repaso" : "estudio", subject: c.materia, ord: c.ord, titulo: c.cap, estado, min: 45, npreg: 12 });
    }
  }
  cursor.setDate(cursor.getDate() + 1);
}

// ================== 5) RESTO DEL ESTADO ==================
const ultima = sessions[0];
const lastResult = { subject: ultima.subject, total: ultima.n, correct: Math.round(ultima.n * ultima.score / 10), wrong: ultima.n - Math.round(ultima.n * ultima.score / 10) - 1, blank: 1, abiertas: 0, time: ultima.time, score: ultima.score, missed: [], byChapter: {}, isSim: false };
const journal = [
  { id: "j6", date: iso(daysAgo(0)), mood: "😃", text: "Buen ritmo. Normatividad sigue floja: mañana le dedico el bloque completo de la tarde." },
  { id: "j5", date: iso(daysAgo(2)), mood: "🙂", text: "Repasé falladas de LGRA y Transparencia. Las de plazos ya salen mejor." },
  { id: "j4", date: iso(daysAgo(5)), mood: "🔥", text: "Simulacro de 8+ por primera vez. La constancia está pagando." },
  { id: "j3", date: iso(daysAgo(12)), mood: "😐", text: "Día pesado de servicio; solo 25 minutos de tarjetas, pero no rompí la racha." },
  { id: "j2", date: iso(daysAgo(24)), mood: "🙂", text: "Terminé la primera vuelta del CJM. Segunda vuelta con tarjetas vencidas." },
  { id: "j1", date: iso(daysAgo(40)), mood: "😐", text: "Arranque formal del plan. Diagnóstico: fuerte en técnico, débil en normatividad." },
];
const reports = [
  { id: "r1", qId: "QAT0007", subject: "Aspecto Técnico", reason: "redaccion", note: "Revisar redacción; el enunciado se corta.", when: daysAgo(3).toISOString(), status: "abierto" },
  { id: "r2", qId: "QAT0015", subject: "Aspecto Técnico", reason: "desactualizado", note: "Confirmar cifra contra la edición 2024 del manual.", when: daysAgo(9).toISOString(), status: "resuelto" },
];

const data = {
  questions, cardSrs, sessions, lastResult,
  plan: { dailyGoal: 30, doneToday: 18, doneDate: iso(HOY), streak: 16, examDate: EXAM, weeklyGoal: 5, freezes: 1, frozenDates: [iso(daysAgo(10))], nombre: "Aspirante", diasDisponibles: [1, 2, 3, 4, 5, 6], dias, generado: true },
  notes: {}, resume: null,
  userCats: [], userMats: [], userOrds: {},
  unlocked: {}, activity, timeLog, reports, simHistory, journal,
  sidebar: null, lastExport: daysAgo(2).toISOString(),
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ app: "EstudioPro", version: "1.0", exportedAt: new Date().toISOString(), tipo: "datos-de-prueba-80", data }), "utf8");

const est = Object.values(cardSrs).length;
console.log(`Preguntas: ${questions.length} (temario: ${questions.length - at.length} · banco real AT: ${at.length})`);
console.log(`Estudiadas (SRS): ${est} (${Math.round(est / questions.length * 100)}%) · dominadas: ${Object.values(cardSrs).filter((c) => c.nivel === "dominado").length}`);
console.log(`Sesiones: ${sessions.length} · registros de tiempo: ${timeLog.length} · días con actividad: ${Object.keys(activity).length}`);
console.log(`Simulacros: ${simHistory.length} (${simHistory[0].global} → ${simHistory[simHistory.length - 1].global}) · plan: ${dias.length} días`);
console.log(`Salida: ${OUT} (${Math.round(JSON.stringify(data).length / 1024)} KiB)`);
