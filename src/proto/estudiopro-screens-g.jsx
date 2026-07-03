/* EstudioPro · Prototipo — Pantallas nuevas (G): Generador IA y Tutor de dudas IA. */
const { useGo: useGoG, PageHead: PageHeadG, Panel: PanelG, EmptyState: EmptyStateG } = window;

const gSubjects = () => Object.keys(window.SUBJECT_COLORS || {});
const stripFences = (s) => (s || "").replace(/```json/gi, "").replace(/```/g, "").trim();

/* ============================ GENERADOR DE REACTIVOS CON IA ============================ */
function Generador() {
  const subjColor = window.subjColor;
  const SUBJECTS = gSubjects();
  const [text, setText] = React.useState("");
  const [subject, setSubject] = React.useState(SUBJECTS[0]);
  const [ord, setOrd] = React.useState("");
  const [n, setN] = React.useState(6);
  const [tipo, setTipo] = React.useState("OM");
  const [dif, setDif] = React.useState("medio");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [items, setItems] = React.useState(null); // reactivos generados
  const [sel, setSel] = React.useState({});

  const aiReady = typeof window.claude !== "undefined" && window.claude.complete;

  const generar = async () => {
    if (text.trim().length < 40) { setErr("Pega al menos un párrafo del material (mín. 40 caracteres)."); return; }
    setErr(""); setLoading(true); setItems(null);
    const tipoTxt = tipo === "OM" ? "opción múltiple con 4 opciones" : tipo === "VF" ? "verdadero/falso" : "respuesta abierta corta";
    const sys = "Eres un generador de reactivos de examen para el ascenso militar mexicano (Cap. 1/o. I.C.I.). "
      + "A partir del texto fuente, redacta preguntas precisas, de nivel " + dif + ", tipo " + tipoTxt + ". "
      + "Cada reactivo debe basarse ESTRICTAMENTE en el texto dado. Devuelve SOLO un arreglo JSON válido, sin explicación ni markdown. "
      + "Esquema por reactivo: {\"q\": string, \"type\": \"" + tipo + "\", "
      + (tipo === "AB" ? "\"answer\": string (respuesta correcta breve), " : "\"options\": string[], \"answer\": number (índice 0-based de la correcta), ")
      + "\"explain\": string (explicación breve), \"dif\": \"" + dif + "\"}.";
    const prompt = "Genera exactamente " + n + " reactivos de la materia \"" + subject + "\""
      + (ord ? " (ordenamiento: " + ord + ")" : "") + " a partir de este texto:\n\n" + text.slice(0, 6000);
    try {
      const out = await window.claude.complete({ system: sys, messages: [{ role: "user", content: prompt }], max_tokens: 2000 });
      let arr = JSON.parse(stripFences(out));
      if (!Array.isArray(arr)) arr = arr.reactivos || arr.items || [];
      arr = arr.filter((x) => x && x.q);
      if (!arr.length) throw new Error("vacío");
      setItems(arr);
      const s0 = {}; arr.forEach((_, k) => { s0[k] = true; });
      setSel(s0);
    } catch (e) {
      setErr("No se pudo generar (la IA puede estar ocupada o el formato falló). Intenta de nuevo o reduce el número de reactivos.");
    } finally { setLoading(false); }
  };

  const toggle = (k) => setSel((p) => ({ ...p, [k]: !p[k] }));
  const nSel = Object.values(sel).filter(Boolean).length;
  const añadir = () => {
    const chosen = items.filter((_, k) => sel[k]);
    chosen.forEach((it) => {
      window.EPStore.addQuestion({
        subject, ord: ord || "", loc: "", q: it.q,
        type: it.type || tipo,
        options: it.options || (tipo === "VF" ? ["Verdadero", "Falso"] : undefined),
        answer: it.answer, explain: it.explain || "", dif: it.dif || dif,
        tags: ["IA"], status: "nuevo",
      });
    });
    window.toast && window.toast(chosen.length + " reactivo(s) añadido(s) al banco", "ok");
    setItems(null); setSel({}); setText("");
  };

  return (
    <main className="main">
      <PageHeadG title="Generador de reactivos con IA" sub="Pega un artículo o tema y genera preguntas con fuente"
        crumbs={[["Banco de preguntas", "banco"], "Generador IA"]} />
      {!aiReady && <div className="audio-warn">⚠ La IA no está disponible en este entorno. La pantalla muestra el flujo, pero la generación real requiere conexión.</div>}
      <div className="gen-grid">
        <section className="panel gen-in">
          <div className="panel-h"><div className="panel-h-l"><span className="panel-idx">1</span><span className="panel-title">Texto fuente</span></div>
            <div className="panel-h-r"><span className="panel-meta">{text.length} car.</span></div></div>
          <div className="panel-b">
            <textarea className="input textarea gen-src" value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Pega aquí el artículo del ordenamiento, el resumen del capítulo o el tema a examinar…"></textarea>
            <div className="gen-cfg">
              <label className="gen-f"><span>Materia</span>
                <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <label className="gen-f"><span>Ordenamiento (opcional)</span>
                <input className="input" value={ord} onChange={(e) => setOrd(e.target.value)} placeholder="p. ej. CJM · Libro Primero" />
              </label>
              <label className="gen-f"><span>Reactivos</span>
                <select className="input" value={n} onChange={(e) => setN(+e.target.value)}>{[4, 6, 8, 10].map((x) => <option key={x} value={x}>{x}</option>)}</select>
              </label>
              <label className="gen-f"><span>Tipo</span>
                <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="OM">Opción múltiple</option><option value="VF">Verdadero / Falso</option><option value="AB">Abierta</option>
                </select>
              </label>
              <label className="gen-f"><span>Dificultad</span>
                <select className="input" value={dif} onChange={(e) => setDif(e.target.value)}>
                  <option value="fácil">Fácil</option><option value="medio">Medio</option><option value="difícil">Difícil</option>
                </select>
              </label>
            </div>
            {err && <div className="gen-err">{err}</div>}
            <button className="btn btn-accent btn-lg gen-go" onClick={generar} disabled={loading}>
              {loading ? "Generando…" : "✨ Generar reactivos"}</button>
          </div>
        </section>

        <section className="panel gen-out">
          <div className="panel-h"><div className="panel-h-l"><span className="panel-idx">2</span><span className="panel-title">Vista previa</span></div>
            {items && <div className="panel-h-r"><span className="panel-meta">{nSel} de {items.length} seleccionados</span></div>}</div>
          <div className="panel-b">
            {loading && <div className="gen-loading"><div className="gen-spin"></div><span>Redactando reactivos desde tu texto…</span></div>}
            {!loading && !items && <EmptyStateG icon="✨" title="Sin reactivos aún" desc="Pega un texto y genera. Podrás revisarlos antes de añadirlos al banco." />}
            {!loading && items && (
              <div className="gen-list">
                {items.map((it, k) => (
                  <label className={"gen-item" + (sel[k] ? " is-sel" : "")} key={k}>
                    <input type="checkbox" checked={!!sel[k]} onChange={() => toggle(k)} />
                    <div className="gen-item-b">
                      <div className="gen-q">{it.q}</div>
                      {it.options && <ul className="gen-opts">{it.options.map((o, oi) => (
                        <li key={oi} className={oi === it.answer ? "is-correct" : ""}>{oi === it.answer ? "✓ " : ""}{o}</li>
                      ))}</ul>}
                      {it.type === "AB" && <div className="gen-ans">Respuesta: <b>{it.answer}</b></div>}
                      {it.explain && <div className="gen-exp">{it.explain}</div>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          {items && <div className="gen-foot">
            <button className="btn" onClick={() => setItems(null)}>Descartar</button>
            <button className="btn btn-accent" onClick={añadir} disabled={nSel === 0}>Añadir {nSel} al banco</button>
          </div>}
        </section>
      </div>
    </main>
  );
}

/* ============================ TUTOR DE DUDAS CON IA ============================ */
function Tutor() {
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = gSubjects();
  const [subject, setSubject] = React.useState("general");
  const [msgs, setMsgs] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef(null);
  const aiReady = typeof window.claude !== "undefined" && window.claude.complete;

  const falladas = (st.questions || []).filter((q) => q.status === "fall").slice(0, 4);
  const quick = [
    "Explícame la diferencia entre delito y falta en el CJM",
    "¿Qué es la insubordinación y sus grados?",
    "Resume los correctivos disciplinarios",
    "Dame una mnemotecnia para las situaciones del militar",
  ];

  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, loading]);

  const send = async (textArg) => {
    const q = (textArg != null ? textArg : input).trim();
    if (!q || loading) return;
    const next = [...msgs, { role: "user", content: q }];
    setMsgs(next); setInput(""); setLoading(true);
    const ctx = subject === "general" ? "el temario del ascenso militar mexicano (Cap. 1/o. I.C.I., Promoción 2026)" : "la materia \"" + subject + "\" del ascenso militar mexicano";
    const sys = "Eres un tutor experto que prepara a un aspirante para el examen de ascenso militar mexicano. "
      + "Respondes sobre " + ctx + ". Sé claro, preciso y conciso (máx. 5 párrafos). "
      + "Cita el ordenamiento o artículo cuando aplique. Si conviene, cierra con una mnemotecnia o dato clave para recordar. "
      + "Responde SIEMPRE en español.";
    try {
      if (!aiReady) throw new Error("no-ai");
      const history = next.map((m) => ({ role: m.role, content: m.content }));
      const out = await window.claude.complete({ system: sys, messages: history, max_tokens: 900 });
      setMsgs((p) => [...p, { role: "assistant", content: out }]);
    } catch (e) {
      setMsgs((p) => [...p, { role: "assistant", content: "⚠ No pude responder ahora mismo. La IA puede estar ocupada o no disponible en este entorno. Intenta de nuevo en un momento.", err: true }]);
    } finally { setLoading(false); }
  };

  return (
    <main className="main">
      <PageHeadG title="Tutor de dudas" sub="Pregunta cualquier concepto del temario y recibe explicación con fuente"
        crumbs={[["Banco de preguntas", "banco"], "Tutor de dudas"]}
        actions={<select className="input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ maxWidth: "220px" }}>
          <option value="general">Contexto: general</option>
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>} />
      <div className="tutor-wrap">
        <div className="tutor-chat" ref={scrollRef}>
          {msgs.length === 0 && (
            <div className="tutor-intro">
              <div className="tutor-intro-ic">🎓</div>
              <div className="tutor-intro-t">Pregúntame lo que quieras del temario</div>
              <div className="tutor-intro-d">Puedo explicar conceptos, comparar figuras jurídicas, resumir capítulos y darte mnemotecnias.</div>
              <div className="tutor-quick">
                {quick.map((qp, k) => <button key={k} className="tutor-chip" onClick={() => send(qp)}>{qp}</button>)}
              </div>
              {falladas.length > 0 && (
                <div className="tutor-fail">
                  <div className="tutor-fail-h">O pide que te explique una pregunta fallada:</div>
                  {falladas.map((f) => (
                    <button key={f._id} className="tutor-fail-item" onClick={() => send("Explícame por qué es importante y cómo dominar esta pregunta: " + f.q)}>
                      <span className="cron-dot" style={{ background: subjColor(f.subject) }}></span>{f.q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {msgs.map((m, k) => (
            <div key={k} className={"tutor-msg tutor-" + m.role + (m.err ? " tutor-err" : "")}>
              {m.role === "assistant" && <span className="tutor-av">🎓</span>}
              <div className="tutor-bubble">{m.content}</div>
            </div>
          ))}
          {loading && <div className="tutor-msg tutor-assistant"><span className="tutor-av">🎓</span><div className="tutor-bubble tutor-typing"><i></i><i></i><i></i></div></div>}
        </div>
        <div className="tutor-input">
          <textarea className="input" rows="1" placeholder="Escribe tu duda…" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}></textarea>
          <button className="btn btn-accent" onClick={() => send()} disabled={loading || !input.trim()}>Enviar</button>
        </div>
      </div>
    </main>
  );
}

Object.assign(window, { Generador, Tutor });
