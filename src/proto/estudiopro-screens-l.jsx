/* EstudioPro — Pantalla L: Reparar distractores.
   Detecta opciones placeholder ("Respuesta idéntica", "Distractor 1"…) o duplicadas y
   propone reemplazos con las respuestas más parecidas del mismo tema (offline, epSimilar).
   Refactor a ES modules (Fase 3): importa React, banco, ui y store; solo los helpers
   propios ep* (epNorm/epSimilar/epScanPlaceholders…) siguen como window.* hasta que migren. */
import React from "react";
import { subjColor } from "./estudiopro-bank.jsx";
import { ConfirmDialog, EmptyState as EmptyStateL, Panel as PanelL, SectionHead, toast, useGo as useGoL } from "./estudiopro-ui.jsx";
import { EPStore, useStore } from "./estudiopro-store.jsx";


const PLACEHOLDER_RE = /^(respuesta\s+id[eé]ntica|distractor(es)?\s*\d*|opci[oó]n\s*\d*|pendiente|por\s+definir|xxx+|\.{2,}|[-–—])$/i;
window.epIsPlaceholder = (t) => {
  const s = (t || "").toString().trim();
  if (!s) return true;
  return PLACEHOLDER_RE.test(s);
};

/* escanea el banco: preguntas OM con opciones placeholder o duplicadas (nunca la correcta) */
window.epScanPlaceholders = () => {
  const st = EPStore.get();
  const out = [];
  st.questions.forEach((q) => {
    if (!q.options || typeof q.answer !== "number") return;
    const seen = new Set();
    const bad = [];
    q.options.forEach((o, i) => {
      const n = window.epNorm(o);
      const dup = n && seen.has(n);
      if (n) seen.add(n);
      if (i === q.answer) return; // la respuesta correcta no se toca
      if (window.epIsPlaceholder(o) || dup) bad.push(i);
    });
    if (bad.length) out.push({ q, bad });
  });
  return out;
};

/* pool de candidatos reales de la materia (sin placeholders) con su ubicación */
window.epRepairPool = (subject) => {
  const st = EPStore.get();
  const pool = [];
  st.questions.forEach((q) => {
    if (q.subject !== subject) return;
    if (q.type === "AB" && typeof q.answer === "string" && !window.epIsPlaceholder(q.answer)) {
      pool.push({ txt: q.answer, ord: q.ord, loc: q.loc });
    } else if (q.options && typeof q.answer === "number") {
      q.options.forEach((o) => { if (o && !window.epIsPlaceholder(o)) pool.push({ txt: o, ord: q.ord, loc: q.loc }); });
    }
  });
  return pool;
};

/* sugiere `need` distractores: los más parecidos a la correcta, prefiriendo mismo ordenamiento/capítulo.
   `offset` rota entre candidatos (botón «Otras opciones»). */
window.epRepairSuggest = (q, need, offset) => {
  const correct = q.options[q.answer];
  const seen = new Set(
    q.options
      .filter((o, i) => i === q.answer || !window.epIsPlaceholder(o))
      .map(window.epNorm)
  );
  const cands = [];
  const nc = window.epNorm(correct);
  window.epRepairPool(q.subject).forEach(({ txt, ord, loc }) => {
    const n = window.epNorm(txt);
    if (!n || seen.has(n)) return;
    seen.add(n);
    // descarta el mismo concepto disfrazado (contención o similitud casi total con la correcta)
    if (n === nc || n.includes(nc) || nc.includes(n)) return;
    if (window.epSimilar(correct, txt) > 0.85) return;
    let score = window.epSimilar(correct, txt);
    if (ord && ord === q.ord) score += 0.08;
    if (loc && loc === q.loc) score += 0.06;
    cands.push({ txt, score });
  });
  cands.sort((a, b) => b.score - a.score);
  if (!cands.length) return [];
  const start = (offset || 0) % cands.length;
  const picked = [];
  for (let i = 0; i < cands.length && picked.length < need; i++) picked.push(cands[(start + i) % cands.length].txt);
  return picked;
};

/* aplica la reparación: reemplaza in situ las opciones malas (la correcta conserva su posición) */
window.epRepairApply = (q, bad, suggestions) => {
  const options = q.options.slice();
  bad.forEach((idx, k) => { if (suggestions[k]) options[idx] = suggestions[k]; });
  EPStore.updateQuestion(q._id, { options });
};

function ReparaDistractoresBody() {
  const go = useGoL();
  const _st = useStore();
  const [offsets, setOffsets] = React.useState({});   // rotación de sugerencias por pregunta
  const [page, setPage] = React.useState(0);
  const [confirmAll, setConfirmAll] = React.useState(false);
  const PER = 10;

  const found = window.epScanPlaceholders();
  const totalPages = Math.max(1, Math.ceil(found.length / PER));
  const curPage = Math.min(page, totalPages - 1);
  const rows = found.slice(curPage * PER, curPage * PER + PER);

  const suggestFor = (q, bad) => window.epRepairSuggest(q, bad.length, offsets[q._id] || 0);

  const applyOne = (q, bad) => {
    const sug = suggestFor(q, bad);
    if (!sug.length) { toast && toast("Sin candidatos suficientes en la materia", "warn"); return; }
    window.epRepairApply(q, bad, sug);
    toast && toast("Distractores reemplazados", "ok");
  };

  const applyAll = () => {
    let n = 0;
    window.epScanPlaceholders().forEach(({ q, bad }) => {
      const sug = window.epRepairSuggest(q, bad.length, offsets[q._id] || 0);
      if (sug.length) { window.epRepairApply(q, bad, sug); n++; }
    });
    setConfirmAll(false);
    toast && toast(n + " preguntas reparadas", "ok");
  };

  const rotate = (q) => setOffsets((o) => ({ ...o, [q._id]: (o[q._id] || 0) + 3 }));

  if (!found.length) {
    return (
      <React.Fragment>
        <SectionHead icon="✎" title="Reparar distractores" desc="Opciones placeholder o repetidas en el banco" />
        <EmptyStateL tone="ok" icon="✓" title="Banco en orden"
          desc="No hay preguntas con distractores placeholder («Respuesta idéntica», «Distractor 1»…) ni opciones duplicadas."
          actions={<button className="btn btn-accent" onClick={() => go("banco")}>Ir al banco ▸</button>} />
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <SectionHead icon="✎" title="Reparar distractores" desc={found.length + " preguntas con opciones placeholder o repetidas"}
        actions={<button className="btn btn-accent" onClick={() => setConfirmAll(true)}>Reparar todas ({found.length}) ▸</button>} />

      <PanelL idx="—" title="Cómo funciona" meta="sugerencias del mismo tema">
        <p className="t-mute" style={{ margin: 0, fontSize: "12.5px", lineHeight: 1.6 }}>
          Para cada opción marcada se propone la respuesta de otra pregunta de la misma materia más
          <b> parecida a la respuesta correcta</b> (prioridad: mismo ordenamiento y capítulo). La respuesta
          correcta nunca se modifica. Usa «Otras opciones» si la propuesta no te convence, o edita la
          pregunta a mano desde el banco.
        </p>
      </PanelL>

      {rows.map(({ q, bad }) => {
        const sug = suggestFor(q, bad);
        const color = subjColor(q.subject);
        return (
          <PanelL key={q._id} idx="✎" title={q.q.length > 96 ? q.q.slice(0, 96) + "…" : q.q} meta={q.loc || q.ord}>
            <div className="cardman-list">
              {q.options.map((o, i) => {
                const badIx = bad.indexOf(i);
                const isBad = badIx >= 0;
                const isAns = i === q.answer;
                return (
                  <div className="cardman-row" key={i} style={{ borderLeft: "3px solid " + (isAns ? "var(--ok)" : isBad ? "var(--danger)" : color) }}>
                    <div className="cardman-main">
                      <div className="cardman-front" style={isBad ? { textDecoration: "line-through", color: "var(--mute)" } : {}}>
                        {String.fromCharCode(65 + i)}) {o}
                        {isAns && <span className="st st-ok" style={{ marginLeft: "8px" }}><i className="st-dot"></i>correcta</span>}
                      </div>
                      {isBad && (
                        <div className="cardman-back" style={{ color: "var(--ink)" }}>
                          → {sug[badIx] || <em className="t-mute">sin candidato disponible</em>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => rotate(q)}>↻ Otras opciones</button>
              <button className="btn" onClick={() => { window.__epEditQ = q; go("pregunta"); }}>Editar a mano</button>
              <button className="btn btn-accent" onClick={() => applyOne(q, bad)} disabled={!sug.length}>Aplicar reemplazos ▸</button>
            </div>
          </PanelL>
        );
      })}

      {totalPages > 1 && (
        <div className="pager">
          <button className="btn btn-sm" disabled={curPage === 0} onClick={() => setPage(curPage - 1)}>‹ Anterior</button>
          <span className="pager-info">Página {curPage + 1} de {totalPages} · {found.length} preguntas</span>
          <button className="btn btn-sm" disabled={curPage >= totalPages - 1} onClick={() => setPage(curPage + 1)}>Siguiente ›</button>
        </div>
      )}

      <ConfirmDialog open={confirmAll} confirmLabel={"Reparar " + found.length + " preguntas"}
        title="¿Reparar todas las preguntas?"
        body={<span>Se reemplazarán las opciones placeholder o repetidas de <b>{found.length}</b> preguntas con las sugerencias actuales. Las respuestas correctas no se tocan. Puedes ajustar cualquier pregunta después desde el banco.</span>}
        onClose={() => setConfirmAll(false)} onConfirm={applyAll} />
    </React.Fragment>
  );
}

Object.assign(window, { ReparaDistractoresBody });
