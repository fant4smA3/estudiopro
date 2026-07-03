/* EstudioPro · Prototipo — Pantallas/piezas nuevas (I):
   Heatmap de actividad, Informe semanal IA, Hoja de repaso imprimible, Editor de plan, Paleta de comandos, Notificaciones. */
const { useGo: useGoI, PageHead: PageHeadI, Panel: PanelI, EmptyState: EmptyStateI } = window;

/* ---- helper: mapa de actividad diaria (últimos ~19 semanas) ---- */
window.activityMap = function () {
  const s = window.EPStore.get();
  const byDate = {};
  (s.timeLog || []).forEach((t) => { byDate[t.date] = (byDate[t.date] || 0) + Math.round((t.seconds || 0) / 60); });
  const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
  const days = 7 * 19;
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // alinear el final a domingo de esta semana
  const end = new Date(today); end.setDate(end.getDate() + (7 - ((today.getDay() + 6) % 7) - 1));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end); d.setDate(end.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    let min = byDate[key] || 0;
    // relleno estable para días pasados (demo realista); días futuros = 0
    if (d <= today && min === 0) { const seed = hash(key) % 100; min = seed < 42 ? 0 : seed < 66 ? 12 : seed < 84 ? 28 : seed < 95 ? 52 : 78; }
    if (d > today) min = 0;
    const level = min === 0 ? 0 : min < 15 ? 1 : min < 35 ? 2 : min < 60 ? 3 : 4;
    out.push({ key, date: d, min, level, future: d > today });
  }
  // racha actual (días consecutivos con actividad terminando hoy o ayer)
  let streak = 0;
  for (let i = out.length - 1; i >= 0; i--) { if (out[i].future) continue; if (out[i].level > 0) streak++; else break; }
  const totalMin = out.reduce((a, x) => a + x.min, 0);
  const activos = out.filter((x) => x.level > 0).length;
  return { cells: out, streak, totalMin, activos };
};

/* ---- helper: notificación real del navegador ---- */
window.epNotify = async function (title, body) {
  if (!("Notification" in window)) { window.toast && window.toast("Tu navegador no soporta notificaciones", "warn"); return false; }
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") { window.toast && window.toast("Permiso de notificaciones denegado", "warn"); return false; }
  try { new Notification(title, { body, icon: "" }); return true; } catch (e) { return false; }
};

/* ============================ HEATMAP DE ACTIVIDAD (Inicio) ============================ */
function ActivityHeatmap() {
  const st = window.useStore();
  const a = window.activityMap();
  const [tip, setTip] = React.useState(null);
  // dividir en semanas (columnas de 7, lunes arriba)
  const weeks = [];
  for (let i = 0; i < a.cells.length; i += 7) weeks.push(a.cells.slice(i, i + 7));
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const DOW = ["L", "M", "X", "J", "V", "S", "D"];
  return (
    <PanelI idx="✦" title="Constancia de estudio" meta={a.streak + " días de racha · " + a.activos + " días activos"}>
      <div className="heat-wrap">
        <div className="heat-dows">{DOW.map((d, i) => <span key={i} className={i % 2 ? "heat-dow-show" : ""}>{i % 2 ? d : ""}</span>)}</div>
        <div className="heat-grid">
          <div className="heat-months">
            {weeks.map((w, i) => {
              const first = w[0]; const showM = first && first.date.getDate() <= 7;
              return <span key={i} className="heat-month">{showM ? MES[first.date.getMonth()] : ""}</span>;
            })}
          </div>
          <div className="heat-cols">
            {weeks.map((w, wi) => (
              <div className="heat-col" key={wi}>
                {w.map((c) => (
                  <div key={c.key} className={"heat-cell heat-l" + c.level + (c.future ? " heat-fut" : "")}
                    onMouseEnter={() => setTip(c)} onMouseLeave={() => setTip(null)}></div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="heat-foot">
          <span className="heat-tip">{tip ? (tip.future ? tip.key + " · próximamente" : tip.min + " min · " + tip.date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })) : "Pasa el cursor por un día"}</span>
          <div className="heat-legend">menos {[0, 1, 2, 3, 4].map((l) => <i key={l} className={"heat-cell heat-l" + l}></i>)} más</div>
        </div>
      </div>
    </PanelI>
  );
}

/* ============================ INFORME SEMANAL CON IA ============================ */
function Informe() {
  const st = window.useStore();
  const r = window.readiness();
  const x = window.intel();
  const a = window.activityMap();
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const aiReady = typeof window.claude !== "undefined" && window.claude.complete;

  const datos = {
    dias: r.dias, prob: r.prob, nivel: r.nivelTxt, notaProy: r.notaProy,
    minSemana: r.min7, diasActivos: r.diasActivos, racha: a.streak,
    debil: x.debil ? x.debil.subj + " (" + x.debil.dominio + "%)" : "—",
    fuerte: x.fuerte ? x.fuerte.subj + " (" + x.fuerte.dominio + "%)" : "—",
    falladas: x.totalFall,
    ultimoSim: (st.simHistory || []).slice(-1)[0],
  };
  const fallbackReport = () => (
    "RESUMEN DE LA SEMANA\n"
    + "Estudiaste " + Math.round(datos.minSemana / 60 * 10) / 10 + " h en " + datos.diasActivos + " días (racha de " + datos.racha + "). "
    + "Tu probabilidad de aprobar es " + datos.prob + "% (" + datos.nivel + ") y tu nota proyectada es " + datos.notaProy + "/10.\n\n"
    + "LO QUE VA BIEN\nTu materia más fuerte es " + datos.fuerte + ". Mantén el repaso espaciado para conservar el dominio.\n\n"
    + "A MEJORAR\nTu punto débil es " + datos.debil + " y tienes " + datos.falladas + " preguntas falladas en cola. Priorízalas.\n\n"
    + "PLAN PARA LA PRÓXIMA SEMANA\n1) Bloques de enfoque diarios en tu materia débil.\n2) Vaciar la cola de repaso prioritario.\n3) Un simulacro de práctica el viernes y revisar la evolución."
  );

  const generar = async () => {
    setLoading(true); setReport(null);
    if (!aiReady) { setTimeout(() => { setReport(fallbackReport()); setLoading(false); }, 500); return; }
    const sys = "Eres el mentor de estudio de un aspirante al ascenso militar mexicano. Redacta un informe semanal breve, motivador y accionable en español, "
      + "con estas secciones en MAYÚSCULA como encabezado: RESUMEN DE LA SEMANA, LO QUE VA BIEN, A MEJORAR, PLAN PARA LA PRÓXIMA SEMANA (lista numerada de 3-4 acciones). "
      + "Sé concreto y usa los datos. Máximo 220 palabras.";
    const prompt = "Datos del aspirante esta semana:\n" + JSON.stringify(datos, null, 2) + "\nExamen el 27 de julio de 2026.";
    try {
      const out = await window.claude.complete({ system: sys, messages: [{ role: "user", content: prompt }], max_tokens: 700 });
      setReport(out);
    } catch (e) { setReport(fallbackReport()); }
    finally { setLoading(false); }
  };

  const copiar = () => { try { navigator.clipboard.writeText(report); window.toast && window.toast("Informe copiado", "ok"); } catch (e) {} };

  return (
    <main className="main">
      <PageHeadI title="Informe semanal" sub="Un resumen con IA de tu semana y el plan para la siguiente"
        crumbs={[["Inicio", "inicio"], "Informe semanal"]}
        actions={<button className="btn btn-accent" onClick={generar} disabled={loading}>{loading ? "Generando…" : report ? "Regenerar" : "✨ Generar informe"}</button>} />
      <div className="prep-kpis">
        <div className="kpi prep-kpi"><div className="kpi-v">{Math.round(r.min7 / 60 * 10) / 10} h</div><div className="kpi-l">Estudio (7 días)</div></div>
        <div className="kpi prep-kpi"><div className="kpi-v">{r.diasActivos}</div><div className="kpi-l">Días activos (7)</div></div>
        <div className="kpi prep-kpi"><div className="kpi-v">{r.prob}%</div><div className="kpi-l">Prob. de aprobar</div></div>
        <div className="kpi prep-kpi"><div className="kpi-v">{r.dias}</div><div className="kpi-l">Días al examen</div></div>
      </div>
      <section className="panel inf-panel">
        <div className="panel-h"><div className="panel-h-l"><span className="panel-idx">📋</span><span className="panel-title">Informe del {new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</span></div>
          {report && <div className="panel-h-r"><button className="link-btn" onClick={copiar}>Copiar</button></div>}</div>
        <div className="panel-b">
          {loading && <div className="gen-loading"><div className="gen-spin"></div><span>Analizando tu semana…</span></div>}
          {!loading && !report && <EmptyStateI icon="📋" title="Sin informe aún" desc="Genera tu informe semanal con un análisis de tu progreso y un plan concreto." actions={<button className="btn btn-accent" onClick={generar}>✨ Generar informe</button>} />}
          {!loading && report && <div className="inf-report">{report.split("\n").map((ln, i) => {
            const isH = ln.trim() === ln.trim().toUpperCase() && ln.trim().length > 3 && /[A-ZÁÉÍÓÚÑ]/.test(ln);
            return ln.trim() === "" ? <div key={i} className="inf-gap"></div> : isH ? <h4 key={i} className="inf-h">{ln}</h4> : <p key={i} className="inf-p">{ln}</p>;
          })}</div>}
        </div>
      </section>
    </main>
  );
}

/* ============================ HOJA DE REPASO IMPRIMIBLE ============================ */
function HojaRepaso() {
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = Object.keys(window.SUBJECT_COLORS || {});
  const [modo, setModo] = React.useState("fall");   // fall | imp | subj | all
  const [subj, setSubj] = React.useState(SUBJECTS[0]);
  const [conResp, setConResp] = React.useState(true);

  const cardBack = (q) => (q.options && typeof q.answer === "number") ? q.options[q.answer] : (typeof q.answer === "string" ? q.answer : "");
  const lista = React.useMemo(() => {
    let qs = st.questions || [];
    if (modo === "fall") qs = qs.filter((q) => q.status === "fall");
    else if (modo === "imp") qs = qs.filter((q) => q.status === "imp");
    else if (modo === "subj") qs = qs.filter((q) => q.subject === subj);
    return qs;
  }, [st.questions, modo, subj]);

  const fecha = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const titulo = modo === "fall" ? "Preguntas falladas" : modo === "imp" ? "Preguntas importantes" : modo === "subj" ? subj : "Banco completo";

  return (
    <main className="main">
      <div className="no-print">
        <PageHeadI title="Hoja de repaso" sub="Genera una hoja imprimible o PDF para estudiar sin pantalla"
          crumbs={[["Inicio", "inicio"], "Hoja de repaso"]} />
        <div className="hoja-bar">
          <div className="rep-tabs">
            {[["fall", "Falladas"], ["imp", "Importantes"], ["subj", "Por materia"], ["all", "Todas"]].map(([k, l]) => (
              <button key={k} className={"rep-tab" + (modo === k ? " is-on" : "")} onClick={() => setModo(k)}>{l}</button>
            ))}
          </div>
          {modo === "subj" && <select className="input" value={subj} onChange={(e) => setSubj(e.target.value)} style={{ maxWidth: "240px" }}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>}
          <label className="hoja-chk"><input type="checkbox" checked={conResp} onChange={() => setConResp(!conResp)} /> Incluir respuestas</label>
          <span style={{ flex: 1 }}></span>
          <button className="btn btn-accent" disabled={!lista.length} onClick={() => window.print()}>🖨 Imprimir / PDF</button>
        </div>
      </div>

      {!lista.length
        ? <div className="no-print"><EmptyStateI icon="🖨" title="No hay preguntas para esta hoja" desc="Cambia el filtro o marca preguntas como falladas/importantes." /></div>
        : <div className="print-area hoja">
            <div className="hoja-head">
              <div><div className="hoja-title">EstudioPro · {titulo}</div><div className="hoja-meta">{fecha} · {lista.length} preguntas</div></div>
              <div className="hoja-brand">EP</div>
            </div>
            <ol className="hoja-list">
              {lista.map((q) => (
                <li className="hoja-item" key={q._id}>
                  <div className="hoja-q">{q.q}</div>
                  {q.options && <div className="hoja-opts">{q.options.map((o, i) => <span key={i} className="hoja-opt">{String.fromCharCode(65 + i)}) {o}</span>)}</div>}
                  {conResp && <div className="hoja-a"><b>R:</b> {cardBack(q) || "—"}{(q.ord || q.ref) && <span className="hoja-src"> · Fuente: {q.ref || q.ord}{q.loc ? " · " + q.loc : ""}</span>}</div>}
                </li>
              ))}
            </ol>
          </div>}
    </main>
  );
}

/* ============================ EDITOR DE PLAN (arrastrar y soltar) ============================ */
function EditorPlan() {
  const go = useGoI();
  const st = window.useStore();
  const subjColor = window.subjColor;
  React.useEffect(() => { if (!st.plan.generado) window.generarPlan(); }, []);
  const dias = (st.plan.dias || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  const [drag, setDrag] = React.useState(null);
  const [over, setOver] = React.useState(null);

  const commit = (arr) => {
    // reasignar las fechas fijas en orden a la nueva secuencia de contenidos
    const fechas = dias.map((d) => d.fecha);
    const nuevo = arr.map((d, i) => ({ ...d, fecha: fechas[i] }));
    window.EPStore.updatePlan(nuevo);
  };
  const onDrop = (idx) => {
    if (drag === null || drag === idx) { setDrag(null); setOver(null); return; }
    const arr = dias.slice();
    const [it] = arr.splice(drag, 1);
    arr.splice(idx, 0, it);
    commit(arr); setDrag(null); setOver(null);
    window.toast && window.toast("Plan reprogramado", "ok");
  };
  const toggleDone = (d) => window.EPStore.setPlanDayState(d.fecha, d.estado === "hecho" ? "pendiente" : "hecho");

  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <main className="main">
      <PageHeadI title="Editor del plan" sub="Arrastra para reprogramar · marca días como hechos · recalcula"
        crumbs={[["Calendario", "calendario"], "Editor del plan"]}
        actions={<div style={{ display: "flex", gap: "8px" }}>
          <button className="btn" onClick={() => { window.generarPlan(); window.toast && window.toast("Plan regenerado", "ok"); }}>Regenerar</button>
          <button className="btn" onClick={() => go("calendario")}>Ver calendario ▸</button>
        </div>} />
      <div className="plan-ed-hint">Sujeta el punto <span className="plan-ed-grip">⠿</span> y arrastra un día sobre otro para intercambiar el orden. Las fechas se mantienen; solo cambia qué estudias cada día.</div>
      <div className="plan-ed-list">
        {dias.map((d, i) => {
          const c = d.subject ? subjColor(d.subject) : "var(--accent)";
          const isToday = d.fecha === hoy;
          return (
            <div key={d.fecha} draggable
              onDragStart={() => setDrag(i)} onDragOver={(e) => { e.preventDefault(); setOver(i); }} onDrop={() => onDrop(i)} onDragEnd={() => { setDrag(null); setOver(null); }}
              className={"plan-ed-row" + (d.estado === "hecho" ? " is-done" : "") + (drag === i ? " is-drag" : "") + (over === i && drag !== null && drag !== i ? " is-over" : "") + (isToday ? " is-today" : "")}
              style={{ borderLeft: "4px solid " + c }}>
              <span className="plan-ed-grip" aria-hidden="true">⠿</span>
              <div className="plan-ed-date">
                <b>{new Date(d.fecha + "T00:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric" })}</b>
                <span>{new Date(d.fecha + "T00:00:00").toLocaleDateString("es-MX", { month: "short" })}</span>
              </div>
              <div className="plan-ed-body">
                <div className="plan-ed-t">{d.tipo === "simulacro" ? "Simulacro general" : d.subject}</div>
                <div className="plan-ed-s">{d.ord}{d.titulo ? " · " + d.titulo : ""}</div>
              </div>
              <span className={"plan-ed-chip plan-ed-" + d.tipo}>{d.tipo}</span>
              <span className="plan-ed-min">{d.min}′</span>
              <button className={"plan-ed-done" + (d.estado === "hecho" ? " is-on" : "")} onClick={() => toggleDone(d)} title="Marcar hecho">✓</button>
            </div>
          );
        })}
        {dias.length === 0 && <EmptyStateI icon="🗓️" title="Sin plan generado" desc="Genera tu plan para poder editarlo." actions={<button className="btn btn-accent" onClick={() => window.generarPlan()}>Generar plan</button>} />}
      </div>
    </main>
  );
}

/* ============================ PALETA DE COMANDOS (Cmd/Ctrl+K) ============================ */
function CommandPalette() {
  const go = window.useGo();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef(null);

  const items = React.useMemo(() => {
    const nav = [];
    (window.NAV || []).forEach((grp) => grp.items.forEach(([route, label]) => nav.push({ label, hint: grp.g, run: () => go(route) })));
    const actions = [
      { label: "Iniciar Pomodoro", hint: "acción", run: () => go("cronometro") },
      { label: "Generar reactivos con IA", hint: "acción", run: () => go("generador") },
      { label: "Preguntar al tutor", hint: "acción", run: () => go("tutor") },
      { label: "Exportar respaldo", hint: "acción", run: () => { window.EPStore.exportJSON(); window.toast && window.toast("Respaldo descargado", "ok"); } },
      { label: "Regenerar plan de estudio", hint: "acción", run: () => { window.generarPlan(); window.toast && window.toast("Plan regenerado", "ok"); go("calendario"); } },
      { label: "Hoja de repaso (imprimir)", hint: "acción", run: () => go("imprimir") },
    ];
    return [...actions, ...nav];
  }, [go]);
  const filtered = q.trim() ? items.filter((it) => (it.label + " " + it.hint).toLowerCase().includes(q.toLowerCase())) : items;

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape") setOpen(false);
    };
    const onEvt = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("ep:cmdk", onEvt);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("ep:cmdk", onEvt); };
  }, []);
  React.useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current && inputRef.current.focus(), 30); } }, [open]);
  React.useEffect(() => { setSel(0); }, [q]);

  if (!open) return null;
  const choose = (it) => { setOpen(false); it.run(); };
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(filtered.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Enter" && filtered[sel]) { e.preventDefault(); choose(filtered[sel]); }
  };
  return (
    <div className="cmdk-scrim" onClick={() => setOpen(false)}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="cmdk-in">
          <span className="cmdk-ic">⌘</span>
          <input ref={inputRef} className="cmdk-input" placeholder="Buscar pantalla o acción…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} />
          <span className="cmdk-esc">esc</span>
        </div>
        <div className="cmdk-list">
          {filtered.length === 0 && <div className="cmdk-empty">Sin resultados</div>}
          {filtered.slice(0, 40).map((it, i) => (
            <div key={i} className={"cmdk-item" + (i === sel ? " is-sel" : "")} onMouseEnter={() => setSel(i)} onClick={() => choose(it)}>
              <span className="cmdk-label">{it.label}</span>
              <span className="cmdk-hint">{it.hint}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ActivityHeatmap, Informe, HojaRepaso, EditorPlan, CommandPalette });
