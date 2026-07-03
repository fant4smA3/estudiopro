/* EstudioPro · Prototipo — Pantallas nuevas (K): Examen adaptativo, Confusiones, Metas semanales, Podcast, Glosario, Simulador de nota. */
const { useGo: useGoK, PageHead: PageHeadK, Panel: PanelK, EmptyState: EmptyStateK } = window;
const kSubjects = () => Object.keys(window.SUBJECT_COLORS || {});
const kShuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ============================ EXAMEN ADAPTATIVO ============================ */
function ExamenAdaptativo() {
  const go = useGoK();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const difOrder = { "fácil": 0, "medio": 1, "difícil": 2 };
  const pool = React.useMemo(() => (st.questions || []).filter((q) => q.type !== "AB" && q.options && q.options.length >= 2), []);
  const MAX = 12;
  const [i, setI] = React.useState(0);
  const [level, setLevel] = React.useState(1);        // 0 fácil, 1 medio, 2 difícil
  const [asked, setAsked] = React.useState([]);       // ids ya usados
  const [cur, setCur] = React.useState(null);
  const [sel, setSel] = React.useState(null);
  const [checked, setChecked] = React.useState(false);
  const [hist, setHist] = React.useState([]);          // { correct, level }
  const [done, setDone] = React.useState(false);
  const [started, setStarted] = React.useState(false);

  const pickForLevel = (lvl, usados) => {
    const wants = ["fácil", "medio", "difícil"][lvl];
    let cand = pool.filter((q) => !usados.includes(q._id) && (q.dif || "medio") === wants);
    if (!cand.length) cand = pool.filter((q) => !usados.includes(q._id));
    if (!cand.length) return null;
    return kShuffle(cand)[0];
  };
  const begin = () => {
    const first = pickForLevel(1, []);
    if (!first) return;
    setStarted(true); setCur(first); setAsked([first._id]);
  };
  const comprobar = () => {
    if (sel === null) return;
    setChecked(true);
    const correct = sel === cur.answer;
    setHist((h) => [...h, { correct, level, id: cur._id, subject: cur.subject }]);
    if (!correct) window.EPStore.updateQuestion(cur._id, { status: "fall" });
  };
  const next = () => {
    const correct = hist[hist.length - 1].correct;
    let nl = level; if (correct && level < 2) nl = level + 1; if (!correct && level > 0) nl = level - 1;
    if (i + 1 >= MAX) { finish(nl); return; }
    const q = pickForLevel(nl, asked);
    if (!q) { finish(nl); return; }
    setLevel(nl); setCur(q); setAsked((a) => [...a, q._id]); setI(i + 1); setSel(null); setChecked(false);
  };
  const finish = (nl) => { setDone(true); window.EPStore.bumpToday(Math.round(hist.length / 2)); };

  React.useEffect(() => {
    const onKey = (e) => {
      if (!started || done || !cur) return;
      if (!checked && /^[1-4]$/.test(e.key)) { const idx = +e.key - 1; if (cur.options[idx] !== undefined) setSel(idx); }
      else if (e.key === "Enter") { checked ? next() : comprobar(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  if (pool.length < 4) return (<main className="main"><PageHeadK title="Examen adaptativo" crumbs={[["Cuestionarios", "cuestionarios"], "Examen adaptativo"]} /><EmptyStateK icon="🎚" title="Faltan preguntas de opción múltiple" desc="Crea o importa más reactivos para calibrar tu nivel." /></main>);

  if (done) {
    const aciertos = hist.filter((h) => h.correct).length;
    const abilidad = Math.round(hist.reduce((a, h) => a + (h.correct ? h.level + 1 : h.level - 0.5), 0) / hist.length * 33);
    const nivelTxt = abilidad >= 66 ? "Alto" : abilidad >= 40 ? "Medio" : "En desarrollo";
    const nivelColor = abilidad >= 66 ? "var(--ok)" : abilidad >= 40 ? "var(--accent)" : "var(--warn)";
    return (
      <main className="main main-center">
        <div className="rest-screen">
          <div className="rest-ic" style={{ background: "color-mix(in srgb," + nivelColor + " 14%,#fff)", color: nivelColor }}>🎚</div>
          <div className="rest-h">Nivel estimado: {nivelTxt}</div>
          <div className="ad-gauge"><div className="ad-gauge-fill" style={{ width: abilidad + "%", background: nivelColor }}></div></div>
          <div className="rest-sub">{aciertos} de {hist.length} correctas · la dificultad se ajustó a tu desempeño en tiempo real.</div>
          <div className="ad-reco">{abilidad >= 66 ? "Domina el detalle fino y practica simulacros a contrarreloj." : abilidad >= 40 ? "Refuerza tus materias débiles con repaso prioritario." : "Vuelve a las tarjetas y a la lectura del material antes de más cuestionarios."}</div>
          <div className="form-actions" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => go("preparacion")}>Ver preparación</button>
            <button className="btn btn-accent" onClick={() => { setDone(false); setStarted(false); setI(0); setLevel(1); setAsked([]); setHist([]); setSel(null); setChecked(false); }}>Repetir ▸</button>
          </div>
        </div>
      </main>
    );
  }

  if (!started) {
    return (
      <main className="main">
        <PageHeadK title="Examen adaptativo" sub="La dificultad sube o baja según tus aciertos para calibrar tu nivel real"
          crumbs={[["Cuestionarios", "cuestionarios"], "Examen adaptativo"]} />
        <section className="panel ad-intro">
          <div className="ad-intro-ic">🎚</div>
          <h3 className="ad-intro-t">¿Qué tan preparado estás, en {MAX} preguntas?</h3>
          <p className="ad-intro-d">Empieza en dificultad media. Si aciertas, la siguiente será más difícil; si fallas, más fácil. Al final obtienes una estimación de tu nivel y una recomendación.</p>
          <ul className="ad-intro-list">
            <li><b>Teclas 1-4</b> para responder, <b>Enter</b> para avanzar</li>
            <li>Las falladas se envían a tu repaso prioritario</li>
            <li>Dura ~5 minutos</li>
          </ul>
          <button className="btn btn-accent btn-lg" onClick={begin}>Comenzar calibración ▸</button>
        </section>
      </main>
    );
  }

  const color = subjColor(cur.subject);
  const lvlTxt = ["Fácil", "Medio", "Difícil"][level];
  const lvlColor = ["var(--ok)", "var(--accent)", "var(--danger)"][level];
  return (
    <main className="main">
      <PageHeadK title="Examen adaptativo" sub={"Pregunta " + (i + 1) + " de " + MAX}
        crumbs={[["Cuestionarios", "cuestionarios"], "Examen adaptativo"]} />
      <div className="ad-bar">
        <div className="reto-prog" style={{ flex: 1, marginBottom: 0 }}><div className="reto-prog-bar" style={{ width: (i / MAX * 100) + "%", background: color }}></div></div>
        <span className="ad-lvl" style={{ color: lvlColor, borderColor: lvlColor }}>Dificultad: {lvlTxt}</span>
      </div>
      <section className="panel reto-card" style={{ borderTop: "3px solid " + color }}>
        <div className="q-head"><span className="q-tag" style={{ color, fontWeight: 700 }}>{cur.subject}</span></div>
        <div className="q-text">{cur.q}</div>
        <div className="opts">
          {cur.options.map((t, k) => {
            let cls = ""; if (checked) { if (k === cur.answer) cls = " is-ok"; else if (k === sel) cls = " is-bad"; } else if (sel === k) cls = " is-sel";
            return (<label className={"opt" + cls} key={k} onClick={() => !checked && setSel(k)}><span className="opt-k">{k + 1}</span><span className="opt-t">{t}</span></label>);
          })}
        </div>
        {checked && cur.explain && <div className={"explain " + (sel === cur.answer ? "explain-ok" : "explain-bad")}><div className="explain-h">{sel === cur.answer ? "✓ Correcto" : "✕ Incorrecto"}</div><p className="explain-p">{cur.explain}</p></div>}
        <div className="q-foot"><span style={{ flex: 1 }}></span>
          {!checked ? <button className="btn btn-accent" disabled={sel === null} onClick={comprobar}>Comprobar</button>
            : <button className="btn btn-accent" onClick={next}>{i + 1 >= MAX ? "Ver resultado ▸" : "Siguiente ▸"}</button>}
        </div>
      </section>
    </main>
  );
}

/* ============================ CONFUSIONES (matriz + drill) ============================ */
function Confusiones() {
  const go = useGoK();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const m = window.confusionMatrix();
  const cellColor = (v) => v >= 60 ? "var(--danger)" : v >= 40 ? "var(--warn)" : v >= 20 ? "color-mix(in srgb,var(--accent) 40%,#fff)" : "var(--surface-2)";
  const cellInk = (v) => v >= 40 ? "#fff" : "var(--mute)";
  return (
    <main className="main">
      <PageHeadK title="Matriz de confusión" sub="Dónde pierdes puntos exactamente: materia × tipo de error"
        crumbs={[["Progreso", "inteligencia"], "Confusiones"]} />
      <section className="panel cf-peak" style={{ borderLeft: "3px solid var(--danger)" }}>
        <div className="cf-peak-ic">🎯</div>
        <div><div className="cf-peak-t">Tu mayor fuga de puntos</div>
          <div className="cf-peak-d"><b style={{ color: subjColor(m.peak.subj) }}>{m.peak.subj}</b> · {m.peak.col.toLowerCase()}</div></div>
        <button className="btn btn-accent" onClick={() => { window.__epSubject = m.peak.subj; go("repaso"); }}>Practicar esto ▸</button>
      </section>
      <section className="panel">
        <div className="panel-b cf-scroll">
          <table className="cf-table">
            <thead><tr><th className="cf-rowh"></th>{m.cols.map((c) => <th key={c} className="cf-colh">{c}</th>)}</tr></thead>
            <tbody>
              {m.rows.map((r) => (
                <tr key={r.subj}>
                  <th className="cf-rowh"><span className="cron-dot" style={{ background: subjColor(r.subj) }}></span>{r.subj}</th>
                  {r.cells.map((v, ci) => (
                    <td key={ci} className="cf-cell" style={{ background: cellColor(v), color: cellInk(v), outline: ci === r.worst ? "2px solid var(--danger)" : "none", outlineOffset: "-2px" }} title={r.subj + " · " + m.cols[ci] + ": " + v + "% de error relativo"}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="cf-legend"><span>Menos error</span><i className="mapa-sw" style={{ background: "var(--surface-2)" }}></i><i className="mapa-sw" style={{ background: "#9DBBE4" }}></i><i className="mapa-sw" style={{ background: "var(--warn)" }}></i><i className="mapa-sw" style={{ background: "var(--danger)" }}></i><span>Más error</span><span className="cf-legend-note">El recuadro rojo marca tu peor tipo de error por materia.</span></div>
    </main>
  );
}

/* ============================ METAS SEMANALES + CONGELAR RACHA ============================ */
function Metas() {
  const st = window.useStore();
  const subjColor = window.subjColor;
  const w = window.weeklyProgress();
  const DOW = ["L", "M", "X", "J", "V", "S", "D"];
  const R = 66, C = 2 * Math.PI * R, frac = Math.min(1, w.active / w.goal);
  const hoyISO = new Date().toISOString().slice(0, 10);
  const yaCongeladoHoy = (st.plan.frozenDates || []).includes(hoyISO);
  const freeze = () => { const ok = window.EPStore.useFreeze(); window.toast && window.toast(ok ? "Día congelado — tu racha está a salvo" : "No quedan comodines o ya congelaste hoy", ok ? "ok" : "warn"); };
  return (
    <main className="main">
      <PageHeadK title="Metas semanales" sub="Constancia por semana, no solo por día — y un comodín para no perder la racha"
        crumbs={[["Inicio", "inicio"], "Metas semanales"]} />
      <div className="mt-grid">
        <section className="panel mt-ring-panel">
          <div className="mt-ring-wrap">
            <svg viewBox="0 0 160 160" className="mt-ring"><circle cx="80" cy="80" r={R} fill="none" stroke="var(--soft-line)" strokeWidth="11" /><circle cx="80" cy="80" r={R} fill="none" stroke="var(--accent)" strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 80 80)" style={{ transition: "stroke-dashoffset .8s" }} /></svg>
            <div className="mt-ring-c"><div className="mt-ring-n">{w.active}<span>/{w.goal}</span></div><div className="mt-ring-l">días activos</div></div>
          </div>
          <div className="mt-goal-row"><span>Meta semanal</span>
            <select className="input input-sm" value={w.goal} onChange={(e) => window.EPStore.setWeeklyGoal(+e.target.value)}>{[3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} días</option>)}</select>
          </div>
          <div className="mt-week">
            {w.days.map((d, i) => (
              <div key={d.iso} className={"mt-day" + (d.isToday ? " is-today" : "") + (d.future ? " is-future" : "")} title={d.iso + " · " + d.min + " min"}>
                <span className="mt-day-l">{DOW[i]}</span>
                <span className={"mt-day-dot" + (d.frozen ? " is-frozen" : d.active ? " is-active" : "")}>{d.frozen ? "❄" : d.active ? "✓" : ""}</span>
              </div>
            ))}
          </div>
        </section>
        <div className="mt-side">
          <PanelK idx="🔥" title="Racha" meta={st.plan.streak + " días"}>
            <div className="mt-streak"><div className="mt-streak-n">{st.plan.streak}</div><div className="mt-streak-l">días seguidos</div></div>
            <div className="mt-freeze">
              <div className="mt-freeze-h"><span>❄ Comodines de racha</span><b>{w.freezes} disponibles</b></div>
              <p className="mt-freeze-d">Úsalos en un día justificado (guardia, comisión) para no perder la racha.</p>
              <button className="btn btn-accent" onClick={freeze} disabled={w.freezes <= 0 || yaCongeladoHoy}>{yaCongeladoHoy ? "Hoy ya está congelado" : "Congelar hoy"}</button>
            </div>
          </PanelK>
          <PanelK idx="✓" title="Checkpoint del domingo" meta="revisión">
            <p className="mt-cp">{w.active >= w.goal ? "¡Meta semanal cumplida! Mantén el impulso la próxima semana." : "Te faltan " + (w.goal - w.active) + " día(s) activos para cumplir la meta de esta semana."}</p>
            <div className="cron-bar-track" style={{ height: "10px" }}><div className="cron-bar-fill" style={{ width: w.pct + "%", background: w.active >= w.goal ? "var(--ok)" : "var(--accent)" }}></div></div>
          </PanelK>
        </div>
      </div>
    </main>
  );
}

/* ============================ PODCAST DE REPASO (audio continuo) ============================ */
function Podcast() {
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = kSubjects();
  const [fuente, setFuente] = React.useState("falladas");
  const [subject, setSubject] = React.useState("todas");
  const [rate, setRate] = React.useState(1);
  const [playing, setPlaying] = React.useState(false);
  const [idx, setIdx] = React.useState(0);
  const [supported] = React.useState(() => typeof window.speechSynthesis !== "undefined");
  const playRef = React.useRef(false);
  const idxRef = React.useRef(0);

  const cola = React.useMemo(() => {
    let qs = (st.questions || []).slice();
    if (fuente === "falladas") qs = qs.filter((q) => q.status === "fall");
    else if (fuente === "importantes") qs = qs.filter((q) => q.status === "imp");
    if (subject !== "todas") qs = qs.filter((q) => q.subject === subject);
    return qs.slice(0, 40);
  }, [st.questions, fuente, subject]);

  React.useEffect(() => { setIdx(0); idxRef.current = 0; }, [fuente, subject]);
  React.useEffect(() => { idxRef.current = idx; }, [idx]);
  React.useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, []);

  const speak = (text) => new Promise((res) => {
    if (!supported) { setTimeout(res, 600); return; }
    const u = new SpeechSynthesisUtterance(text); u.lang = "es-MX"; u.rate = rate;
    const v = window.speechSynthesis.getVoices().filter((x) => x.lang.startsWith("es")); if (v[0]) u.voice = v[0];
    u.onend = res; u.onerror = res; window.speechSynthesis.speak(u);
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const run = async (from) => {
    let k = from;
    while (playRef.current && k < cola.length) {
      const q = cola[k]; setIdx(k);
      const resp = q.options && typeof q.answer === "number" ? q.options[q.answer] : (typeof q.answer === "string" ? q.answer : "");
      await speak("Pregunta. " + q.q); if (!playRef.current) return; await wait(1600);
      if (!playRef.current) return; await speak("Respuesta. " + (resp || "consulta el material")); if (!playRef.current) return;
      if (q.explain) { await wait(500); if (!playRef.current) return; await speak(q.explain); } await wait(700); k++;
    }
    if (k >= cola.length) { stop(); window.toast && window.toast("Fin del podcast de repaso", "ok"); }
  };
  const play = () => { if (!cola.length) return; playRef.current = true; setPlaying(true); run(idxRef.current); };
  const stop = () => { playRef.current = false; setPlaying(false); if (supported) window.speechSynthesis.cancel(); };
  const jump = (d) => { const was = playRef.current; stop(); const nx = Math.max(0, Math.min(cola.length - 1, idxRef.current + d)); setIdx(nx); idxRef.current = nx; if (was) setTimeout(play, 120); };

  const cur = cola[idx];
  return (
    <main className="main">
      <PageHeadK title="Podcast de repaso" sub="Escucha tus preguntas y respuestas en cadena — ideal para trayectos"
        crumbs={[["Inicio", "inicio"], "Podcast de repaso"]} />
      {!supported && <div className="audio-warn">⚠ Tu navegador no soporta voz; el podcast avanzará por temporizador sin audio.</div>}
      <div className="audio-bar">
        <select className="input" value={fuente} onChange={(e) => setFuente(e.target.value)} style={{ maxWidth: "200px" }}>
          <option value="falladas">Solo falladas</option><option value="importantes">Importantes</option><option value="todas">Todas</option>
        </select>
        <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ maxWidth: "220px" }}>
          <option value="todas">Todas las materias</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="audio-rate">Velocidad<input type="range" min="0.7" max="1.5" step="0.1" value={rate} onChange={(e) => setRate(+e.target.value)} /><b>{rate.toFixed(1)}×</b></label>
        <span className="audio-count">{cola.length ? (idx + 1) + " / " + cola.length : "0"}</span>
      </div>
      {!cola.length
        ? <EmptyStateK icon="🎙" title="No hay preguntas en esta lista" desc="Cambia la fuente o el filtro de materia." />
        : <section className={"pod-now" + (playing ? " is-playing" : "")} style={{ "--c": subjColor(cur.subject) }}>
            <div className="pod-wave">{Array.from({ length: 9 }).map((_, i) => <i key={i} style={{ animationDelay: (i * 0.09) + "s" }}></i>)}</div>
            <span className="audio-badge" style={{ background: subjColor(cur.subject), position: "static", alignSelf: "center" }}>{cur.subject}</span>
            <div className="pod-q">{cur.q}</div>
            <div className="pod-i">Pista {idx + 1} de {cola.length}</div>
          </section>}
      <div className="audio-ctrls">
        <button className="btn btn-lg" onClick={() => jump(-1)} disabled={!cola.length}>⏮</button>
        {!playing ? <button className="btn btn-accent btn-lg" onClick={play} disabled={!cola.length}>▶ Reproducir</button> : <button className="btn btn-lg" onClick={stop}>⏸ Pausar</button>}
        <button className="btn btn-lg" onClick={() => jump(1)} disabled={!cola.length}>⏭</button>
      </div>
    </main>
  );
}

/* ============================ GLOSARIO ============================ */
function Glosario() {
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = kSubjects();
  const { PromptDialog } = window;
  const [q, setQ] = React.useState("");
  const [subject, setSubject] = React.useState("todas");
  const [adding, setAdding] = React.useState(false);
  const terms = (st.glossary || []).filter((t) => {
    const okS = subject === "todas" || t.subject === subject;
    const needle = q.trim().toLowerCase();
    return okS && (!needle || (t.term + " " + t.def).toLowerCase().includes(needle));
  }).sort((a, b) => a.term.localeCompare(b.term));
  return (
    <main className="main">
      <PageHeadK title="Glosario" sub="Términos clave del temario, con su fundamento"
        crumbs={[["Inicio", "inicio"], "Glosario"]}
        actions={<button className="btn btn-accent" onClick={() => setAdding(true)}>+ Nuevo término</button>} />
      <div className="notas-hub-bar">
        <input className="input search-input" placeholder="Buscar término…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ maxWidth: "220px" }}><option value="todas">Todas</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
        <span className="notas-hub-count">{terms.length} término(s)</span>
      </div>
      {terms.length === 0
        ? <EmptyStateK icon="📖" title="Sin términos" desc="Añade tu primer término del temario." actions={<button className="btn btn-accent" onClick={() => setAdding(true)}>+ Nuevo término</button>} />
        : <div className="gl-grid">
            {terms.map((t) => (
              <section className="gl-card" key={t.id} style={{ borderTop: "3px solid " + subjColor(t.subject) }}>
                <div className="gl-card-h"><span className="gl-term">{t.term}</span><button className="cron-x" onClick={() => window.EPStore.deleteGlossary(t.id)} aria-label="Eliminar">×</button></div>
                <p className="gl-def">{t.def}</p>
                <div className="gl-foot"><span className="gl-subj" style={{ color: subjColor(t.subject) }}>{t.subject}</span>{t.ref && <span className="gl-ref">{t.ref}</span>}</div>
              </section>
            ))}
          </div>}
      <PromptDialog open={adding} title="Nuevo término"
        fields={[{ key: "term", label: "Término", placeholder: "p. ej. Insubordinación", required: true }, { key: "subject", label: "Materia", placeholder: SUBJECTS[0], required: true }, { key: "def", label: "Definición", type: "textarea", placeholder: "Definición breve…", required: true }, { key: "ref", label: "Fundamento (opcional)", placeholder: "CJM · Art. …" }]}
        confirmLabel="Guardar término" onConfirm={(v) => { window.EPStore.addGlossary(v); setAdding(false); window.toast && window.toast("Término añadido", "ok"); }} onClose={() => setAdding(false)} />
    </main>
  );
}

/* ============================ SIMULADOR DE NOTA FINAL ============================ */
function Simulador() {
  const go = useGoK();
  const s = window.scoreScenarios();
  const yOf = (n, h) => h - (n / 10) * h;
  return (
    <main className="main">
      <PageHeadK title="Simulador de nota final" sub="Tu nota estimada el 27 de julio según cómo sigas estudiando"
        crumbs={[["Progreso", "inteligencia"], "Simulador de nota"]} />
      <div className="prep-kpis">
        <div className="kpi prep-kpi"><div className="kpi-v">{s.base}</div><div className="kpi-l">Nota base (hoy)</div></div>
        <div className="kpi prep-kpi"><div className="kpi-v">{s.dias}</div><div className="kpi-l">Días al examen</div></div>
        <div className="kpi prep-kpi"><div className="kpi-v">{s.umbral}.0</div><div className="kpi-l">Umbral aprobatorio</div></div>
      </div>
      <div className="sim-scn">
        {s.escenarios.map((e) => (
          <section key={e.key} className="panel sim-card" style={{ borderTop: "4px solid " + e.color }}>
            <div className="sim-card-l">{e.label}</div>
            <div className="sim-card-n" style={{ color: e.color }}>{e.nota}</div>
            <div className={"sim-card-tag" + (e.aprueba ? " ok" : " no")}>{e.aprueba ? "✓ Aprueba" : "✕ No aprueba"}</div>
            <p className="sim-card-d">{e.desc}</p>
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="panel-h"><div className="panel-h-l"><span className="panel-idx">📊</span><span className="panel-title">Proyección al examen</span></div></div>
        <div className="panel-b">
          <svg viewBox="0 0 640 240" className="sim-chart">
            {[0, 2, 4, 6, 8, 10].map((g) => (<g key={g}><line x1="40" y1={20 + yOf(g, 180)} x2="620" y2={20 + yOf(g, 180)} stroke="var(--soft-line)" /><text x="32" y={24 + yOf(g, 180)} textAnchor="end" className="evo-axis">{g}</text></g>))}
            <line x1="40" y1={20 + yOf(6, 180)} x2="620" y2={20 + yOf(6, 180)} stroke="var(--warn)" strokeDasharray="4 4" opacity=".6" />
            {s.escenarios.map((e, i) => (
              <g key={e.key}>
                <line x1="70" y1={20 + yOf(s.base, 180)} x2="600" y2={20 + yOf(e.nota, 180)} stroke={e.color} strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="600" cy={20 + yOf(e.nota, 180)} r="5" fill="#fff" stroke={e.color} strokeWidth="2.5" />
                <text x="608" y={24 + yOf(e.nota, 180)} className="evo-val" fill={e.color}>{e.nota}</text>
              </g>
            ))}
            <circle cx="70" cy={20 + yOf(s.base, 180)} r="5" fill="var(--ink)" />
            <text x="70" y={20 + yOf(s.base, 180) - 12} textAnchor="middle" className="evo-axis">hoy</text>
            <text x="600" y="235" textAnchor="middle" className="evo-axis">27-jul</text>
          </svg>
          <div className="evo-legend">{s.escenarios.map((e) => <span key={e.key}><i style={{ background: e.color }}></i>{e.label}</span>)}<span><i className="evo-dash evo-warn"></i>Umbral (6)</span></div>
        </div>
      </section>
      <section className="panel sim-cta"><span>La diferencia entre aprobar y no está en la constancia de las próximas {s.semanas} semanas.</span><button className="btn btn-accent" onClick={() => go("repaso")}>Empezar a cerrar la brecha ▸</button></section>
    </main>
  );
}

Object.assign(window, { ExamenAdaptativo, Confusiones, Metas, Podcast, Glosario, Simulador });
