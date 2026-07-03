/* EstudioPro · Prototipo — Pantalla C: Cuestionarios (listado + configurar) */
const { useGo: useGoC, PageHead: PageHeadC, Panel: PanelC, Diff: DiffC, EmptyState: EmptyStateC, Crumbs } = window;

function Cuestionarios() {
  const go = useGoC();
  const st = window.useStore();
  const [tab, setTab] = React.useState("config");
  const [modo, setModo] = React.useState("practica");
  const [origen, setOrigen] = React.useState("Legislación Militar");
  const [n, setN] = React.useState(20);
  const [soloFalladas, setSoloFalladas] = React.useState(false);
  const [soloImportantes, setSoloImportantes] = React.useState(false);
  const [dif, setDif] = React.useState("todas");
  const [temas, setTemas] = React.useState(["Todos"]);
  const [tiempo, setTiempo] = React.useState(null); // minutos; null = sin límite
  // temas = ordenamientos reales presentes en el banco para la materia elegida
  const bank = st.questions || [];
  const TEMAS = ["Todos", ...Array.from(new Set(bank.filter((q) => q.subject === origen).map((q) => q.ord).filter(Boolean)))];
  React.useEffect(() => { setTemas(["Todos"]); }, [origen]);
  React.useEffect(() => { setTiempo(modo === "examen" ? 20 : null); }, [modo]);
  const toggleTema = (tm) => setTemas((prev) => {
    if (tm === "Todos") return ["Todos"];
    const sinTodos = prev.filter((x) => x !== "Todos");
    const next = sinTodos.includes(tm) ? sinTodos.filter((x) => x !== tm) : [...sinTodos, tm];
    return next.length ? next : ["Todos"];
  });
  // contadores y disponibilidad reales según los filtros elegidos
  const poolBase = bank.filter((q) => q.subject === origen);
  const nFalladas = poolBase.filter((q) => q.status === "fall").length;
  const nImportantes = poolBase.filter((q) => q.status === "imp").length;
  const disponibles = poolBase.filter((q) => {
    if (temas.length && !temas.includes("Todos") && !temas.includes(q.ord)) return false;
    if (dif !== "todas" && q.dif !== dif) return false;
    if (soloFalladas && q.status !== "fall") return false;
    if (soloImportantes && q.status !== "imp") return false;
    return true;
  }).length;
  const nReal = Math.min(n, disponibles);

  const historial = st.sessions || [];
  const fmtWhen = (s) => {
    if (!s.date) return s.when || "";
    const d = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(s.date + "T00:00:00")) / 86400000);
    return d <= 0 ? "hoy" : d === 1 ? "ayer" : d < 7 ? d + " d" : Math.floor(d / 7) + " sem";
  };
  const SUBJECTS6 = Object.keys(window.SUBJECT_COLORS || {});

  return (
    <main className="main">
      <PageHeadC title="Cuestionarios" sub="Configura una sesión o repasa tu historial" crumbs={[["Inicio", "inicio"], "Cuestionarios"]}
        actions={
          <div className="seg seg-tabs">
            <span className={"segchip" + (tab === "config" ? " is-on" : "")} onClick={() => setTab("config")}>Por materia</span>
            <span className={"segchip" + (tab === "historial" ? " is-on" : "")} onClick={() => setTab("historial")}>Historial</span>
          </div>
        } />

      {tab === "config" && (
        <div className="quiz-config">
          <div className="qc-main">
            <PanelC idx="01" title="Origen de las preguntas">
              <div className="form-2">
                <div className="field"><label>Categoría</label><select className="input" aria-label="Categoría"><option>Promoción 2026</option></select></div>
                <div className="field"><label>Materia</label>
                  <select className="input" aria-label="Materia" value={origen} onChange={(e) => setOrigen(e.target.value)}>
                    {SUBJECTS6.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Temas incluidos</label>
                <div className="seg seg-wrap">
                  {TEMAS.map((tm) => (
                    <span key={tm} className={"segchip" + (temas.includes(tm) ? " is-on" : "")} onClick={() => toggleTema(tm)}>{tm}</span>
                  ))}
                </div>
              </div>
            </PanelC>

            <PanelC idx="02" title="Filtros">
              <div className="field">
                <label>Dificultad</label>
                <div className="seg">
                  {["todas", "fácil", "medio", "difícil"].map((d) => (
                    <span key={d} className={"segchip" + (dif === d ? " is-on" : "")} onClick={() => setDif(d)}>{d}</span>
                  ))}
                </div>
              </div>
              <div className="qc-toggles">
                <label className="qc-tg"><span className={"box" + (soloFalladas ? " is-on" : "")} onClick={() => setSoloFalladas(!soloFalladas)}></span> Solo preguntas falladas <span className="qc-tg-n">{nFalladas}</span></label>
                <label className="qc-tg"><span className={"box" + (soloImportantes ? " is-on" : "")} onClick={() => setSoloImportantes(!soloImportantes)}></span> Solo marcadas como importantes <span className="qc-tg-n">{nImportantes}</span></label>
              </div>
            </PanelC>

            <PanelC idx="03" title="Formato">
              <div className="field">
                <label>Modo</label>
                <div className="mode-cards">
                  <div className={"mode-card" + (modo === "practica" ? " is-on" : "")} onClick={() => setModo("practica")}>
                    <div className="mode-card-t">Práctica</div>
                    <div className="mode-card-d">Feedback y explicación tras cada respuesta. Sin tiempo límite.</div>
                  </div>
                  <div className={"mode-card" + (modo === "examen" ? " is-on" : "")} onClick={() => setModo("examen")}>
                    <div className="mode-card-t">Examen</div>
                    <div className="mode-card-d">Resultados al final, con tiempo límite. Simula el examen real.</div>
                  </div>
                </div>
              </div>
              <div className="form-2">
                <div className="field">
                  <label>Número de preguntas: <b>{n}</b>{disponibles < n && <span className="opt-note"> · solo {disponibles} disponibles</span>}</label>
                  <input className="range" type="range" min="5" max="50" step="5" value={n} onChange={(e) => setN(+e.target.value)} aria-label="Número de preguntas" />
                </div>
                <div className="field"><label>Tiempo límite</label>
                  <select className="input" value={tiempo == null ? "sin" : String(tiempo)} onChange={(e) => setTiempo(e.target.value === "sin" ? null : +e.target.value)} aria-label="Tiempo límite">
                    <option value="sin">Sin límite</option><option value="10">10:00</option><option value="20">20:00</option><option value="30">30:00</option>
                  </select>
                </div>
              </div>
            </PanelC>
          </div>

          <aside className="qc-side">
            <div className="qc-summary">
              <div className="qc-summary-h">Resumen de la sesión</div>
              <div className="qc-sum-row"><span>Origen</span><b>{origen}</b></div>
              <div className="qc-sum-row"><span>Modo</span><b>{modo === "practica" ? "Práctica" : "Examen"}</b></div>
              <div className="qc-sum-row"><span>Preguntas</span><b>{nReal}{disponibles < n ? " de " + n : ""}</b></div>
              <div className="qc-sum-row"><span>Dificultad</span><b>{dif}</b></div>
              <div className="qc-sum-row"><span>Temas</span><b>{temas.includes("Todos") ? "todos" : temas.length + " sel."}</b></div>
              <div className="qc-sum-row"><span>Tiempo</span><b>{tiempo == null ? "sin límite" : tiempo + " min"}</b></div>
              {soloFalladas && <div className="qc-sum-row"><span>Filtro</span><b>solo falladas</b></div>}
              {soloImportantes && <div className="qc-sum-row"><span>Filtro</span><b>solo importantes</b></div>}
              <div className="qc-sum-est">{disponibles === 0 ? "Sin preguntas con estos filtros" : "≈ " + Math.max(1, Math.round(nReal * 0.8)) + " min estimados"}</div>
              <button className="btn btn-accent btn-lg" style={{ width: "100%" }} disabled={disponibles === 0}
                onClick={() => { window.__epSimulacro = false; window.__epSubject = origen; window.EPStore.setNav({ subject: origen, mode: modo, n, dif, temas, tiempo, filter: soloFalladas ? "fall" : soloImportantes ? "imp" : null }); go("quiz"); }}>Empezar ▸</button>
              <button className="btn btn-sm" style={{ width: "100%", marginTop: "8px" }} onClick={() => go("simulacro")}>¿Buscas el examen completo? Ir a Simulacro ▸</button>
            </div>
          </aside>
        </div>
      )}

      {tab === "historial" && (historial.length === 0 ? (
        <EmptyStateC icon="◎" title="Aún no hay cuestionarios"
          desc="Cuando completes un cuestionario o simulacro, aparecerá aquí con su nota y fecha."
          actions={<button className="btn btn-accent" onClick={() => setTab("config")}>Configurar el primero ▸</button>} />
      ) : (
        <div className="tbl-wrap">
          <table className="tbl tbl-bank tbl-hist">
            <thead>
              <tr><th>Cuestionario</th><th className="ta-c">Nota</th><th className="ta-r">Fecha</th><th className="ta-c">Acciones</th></tr>
            </thead>
            <tbody>
              {historial.map((h, i) => {
                const c = window.subjColor(h.subject);
                const paused = h.state === "pause";
                return (
                <tr key={i} className="clickable" onClick={() => { window.__epSubject = h.subject; go(paused ? "quiz" : "resultado"); }}>
                  <td className="t-q">
                    <span className="t-q-bar" style={{ background: c }}></span>
                    <span className="t-q-body">
                      <span className="t-q-text">{h.label}</span>
                      <span className="t-q-loc"><span className="t-q-subj" style={{ color: c }}>{h.subject}</span><span className="t-q-path">· {h.n} preg · {h.time}</span></span>
                    </span>
                  </td>
                  <td className="ta-c">{h.score == null ? <span className="st st-nuevo"><i className="st-dot"></i>en pausa</span> : <span className={"hist-score " + (h.score >= 8 ? "hs-ok" : h.score >= 6 ? "hs-warn" : "hs-bad")}>{h.score}</span>}</td>
                  <td className="ta-r t-mute">{fmtWhen(h)}</td>
                  <td className="ta-c" onClick={(e) => e.stopPropagation()}>
                    <div className="rowacts">
                      {paused
                        ? <button className="btn btn-sm btn-accent" onClick={() => { window.__epSubject = h.subject; go("quiz"); }}>Reanudar</button>
                        : <button className="btn btn-sm" onClick={() => go("resultado")}>Ver</button>}
                      <button className="btn btn-sm" onClick={() => { window.__epSimulacro = false; window.__epSubject = h.subject; window.EPStore.setNav({ subject: h.subject, mode: "practica" }); go("quiz"); }}>Repetir</button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </main>
  );
}

window.Cuestionarios = Cuestionarios;

/* ========================= PERFIL ========================= */
function Perfil() {
  const go = useGoC();
  const st = window.useStore();
  const nombre = (st.plan.nombre || "Aspirante").trim();
  const iniciales = nombre.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";
  const dExam = window.daysToExam();
  const examFecha = (() => { try { return new Date(st.plan.examDate + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } })();
  const nQ = st.questions.length;
  const dominadas = st.cards.filter((c) => c.nivel === "dominado").length;
  const avancePct = nQ ? Math.round(dominadas / nQ * 100) : 0;
  const streak = window.realStreak ? window.realStreak() : 0;
  const sims = st.simHistory || [];
  const simMedia = sims.length ? (sims.reduce((a, s) => a + (s.global || 0), 0) / sims.length).toFixed(1) : "—";
  const kpis = [
    ["Días para el examen", String(dExam), examFecha],
    ["Avance global", avancePct + "%", dominadas.toLocaleString() + " / " + nQ.toLocaleString()],
    ["Racha actual", streak + " día" + (streak === 1 ? "" : "s"), "días consecutivos de estudio"],
    ["Simulacros", String(sims.length), sims.length ? "media " + simMedia + " / 10" : "aún sin simulacros"],
  ];
  const SUBJECTS = Object.keys(window.SUBJECT_COLORS || {});
  const porMateria = SUBJECTS.map((s) => {
    const qs = st.cards.filter((c) => c.subject === s);
    const dom = qs.filter((c) => c.nivel === "dominado").length;
    return [s, qs.length ? Math.round(dom / qs.length * 100) : 0, window.subjColor(s)];
  });
  const logros = (window.computeAchievements && window.computeAchievements()) || [];
  const earnedCount = logros.filter((l) => l[2]).length;
  return (
    <main className="main">
      <header className="page-head-card" style={{ borderTop: "3px solid var(--accent)" }}>
        <Crumbs path={[["Inicio", "inicio"], "Perfil"]} />
        <div className="profile-head">
          <div className="profile-av">{iniciales}</div>
          <div className="profile-id">
            <h1 className="page-title">{nombre}</h1>
            <div className="profile-sub">Configura tu nombre y fecha de examen en Configuración</div>
            <div className="stat-chips">
              <span className="sc"><b>Promoción 2026</b></span>
              <span className="sc">Sesión <b>local</b></span>
            </div>
          </div>
          <div className="profile-actions">
            <button className="btn btn-accent" onClick={() => go("cuestionarios")}>Estudiar hoy ▸</button>
            <button className="btn" onClick={() => go("config")}>Editar perfil</button>
          </div>
        </div>
      </header>

      <div className="exam-countdown">
        <div className="exam-l">
          <span className="exam-tag">Cuenta regresiva</span>
          <div className="exam-title">Faltan <b>{dExam} día{dExam === 1 ? "" : "s"}</b> para el examen de promoción</div>
          <div className="exam-meta">{examFecha} · prepárate con simulacros completos por materia</div>
        </div>
        <div className="exam-ring">
          <svg viewBox="0 0 44 44"><circle className="rr-bg" cx="22" cy="22" r="19"></circle><circle className="rr-fg" cx="22" cy="22" r="19" strokeDasharray="119.4" strokeDashoffset={(119.4 * (1 - avancePct / 100)).toFixed(1)}></circle></svg>
          <span className="resume-ring-n">{avancePct}%</span>
        </div>
      </div>

      <div className="kpis">
        {kpis.map(([k, v, s]) => (
          <div className="kpi" key={k}>
            <div className="kpi-k">{k}</div>
            <div className="kpi-v">{v}</div>
            <div className="kpi-s">{s}</div>
          </div>
        ))}
      </div>

      {(() => {
        const xp = window.studyXP ? window.studyXP() : null;
        if (!xp) return null;
        return (
          <div className="xp-card">
            <div className="xp-badge">Nv {xp.level}</div>
            <div className="xp-body">
              <div className="xp-top"><span className="xp-title">{xp.title}</span><span className="xp-xp">{xp.xp.toLocaleString()} XP</span></div>
              <div className="xp-track"><div className="xp-fill" style={{ width: xp.pct + "%" }}></div></div>
              <div className="xp-sub">{xp.cur} / {xp.need} XP para el nivel {xp.level + 1}</div>
            </div>
          </div>
        );
      })()}

      <div className="grid-2">
        <PanelC idx="01" title="Avance por materia" action="ver materias ▸" onAction={() => go("materias")}>
          <div className="matstats">
            {porMateria.map(([n, p, c]) => (
              <div className="matstat-row" key={n} onClick={() => { window.__epSubject = n; go("materia"); }}>
                <span className="matstat-dot" style={{ background: c }}></span>
                <span className="matstat-name">{n}</span>
                <div className="matstat-track"><i style={{ width: p + "%", background: c, color: c }}></i></div>
                <span className="matstat-pct">{p}%</span>
              </div>
            ))}
          </div>
        </PanelC>

        <PanelC idx="02" title="Logros" meta={earnedCount + " de " + logros.length + " obtenidos"}>
          <div className="badges">
            {logros.map(([ic, n, earned]) => (
              <div className={"badge" + (earned ? "" : " is-locked")} key={n}>
                <span className="badge-ic">{ic}</span>
                <span className="badge-n">{n}</span>
                {earned ? <span className="badge-ok">✓</span> : <span className="badge-lock">🔒</span>}
              </div>
            ))}
          </div>
        </PanelC>
      </div>
    </main>
  );
}
window.Perfil = Perfil;
