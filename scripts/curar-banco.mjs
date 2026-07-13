#!/usr/bin/env node
/* Curación del banco de preguntas (fuente JSON).
   - Elimina filas basura de captura (enunciado "; asas.", respuesta de una letra).
   - Reemplaza distractores placeholder («Respuesta idéntica», «Distractor 1»…) o duplicados
     por respuestas reales del mismo banco, con la misma lógica de similitud que usa la app
     (src/proto/estudiopro-screens-e.jsx: epNorm/epSimilar) más heurísticas por tipo de
     respuesta (números → vecinos numéricos; "APT n" → otros grupos APT).
   La respuesta correcta nunca se modifica y conserva su posición.

   Uso: node scripts/curar-banco.mjs <entrada.json> <salida.json> */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Uso: node scripts/curar-banco.mjs <entrada.json> <salida.json>");
  process.exit(1);
}

const PLACEHOLDER_RE = /^(respuesta\s+id[eé]ntica|distractor(es)?\s*\d*|opci[oó]n\s*\d*|pendiente|por\s+definir|xxx+|\.{2,}|[-–—])$/i;
const isPlaceholder = (t) => {
  const s = (t || "").toString().trim();
  return !s || PLACEHOLDER_RE.test(s);
};

// misma normalización y similitud que la app (epNorm / epSimilar)
const norm = (s) => (s || "").toString().toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9áéíóúñ\s]/gi, " ").replace(/\s+/g, " ").trim();

const similar = (a, b) => {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const wa = new Set(na.split(" ").filter((w) => w.length > 2));
  const wb = new Set(nb.split(" ").filter((w) => w.length > 2));
  let inter = 0; wa.forEach((w) => { if (wb.has(w)) inter++; });
  const union = new Set([...wa, ...wb]).size || 1;
  const jaccard = inter / union;
  const lenClose = 1 - Math.abs(na.length - nb.length) / Math.max(na.length, nb.length);
  return 0.72 * jaccard + 0.28 * lenClose;
};

const questions = JSON.parse(readFileSync(inPath, "utf8"));

// --- 1) filas basura de captura: enunciado sin contenido real ---
const isJunk = (q) => {
  const body = (q.q || "").replace(/^de conformidad con el manual[^;]*;\s*/i, "").trim();
  return body.length < 8 || /^asas\.?$/i.test(body) || /texto de la pregunta/i.test(body);
};
const junk = questions.filter(isJunk);
const bank = questions.filter((q) => !isJunk(q));

// --- 2) pool de candidatos: toda opción real del banco, con su ubicación y etiquetas ---
const pool = [];
bank.forEach((q) => {
  if (!q.options || typeof q.answer !== "number") return;
  q.options.forEach((o) => {
    if (!isPlaceholder(o)) pool.push({ txt: o, loc: q.loc || "", tags: q.tags || [] });
  });
});

const isNumeric = (t) => /^\d+$/.test((t || "").trim());
const isAPT = (t) => /^apt\s*\d+$/i.test((t || "").trim());

/* distractores numéricos: vecinos del valor correcto (n±1, n±2, n+3…) */
const numericDistractors = (correct, exclude, need) => {
  const n = parseInt(correct, 10);
  const out = [];
  for (const d of [1, -1, 2, -2, 3, -3, 4, 5]) {
    const v = n + d;
    if (v <= 0) continue;
    const s = String(v);
    if (exclude.has(s)) continue;
    exclude.add(s);
    out.push(s);
    if (out.length >= need) break;
  }
  return out;
};

/* distractores "APT n": otros grupos APT reales del banco primero, luego generados */
const aptDistractors = (correct, exclude, need) => {
  const out = [];
  const fromBank = [...new Set(pool.map((p) => p.txt).filter((t) => isAPT(t)))];
  for (const t of fromBank) {
    if (exclude.has(norm(t))) continue;
    exclude.add(norm(t));
    out.push(t);
    if (out.length >= need) return out;
  }
  const n = parseInt(correct.replace(/\D/g, ""), 10);
  for (const d of [1, -1, 2, -2, 3, -3, 5, 10]) {
    const v = n + d;
    if (v <= 0) continue;
    const s = "APT " + v;
    if (exclude.has(norm(s))) continue;
    exclude.add(norm(s));
    out.push(s);
    if (out.length >= need) break;
  }
  return out;
};

/* distractores por similitud (mismo criterio que epRepairSuggest de la app) */
const similarDistractors = (q, correct, exclude, need) => {
  const nc = norm(correct);
  const cands = [];
  pool.forEach(({ txt, loc, tags }) => {
    const n = norm(txt);
    if (!n || exclude.has(n)) return;
    // el mismo concepto disfrazado no sirve de distractor
    if (n === nc || n.includes(nc) || nc.includes(n)) return;
    if (similar(correct, txt) > 0.85) return;
    // los números puros solo compiten con respuestas numéricas
    if (isNumeric(txt) !== isNumeric(correct)) return;
    let score = similar(correct, txt);
    if (loc && loc === q.loc) score += 0.08;
    if ((tags || []).some((t) => (q.tags || []).includes(t))) score += 0.06;
    cands.push({ txt, n, score });
  });
  cands.sort((a, b) => b.score - a.score);
  const out = [];
  for (const c of cands) {
    if (exclude.has(c.n)) continue;
    exclude.add(c.n);
    out.push(c.txt);
    if (out.length >= need) break;
  }
  return out;
};

// --- 3) reparación in situ ---
let repaired = 0, optionsReplaced = 0, unresolved = [];
bank.forEach((q) => {
  if (!q.options || typeof q.answer !== "number") return;
  const correct = q.options[q.answer];
  const seen = new Set();
  const bad = [];
  q.options.forEach((o, i) => {
    const n = norm(o);
    const dup = n && seen.has(n);
    if (n) seen.add(n);
    if (i === q.answer) return;
    if (isPlaceholder(o) || dup) bad.push(i);
  });
  if (!bad.length) return;

  // lo ya presente en la pregunta queda excluido de las sugerencias
  const exclude = new Set(q.options.filter((o, i) => i === q.answer || !isPlaceholder(o)).map(norm));
  let sugs;
  if (isAPT(correct)) sugs = aptDistractors(correct, exclude, bad.length);
  else if (isNumeric(correct)) sugs = numericDistractors(correct, new Set(q.options.filter((o, i) => i === q.answer || !isPlaceholder(o)).map((s) => s.trim())), bad.length);
  else sugs = similarDistractors(q, correct, exclude, bad.length);

  if (sugs.length < bad.length) unresolved.push({ q: q.q.slice(0, 90), faltan: bad.length - sugs.length });
  bad.forEach((idx, k) => { if (sugs[k]) { q.options[idx] = sugs[k]; optionsReplaced++; } });
  if (sugs.length) repaired++;
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(bank, null, 1) + "\n", "utf8");

console.log(`Entrada: ${questions.length} preguntas`);
console.log(`Basura eliminada: ${junk.length}`);
console.log(`Preguntas reparadas: ${repaired} (${optionsReplaced} opciones reemplazadas)`);
console.log(`Salida: ${bank.length} preguntas → ${outPath}`);
if (unresolved.length) {
  console.log(`Sin candidato suficiente: ${unresolved.length}`);
  unresolved.slice(0, 10).forEach((u) => console.log(`  · faltan ${u.faltan}: ${u.q}…`));
}
