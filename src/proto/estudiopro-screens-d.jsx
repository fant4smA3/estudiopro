/* EstudioPro · Prototipo — Pantallas D: Calendario, Simulacro (config + bloques), Alertas */
const { useGo: useGoD, PageHead: PageHeadD, Panel: PanelD, Diff: DiffD, Crumbs: CrumbsD } = window;

/* ============================ CALENDARIO ============================ */
function Calendario() {
  const go = useGoD();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const [cursor, setCursor] = React.useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = React.useState(null);
  React.useEffect(() => { if (!st.plan.generado) window.generarPlan(); }, []);
  const dias = st.plan.dias || [];
  const byDate = {}; dias.forEach((d) => { byDate[d.fecha] = d; });

  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DOW = ["L", "M", "X", "J", "V", "S", "D"];
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const examStr = st.plan.examDate;
  const fmt = (dd) => new Date(y, m, dd).toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let dd = 1; dd <= daysInMonth; dd++) cells.push(dd);

  const estadoCls = { hecho: "cd-done", parcial: "cd-partial", pendiente: "" };
  const planMonth = dias.filter((d) => d.fecha.startsWith(y + "-" + String(m + 1).padStart(2, "0")));
  const hechos = planMonth.filter((d) => d.estado === "hecho").length;

  const openDay = (dd) => { const d = byDate[fmt(dd)]; if (d) setSel(d); };
  const startDay = (d) => {
    if (d.tipo === "simulacro") { go("simulacro"); return; }
    window.__epSimulacro = false; window.__epSubject = d.subject;
    window.EPStore.setNav({ subject: d.subject, ord: d.ord, mode: "practica" });
    go("quiz");
  };
  const markDone = (d) => {
    window.EPStore.get().plan.dias = dias.map((x) => x.fecha === d.fecha ? { ...x, estado: "hecho" } : x);
    window.EPStore.setGoal(st.plan.dailyGoal); // fuerza emit
    setSel({ ...d, estado: "hecho" });
    window.toast && window.toast("Día marcado como estudiado", "ok");
  };

  return (
    <main className="main">
      <PageHeadD title="Calendario de estudio" sub="Plan hasta el examen · 27 jul 2026" crumbs={[["Inicio", "inicio"], "Calendario"]}
        actions={<div className="cal-nav">
          <button className="btn btn-sm" onClick={() => setCursor(new Date(y, m - 1, 1))}>‹</button>
          <span className="cal-month">{MES[m]} {y}</span>
          <button className="btn btn-sm" onClick={() => setCursor(new Date(y, m + 1, 1))}>›</button>
          <button className="btn btn-sm" onClick={() => { window.generarPlan(); window.toast && window.toast("Plan regenerado", "ok"); }}>Regenerar plan</button>
        </div>} />

      <div className="cal-legend">
        <span><i className="cal-dot cd-done"></i> Estudiado</span>
        <span><i className="cal-dot cd-partial"></i> Parcial</span>
        <span><i className="cal-dot"></i> Pendiente</span>
        <span><i className="cal-dot cd-sim"></i> Simulacro (viernes)</span>
        <span className="cal-legend-r">{hechos} días estudiados este mes</span>
      </div>

      <div className="calendar">
        <div className="cal-grid cal-head">
          {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
        </div>
        <div className="cal-grid">
          {cells.map((dd, i) => {
            if (dd === null) return <div className="cal-cell cal-empty" key={"e" + i}></div>;
            const ds = fmt(dd);
            const d = byDate[ds];
            const isToday = ds === todayStr;
            const isExam = ds === examStr;
            const c = d && d.subject ? subjColor(d.subject) : null;
            return (
              <div key={dd} className={"cal-cell" + (isToday ? " is-today" : "") + (isExam ? " is-exam" : "") + (d ? " has-plan" : "")}
                onClick={() => openDay(dd)} role={d ? "button" : undefined}>
                <span className="cal-num">{dd}{isExam && <span className="cal-examflag">EXAMEN</span>}</span>
                {d && d.tipo === "simulacro" && <span className="cal-chip cal-chip-sim">Simulacro 200</span>}
                {d && d.tipo === "estudio" && <span className="cal-chip" style={{ background: c + "22", color: c }}><i className="cal-dot" style={{ background: c }}></i>{d.subject.split(" ")[0]}</span>}
                {d && d.tipo === "repaso" && <span className="cal-chip cal-chip-rep">Repaso</span>}
                {d && d.titulo && d.tipo !== "simulacro" && <span className="cal-cap">{d.titulo.replace(/^(Cap\.|Libro|Título)\s*/, "")}</span>}
                {d && <span className={"cal-state " + (estadoCls[d.estado] || "")}></span>}
              </div>
            );
          })}
        </div>
      </div>

      {sel && (
        <div className="cal-sheet" onClick={() => setSel(null)}>
          <div className="cal-sheet-card" onClick={(e) => e.stopPropagation()} style={sel.subject ? { borderTop: "3px solid " + subjColor(sel.subject) } : { borderTop: "3px solid var(--accent)" }}>
            <button className="cal-sheet-x" onClick={() => setSel(null)}>✕</button>
            <div className="cal-sheet-date">{new Date(sel.fecha + "T00:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</div>
            <div className="cal-sheet-title">{sel.tipo === "simulacro" ? "Simulacro general" : sel.subject}</div>
            <div className="cal-sheet-sub">{sel.ord}{sel.titulo ? " · " + sel.titulo : ""}</div>
            <div className="cal-sheet-stats">
              <span className="sc"><b>{sel.min}</b> min estimados</span>
              <span className="sc"><b>{sel.npreg}</b> preguntas</span>
              <span className={"sc cal-badge-" + sel.estado}>{sel.estado}</span>
            </div>
            <div className="cal-sheet-acts">
              <button className="btn btn-accent" onClick={() => startDay(sel)}>{sel.tipo === "simulacro" ? "Ir al simulacro ▸" : "Estudiar ahora ▸"}</button>
              {sel.estado !== "hecho" && <button className="btn" onClick={() => markDone(sel)}>Marcar hecho</button>}
              <button className="btn" onClick={() => setSel(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
window.Calendario = Calendario;

/* ====================== SIMULACRO (config + bloques) ====================== */
function Simulacro() {
  const go = useGoD();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = Object.keys(window.SUBJECT_COLORS || {});
  const DEF = { "Legislación Militar": 40, "Operaciones Militares": 35, "Normatividad Gubernamental": 35, "Aspecto Administrativo": 25, "Adiestramiento y Mando Militar": 30, "Aspecto Técnico": 35 };
  const [dist, setDist] = React.useState(DEF);
  const [modo, setModo] = React.useState("aleatorio");
  const [filtro, setFiltro] = React.useState("ninguno");
  // disponibilidad real por materia en el banco (sólo preguntas calificables, no abiertas)
  const gradable = (st.questions || []).filter((q) => q.type !== "AB");
  const avail = {}; SUBJECTS.forEach((s) => { avail[s] = gradable.filter((q) => q.subject === s).length; });
  const eff = {}; SUBJECTS.forEach((s) => { eff[s] = Math.min(dist[s] || 0, avail[s]); });
  const total = SUBJECTS.reduce((a, s) => a + (dist[s] || 0), 0);
  const effTotal = SUBJECTS.reduce((a, s) => a + eff[s], 0);
  const ok = total === 200;
  const setN = (s, v) => setDist((d) => ({ ...d, [s]: Math.max(0, Math.min(80, v || 0)) }));
  const repartirPorPeso = () => setDist(DEF);

  return (
    <main className="main">
      <PageHeadD title="Simulacro de examen" sub="200 preguntas · 120 + 15 descanso + 120 min" crumbs={[["Inicio", "inicio"], "Simulacro"]} />

      <div className="quiz-config">
        <div className="qc-main">
          <PanelD idx="01" title="Preguntas por materia" meta={total + " / 200"}>
            <div className="sim-dist">
              {SUBJECTS.map((s) => (
                <div className="sim-dist-row" key={s}>
                  <span className="matstat-dot" style={{ background: subjColor(s) }}></span>
                  <span className="sim-dist-name">{s} <span className="opt-note">· {avail[s]} disp.</span></span>
                  <div className="sim-stepper">
                    <button className="step-btn" onClick={() => setN(s, dist[s] - 5)} aria-label={"Menos preguntas de " + s}>−</button>
                    <input className="sim-num" value={dist[s]} onChange={(e) => setN(s, parseInt(e.target.value.replace(/\D/g, "")) || 0)} aria-label={"Preguntas de " + s} />
                    <button className="step-btn" onClick={() => setN(s, dist[s] + 5)} aria-label={"Más preguntas de " + s}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="sim-total-bar">
              <div className="sim-total-track">
                {SUBJECTS.map((s) => dist[s] > 0 && <div key={s} className="sim-total-seg" style={{ width: (dist[s] / Math.max(total, 200) * 100) + "%", background: subjColor(s) }}></div>)}
              </div>
              <div className={"sim-total-n" + (ok ? " is-ok" : " is-bad")}>{total} / 200 {ok ? "✓" : ""}</div>
            </div>
            <button className="btn btn-sm" style={{ marginTop: "10px" }} onClick={repartirPorPeso}>Repartir por peso</button>
          </PanelD>

          <PanelD idx="02" title="Selección de preguntas">
            <div className="field">
              <label>Modo</label>
              <div className="mode-cards">
                <div className={"mode-card" + (modo === "aleatorio" ? " is-on" : "")} onClick={() => setModo("aleatorio")}>
                  <div className="mode-card-t">Aleatorio</div>
                  <div className="mode-card-d">Preguntas al azar de cada materia.</div>
                </div>
                <div className={"mode-card" + (modo === "filtros" ? " is-on" : "")} onClick={() => setModo("filtros")}>
                  <div className="mode-card-t">Por filtros</div>
                  <div className="mode-card-d">Acota por capítulo, dificultad o estado.</div>
                </div>
              </div>
            </div>
            {modo === "filtros" && (
              <div className="seg seg-wrap" style={{ marginTop: "12px" }}>
                {["ninguno", "solo falladas", "importantes", "difíciles"].map((f) => (
                  <span key={f} className={"segchip" + (filtro === f ? " is-on" : "")} onClick={() => setFiltro(f)}>{f}</span>
                ))}
              </div>
            )}
          </PanelD>

          <PanelD idx="03" title="Estructura del examen">
            <div className="sim-blocks">
              <div className="sim-block"><span className="sim-block-n">1</span><div><div className="sim-block-t">Bloque 1 · 100 preguntas</div><div className="sim-block-d">120 minutos</div></div></div>
              <div className="sim-block sim-block-rest"><span className="sim-block-n">☕</span><div><div className="sim-block-t">Descanso</div><div className="sim-block-d">15 minutos</div></div></div>
              <div className="sim-block"><span className="sim-block-n">2</span><div><div className="sim-block-t">Bloque 2 · 100 preguntas</div><div className="sim-block-d">120 minutos</div></div></div>
            </div>
          </PanelD>
        </div>

        <aside className="qc-side">
          <div className="qc-summary">
            <div className="qc-summary-h">Resumen del simulacro</div>
            <div className="qc-sum-row"><span>Preguntas</span><b>{total}</b></div>
            <div className="qc-sum-row"><span>Modo</span><b>{modo === "aleatorio" ? "Aleatorio" : "Filtros"}</b></div>
            {modo === "filtros" && filtro !== "ninguno" && <div className="qc-sum-row"><span>Filtro</span><b>{filtro}</b></div>}
            <div className="qc-sum-row"><span>Tiempo</span><b>4 h 15 min</b></div>
            <div className="qc-sum-row"><span>Estructura</span><b>{Math.ceil(effTotal / 2)} + {Math.floor(effTotal / 2)}</b></div>
            {effTotal < total && <div className="qc-sum-row"><span>Disponibles</span><b>{effTotal} en tu banco</b></div>}
            <div className="qc-sum-est">{effTotal === 0 ? "Tu banco no tiene preguntas para esta selección" : (ok && effTotal === 200 ? "Listo para iniciar" : effTotal < total ? "Se usarán las " + effTotal + " disponibles" : "Ajusta a 200 preguntas")}</div>
            <button className="btn btn-accent btn-lg" style={{ width: "100%" }} disabled={effTotal === 0}
              onClick={() => { window.EPStore.setNav({ simDist: dist, simFiltro: modo === "filtros" ? filtro : "ninguno" }); go("simrun"); }}>Iniciar simulacro ▸</button>
          </div>
        </aside>
      </div>
    </main>
  );
}
window.Simulacro = Simulacro;

/* ====================== SIMULACRO en curso (2 bloques + descanso) ====================== */
function SimRun() {
  const go = useGoD();
  const { TYPE_LABEL, ConfirmDialog } = window;
  // pool real: preguntas del banco según la distribución configurada, sin repetición
  const pool = React.useMemo(() => {
    const nav = (window.EPStore.getNav && window.EPStore.getNav()) || {};
    const dist = nav.simDist || { "Legislación Militar": 40, "Operaciones Militares": 35, "Normatividad Gubernamental": 35, "Aspecto Administrativo": 25, "Adiestramiento y Mando Militar": 30, "Aspecto Técnico": 35 };
    const filtro = nav.simFiltro || "ninguno";
    const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    let bank = (window.EPStore.get().questions || []).filter((q) => q.type !== "AB");
    if (filtro === "solo falladas") bank = bank.filter((q) => q.status === "fall");
    else if (filtro === "importantes") bank = bank.filter((q) => q.status === "imp");
    else if (filtro === "difíciles") bank = bank.filter((q) => q.dif === "difícil");
    const out = [];
    Object.keys(dist).forEach((s) => {
      const qs = shuffle(bank.filter((q) => q.subject === s)).slice(0, dist[s] || 0);
      out.push(...qs);
    });
    return shuffle(out).map((q, i) => ({ ...q, _slot: i }));
  }, []);
  const total = pool.length;
  const half = Math.ceil(total / 2);
  const [phase, setPhase] = React.useState("b1"); // b1 | rest | b2 | done
  const [cur, setCur] = React.useState(0);
  const [answers, setAnswers] = React.useState(() => pool.map(() => null));
  const [flags, setFlags] = React.useState(() => pool.map(() => false));
  const [secs, setSecs] = React.useState(120 * 60);
  const [showExit, setShowExit] = React.useState(false);
  const elapsedRef = React.useRef(0); // segundos consumidos en bloques anteriores
  const range = phase === "b2" ? [half, total] : [0, half];
  React.useEffect(() => {
    if (phase === "done" || total === 0) return;
    const t = setInterval(() => setSecs((s) => {
      if (s <= 1) { advancePhase(); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [phase]);
  const advancePhase = () => {
    if (phase === "b1") {
      elapsedRef.current += 120 * 60 - secs;
      if (half >= total) { finish(); return; } // no hay segundo bloque
      setPhase("rest"); setSecs(15 * 60); setCur(half);
    }
    else if (phase === "rest") { setPhase("b2"); setSecs(120 * 60); setCur(half); }
    else if (phase === "b2") { elapsedRef.current += 120 * 60 - secs; finish(); }
  };
  const mmss = String(Math.floor(secs / 60)).padStart(2, "0") + ":" + String(secs % 60).padStart(2, "0");
  const q = pool[cur];
  const sel = answers[cur];
  const setAns = (i) => setAnswers((a) => a.map((v, k) => (k === cur ? i : v)));
  const toggleFlag = () => setFlags((f) => f.map((v, k) => (k === cur ? !v : v)));
  const answered = answers.slice(range[0], range[1]).filter((a) => a !== null).length;
  const finish = () => {
    let correct = 0; const byMat = {};
    pool.forEach((qq, k) => {
      if (!byMat[qq.subject]) byMat[qq.subject] = { ok: 0, total: 0 };
      byMat[qq.subject].total++;
      if (answers[k] === qq.answer) { correct++; byMat[qq.subject].ok++; }
    });
    const score = total ? +(correct / total * 10).toFixed(1) : 0;
    // registra el simulacro en el histórico de Evolución (global + por materia)
    const byS = {}; Object.entries(byMat).forEach(([k, v]) => { byS[k] = v.total ? +(v.ok / v.total * 10).toFixed(1) : 0; });
    window.EPStore.addSimResult({ global: score, byS });
    // marca el banco real con el desempeño del simulacro
    const seen = {}; pool.forEach((qq, k) => { if (qq._id) seen[qq._id] = { id: qq._id, correct: answers[k] === qq.answer }; });
    window.EPStore.applyQuizResults(Object.values(seen));
    const el = elapsedRef.current;
    const time = String(Math.floor(el / 60)).padStart(2, "0") + ":" + String(el % 60).padStart(2, "0");
    const missed = pool.map((qq, k) => ({ q: qq.q, loc: qq.loc, ord: qq.ord, ok: answers[k] === qq.answer })).filter((m) => !m.ok);
    window.EPStore.setLastResult({ subject: "Simulacro general", total, correct, wrong: total - correct, time, score, isSim: true,
      byChapter: Object.fromEntries(Object.entries(byMat).map(([k, v]) => [k, v])), missed });
    window.EPStore.addSession({ subject: "Simulacro general", label: "Simulacro general · " + total + " preg", n: total, time, score, date: new Date().toISOString().slice(0, 10), state: "done" });
    window.EPStore.bumpToday(answers.filter((a) => a !== null).length);
    setPhase("done");
  };
  // banco sin preguntas para la selección: estado vacío en lugar de sesión
  if (total === 0) {
    return (
      <main className="main main-center">
        <div className="card-stage">
          <window.EmptyState icon="⌕" title="No hay preguntas para el simulacro"
            desc="Tu banco no tiene preguntas calificables para la distribución elegida. Importa o crea preguntas primero."
            actions={<React.Fragment>
              <button className="btn" onClick={() => go("simulacro")}>‹ Ajustar simulacro</button>
              <button className="btn btn-accent" onClick={() => go("importar")}>Importar preguntas ▸</button>
            </React.Fragment>} />
        </div>
      </main>
    );
  }

  if (phase === "rest") {
    return (
      <main className="main main-center">
        <div className="rest-screen">
          <div className="rest-ic">☕</div>
          <div className="rest-h">Descanso</div>
          <div className="rest-timer">{mmss}</div>
          <div className="rest-sub">Bloque 1 completado. El Bloque 2 inicia automáticamente al terminar el descanso.</div>
          <button className="btn btn-accent btn-lg" onClick={() => { setPhase("b2"); setSecs(120 * 60); setCur(100); }}>Saltar descanso e iniciar Bloque 2 ▸</button>
        </div>
      </main>
    );
  }
  if (phase === "done") {
    const r = window.EPStore.get().lastResult;
    return (
      <main className="main main-center">
        <div className="rest-screen">
          <div className="rest-ic" style={{ background: "var(--ok-tint)", color: "var(--ok)" }}>✓</div>
          <div className="rest-h">Simulacro completado</div>
          <div className="res-score" style={{ justifyContent: "center", border: 0 }}><div className="res-score-n">{r.score}</div><div className="res-score-d">/ 10</div></div>
          <div className="rest-sub">{r.correct} correctas · {r.wrong} incorrectas de {r.total}. Las falladas se enviaron a tu repaso prioritario.</div>
          <div className="form-actions" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => go("inicio")}>Volver al inicio</button>
            <button className="btn btn-accent" onClick={() => go("resultado")}>Ver resultado detallado ▸</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="main main-flush">
      <header className="page-head-card" style={{ borderTop: "3px solid var(--accent)" }}>
        <div className="quiz-bar">
          <div className="quiz-headline">
            <span className="quiz-headline-tag">Simulacro · {phase === "b1" ? "Bloque 1" : "Bloque 2"} · modo examen</span>
            <span className="quiz-headline-name">Pregunta {cur + 1} de {total}</span>
          </div>
          <div className="quiz-meta">
            <span className="quiz-prog">{answered} / {range[1] - range[0]} contestadas</span>
            <span className={"quiz-timer" + (secs < 300 ? " is-low" : "")}>⏱ {mmss}</span>
            <button className="btn btn-sm" onClick={() => setShowExit(true)}>Salir</button>
            <button className="btn btn-sm btn-accent" onClick={advancePhase}>{phase === "b1" ? "Terminar Bloque 1 ▸" : "Finalizar ▸"}</button>
          </div>
        </div>
      </header>

      <div className="quiz-grid">
        <section className="quiz-main">
          <div className="q-head">
            <span className="type-tag">{TYPE_LABEL[q.type] || q.type}</span>
            <DiffD level={q.dif} />
            <span className="q-tag" style={{ color: window.subjColor(q.subject), fontWeight: 700 }}>{q.subject}</span>
            {flags[cur] && <span className="q-flagged">★ marcada</span>}
          </div>
          <div className="q-text">{q.q}</div>
          {q.type === "AB" ? (
            <textarea className="input textarea" placeholder="Escribe tu respuesta…"></textarea>
          ) : (
            <div className="opts">
              {q.options.map((t, i) => (
                <label className={"opt" + (sel === i ? " is-sel" : "")} key={i} onClick={() => setAns(i)}>
                  <span className="opt-k">{String.fromCharCode(65 + i)}</span>
                  <span className="opt-t">{t}</span>
                  <span className="opt-radio" aria-hidden="true"></span>
                </label>
              ))}
            </div>
          )}
          <div className="q-foot">
            <button className="btn" disabled={cur <= range[0]} onClick={() => setCur(Math.max(range[0], cur - 1))}>‹ Anterior</button>
            <label className={"flag-chk" + (flags[cur] ? " is-on" : "")} onClick={toggleFlag}><span className="box"></span> Marcar</label>
            <span style={{ flex: 1 }}></span>
            <button className="btn btn-accent" disabled={cur >= range[1] - 1} onClick={() => setCur(Math.min(range[1] - 1, cur + 1))}>Siguiente ▸</button>
          </div>
        </section>

        <aside className="quiz-rail">
          <div className="rail-h">Hoja de respuestas · {range[0] + 1}–{range[1]}</div>
          <div className="qnav qnav-sim">
            {pool.slice(range[0], range[1]).map((_, idx) => {
              const n = range[0] + idx;
              const stt = n === cur ? "cur" : flags[n] ? "flag" : answers[n] !== null ? "done" : "";
              return <span key={n} className={"qn qn-" + stt} onClick={() => setCur(n)}>{n + 1}</span>;
            })}
          </div>
          <div className="rail-legend">
            <div><span className="qn qn-done"></span> Contestada</div>
            <div><span className="qn qn-flag"></span> Marcada</div>
            <div><span className="qn qn-cur"></span> Actual</div>
          </div>
        </aside>
      </div>

      <ConfirmDialog open={showExit} danger confirmLabel="Salir del simulacro"
        title="¿Salir del simulacro?" body={<span>Perderás el progreso de este simulacro. ¿Seguro que quieres salir?</span>}
        onClose={() => setShowExit(false)} onConfirm={() => go("inicio")} />
    </main>
  );
}
window.SimRun = SimRun;

/* ============================ ALERTAS ============================ */
function Alertas() {
  const go = useGoD();
  const [cfg, setCfg] = React.useState({ diaria: true, vencidas: true, simulacro: true, racha: true, meta: false });
  const [perm, setPerm] = React.useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const pedirPermiso = async () => {
    if (typeof Notification === "undefined") { setPerm("unsupported"); window.toast && window.toast("Navegador sin soporte de notificaciones", "warn"); return; }
    const p = await Notification.requestPermission(); setPerm(p);
    if (p === "granted") window.epNotify("Notificaciones activadas", "Te avisaremos de tus repasos y simulacros.");
  };
  const t = (k) => setCfg((p) => ({ ...p, [k]: !p[k] }));
  const Switch = window.Switch;
  const alerts = [
    ["diaria", "🗓️", "Recordatorio de sesión diaria", "Hoy toca Legislación · CJM Libro Primero", "8:00 a.m.", "var(--accent)"],
    ["vencidas", "🔁", "Tarjetas vencidas", "Tienes 58 tarjetas para repasar hoy", "9:00 a.m.", "#A0742A"],
    ["simulacro", "📝", "Simulacro del viernes", "Hoy: simulacro de 200 preguntas (4 h 15 min)", "viernes 8:00 a.m.", "#2A8A5E"],
    ["racha", "🔥", "Racha en riesgo", "No pierdas tu racha de 12 días", "9:00 p.m.", "#C2410C"],
    ["meta", "🎯", "Meta diaria no cumplida", "Te faltan 12 preguntas para tu meta", "9:30 p.m.", "#7A57C2"],
  ];
  return (
    <main className="main">
      <PageHeadD title="Alertas y recordatorios" sub="Notificaciones del plan de estudio" crumbs={[["Inicio", "inicio"], "Alertas"]} />

      <Panel idx="01" title="Próximas notificaciones">
        <div className="alert-list">
          {alerts.filter((a) => cfg[a[0]]).map(([k, ic, title, msg, when, c]) => (
            <div className="alert-row" key={k}>
              <span className="alert-ic" style={{ background: c + "22", color: c }}>{ic}</span>
              <div className="alert-body">
                <div className="alert-title">{title}</div>
                <div className="alert-msg">{msg}</div>
              </div>
              <span className="alert-when">{when}</span>
            </div>
          ))}
          {alerts.filter((a) => cfg[a[0]]).length === 0 && <div className="notas-empty">No tienes alertas activas. Actívalas abajo.</div>}
        </div>
      </Panel>

      <Panel idx="02" title="Notificaciones del navegador">
        <div className="notif-perm">
          <div className="notif-perm-l">
            <div className="notif-perm-s">Estado: <b className={"notif-badge notif-" + perm}>{perm === "granted" ? "activadas" : perm === "denied" ? "bloqueadas" : perm === "unsupported" ? "no soportadas" : "sin activar"}</b></div>
            <div className="set-desc">Recibe recordatorios reales aunque la pestaña esté en segundo plano.</div>
          </div>
          <div className="notif-perm-a">
            {perm !== "granted" && perm !== "unsupported" && <button className="btn btn-accent" onClick={pedirPermiso}>Activar notificaciones</button>}
            {perm === "granted" && <button className="btn" onClick={() => window.epNotify("EstudioPro · recordatorio", "Hoy toca Legislación · CJM Libro Primero. ¡A repasar!")}>Probar notificación</button>}
          </div>
        </div>
      </Panel>

      <Panel idx="03" title="Configuración de alertas">
        <div className="settings">
          {alerts.map(([k, ic, title, msg, when]) => (
            <div className="set-row" key={k}>
              <div><div className="set-label">{ic} {title}</div><div className="set-desc">{msg}</div></div>
              <div className="alert-cfg-r">
                <select className="input input-sm" defaultValue={when} disabled={!cfg[k]} aria-label={"Horario · " + title}>
                  <option>{when}</option><option>7:00 a.m.</option><option>8:00 a.m.</option><option>12:00 p.m.</option><option>6:00 p.m.</option><option>9:00 p.m.</option>
                </select>
                <Switch on={cfg[k]} onClick={() => t(k)} label={title} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </main>
  );
}
window.Alertas = Alertas;

/* ====================== REPASO PRIORITARIO (cola SRS) ====================== */
function RepasoPrioritario() {
  const go = useGoD();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = Object.keys(window.SUBJECT_COLORS || {});
  // construye la cola con el orden del plan §5: falladas → importantes → vencidas → nuevas
  const falladas = st.questions.filter((q) => q.status === "fall");
  const importantes = st.questions.filter((q) => q.status === "imp");
  const vencidas = st.cards.filter((c) => c.nivel !== "dominado").slice(0, 26);
  const nuevas = st.questions.filter((q) => q.status === "nuevo").slice(0, 11);
  const cola = [
    { tier: "1", label: "Falladas", color: "var(--danger)", desc: "Respondidas incorrectamente · máxima prioridad", items: falladas, kind: "preg" },
    { tier: "2", label: "Importantes", color: "var(--warn)", desc: "Marcadas por ti para reforzar", items: importantes, kind: "preg" },
    { tier: "3", label: "Tarjetas vencidas", color: "var(--accent)", desc: "Toca repasarlas hoy según el calendario SRS", items: vencidas, kind: "tarj" },
    { tier: "4", label: "Nuevas del día", color: "var(--mute)", desc: "Contenido del plan de hoy", items: nuevas, kind: "preg" },
  ];
  const totalCola = cola.reduce((a, t) => a + t.items.length, 0);
  const startTier = (t) => {
    if (t.kind === "tarj") { window.__epSubject = null; go("tarjetas"); return; }
    window.__epSimulacro = false; window.__epSubject = (t.items[0] && t.items[0].subject) || "Legislación Militar";
    window.EPStore.setNav({ subject: window.__epSubject, mode: "practica", filter: t.label === "Falladas" ? "fall" : t.label === "Importantes" ? "imp" : null });
    go("quiz");
  };
  return (
    <main className="main">
      <PageHeadD title="Repaso prioritario" sub="Cola inteligente: primero lo que más lo necesita" crumbs={[["Inicio", "inicio"], "Repaso prioritario"]}
        actions={<button className="btn btn-accent" disabled={!totalCola} onClick={() => startTier(cola.find((t) => t.items.length) || cola[0])}>Iniciar repaso ▸</button>} />

      <div className="rp-summary">
        <div className="rp-sum-n"><b>{totalCola}</b><span>en cola hoy</span></div>
        <div className="rp-sum-split">
          {cola.map((t) => (
            <div className="rp-sum-cell" key={t.tier}>
              <span className="rp-sum-dot" style={{ background: t.color }}></span>
              <b>{t.items.length}</b> {t.label}
            </div>
          ))}
        </div>
      </div>

      <div className="rp-tiers">
        {cola.map((t) => (
          <div className="rp-tier" key={t.tier} style={{ borderLeft: "3px solid " + t.color }}>
            <div className="rp-tier-h">
              <span className="rp-tier-badge" style={{ background: t.color }}>{t.tier}</span>
              <div className="rp-tier-info">
                <div className="rp-tier-title">{t.label} <span className="rp-tier-count">· {t.items.length}</span></div>
                <div className="rp-tier-desc">{t.desc}</div>
              </div>
              <button className="btn btn-sm" disabled={!t.items.length} onClick={() => startTier(t)}>Repasar</button>
            </div>
            {t.items.length > 0 && (
              <div className="rp-items">
                {t.items.slice(0, 3).map((it, i) => (
                  <div className="rp-item" key={i}>
                    <span className="rp-item-bar" style={{ background: subjColor(it.subject) }}></span>
                    <span className="rp-item-q">{it.q || it.front}</span>
                    <span className="rp-item-subj" style={{ color: subjColor(it.subject) }}>{(it.subject || "").split(" ")[0]}</span>
                  </div>
                ))}
                {t.items.length > 3 && <div className="rp-more">+ {t.items.length - 3} más en esta categoría</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rp-note">
        <b>¿Cómo funciona?</b> Cada respuesta ajusta la próxima revisión (repetición espaciada). Una pregunta sale de "Falladas" tras <b>2 aciertos seguidos</b>; las difíciles vuelven hoy, las fáciles en varios días.
      </div>
    </main>
  );
}
window.RepasoPrioritario = RepasoPrioritario;

/* ====================== SESIÓN DE HOY (modo enfoque) ====================== */
function SesionHoy() {
  const go = useGoD();
  const subjColor = window.subjColor;
  const ses = window.__epSesion || { subject: "Legislación Militar", ord: "Código de Justicia Militar", titulo: "Libro Primero", step: 0 };
  const color = subjColor(ses.subject);
  const [step, setStep] = React.useState(ses.step || 0);
  const steps = [
    { n: "1", t: "Leer el tema", d: "Estudia el material físico (manual) de este capítulo. Marca cuando termines.", ic: "📖", cta: "Marqué como leído ▸" },
    { n: "2", t: "Repaso de tarjetas", d: "Refuerza con flashcards del tema (repetición espaciada).", ic: "🃏", cta: "Hacer tarjetas ▸" },
    { n: "3", t: "Cuestionario", d: "Comprueba lo aprendido con preguntas del capítulo.", ic: "✓", cta: "Hacer cuestionario ▸" },
  ];
  const advance = () => setStep((s) => Math.min(3, s + 1));
  const goAction = (i) => {
    if (i === 1) { window.__epSubject = ses.subject; window.EPStore.setNav({ subject: ses.subject, ord: ses.ord, mode: "practica" }); go("tarjetas"); }
    if (i === 2) { window.__epSimulacro = false; window.__epSubject = ses.subject; window.EPStore.setNav({ subject: ses.subject, ord: ses.ord, mode: "practica" }); go("quiz"); }
  };
  return (
    <main className="main main-center">
      <header className="page-head-card" style={{ borderTop: "3px solid " + color }}>
        <CrumbsD path={[["Inicio", "inicio"], "Sesión de hoy"]} />
        <div className="study-top">
          <div className="study-meta">
            <span className="study-meta-tag" style={{ color }}>Sesión de estudio · modo enfoque</span>
            <span className="study-meta-name">{ses.subject} · {ses.titulo}</span>
          </div>
          <div className="sesion-prog"><span className="sp-n">{Math.min(step, 3)} / 3</span><div className="mini-bar mini-bar-wide" style={{ width: "180px" }}><i style={{ width: (Math.min(step, 3) / 3 * 100) + "%", background: color }}></i></div></div>
        </div>
      </header>

      <div className="sesion-flow">
        {steps.map((s, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <div className={"sesion-card sc-" + state} key={s.n}>
              <span className="sesion-ic">{state === "done" ? "✓" : s.ic}</span>
              <div className="sesion-body">
                <div className="sesion-t">Paso {s.n} · {s.t}</div>
                <div className="sesion-d">{s.d}</div>
              </div>
              {state === "active" && (
                <button className="btn btn-accent" onClick={() => { if (i === 0) advance(); else goAction(i); }}>{s.cta}</button>
              )}
              {state === "done" && <span className="sesion-check">Hecho</span>}
            </div>
          );
        })}
      </div>

      {step >= 3 && (
        <div className="sesion-done">
          <div className="rest-ic" style={{ background: "var(--ok-tint)", color: "var(--ok)", width: "60px", height: "60px", fontSize: "28px" }}>✓</div>
          <div className="rest-h">Sesión completada</div>
          <div className="rest-sub">Terminaste el plan de hoy para <b>{ses.subject}</b>. Tu progreso quedó registrado y el día se marcó en el calendario.</div>
          <div className="form-actions" style={{ justifyContent: "center" }}>
            <button className="btn" onClick={() => go("calendario")}>Ver calendario</button>
            <button className="btn btn-accent" onClick={() => go("inicio")}>Volver al inicio ▸</button>
          </div>
        </div>
      )}
    </main>
  );
}
window.SesionHoy = SesionHoy;

/* ====================== ONBOARDING GUIADO (multipaso) ====================== */
function Onboarding() {
  const go = useGoD();
  const subjColor = window.subjColor;
  const SUBJECTS = Object.keys(window.SUBJECT_COLORS || {});
  const [step, setStep] = React.useState(0);
  const [examDate, setExamDate] = React.useState("2026-07-27");
  const [activeSubj, setActiveSubj] = React.useState(() => { const o = {}; SUBJECTS.forEach((s) => o[s] = true); return o; });
  const [goal, setGoal] = React.useState(30);
  const [dias, setDias] = React.useState({ L: true, M: true, X: true, J: true, V: true, S: true, D: false });
  const steps = ["Examen", "Materias", "Ritmo", "Listo"];
  const nSel = SUBJECTS.filter((s) => activeSubj[s]).length;
  const nDias = Object.values(dias).filter(Boolean).length;
  const finish = () => {
    const map = { L: 1, M: 2, X: 3, J: 4, V: 5, S: 6, D: 0 };
    const diasNum = Object.keys(dias).filter((k) => dias[k]).map((k) => map[k]);
    window.EPStore.setExamDate(examDate);
    window.EPStore.setGoal(goal);
    window.EPStore.setDias(diasNum);
    window.generarPlan();
    window.toast && window.toast("Plan de estudio generado", "ok");
    go("calendario");
  };
  return (
    <main className="main main-center">
      <div className="ob">
        <div className="ob-mark">EP</div>
        <div className="ob-stepper">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div className={"ob-step" + (i === step ? " is-on" : "") + (i < step ? " is-done" : "")}>
                <span className="ob-stepn">{i < step ? "✓" : i + 1}</span><span className="ob-stepl">{s}</span>
              </div>
              {i < steps.length - 1 && <span className="ob-stepline"></span>}
            </React.Fragment>
          ))}
        </div>

        {step === 0 && (
          <div className="ob-panel">
            <h2 className="ob-h">¿Cuándo es tu examen?</h2>
            <p className="ob-p">Calcularemos el plan de estudio y la cuenta regresiva desde hoy hasta esa fecha.</p>
            <input className="input ob-date" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            <div className="ob-hint">Promoción 2026 · Cap. 1/o. I.C.I.</div>
          </div>
        )}

        {step === 1 && (
          <div className="ob-panel">
            <h2 className="ob-h">¿Qué materias estudiarás?</h2>
            <p className="ob-p">Selecciona las áreas que entran en tu examen. Puedes ajustar el peso después.</p>
            <div className="ob-subjects">
              {SUBJECTS.map((s) => (
                <div className={"ob-subj" + (activeSubj[s] ? " is-on" : "")} key={s} onClick={() => setActiveSubj((o) => ({ ...o, [s]: !o[s] }))} style={activeSubj[s] ? { borderColor: subjColor(s) } : {}}>
                  <span className="ob-subj-dot" style={{ background: subjColor(s) }}></span>
                  <span className="ob-subj-n">{s}</span>
                  <span className="ob-subj-check">{activeSubj[s] ? "✓" : ""}</span>
                </div>
              ))}
            </div>
            <div className="ob-hint">{nSel} de {SUBJECTS.length} materias</div>
          </div>
        )}

        {step === 2 && (
          <div className="ob-panel">
            <h2 className="ob-h">Define tu ritmo</h2>
            <p className="ob-p">Días de estudio a la semana y meta diaria de preguntas.</p>
            <div className="ob-field"><label>Días disponibles</label>
              <div className="ob-dias">
                {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                  <span key={d} className={"ob-dia" + (dias[d] ? " is-on" : "")} onClick={() => setDias((o) => ({ ...o, [d]: !o[d] }))}>{d}</span>
                ))}
              </div>
            </div>
            <div className="ob-field"><label>Meta diaria: <b>{goal} preguntas</b></label>
              <input className="range" type="range" min="10" max="60" step="5" value={goal} onChange={(e) => setGoal(+e.target.value)} />
            </div>
            <div className="ob-hint">{nDias} días/semana · los viernes se reservan para simulacro</div>
          </div>
        )}

        {step === 3 && (
          <div className="ob-panel">
            <div className="rest-ic" style={{ background: "var(--ok-tint)", color: "var(--ok)", margin: "0 auto 16px" }}>✓</div>
            <h2 className="ob-h">¡Todo listo!</h2>
            <p className="ob-p">Generaremos tu calendario hasta el <b>{new Date(examDate + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</b> con {nSel} materias, {goal} preguntas/día y {nDias} días por semana. Los viernes serán simulacros.</p>
          </div>
        )}

        <div className="ob-nav">
          {step > 0 ? <button className="btn" onClick={() => setStep(step - 1)}>‹ Atrás</button> : <button className="btn" onClick={() => go("inicio")}>Cancelar</button>}
          <span style={{ flex: 1 }}></span>
          {step < 3
            ? <button className="btn btn-accent" disabled={step === 1 && nSel === 0} onClick={() => setStep(step + 1)}>Continuar ▸</button>
            : <button className="btn btn-accent btn-lg" onClick={finish}>Generar mi plan ▸</button>}
        </div>
      </div>
    </main>
  );
}
window.Onboarding = Onboarding;

/* ====================== INTELIGENCIA DE ESTUDIO ====================== */
function Inteligencia() {
  const go = useGoD();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const x = window.intel();
  const notaCls = x.nota >= 8 ? "rs-ok" : x.nota >= 6 ? "rs-warn" : "rs-bad";
  const recoIc = { debil: "🎯", fall: "🔁", olvido: "🕓", nota: "📈" };
  const startSubj = (subj, filter) => {
    window.__epSimulacro = false; window.__epSubject = subj;
    window.EPStore.setNav({ subject: subj, mode: "practica", filter: filter || null });
    go("quiz");
  };
  return (
    <main className="main">
      <PageHeadD title="Inteligencia de estudio" sub="Análisis de tu desempeño y qué estudiar a continuación" crumbs={[["Inicio", "inicio"], "Inteligencia"]} />

      {/* Predicción de nota */}
      <div className="intel-hero">
        <div className={"intel-score " + notaCls}>
          <div className="intel-score-n">{x.nota}</div>
          <div className="intel-score-d">/ 10</div>
        </div>
        <div className="intel-hero-r">
          <span className="intel-tag">Nota proyectada en el examen</span>
          <div className="intel-hero-t">{x.nota >= 8 ? "Vas por buen camino" : x.nota >= 6 ? "Aprobando, con margen de mejora" : "Necesitas reforzar antes del examen"}</div>
          <div className="intel-hero-s">Estimación según tu dominio actual por materia, ponderada por el peso de cada área en el examen.</div>
          <div className="intel-bars">
            {x.porMateria.map((m) => (
              <div className="intel-bar-row" key={m.subj} onClick={() => { window.__epSubject = m.subj; go("materia"); }}>
                <span className="intel-bar-name">{m.subj}</span>
                <div className="intel-bar-track"><i style={{ width: m.dominio + "%", background: subjColor(m.subj) }}></i></div>
                <span className="intel-bar-pct" style={{ color: subjColor(m.subj) }}>{m.dominio}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Recomendaciones */}
        <PanelD idx="01" title="Recomendaciones" meta="priorizadas para ti">
          <div className="reco-list">
            {x.recos.map((r, i) => (
              <div className="reco-card" key={i} style={{ borderLeft: "3px solid " + subjColor(r.subj) }}>
                <span className="reco-ic">{recoIc[r.tipo] || "💡"}</span>
                <div className="reco-txt">{r.txt}</div>
                <button className="btn btn-sm btn-accent" onClick={() => startSubj(r.subj, r.tipo === "fall" ? "fall" : null)}>Repasar</button>
              </div>
            ))}
          </div>
        </PanelD>

        {/* Capítulos olvidados + foco */}
        <PanelD idx="02" title="Foco recomendado">
          <div className="intel-focus">
            <div className="intel-focus-row">
              <span className="intel-focus-k">Punto débil</span>
              <span className="intel-focus-v" style={{ color: subjColor(x.debil.subj) }}>{x.debil.subj}</span>
              <span className="intel-focus-n">{x.debil.dominio}%</span>
            </div>
            <div className="intel-focus-row">
              <span className="intel-focus-k">Más olvidado</span>
              {x.olvidado
                ? <React.Fragment>
                    <span className="intel-focus-v" style={{ color: subjColor(x.olvidado.subj) }}>{x.olvidado.subj}</span>
                    <span className="intel-focus-n">{x.olvidado.dias} d sin repasar</span>
                  </React.Fragment>
                : <span className="intel-focus-n">sin datos aún · registra sesiones o tiempo</span>}
            </div>
            <div className="intel-focus-row">
              <span className="intel-focus-k">Más fuerte</span>
              <span className="intel-focus-v" style={{ color: subjColor(x.fuerte.subj) }}>{x.fuerte.subj}</span>
              <span className="intel-focus-n">{x.fuerte.dominio}%</span>
            </div>
            <div className="intel-focus-row">
              <span className="intel-focus-k">Falladas en cola</span>
              <span className="intel-focus-v">Repaso prioritario</span>
              <span className="intel-focus-n">{x.totalFall}</span>
            </div>
          </div>
          <div className="intel-focus-acts">
            <button className="btn btn-accent" onClick={() => startSubj(x.debil.subj)}>Estudiar punto débil ▸</button>
            <button className="btn" onClick={() => go("repaso")}>Ir al repaso prioritario</button>
          </div>
        </PanelD>
      </div>

      <div className="grid-2">
        <PanelD idx="03" title="Tendencia de simulacros" meta="evolución de tu nota">
          <div className="trend">
            {(() => {
              const hist = st.sessions.filter((s) => s.score != null).slice(0, 8).reverse();
              const data = hist.length ? hist : [{ score: 6.1 }, { score: 7.2 }, { score: 6.8 }, { score: 8.8 }, { score: 8.4 }, { score: 9.3 }];
              return data.map((s, i) => (
                <div className="trend-col" key={i}>
                  <div className="trend-track"><div className="trend-bar" style={{ height: (s.score / 10 * 100) + "%", background: s.score >= 8 ? "var(--ok)" : s.score >= 6 ? "var(--warn)" : "var(--danger)" }}></div></div>
                  <span className="trend-v">{(s.score || 0).toFixed(1)}</span>
                </div>
              ));
            })()}
          </div>
          <div className="trend-foot"><span>más antiguo</span><span>proyección actual: <b style={{ color: x.nota >= 8 ? "var(--ok)" : x.nota >= 6 ? "var(--warn)" : "var(--danger)" }}>{x.nota}</b></span></div>
        </PanelD>

        <PanelD idx="04" title="Dominio por capítulo" meta="dónde reforzar">
          <table className="tbl tbl-mini">
            <tbody>
              {[["CJM · Insubordinación", "Legislación Militar", 45], ["Op. Conjuntas · Niveles", "Operaciones Militares", 52], ["LGRA · Faltas graves", "Normatividad Gubernamental", 61], ["Ciberdefensa · Sistema", "Aspecto Técnico", 68], ["PMBOK · Dominios", "Aspecto Administrativo", 74]].map(([cap, subj, p]) => (
                <tr key={cap} className="clickable" onClick={() => { window.__epSubject = subj; go("materia"); }}>
                  <td className="t-q"><span className="t-q-bar" style={{ background: subjColor(subj), display: "inline-block", width: "3px", height: "14px", verticalAlign: "middle", marginRight: "8px", borderRadius: "2px" }}></span>{cap}</td>
                  <td style={{ width: "90px" }}><div className="mini-bar mini-bar-thin"><i style={{ width: p + "%", background: subjColor(subj) }}></i></div></td>
                  <td className="ta-r" style={{ width: "36px", fontWeight: 700, color: subjColor(subj) }}>{p}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelD>
      </div>

      <div className="rp-note">
        <b>¿Cómo se calcula?</b> La nota proyectada combina tu <b>dominio por materia</b> (avance, aciertos y fallos) ponderado por el peso de cada área en el examen. Las recomendaciones priorizan lo débil, lo fallado y lo que llevas más tiempo sin repasar.
      </div>
    </main>
  );
}
window.Inteligencia = Inteligencia;

/* helper local: Panel ya viene del window */
const Panel = window.Panel;
