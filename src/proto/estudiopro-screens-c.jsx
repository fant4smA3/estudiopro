/* EstudioPro · Prototipo — Pantalla C: Cuestionarios (listado + configurar) */
const { useGo: useGoC, PageHead: PageHeadC, Panel: PanelC, Diff: DiffC, EmptyState: EmptyStateC, Crumbs } = window;

function Cuestionarios() {
  const go = useGoC();
  const [tab, setTab] = React.useState("config");
  const [modo, setModo] = React.useState("practica");
  const [origen, setOrigen] = React.useState("Legislación Militar");
  const [n, setN] = React.useState(20);
  const [soloFalladas, setSoloFalladas] = React.useState(false);
  const [soloImportantes, setSoloImportantes] = React.useState(false);
  const [dif, setDif] = React.useState("todas");
  const [temas, setTemas] = React.useState(["Todos"]);
  const TEMAS = ["Todos", "Tema 1", "Tema 2", "Tema 3", "Cap. II"];
  const toggleTema = (tm) => setTemas((prev) => {
    if (tm === "Todos") return ["Todos"];
    const sinTodos = prev.filter((x) => x !== "Todos");
    const next = sinTodos.includes(tm) ? sinTodos.filter((x) => x !== tm) : [...sinTodos, tm];
    return next.length ? next : ["Todos"];
  });

  const historial = [
    ["Legislación Militar", "Código de Justicia Militar · examen", "20 preg · 14:32", "8.4", "hoy", "done"],
    ["Legislación Militar", "Ley de Disciplina · práctica", "15 preg · 09:10", "9.3", "ayer", "done"],
    ["Operaciones Militares", "Op. Conjuntas (falladas)", "12 preg · en pausa", "—", "ayer", "pause"],
    ["Normatividad Gubernamental", "Simulacro general", "50 preg · 38:04", "7.2", "3 d", "done"],
    ["Aspecto Técnico", "Ciberseguridad · práctica", "18 preg · 12:45", "6.1", "5 d", "done"],
    ["Adiestramiento y Mando Militar", "Mando y Liderazgo · examen", "25 preg · 19:20", "8.8", "1 sem", "done"],
  ];
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
                <div className="field"><label>Categoría</label><select className="input"><option>Promoción 2026</option></select></div>
                <div className="field"><label>Materia</label>
                  <select className="input" value={origen} onChange={(e) => setOrigen(e.target.value)}>
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
                <label className="qc-tg"><span className={"box" + (soloFalladas ? " is-on" : "")} onClick={() => setSoloFalladas(!soloFalladas)}></span> Solo preguntas falladas <span className="qc-tg-n">18</span></label>
                <label className="qc-tg"><span className={"box" + (soloImportantes ? " is-on" : "")} onClick={() => setSoloImportantes(!soloImportantes)}></span> Solo marcadas como importantes <span className="qc-tg-n">42</span></label>
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
                  <label>Número de preguntas: <b>{n}</b></label>
                  <input className="range" type="range" min="5" max="50" step="5" value={n} onChange={(e) => setN(+e.target.value)} />
                </div>
                <div className="field"><label>Tiempo límite</label><select className="input" defaultValue={modo === "examen" ? "20:00" : "Sin límite"}><option>Sin límite</option><option>10:00</option><option>20:00</option><option>30:00</option></select></div>
              </div>
            </PanelC>
          </div>

          <aside className="qc-side">
            <div className="qc-summary">
              <div className="qc-summary-h">Resumen de la sesión</div>
              <div className="qc-sum-row"><span>Origen</span><b>{origen}</b></div>
              <div className="qc-sum-row"><span>Modo</span><b>{modo === "practica" ? "Práctica" : "Examen"}</b></div>
              <div className="qc-sum-row"><span>Preguntas</span><b>{n}</b></div>
              <div className="qc-sum-row"><span>Dificultad</span><b>{dif}</b></div>
              <div className="qc-sum-row"><span>Temas</span><b>{temas.includes("Todos") ? "todos" : temas.length + " sel."}</b></div>
              {soloFalladas && <div className="qc-sum-row"><span>Filtro</span><b>solo falladas</b></div>}
              <div className="qc-sum-est">≈ {Math.round(n * 0.8)} min estimados</div>
              <button className="btn btn-accent btn-lg" style={{ width: "100%" }} onClick={() => { window.__epSimulacro = false; window.__epSubject = origen; window.EPStore.setNav({ subject: origen, mode: modo, filter: soloFalladas ? "fall" : soloImportantes ? "imp" : null }); go("quiz"); }}>Empezar ▸</button>
              <button className="btn btn-sm" style={{ width: "100%", marginTop: "8px" }} onClick={() => go("simulacro")}>¿Buscas el examen completo? Ir a Simulacro ▸</button>
            </div>
          </aside>
        </div>
      )}

      {tab === "historial" && (
        <div className="tbl-wrap">
          <table className="tbl tbl-bank tbl-hist">
            <thead>
              <tr><th>Cuestionario</th><th className="ta-c">Nota</th><th className="ta-r">Fecha</th><th className="ta-c">Acciones</th></tr>
            </thead>
            <tbody>
              {historial.map((h, i) => {
                const c = window.subjColor(h[0]);
                return (
                <tr key={i} className="clickable" onClick={() => { window.__epSubject = h[0]; go(h[5] === "pause" ? "quiz" : "resultado"); }}>
                  <td className="t-q">
                    <span className="t-q-bar" style={{ background: c }}></span>
                    <span className="t-q-body">
                      <span className="t-q-text">{h[1]}</span>
                      <span className="t-q-loc"><span className="t-q-subj" style={{ color: c }}>{h[0]}</span><span className="t-q-path">· {h[2]}</span></span>
                    </span>
                  </td>
                  <td className="ta-c">{h[3] === "—" ? <span className="st st-nuevo"><i className="st-dot"></i>en pausa</span> : <span className={"hist-score " + (+h[3] >= 8 ? "hs-ok" : +h[3] >= 6 ? "hs-warn" : "hs-bad")}>{h[3]}</span>}</td>
                  <td className="ta-r t-mute">{h[4]}</td>
                  <td className="ta-c" onClick={(e) => e.stopPropagation()}>
                    <div className="rowacts">
                      {h[5] === "pause"
                        ? <button className="btn btn-sm btn-accent" onClick={() => { window.__epSubject = h[0]; go("quiz"); }}>Reanudar</button>
                        : <button className="btn btn-sm" onClick={() => go("resultado")}>Ver</button>}
                      <button className="btn btn-sm" onClick={() => { window.__epSubject = h[0]; go("quiz"); }}>Repetir</button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

window.Cuestionarios = Cuestionarios;

/* ========================= PERFIL ========================= */
function Perfil() {
  const go = useGoC();
  const kpis = [
    ["Días para el examen", "48", "27 jul 2026"],
    ["Avance global", "19%", "212 / 1,120"],
    ["Racha actual", "12 días", "récord: 23"],
    ["Simulacros", "18", "media 8.1 / 10"],
  ];
  const porMateria = [
    ["Legislación Militar", 24, "#2F73CE"],
    ["Operaciones Militares", 12, "#2A8A5E"],
    ["Normatividad Gubernamental", 18, "#A0742A"],
    ["Aspecto Administrativo", 8, "#7A57C2"],
    ["Adiestramiento y Mando Militar", 15, "#C2410C"],
    ["Aspecto Técnico", 5, "#0E7490"],
  ];
  const logros = (window.computeAchievements && window.computeAchievements()) || [];
  const earnedCount = logros.filter((l) => l[2]).length;
  return (
    <main className="main">
      <header className="page-head-card" style={{ borderTop: "3px solid var(--accent)" }}>
        <Crumbs path={[["Inicio", "inicio"], "Perfil"]} />
        <div className="profile-head">
          <div className="profile-av">JR</div>
          <div className="profile-id">
            <h1 className="page-title">Aspirante J. Ramírez</h1>
            <div className="profile-sub">Capitán 1/o. I.C.I. · Ingeniero en Computación e Informática</div>
            <div className="stat-chips">
              <span className="sc"><b>Promoción 2026</b></span>
              <span className="sc">Inscrito desde <b>mar 2026</b></span>
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
          <div className="exam-title">Faltan <b>48 días</b> para el examen de promoción</div>
          <div className="exam-meta">27 de julio de 2026 · prepárate con simulacros completos por materia</div>
        </div>
        <div className="exam-ring">
          <svg viewBox="0 0 44 44"><circle className="rr-bg" cx="22" cy="22" r="19"></circle><circle className="rr-fg" cx="22" cy="22" r="19" strokeDasharray="119.4" strokeDashoffset="96.7"></circle></svg>
          <span className="resume-ring-n">19%</span>
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
