/* EstudioPro · Prototipo — Pantallas nuevas (H): Preparación, Evolución, Mapa del temario, Respaldo, Reportes. */
const { useGo: useGoH, PageHead: PageHeadH, Panel: PanelH, EmptyState: EmptyStateH } = window;

const hSubjects = () => window.subjectNames();
const hHash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; };

/* ============================ ÍNDICE DE PREPARACIÓN ============================ */
function Preparacion() {
  const go = useGoH();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const r = window.readiness();
  const nivelColor = { "listo": "var(--ok)", "en-camino": "var(--accent)", "atención": "var(--warn)", "riesgo": "var(--danger)" }[r.nivel];
  const R = 92, C = 2 * Math.PI * R, frac = r.prob / 100;

  const kpis = [
    ["Nota proyectada", r.notaProy + " / 10"],
    ["Días al examen", r.dias],
    ["Dominio promedio", r.dominioProm + "%"],
    ["Tendencia simulacros", (r.tendencia >= 0 ? "+" : "") + r.tendencia],
    ["Estudio (7 días)", r.min7 + " min"],
    ["Días activos (7)", r.diasActivos + " / 7"],
  ];

  return (
    <main className="main">
      <PageHeadH title="Índice de preparación" sub="¿Qué tan listo estás para el 27 de julio?"
        crumbs={[["Inicio", "inicio"], "Índice de preparación"]} />
      <window.SubTabs group="preparacion" active="preparacion" />
      <section className="panel prep-hero">
        <div className="prep-gauge-wrap">
          <svg viewBox="0 0 220 220" className="prep-gauge">
            <circle cx="110" cy="110" r={R} fill="none" stroke="var(--soft-line)" strokeWidth="14" />
            <circle cx="110" cy="110" r={R} fill="none" stroke={nivelColor} strokeWidth="14" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 110 110)"
              style={{ transition: "stroke-dashoffset 1s cubic-bezier(.2,.7,.3,1)" }} />
          </svg>
          <div className="prep-gauge-c">
            <div className="prep-prob" style={{ color: nivelColor }}>{r.prob}%</div>
            <div className="prep-prob-l">probabilidad de aprobar</div>
          </div>
        </div>
        <div className="prep-hero-r">
          <span className="prep-badge" style={{ background: "color-mix(in srgb," + nivelColor + " 14%,#fff)", color: nivelColor }}>{r.nivelTxt}</span>
          <p className="prep-lead">
            {r.nivel === "listo" && "Vas muy bien encaminado. Mantén el ritmo y consolida tus áreas débiles para asegurar el resultado."}
            {r.nivel === "en-camino" && "Progreso sólido. Prioriza las materias en riesgo y sostén la constancia diaria de aquí al examen."}
            {r.nivel === "atención" && "Hay avance, pero necesitas subir el ritmo. Enfócate en las materias débiles y aumenta tu tiempo diario."}
            {r.nivel === "riesgo" && "El tiempo apremia. Sube tu meta diaria, ataca las materias más flojas y agenda simulacros de práctica."}
          </p>
          <div className="prep-rate">Ritmo necesario: <b>+{r.ritmoNecesario}%</b> de dominio por día para llegar al 100%.</div>
        </div>
      </section>

      <div className="prep-kpis">
        {kpis.map(([l, v]) => (<div className="kpi prep-kpi" key={l}><div className="kpi-v">{v}</div><div className="kpi-l">{l}</div></div>))}
      </div>

      <div className="prep-cols">
        <PanelH idx="!" title="Materias por reforzar" meta={r.enRiesgo.length + " bajo 60%"}>
          {r.enRiesgo.length === 0
            ? <div className="cron-empty">Todas tus materias superan el umbral aprobatorio. 👏</div>
            : <div className="prep-risk">
                {r.enRiesgo.sort((a, b) => a.dominio - b.dominio).map((m) => (
                  <div className="prep-risk-row" key={m.subj}>
                    <span className="cron-dot" style={{ background: subjColor(m.subj) }}></span>
                    <span className="prep-risk-s">{m.subj}</span>
                    <div className="cron-bar-track"><div className="cron-bar-fill" style={{ width: m.dominio + "%", background: subjColor(m.subj) }}></div></div>
                    <span className="prep-risk-v">{m.dominio}%</span>
                    <button className="link-btn" onClick={() => { window.__epSubject = m.subj; go("materia"); }}>Estudiar</button>
                  </div>
                ))}
              </div>}
        </PanelH>
        <PanelH idx="→" title="Qué hacer ahora" meta="plan sugerido">
          <ol className="prep-todo">
            <li onClick={() => go("repaso")}><b>Repaso prioritario</b><span>Ataca falladas e importantes primero</span></li>
            <li onClick={() => go("simulacro")}><b>Simulacro de práctica</b><span>Mide y detecta huecos reales</span></li>
            <li onClick={() => go("evolucion")}><b>Revisa tu evolución</b><span>Confirma que la tendencia sube</span></li>
          </ol>
        </PanelH>
      </div>
    </main>
  );
}

/* ============================ EVOLUCIÓN DE SIMULACROS ============================ */
function Evolucion() {
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = hSubjects();
  const hist = (st.simHistory || []).slice().sort((a, b) => a.date.localeCompare(b.date));
  const [foco, setFoco] = React.useState("global");

  if (hist.length < 2) {
    return (<main className="main"><PageHeadH title="Evolución de simulacros" crumbs={[["Inicio", "inicio"], "Evolución"]} />
      <window.SubTabs group="estadisticas" active="evolucion" />
      <EmptyStateH icon="📈" title="Aún no hay suficientes simulacros" desc="Completa al menos dos simulacros para ver tu tendencia." /></main>);
  }

  // geometría del gráfico
  const W = 680, H = 260, padL = 34, padR = 16, padT = 16, padB = 28;
  const iw = W - padL - padR, ih = H - padT - padB;
  const xs = hist.map((_, i) => padL + (hist.length === 1 ? 0 : (i / (hist.length - 1)) * iw));
  const yOf = (v) => padT + ih - (v / 10) * ih;
  const serie = (getV) => hist.map((d, i) => [xs[i], yOf(getV(d))]);
  const line = (pts) => pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const globalPts = serie((d) => d.global);
  const focoPts = foco !== "global" ? serie((d) => (d.byS && d.byS[foco]) || 0) : null;
  const focoColor = foco === "global" ? "var(--accent)" : subjColor(foco);

  // proyección lineal al examen
  const last = hist[hist.length - 1], prev = hist[hist.length - 2];
  const slope = last.global - prev.global;
  const proy = Math.max(0, Math.min(10, +(last.global + slope * 1.5).toFixed(1)));
  const last3 = hist.slice(-3);
  const mejora = +(last.global - hist[0].global).toFixed(1);

  return (
    <main className="main">
      <PageHeadH title="Evolución de simulacros" sub="Tendencia de tu nota global y por materia hacia el 27 de julio"
        crumbs={[["Inicio", "inicio"], "Evolución"]} />
      <window.SubTabs group="estadisticas" active="evolucion" />
      <div className="prep-kpis">
        <div className="kpi prep-kpi"><div className="kpi-v">{last.global}</div><div className="kpi-l">Último simulacro</div></div>
        <div className="kpi prep-kpi"><div className="kpi-v" style={{ color: mejora >= 0 ? "var(--ok)" : "var(--danger)" }}>{(mejora >= 0 ? "+" : "") + mejora}</div><div className="kpi-l">Mejora total</div></div>
        <div className="kpi prep-kpi"><div className="kpi-v">{proy}</div><div className="kpi-l">Proyección examen</div></div>
        <div className="kpi prep-kpi"><div className="kpi-v">{hist.length}</div><div className="kpi-l">Simulacros</div></div>
      </div>

      <section className="panel">
        <div className="panel-h"><div className="panel-h-l"><span className="panel-idx">📈</span><span className="panel-title">Curva de aprendizaje</span></div>
          <div className="panel-h-r">
            <select className="input" aria-label="Materia en foco" value={foco} onChange={(e) => setFoco(e.target.value)} style={{ maxWidth: "220px" }}>
              <option value="global">Nota global</option>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div></div>
        <div className="panel-b">
          <svg viewBox={"0 0 " + W + " " + H} className="evo-chart">
            {[0, 2, 4, 6, 8, 10].map((g) => (
              <g key={g}>
                <line x1={padL} y1={yOf(g)} x2={W - padR} y2={yOf(g)} stroke="var(--soft-line)" strokeWidth="1" />
                <text x={padL - 8} y={yOf(g) + 3} textAnchor="end" className="evo-axis">{g}</text>
              </g>
            ))}
            <line x1={padL} y1={yOf(6)} x2={W - padR} y2={yOf(6)} stroke="var(--warn)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
            {/* línea global tenue cuando hay foco de materia (nota: no empezar este comentario con "global": ESLint lo lee como directiva) */}
            {focoPts && <path d={line(globalPts)} fill="none" stroke="var(--line-strong)" strokeWidth="1.5" strokeDasharray="3 3" />}
            <path d={line(focoPts || globalPts)} fill="none" stroke={focoColor} strokeWidth="2.5" strokeLinejoin="round" />
            {(focoPts || globalPts).map((p, i) => (
              <g key={i}>
                <circle cx={p[0]} cy={p[1]} r="4.5" fill="#fff" stroke={focoColor} strokeWidth="2.5" />
                <text x={p[0]} y={p[1] - 12} textAnchor="middle" className="evo-val">{(focoPts ? (hist[i].byS[foco] || 0) : hist[i].global)}</text>
                <text x={p[0]} y={H - 8} textAnchor="middle" className="evo-axis">{hist[i].date.slice(5)}</text>
              </g>
            ))}
            {/* proyección */}
            {!focoPts && <line x1={globalPts[globalPts.length - 1][0]} y1={globalPts[globalPts.length - 1][1]}
              x2={W - padR} y2={yOf(proy)} stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 4" opacity="0.7" />}
          </svg>
          <div className="evo-legend">
            <span><i style={{ background: focoColor }}></i>{foco === "global" ? "Nota global" : foco}</span>
            {focoPts && <span><i style={{ background: "var(--line-strong)" }}></i>Global (ref.)</span>}
            {!focoPts && <span><i className="evo-dash"></i>Proyección al examen</span>}
            <span><i className="evo-dash evo-warn"></i>Umbral aprobatorio (6)</span>
          </div>
        </div>
      </section>

      <PanelH idx="≣" title="Detalle por materia" meta={"último: " + last.date}>
        <div className="evo-table">
          <div className="evo-tr evo-th"><span>Materia</span>{last3.map((h) => <span key={h.id}>{h.date.slice(5)}</span>)}<span>Δ</span></div>
          {SUBJECTS.map((s) => {
            const vals = last3.map((h) => (h.byS && h.byS[s]) || 0);
            const delta = +(vals[vals.length - 1] - vals[0]).toFixed(1);
            return (
              <div className="evo-tr" key={s}>
                <span className="evo-s"><span className="cron-dot" style={{ background: subjColor(s) }}></span>{s}</span>
                {vals.map((v, i) => <span key={i} className={"evo-cell" + (v >= 6 ? " ok" : " bad")}>{v}</span>)}
                <span className={"evo-delta" + (delta >= 0 ? " up" : " down")}>{(delta >= 0 ? "+" : "") + delta}</span>
              </div>
            );
          })}
        </div>
      </PanelH>
    </main>
  );
}

/* ============================ MAPA DE CALOR DEL TEMARIO ============================ */
function MapaTemario() {
  const go = useGoH();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = hSubjects();
  const DETAIL = window.MATERIA_DETAIL || {};
  const [foco, setFoco] = React.useState("todas");

  // dominio estimado por capítulo: mezcla estado real de preguntas del ordenamiento + señal estable por hash
  const qByOrd = {};
  (st.questions || []).forEach((q) => { const k = q.ord || ""; if (!qByOrd[k]) qByOrd[k] = { ok: 0, fall: 0, n: 0 }; qByOrd[k].n++; if (q.status === "ok") qByOrd[k].ok++; if (q.status === "fall") qByOrd[k].fall++; });
  const capScore = (ord, cap) => {
    const base = hHash(ord + "·" + cap) % 100; // señal estable 0-99
    const st2 = qByOrd[ord];
    if (st2 && st2.n) { const real = Math.round((st2.ok / st2.n) * 100 - (st2.fall / st2.n) * 40); return Math.max(0, Math.min(99, Math.round(base * 0.5 + real * 0.5))); }
    return base;
  };
  const bucket = (v) => v >= 75 ? "b4" : v >= 50 ? "b3" : v >= 25 ? "b2" : "b1";
  const bucketColor = { b1: "#EBEEF3", b2: "color-mix(in srgb,var(--c) 30%,#fff)", b3: "color-mix(in srgb,var(--c) 60%,#fff)", b4: "var(--c)" };

  // materias a mostrar
  const cats = SUBJECTS.filter((s) => foco === "todas" || s === foco);
  const ordsOf = (subj) => Object.keys(DETAIL).filter((k) => DETAIL[k].cat === subj);

  // resumen global por bucket
  let counts = { b1: 0, b2: 0, b3: 0, b4: 0, total: 0 };
  SUBJECTS.forEach((s) => ordsOf(s).forEach((ord) => DETAIL[ord].titulos.forEach((t) => t.caps.forEach((c) => { counts[bucket(capScore(ord, c[0]))]++; counts.total++; }))));

  return (
    <main className="main">
      <PageHeadH title="Mapa del temario" sub="Dominio estimado capítulo por capítulo — detecta tus huecos de un vistazo"
        crumbs={[["Inicio", "inicio"], "Mapa del temario"]}
        actions={<select className="input" aria-label="Materia en foco" value={foco} onChange={(e) => setFoco(e.target.value)} style={{ maxWidth: "220px" }}>
          <option value="todas">Todas las materias</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>} />
      <window.SubTabs group="materias" active="mapa" />
      <div className="mapa-legend">
        <span className="mapa-leg-t">Menos dominio</span>
        <i className="mapa-sw" style={{ background: "#EBEEF3" }}></i>
        <i className="mapa-sw" style={{ background: "#B9C6DB" }}></i>
        <i className="mapa-sw" style={{ background: "#6E93C7" }}></i>
        <i className="mapa-sw" style={{ background: "#2F73CE" }}></i>
        <span className="mapa-leg-t">Más dominio</span>
        <span className="mapa-leg-sum">{counts.b1} sin tocar · {counts.b4} dominados · {counts.total} capítulos</span>
      </div>
      {cats.map((subj) => {
        const c = subjColor(subj);
        const ords = ordsOf(subj);
        return (
          <section className="panel mapa-mat" key={subj} style={{ "--c": c }}>
            <div className="panel-h"><div className="panel-h-l"><span className="cron-dot" style={{ background: c }}></span><span className="panel-title">{subj}</span></div>
              <div className="panel-h-r"><button className="link-btn" onClick={() => { window.__epSubject = subj; go("materia"); }}>Abrir materia</button></div></div>
            <div className="panel-b mapa-body">
              {ords.length === 0 ? <div className="cron-empty">Sin ordenamientos detallados.</div> : ords.map((ord) => (
                <div className="mapa-ord" key={ord}>
                  <div className="mapa-ord-t">{ord}</div>
                  <div className="mapa-cells">
                    {DETAIL[ord].titulos.map((t) => t.caps.map((cap) => {
                      const v = capScore(ord, cap[0]); const b = bucket(v);
                      return <div key={ord + cap[0]} className="mapa-cell" title={cap[0] + " — " + v + "% dominio"}
                        style={{ background: bucketColor[b], color: b === "b4" || b === "b3" ? "#fff" : "var(--mute)" }}>
                        <span className="mapa-cell-lbl">{cap[0].replace(/^Cap\. /, "").split(" — ")[0]}</span>
                      </div>;
                    }))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

/* ============================ RESPALDO (exportar / importar JSON) ============================ */
function Respaldo() {
  const st = window.useStore();
  const { ConfirmDialog } = window;
  const fileRef = React.useRef(null);
  const [pending, setPending] = React.useState(null); // payload leído a confirmar
  const [info, setInfo] = React.useState(null);
  // copias automáticas diarias (IndexedDB) + restauración
  const [backups, setBackups] = React.useState([]);
  const [restoreDate, setRestoreDate] = React.useState(null);
  React.useEffect(() => {
    if (window.epBackups) window.epBackups.list().then(setBackups).catch(() => {});
  }, []);
  const doRestoreBackup = () => {
    const date = restoreDate; setRestoreDate(null);
    window.epBackups.get(date).then((snap) => {
      if (!snap) { window.toast && window.toast("No se encontró la copia", "danger"); return; }
      const res = window.EPStore.importJSON({ data: snap });
      if (res.ok) window.toast && window.toast("Copia del " + date + " restaurada (" + res.n + " preguntas)", "ok");
      else window.toast && window.toast(res.msg || "No se pudo restaurar", "danger");
    });
  };
  // recordatorio: días desde la última exportación (null = nunca)
  const diasSinExportar = st.lastExport ? Math.floor((Date.now() - new Date(st.lastExport).getTime()) / 86400000) : null;
  const recordar = diasSinExportar === null || diasSinExportar >= 7;
  // datos de prueba (~80% de avance): descarga bajo demanda + importJSON validado
  const [confirmDemo, setConfirmDemo] = React.useState(false);
  const [demoBusy, setDemoBusy] = React.useState(false);
  const loadDemo = () => {
    setConfirmDemo(false); setDemoBusy(true);
    Promise.resolve()
      .then(() => fetch("data/progreso-prueba.json"))
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((payload) => {
        const res = window.EPStore.importJSON(payload);
        if (res.ok) window.toast && window.toast("Datos de prueba cargados: " + res.n.toLocaleString("es-MX") + " preguntas con progreso al 80%", "ok");
        else window.toast && window.toast(res.msg || "No se pudo cargar", "danger");
      })
      .catch(() => window.toast && window.toast("No se pudieron descargar los datos de prueba. Revisa tu conexión.", "danger"))
      .finally(() => setDemoBusy(false));
  };

  const stats = [
    ["Preguntas", (st.questions || []).length],
    ["Tarjetas", (st.cards || []).length],
    ["Apuntes", Object.values(st.notes || {}).filter((v) => (v || "").trim()).length],
    ["Sesiones", (st.sessions || []).length],
    ["Registros de tiempo", (st.timeLog || []).length],
    ["Simulacros", (st.simHistory || []).length],
  ];

  const onFile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const payload = JSON.parse(rd.result);
        const d = payload.data || payload;
        setInfo({ q: (d.questions || []).length, n: Object.keys(d.notes || {}).length, s: (d.sessions || []).length });
        setPending(payload);
      } catch (err) { window.toast && window.toast("Archivo inválido o corrupto", "danger"); }
    };
    rd.readAsText(f);
    e.target.value = "";
  };
  const doImport = () => {
    const res = window.EPStore.importJSON(pending);
    setPending(null); setInfo(null);
    if (res.ok) window.toast && window.toast("Respaldo restaurado (" + res.n + " preguntas)" + (res.dropped ? " · " + res.dropped + " entradas inválidas omitidas" : ""), res.dropped ? "warn" : "ok");
    else window.toast && window.toast(res.msg || "No se pudo importar", "danger");
  };

  return (
    <main className="main">
      <PageHeadH title="Respaldo de datos" sub="Exporta tu progreso a un archivo o restáuralo en otro dispositivo"
        crumbs={[["Inicio", "inicio"], "Respaldo"]} />
      <window.SubTabs group="datos" active="respaldo" />
      <div className="prep-kpis">
        {stats.map(([l, v]) => <div className="kpi prep-kpi" key={l}><div className="kpi-v">{v}</div><div className="kpi-l">{l}</div></div>)}
      </div>
      <div className="resp-cards">
        <section className="panel resp-card">
          <div className="resp-ic">⬇</div>
          <h3 className="resp-h">Exportar respaldo</h3>
          <p className="resp-d">Descarga un archivo <code>.json</code> con todo tu banco, tarjetas, apuntes, tiempos y progreso. Guárdalo en un lugar seguro.</p>
          <p className={"resp-last" + (recordar ? " is-warn" : "")}>
            {diasSinExportar === null ? "⚠ Aún no has exportado ningún respaldo." :
              diasSinExportar === 0 ? "✓ Exportaste hoy." :
              (recordar ? "⚠ " : "✓ ") + "Última exportación hace " + diasSinExportar + " día" + (diasSinExportar === 1 ? "" : "s") + "."}
            {recordar && " iOS puede purgar datos locales: exporta ahora."}
          </p>
          <button className="btn btn-accent btn-lg" onClick={() => { window.EPStore.exportJSON(); window.toast && window.toast("Respaldo descargado", "ok"); }}>Descargar respaldo</button>
        </section>
        <section className="panel resp-card">
          <div className="resp-ic">⬆</div>
          <h3 className="resp-h">Importar respaldo</h3>
          <p className="resp-d">Restaura un archivo exportado previamente. <b>Reemplaza</b> tus datos actuales, así que exporta antes por seguridad.</p>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onFile} />
          <button className="btn btn-lg" onClick={() => fileRef.current && fileRef.current.click()}>Seleccionar archivo…</button>
        </section>
      </div>
      <section className="panel">
        <div className="panel-h">
          <div className="panel-h-l"><span className="panel-idx">❄</span><span className="panel-title">Copias automáticas</span></div>
          <div className="panel-h-r"><span className="panel-meta">una por día · se conservan las últimas 5</span></div>
        </div>
        <div className="panel-b">
          {backups.length === 0
            ? <p className="resp-d" style={{ margin: 0 }}>Aún no hay copias automáticas. Se crean solas al abrir la app cada día; aquí podrás restaurarlas si algo sale mal.</p>
            : backups.map((b) => (
                <div className="set-row" key={b.date}>
                  <div>
                    <div className="set-label">Copia del {new Date(b.date + "T00:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</div>
                    <div className="set-desc">Estado completo tal como estaba al iniciar ese día.</div>
                  </div>
                  <button className="btn btn-sm" onClick={() => setRestoreDate(b.date)}>Restaurar…</button>
                </div>
              ))}
        </div>
      </section>
      <section className="panel">
        <div className="panel-h">
          <div className="panel-h-l"><span className="panel-idx">🧪</span><span className="panel-title">Datos de prueba</span></div>
          <div className="panel-h-r"><span className="panel-meta">~80% de avance simulado · 4,500+ reactivos</span></div>
        </div>
        <div className="panel-b">
          <div className="set-row">
            <div>
              <div className="set-label">Cargar estado de prueba (progreso al 80%)</div>
              <div className="set-desc">Banco completo por capítulo del temario + banco real de Aspecto Técnico, con repaso SM-2, sesiones, tiempos, racha y simulacros ya avanzados. Ideal para probar el sistema como si llevaras semanas estudiando. <b>Reemplaza todos tus datos actuales.</b></div>
            </div>
            <button className="btn btn-sm" disabled={demoBusy} onClick={() => setConfirmDemo(true)}>{demoBusy ? "Cargando…" : "Cargar datos de prueba…"}</button>
          </div>
        </div>
      </section>
      <p className="resp-note">Tus datos se guardan localmente en este navegador. Exporta con regularidad para no perder tu avance.</p>
      <ConfirmDialog open={!!pending} title="¿Restaurar este respaldo?"
        body={info ? "El archivo contiene " + info.q + " preguntas, " + info.n + " apuntes y " + info.s + " sesiones. Esto reemplazará tus datos actuales." : ""}
        confirmLabel="Restaurar" danger onConfirm={doImport} onClose={() => { setPending(null); setInfo(null); }} />
      <ConfirmDialog open={!!restoreDate} title={"¿Restaurar la copia del " + restoreDate + "?"}
        body="Tus datos actuales se reemplazarán por el estado guardado ese día. Si tienes dudas, exporta un respaldo antes."
        confirmLabel="Restaurar copia" danger onConfirm={doRestoreBackup} onClose={() => setRestoreDate(null)} />
      <ConfirmDialog open={confirmDemo} title="¿Cargar los datos de prueba?"
        body={<span>Se reemplazarán <b>todos</b> tus datos actuales por un estado simulado con ~80% de avance (4,500+ preguntas, repaso SM-2, sesiones, racha y simulacros). Si tienes progreso real, <b>exporta un respaldo antes</b>. Requiere conexión la primera vez (~4 MB).</span>}
        confirmLabel="Sí, cargar datos de prueba" danger onConfirm={loadDemo} onClose={() => setConfirmDemo(false)} />
    </main>
  );
}

/* ============================ REPORTES DE ERRORES DEL BANCO ============================ */
function Reportes() {
  const go = useGoH();
  const st = window.useStore();
  const subjColor = window.subjColor;
  const { Modal } = window;
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [pickId, setPickId] = React.useState(null);
  const [reason, setReason] = React.useState("desactualizado");
  const [note, setNote] = React.useState("");
  const [filter, setFilter] = React.useState("todos");

  const REASONS = { desactualizado: "Dato desactualizado (D.O.F.)", factual: "Error factual", redaccion: "Redacción confusa", opcion: "Opción/respuesta incorrecta", otro: "Otro" };
  const reports = st.reports || [];
  const shown = reports.filter((r) => filter === "todos" || r.status === filter);
  const abiertos = reports.filter((r) => r.status === "abierto").length;
  const candidates = (st.questions || []).filter((x) => (x.q || "").toLowerCase().includes(q.toLowerCase())).slice(0, 6);
  const pick = (st.questions || []).find((x) => x._id === pickId);

  const submit = () => {
    if (!pickId) return;
    window.EPStore.reportQuestion(pickId, { reason, note });
    setOpen(false); setPickId(null); setNote(""); setQ(""); setReason("desactualizado");
    window.toast && window.toast("Reporte registrado", "ok");
  };

  return (
    <main className="main">
      <PageHeadH title="Reportes del banco" sub="Marca reactivos con datos desactualizados o errores para revisarlos"
        crumbs={[["Banco de preguntas", "banco"], "Reportes"]}
        actions={<button className="btn btn-accent" onClick={() => setOpen(true)}>+ Reportar reactivo</button>} />
      <window.SubTabs group="mantenimiento" active="reportes" />
      <div className="rep-bar">
        <div className="rep-tabs">
          {[["todos", "Todos"], ["abierto", "Abiertos"], ["resuelto", "Resueltos"]].map(([k, l]) => (
            <button key={k} className={"rep-tab" + (filter === k ? " is-on" : "")} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <span className="rep-count">{abiertos} abierto(s)</span>
      </div>
      {shown.length === 0
        ? <EmptyStateH icon="🚩" title={reports.length === 0 ? "Sin reportes" : "Nada en este filtro"}
            desc={reports.length === 0 ? "Cuando encuentres un reactivo con un dato desactualizado (varias leyes son D.O.F. 2025), repórtalo aquí." : "Cambia el filtro para ver otros reportes."}
            actions={reports.length === 0 && <button className="btn btn-accent" onClick={() => setOpen(true)}>+ Reportar el primero</button>} />
        : <div className="rep-list">
            {shown.map((r) => {
              const src = (st.questions || []).find((x) => x._id === r.qId);
              return (
                <section className={"rep-item" + (r.status === "resuelto" ? " is-done" : "")} key={r.id}>
                  <div className="rep-item-l">
                    <div className="rep-item-h">
                      <span className="rep-reason">{REASONS[r.reason] || r.reason}</span>
                      {r.subject && <span className="rep-subj" style={{ color: subjTextColor(r.subject) }}>{r.subject}</span>}
                      <span className={"rep-status rep-" + r.status}>{r.status}</span>
                    </div>
                    <div className="rep-q">{src ? src.q : "(reactivo eliminado del banco)"}</div>
                    {r.note && <div className="rep-note">“{r.note}”</div>}
                  </div>
                  <div className="rep-item-a">
                    <button className="link-btn" onClick={() => window.EPStore.resolveReport(r.id)}>{r.status === "resuelto" ? "Reabrir" : "Resolver"}</button>
                    {src && <button className="link-btn" onClick={() => { window.__epEditQ = src; go("pregunta"); }}>Editar</button>}
                    <button className="link-btn link-danger" onClick={() => window.EPStore.deleteReport(r.id)}>Eliminar</button>
                  </div>
                </section>
              );
            })}
          </div>}

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="modal-h">Reportar reactivo</div>
        <div className="modal-b">
          <div className="field"><label>Buscar reactivo</label>
            <input className="input" placeholder="Escribe parte del enunciado…" value={q} onChange={(e) => { setQ(e.target.value); setPickId(null); }} autoFocus />
          </div>
          {!pickId && q && (
            <div className="rep-cands">
              {candidates.length === 0 ? <div className="cron-empty">Sin coincidencias.</div>
                : candidates.map((c) => (
                  <button key={c._id} className="rep-cand" onClick={() => setPickId(c._id)}>
                    <span className="cron-dot" style={{ background: subjColor(c.subject) }}></span>{c.q}
                  </button>
                ))}
            </div>
          )}
          {pick && <div className="rep-picked"><b>Seleccionado:</b> {pick.q} <button className="link-btn" onClick={() => setPickId(null)}>cambiar</button></div>}
          <div className="field"><label>Motivo</label>
            <select className="input" aria-label="Motivo del reporte" value={reason} onChange={(e) => setReason(e.target.value)}>
              {Object.entries(REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field"><label>Nota (opcional)</label>
            <textarea className="input textarea" rows="2" placeholder="Describe el problema o la corrección sugerida…" value={note} onChange={(e) => setNote(e.target.value)}></textarea>
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
          <button className="btn btn-accent" disabled={!pickId} onClick={submit}>Registrar reporte</button>
        </div>
      </Modal>
    </main>
  );
}

Object.assign(window, { Preparacion, Evolucion, MapaTemario, Respaldo, Reportes });
