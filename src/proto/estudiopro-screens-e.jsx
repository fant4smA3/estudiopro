/* EstudioPro · Prototipo — Pantalla E: Creación rápida de preguntas.
   Solo escribes pregunta + respuesta correcta; el sistema genera 3 distractores
   eligiendo, del mismo tema, las respuestas más parecidas a la correcta. */
const { useGo: useGoE, PageHead: PageHeadE, Crumbs: CrumbsE, EmptyState: EmptyStateE, ConfirmDialog: ConfirmDialogE } = window;

/* --- normalización + similitud de cadenas (para elegir distractores plausibles) --- */
window.epNorm = (s) => (s || "").toString().toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9áéíóúñ\s]/gi, " ").replace(/\s+/g, " ").trim();

window.epSimilar = (a, b) => {
  const na = window.epNorm(a), nb = window.epNorm(b);
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

/* reúne respuestas candidatas del banco para una materia (correctas + distractores existentes) */
window.epAnswerPool = (subject) => {
  const st = window.EPStore.get();
  const out = [];
  st.questions.forEach((q) => {
    if (q.subject !== subject) return;
    if (q.type === "AB" && typeof q.answer === "string") out.push(q.answer);
    else if (q.options && typeof q.answer === "number") {
      q.options.forEach((o) => { if (o) out.push(o); }); // correcta + distractores: todos plausibles del tema
    }
  });
  return out;
};

/* genera 3 distractores: los más parecidos a la correcta dentro del tema; rellena si faltan */
window.epDistractors = (correct, subject, extraPool) => {
  const seen = new Set([window.epNorm(correct)]);
  const cand = [];
  const consider = (arr, sameSubject) => {
    arr.forEach((txt) => {
      const n = window.epNorm(txt);
      if (!n || seen.has(n)) return;
      seen.add(n);
      cand.push({ txt, score: window.epSimilar(correct, txt) + (sameSubject ? 0 : -0.15) });
    });
  };
  consider([...(extraPool || []), ...window.epAnswerPool(subject)], true);
  // si hay muy pocos en el tema, completa con respuestas de otras materias
  if (cand.length < 3) {
    const st = window.EPStore.get();
    const others = [];
    st.questions.forEach((q) => {
      if (q.subject === subject) return;
      if (q.type === "AB" && typeof q.answer === "string") others.push(q.answer);
      else if (q.options && typeof q.answer === "number" && q.options[q.answer]) others.push(q.options[q.answer]);
    });
    consider(others, false);
  }
  cand.sort((a, b) => b.score - a.score);
  const picked = cand.slice(0, 3).map((c) => c.txt);
  const padding = ["Ninguna de las anteriores", "Todas las anteriores", "No aplica al caso"];
  let pi = 0;
  while (picked.length < 3 && pi < padding.length) {
    if (!seen.has(window.epNorm(padding[pi]))) { picked.push(padding[pi]); seen.add(window.epNorm(padding[pi])); }
    pi++;
  }
  return picked;
};

const epShuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function CreaRapido() {
  const go = useGoE();
  const st = window.useStore();
  const SUBJECTS = window.subjectNames();
  const subjColor = window.subjColor;
  const DETAIL = window.MATERIA_DETAIL || {};
  const defSubj = (window.__epSubject && window.subjectNames().includes(window.__epSubject)) ? window.__epSubject : SUBJECTS[0];

  // ordenamientos y capítulos disponibles según el destino elegido
  const ordsForSubject = (subj) => {
    const base = Object.keys(DETAIL).filter((k) => DETAIL[k].cat === subj);
    const extra = ((st.userOrds || {})[subj] || []).map((o) => o.name);
    return [...base, ...extra];
  };
  const capsForOrd = (ord) => (DETAIL[ord] ? DETAIL[ord].titulos.map((t) => t.n) : []);

  // --- destino común a todas las preguntas ---
  const initialOrd = ordsForSubject(defSubj)[0] || "";
  const [dest, setDest] = React.useState({ subject: defSubj, ord: initialOrd, cap: "" });
  const setSubject = (subject) => { const o = ordsForSubject(subject)[0] || ""; setDest({ subject, ord: o, cap: "" }); };
  const setOrd = (ord) => setDest((d) => ({ ...d, ord, cap: "" }));
  const setCap = (cap) => setDest((d) => ({ ...d, cap }));
  const ords = ordsForSubject(dest.subject);
  const caps = capsForOrd(dest.ord);
  const color = subjColor(dest.subject);

  const blank = () => ({ key: "r" + Date.now() + Math.random().toString(36).slice(2, 6), q: "", a: "", opts: null });
  const [rows, setRows] = React.useState(() => [blank(), blank(), blank()]);
  const [saved, setSaved] = React.useState(false);
  const [savedN, setSavedN] = React.useState(0);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const lastAnsRef = React.useRef(null);

  const setRow = (key, patch) => setRows((rs) => rs.map((r) => r.key === key ? { ...r, ...patch, opts: patch.opts !== undefined ? patch.opts : (patch.a !== undefined ? null : r.opts) } : r));
  const addRow = () => setRows((rs) => [...rs, blank()]);
  const removeRow = (key) => setRows((rs) => rs.length > 1 ? rs.filter((r) => r.key !== key) : rs);

  const preview = (row) => {
    if (!row.q.trim() || !row.a.trim()) return;
    const otherRows = rows.filter((r) => r.key !== row.key && r.a.trim()).map((r) => r.a.trim());
    const opts = window.epDistractors(row.a.trim(), dest.subject, otherRows);
    setRow(row.key, { opts });
  };

  const validRows = rows.filter((r) => r.q.trim() && r.a.trim());
  const save = () => {
    let n = 0;
    validRows.forEach((row) => {
      const correct = row.a.trim();
      const others = rows.filter((r) => r.key !== row.key && r.a.trim()).map((r) => r.a.trim());
      const distractors = (row.opts && row.opts.length === 3) ? row.opts : window.epDistractors(correct, dest.subject, others);
      const options = epShuffle([correct, ...distractors]);
      window.EPStore.addQuestion({
        subject: dest.subject, q: row.q.trim(), type: "OM", dif: "medio", status: "nuevo",
        options, answer: options.indexOf(correct), tags: [], explain: "",
        ord: dest.ord || "", loc: dest.cap || (dest.ord ? "" : "Creación rápida"),
      });
      n++;
    });
    setSavedN(n); setSaved(true);
    window.toast && window.toast(n + " pregunta(s) guardada(s) en " + dest.subject, "ok");
  };

  if (saved) {
    return (
      <main className="main main-center">
        <PageHeadE title="Creación rápida" crumbs={[["Inicio", "inicio"], ["Banco", "banco"], "Crear preguntas"]} />
        <EmptyStateE tone="ok" icon="✓" title={"¡" + savedN + " pregunta(s) creada(s)!"}
          desc={"Se guardaron en " + dest.subject + (dest.ord ? " · " + dest.ord : "") + (dest.cap ? " · " + dest.cap : "") + " como opción múltiple con 3 distractores automáticos. Ya están en tu banco."}
          actions={<React.Fragment>
            <button className="btn" onClick={() => { setRows([blank(), blank(), blank()]); setSaved(false); }}>Crear más</button>
            <button className="btn btn-accent" onClick={() => go("banco")}>Ir al banco ▸</button>
          </React.Fragment>} />
      </main>
    );
  }

  return (
    <main className="main">
      <PageHeadE title="Creación rápida" sub="Escribe pregunta y respuesta — el sistema genera las opciones" crumbs={[["Inicio", "inicio"], ["Banco", "banco"], "Crear preguntas"]}
        actions={<div className="qr-head-acts">
          <button className="btn" onClick={() => setConfirmClear(true)}>Limpiar</button>
          <button className="btn btn-accent" disabled={!validRows.length} onClick={save}>Guardar {validRows.length || ""} ▸</button>
        </div>} />

      {/* DESTINO — configuración común a todas las preguntas */}
      <div className="qr-dest" style={{ borderTop: "3px solid " + color }}>
        <div className="qr-dest-h">
          <span className="qr-dest-tag">Destino de las preguntas</span>
          <span className="qr-dest-sum">Se guardarán todas en <b style={{ color: window.subjTextColor(dest.subject) }}>{dest.subject}</b>{dest.ord ? <span> · {dest.ord}</span> : null}{dest.cap ? <span> · {dest.cap}</span> : null}</span>
        </div>
        <div className="qr-dest-grid">
          <div className="field">
            <label>Materia</label>
            <select className="input" aria-label="Materia" value={dest.subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Ordenamiento</label>
            <select className="input" aria-label="Ordenamiento" value={dest.ord} onChange={(e) => setOrd(e.target.value)} disabled={!ords.length}>
              {!ords.length && <option value="">— Sin ordenamientos —</option>}
              {ords.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Capítulo / Título</label>
            <select className="input" aria-label="Capítulo" value={dest.cap} onChange={(e) => setCap(e.target.value)} disabled={!caps.length}>
              <option value="">{caps.length ? "Todo el ordenamiento" : "—"}</option>
              {caps.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="qr-howto">
        <span className="qr-howto-ic">✨</span>
        <div>Elige arriba <b>dónde</b> se guardarán y luego escribe solo la <b>pregunta</b> y la <b>respuesta correcta</b>. Al guardar, EstudioPro añade 3 opciones más —las respuestas del mismo tema que más se parecen a la tuya— y las baraja como opción múltiple. Usa <b>Previsualizar</b> para verlas antes.</div>
      </div>

      <div className="qr-list">
        {rows.map((row, i) => {
          const ready = row.q.trim() && row.a.trim();
          return (
            <div className="qr-row" key={row.key} style={{ borderLeft: "3px solid " + color }}>
              <div className="qr-row-top">
                <span className="qr-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="qr-row-dest">{dest.subject}{dest.cap ? " · " + dest.cap : (dest.ord ? " · " + dest.ord : "")}</span>
                <span className="qr-flex"></span>
                <button className="ra-btn ra-del" title="Eliminar fila" aria-label="Eliminar fila" onClick={() => removeRow(row.key)} disabled={rows.length <= 1}>✕</button>
              </div>
              <div className="qr-fields">
                <div className="field">
                  <label>Pregunta</label>
                  <textarea className="input textarea qr-q" rows="2" placeholder="p. ej. ¿Cuáles son los niveles de conducción de las operaciones militares?"
                    value={row.q} onChange={(e) => setRow(row.key, { q: e.target.value })}></textarea>
                </div>
                <div className="field">
                  <label>Respuesta correcta</label>
                  <input className="input qr-a" placeholder="p. ej. Estratégico, operacional y táctico"
                    value={row.a} ref={i === rows.length - 1 ? lastAnsRef : null}
                    onChange={(e) => setRow(row.key, { a: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (i === rows.length - 1) { addRow(); setTimeout(() => lastAnsRef.current && lastAnsRef.current.focus(), 30); } } }} />
                </div>
              </div>
              <div className="qr-row-foot">
                <button className="btn btn-sm qr-prev-btn" disabled={!ready} onClick={() => preview(row)}>{row.opts ? "↻ Regenerar opciones" : "✨ Previsualizar opciones"}</button>
                {row.opts && (
                  <div className="qr-opts">
                    <span className="qr-opts-correct"><i className="qr-opt-dot"></i>{row.a.trim()}<span className="qr-opt-tag">correcta</span></span>
                    {row.opts.map((o, k) => <span className="qr-opts-distr" key={k}>{o}</span>)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="qr-foot">
        <button className="btn qr-add" onClick={() => { addRow(); setTimeout(() => lastAnsRef.current && lastAnsRef.current.focus(), 30); }}>+ Añadir otra pregunta</button>
        <span className="qr-flex"></span>
        <span className="qr-count">{validRows.length} de {rows.length} lista(s)</span>
        <button className="btn btn-accent btn-lg" disabled={!validRows.length} onClick={save}>Guardar {validRows.length ? validRows.length + " pregunta(s)" : ""} ▸</button>
      </div>

      <ConfirmDialogE open={confirmClear} danger confirmLabel="Limpiar todo"
        title="¿Limpiar todas las filas?" body={<span>Se borrarán las preguntas que aún no has guardado. El destino elegido se mantiene.</span>}
        onClose={() => setConfirmClear(false)} onConfirm={() => { setRows([blank(), blank(), blank()]); setConfirmClear(false); }} />
    </main>
  );
}
window.CreaRapido = CreaRapido;
