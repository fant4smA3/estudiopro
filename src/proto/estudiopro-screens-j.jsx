/* EstudioPro · Prototipo — Pantallas nuevas (J): Importar IA, Duplicados, Reto diario, Hábitos, Bitácora. */
const { useGo: useGoJ, PageHead: PageHeadJ, Panel: PanelJ, EmptyState: EmptyStateJ } = window;
const jSubjects = () => Object.keys(window.SUBJECT_COLORS || {});
const jStrip = (s) => (s || "").replace(/```json/gi, "").replace(/```/g, "").trim();
const jNorm = (t) => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/* ============================ IMPORTAR CON IA (texto / PDF / imagen) ============================ */
function ImportarIA() {
  const subjColor = window.subjColor;
  const SUBJECTS = jSubjects();
  const [text, setText] = React.useState("");
  const [imgData, setImgData] = React.useState(null);
  const [fileName, setFileName] = React.useState("");
  const [subject, setSubject] = React.useState(SUBJECTS[0]);
  const [n, setN] = React.useState(8);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [items, setItems] = React.useState(null);
  const [sel, setSel] = React.useState({});
  const fileRef = React.useRef(null);
  const aiReady = typeof window.claude !== "undefined" && window.claude.complete;

  const onFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setFileName(f.name); setErr("");
    if (f.type.startsWith("image/")) {
      const rd = new FileReader(); rd.onload = () => { setImgData(rd.result); setText(""); }; rd.readAsDataURL(f);
    } else {
      const rd = new FileReader(); rd.onload = () => { setText((rd.result || "").slice(0, 8000)); setImgData(null); }; rd.readAsText(f);
    }
    e.target.value = "";
  };

  const extraer = async () => {
    if (!text.trim() && !imgData) { setErr("Pega texto o sube un archivo (.txt o imagen)."); return; }
    setErr(""); setLoading(true); setItems(null);
    const sys = "Extraes reactivos de examen del material del ascenso militar mexicano. Devuelve SOLO un arreglo JSON válido (sin markdown). "
      + "Cada elemento: {\"q\": string, \"type\": \"OM\", \"options\": string[4], \"answer\": number (índice correcto), \"explain\": string, \"dif\": \"medio\"}. "
      + "Si el material ya contiene preguntas, transcríbelas fielmente; si no, redáctalas a partir del contenido.";
    const userText = "Materia: " + subject + ". Extrae hasta " + n + " reactivos" + (text ? " de este texto:\n\n" + text.slice(0, 6000) : " de la imagen adjunta.");
    try {
      let out;
      if (imgData && aiReady) {
        const b64 = imgData.split(",")[1]; const mime = (imgData.match(/data:(.*?);/) || [])[1] || "image/png";
        out = await window.claude.complete({ system: sys, max_tokens: 2000, messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
          { type: "text", text: userText },
        ] }] });
      } else {
        if (!aiReady) throw new Error("no-ai");
        out = await window.claude.complete({ system: sys, max_tokens: 2000, messages: [{ role: "user", content: userText }] });
      }
      let arr = JSON.parse(jStrip(out));
      if (!Array.isArray(arr)) arr = arr.reactivos || arr.items || [];
      arr = arr.filter((x) => x && x.q);
      if (!arr.length) throw new Error("vacío");
      // marca posibles duplicados contra el banco actual
      const bank = new Set((window.EPStore.get().questions || []).map((q) => jNorm(q.q)));
      arr = arr.map((it) => ({ ...it, dup: bank.has(jNorm(it.q)) }));
      setItems(arr);
      const s0 = {}; arr.forEach((it, k) => { s0[k] = !it.dup; });
      setSel(s0);
    } catch (e) {
      setErr(aiReady ? "No se pudo extraer (formato o servicio). Intenta con menos reactivos o revisa el material." : "La IA no está disponible en este entorno; la extracción real requiere conexión.");
    } finally { setLoading(false); }
  };

  const nSel = Object.values(sel).filter(Boolean).length;
  const añadir = () => {
    items.filter((_, k) => sel[k]).forEach((it) => window.EPStore.addQuestion({
      subject, q: it.q, type: it.type || "OM", options: it.options, answer: it.answer, explain: it.explain || "", dif: it.dif || "medio", tags: ["IA", "importado"], status: "nuevo",
    }));
    window.toast && window.toast(nSel + " reactivo(s) importado(s)", "ok");
    setItems(null); setSel({}); setText(""); setImgData(null); setFileName("");
  };

  return (
    <main className="main">
      <PageHeadJ title="Importar con IA" sub="Sube el manual o una foto y extrae preguntas automáticamente"
        crumbs={[["Importar", "importar"], "Importar con IA"]} />
      {!aiReady && <div className="audio-warn">⚠ La extracción con IA no está disponible en esta instalación. Usa <b>Importar</b> (CSV/JSON) o <b>Crear preguntas</b> para cargar tu material.</div>}
      <div className="gen-grid">
        <section className="panel">
          <div className="panel-h"><div className="panel-h-l"><span className="panel-idx">1</span><span className="panel-title">Material fuente</span></div></div>
          <div className="panel-b">
            <div className="imp-drop" onClick={() => fileRef.current && fileRef.current.click()}>
              <input ref={fileRef} type="file" accept=".txt,text/plain,image/*" style={{ display: "none" }} onChange={onFile} />
              <span className="imp-drop-ic">⬆</span>
              <span className="imp-drop-t">{fileName || "Subir archivo (.txt o imagen)"}</span>
              <span className="imp-drop-d">o pega el texto abajo</span>
            </div>
            {imgData && <img src={imgData} alt="vista previa" className="imp-preview" />}
            <textarea className="input textarea gen-src" value={text} onChange={(e) => { setText(e.target.value); setImgData(null); }} placeholder="Pega aquí el contenido del manual, artículo o resumen…"></textarea>
            <div className="gen-cfg">
              <label className="gen-f"><span>Materia</span><select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label className="gen-f"><span>Máx. reactivos</span><select className="input" value={n} onChange={(e) => setN(+e.target.value)}>{[5, 8, 12, 16].map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
            </div>
            {err && <div className="gen-err">{err}</div>}
            <button className="btn btn-accent btn-lg gen-go" onClick={extraer} disabled={loading || !aiReady} title={!aiReady ? "IA no disponible en esta instalación" : undefined}>{loading ? "Extrayendo…" : "✨ Extraer reactivos"}</button>
          </div>
        </section>
        <section className="panel gen-out">
          <div className="panel-h"><div className="panel-h-l"><span className="panel-idx">2</span><span className="panel-title">Revisar e importar</span></div>{items && <div className="panel-h-r"><span className="panel-meta">{nSel} de {items.length}</span></div>}</div>
          <div className="panel-b">
            {loading && <div className="gen-loading"><div className="gen-spin"></div><span>Leyendo el material…</span></div>}
            {!loading && !items && <EmptyStateJ icon="✨" title="Sin reactivos aún" desc="Sube o pega material y extrae. Los duplicados se marcan y se omiten." />}
            {!loading && items && <div className="gen-list">
              {items.map((it, k) => (
                <label className={"gen-item" + (sel[k] ? " is-sel" : "")} key={k}>
                  <input type="checkbox" checked={!!sel[k]} onChange={() => setSel((p) => ({ ...p, [k]: !p[k] }))} />
                  <div className="gen-item-b">
                    <div className="gen-q">{it.q} {it.dup && <span className="imp-dup">posible duplicado</span>}</div>
                    {it.options && <ul className="gen-opts">{it.options.map((o, oi) => <li key={oi} className={oi === it.answer ? "is-correct" : ""}>{oi === it.answer ? "✓ " : ""}{o}</li>)}</ul>}
                    {it.explain && <div className="gen-exp">{it.explain}</div>}
                  </div>
                </label>
              ))}
            </div>}
          </div>
          {items && <div className="gen-foot"><button className="btn" onClick={() => setItems(null)}>Descartar</button><button className="btn btn-accent" onClick={añadir} disabled={nSel === 0}>Importar {nSel}</button></div>}
        </section>
      </div>
    </main>
  );
}

/* ============================ DETECCIÓN DE DUPLICADOS ============================ */
function Duplicados() {
  const st = window.useStore();
  const subjColor = window.subjColor;
  const groups = window.dedupeGroups();
  const total = groups.reduce((a, g) => a + g.length - 1, 0);
  const del = (id) => { window.EPStore.deleteQuestion(id); window.toast && window.toast("Duplicado eliminado", "ok"); };
  return (
    <main className="main">
      <PageHeadJ title="Duplicados" sub="Reactivos con enunciado casi idéntico en tu banco"
        crumbs={[["Banco de preguntas", "banco"], "Duplicados"]} />
      {groups.length === 0
        ? <EmptyStateJ icon="✓" title="Sin duplicados" desc="Tu banco no tiene reactivos repetidos. ¡Bien!" tone="ok" />
        : <React.Fragment>
            <div className="rep-bar"><span className="rep-count">{groups.length} grupo(s) · {total} duplicado(s) por resolver</span></div>
            <div className="rep-list">
              {groups.map((g, gi) => (
                <section className="dup-group" key={gi}>
                  <div className="dup-group-h">{g.length} coincidencias</div>
                  {g.map((q, qi) => (
                    <div className="dup-row" key={q._id}>
                      <span className="cron-dot" style={{ background: subjColor(q.subject) }}></span>
                      <div className="dup-q"><div className="dup-q-t">{q.q}</div><div className="dup-q-s">{q.subject}{q.ord ? " · " + q.ord : ""}</div></div>
                      {qi === 0 ? <span className="dup-keep">conservar</span> : <button className="link-btn link-danger" onClick={() => del(q._id)}>Eliminar</button>}
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </React.Fragment>}
    </main>
  );
}

/* ============================ RETO DIARIO (examen sorpresa) ============================ */
function RetoDiario() {
  const go = useGoJ();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const pool = React.useMemo(() => {
    const qs = (st.questions || []).filter((q) => q.type !== "AB" && q.options);
    const a = qs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a.slice(0, 5);
  }, []);
  const [i, setI] = React.useState(0);
  const [sel, setSel] = React.useState(null);
  const [checked, setChecked] = React.useState(false);
  const [res, setRes] = React.useState([]);
  const [done, setDone] = React.useState(false);
  const q = pool[i];

  const comprobar = () => { if (sel === null) return; setChecked(true); setRes((r) => [...r, { id: q._id, correct: sel === q.answer }]); };
  const next = () => {
    if (i >= pool.length - 1) { window.EPStore.applyQuizResults(res); window.EPStore.bumpToday(pool.length); setDone(true); return; }
    setI(i + 1); setSel(null); setChecked(false);
  };
  React.useEffect(() => {
    const onKey = (e) => {
      if (done || !q) return;
      if (!checked && /^[1-4]$/.test(e.key)) { const idx = +e.key - 1; if (q.options[idx] !== undefined) setSel(idx); }
      else if (e.key === "Enter") { checked ? next() : comprobar(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [q, checked, sel, done, res, i]);

  if (!pool.length) return (<main className="main"><PageHeadJ title="Reto diario" crumbs={[["Inicio", "inicio"], "Reto diario"]} /><EmptyStateJ icon="⚡" title="Sin preguntas de opción múltiple" desc="Crea o importa reactivos para jugar el reto." /></main>);
  const aciertos = res.filter((r) => r.correct).length;

  if (done) {
    const nota = Math.round(aciertos / pool.length * 100);
    return (
      <main className="main main-center">
        <div className="rest-screen">
          <div className="rest-ic" style={{ background: "var(--ok-tint)", color: "var(--ok)" }}>⚡</div>
          <div className="rest-h">Reto completado</div>
          <div className="res-score" style={{ justifyContent: "center", border: 0 }}><div className="res-score-n">{aciertos}</div><div className="res-score-d">/ {pool.length}</div></div>
          <div className="rest-sub">{nota}% de acierto. {aciertos === pool.length ? "¡Perfecto! 🎯" : "Las falladas fueron a tu repaso prioritario."}</div>
          <div className="form-actions" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => go("inicio")}>Volver al inicio</button>
            <button className="btn btn-accent" onClick={() => { setI(0); setSel(null); setChecked(false); setRes([]); setDone(false); }}>Otro reto ▸</button>
          </div>
        </div>
      </main>
    );
  }

  const color = subjColor(q.subject);
  return (
    <main className="main">
      <PageHeadJ title="Reto diario" sub="5 preguntas rápidas · usa las teclas 1-4 y Enter"
        crumbs={[["Inicio", "inicio"], "Reto diario"]} />
      <div className="reto-prog"><div className="reto-prog-bar" style={{ width: ((i) / pool.length * 100) + "%", background: color }}></div></div>
      <section className="panel reto-card" style={{ borderTop: "3px solid " + color }}>
        <div className="q-head"><span className="reto-n">Pregunta {i + 1} de {pool.length}</span><span className="q-tag" style={{ color, fontWeight: 700 }}>{q.subject}</span></div>
        <div className="q-text">{q.q}</div>
        <div className="opts">
          {q.options.map((t, k) => {
            let cls = ""; if (checked) { if (k === q.answer) cls = " is-ok"; else if (k === sel) cls = " is-bad"; } else if (sel === k) cls = " is-sel";
            return (
              <label className={"opt" + cls} key={k} onClick={() => !checked && setSel(k)}>
                <span className="opt-k">{k + 1}</span><span className="opt-t">{t}</span>
                {checked && k === q.answer && <span className="opt-mark opt-mark-ok">✓</span>}
                {checked && k === sel && k !== q.answer && <span className="opt-mark opt-mark-bad">✕</span>}
              </label>
            );
          })}
        </div>
        {checked && q.explain && <div className={"explain " + (sel === q.answer ? "explain-ok" : "explain-bad")}><div className="explain-h">{sel === q.answer ? "✓ Correcto" : "✕ Incorrecto"}</div><p className="explain-p">{q.explain}</p></div>}
        <div className="q-foot">
          <span className="reto-score">Aciertos: {aciertos}</span><span style={{ flex: 1 }}></span>
          {!checked ? <button className="btn btn-accent" disabled={sel === null} onClick={comprobar}>Comprobar</button>
            : <button className="btn btn-accent" onClick={next}>{i >= pool.length - 1 ? "Ver resultado ▸" : "Siguiente ▸"}</button>}
        </div>
      </section>
    </main>
  );
}

/* ============================ HÁBITOS (mejor hora + curva de olvido) ============================ */
function Habitos() {
  const go = useGoJ();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const bh = window.bestHours();
  const fg = window.forgetting().slice(0, 12);
  const fmtH = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? " a.m." : " p.m.");
  const franja = bh.best < 6 ? "madrugada" : bh.best < 12 ? "mañana" : bh.best < 19 ? "tarde" : "noche";
  return (
    <main className="main">
      <PageHeadJ title="Hábitos de estudio" sub="Cuándo rindes mejor y qué estás por olvidar"
        crumbs={[["Inicio", "inicio"], "Hábitos"]} />
      <PanelJ idx="◷" title="Mejor hora para estudiar" meta={"pico: " + fmtH(bh.best) + " · " + franja}>
        <div className="bh-chart">
          {bh.buckets.map((v, h) => (
            <div className="bh-col" key={h} title={fmtH(h) + " · " + v + " min"}>
              <div className="bh-bar" style={{ height: Math.max(2, v / bh.max * 100) + "%", background: h === bh.best ? "var(--accent)" : "var(--surface-2)" }}></div>
              {h % 6 === 0 && <span className="bh-lbl">{h === 0 ? "12a" : h === 12 ? "12p" : (h % 12) + (h < 12 ? "a" : "p")}</span>}
            </div>
          ))}
        </div>
        <div className="bh-note">Programa tus bloques de enfoque alrededor de las <b>{fmtH(bh.best)}</b>, tu franja más productiva.</div>
      </PanelJ>
      <PanelJ idx="↓" title="Por olvidar pronto" meta="curva de olvido">
        <div className="fg-list">
          {fg.map(({ c, ret, dias }) => (
            <div className="fg-row" key={c._id}>
              <span className="cron-dot" style={{ background: subjColor(c.subject) }}></span>
              <div className="fg-q"><div className="fg-q-t">{c.front}</div><div className="fg-q-s">{c.subject} · nivel {c.nivel} · hace {dias} d</div></div>
              <div className="fg-ret"><div className="fg-ret-track"><div className="fg-ret-fill" style={{ width: ret + "%", background: ret < 40 ? "var(--danger)" : ret < 70 ? "var(--warn)" : "var(--ok)" }}></div></div><span>{ret}%</span></div>
            </div>
          ))}
        </div>
        <div className="fg-foot"><button className="btn btn-accent" onClick={() => go("repaso")}>Repasar ahora ▸</button></div>
      </PanelJ>
    </main>
  );
}

/* ============================ BITÁCORA DE ESTUDIO ============================ */
function Bitacora() {
  const st = window.useStore();
  const [text, setText] = React.useState("");
  const [mood, setMood] = React.useState("🙂");
  const MOODS = ["😞", "😐", "🙂", "😃", "🔥"];
  const entries = st.journal || [];
  const add = () => { if (!text.trim()) return; window.EPStore.addJournal({ mood, text: text.trim() }); setText(""); setMood("🙂"); window.toast && window.toast("Entrada guardada", "ok"); };
  return (
    <main className="main">
      <PageHeadJ title="Bitácora de estudio" sub="Anota cómo te fue hoy; la constancia también se reflexiona"
        crumbs={[["Inicio", "inicio"], "Bitácora"]} />
      <section className="panel">
        <div className="panel-b bit-new">
          <div className="bit-moods">{MOODS.map((m) => <button key={m} className={"bit-mood" + (mood === m ? " is-on" : "")} onClick={() => setMood(m)}>{m}</button>)}</div>
          <textarea className="input textarea" rows="3" placeholder="¿Qué estudiaste? ¿Qué costó? ¿Qué harás mañana?" value={text} onChange={(e) => setText(e.target.value)}></textarea>
          <div className="form-actions" style={{ marginTop: "10px" }}><button className="btn btn-accent" onClick={add} disabled={!text.trim()}>Guardar entrada</button></div>
        </div>
      </section>
      {entries.length === 0
        ? <EmptyStateJ icon="📓" title="Sin entradas aún" desc="Escribe tu primera reflexión del día." />
        : <div className="bit-list">
            {entries.map((e) => (
              <div className="bit-item" key={e.id}>
                <span className="bit-item-m">{e.mood}</span>
                <div className="bit-item-b"><div className="bit-item-d">{new Date(e.date + "T00:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</div><p className="bit-item-t">{e.text}</p></div>
                <button className="cron-x" onClick={() => window.EPStore.deleteJournal(e.id)} aria-label="Eliminar">×</button>
              </div>
            ))}
          </div>}
    </main>
  );
}

Object.assign(window, { ImportarIA, Duplicados, RetoDiario, Habitos, Bitacora });
