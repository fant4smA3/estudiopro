/* EstudioPro · Prototipo — Pantallas D: Calendario, Simulacro (config + bloques), Alertas */
import React from "react";
import { ColorField, ConfirmDialog, Crumbs as CrumbsD, Diff as DiffD, EmptyState, Modal, PageHead as PageHeadD, Panel, Panel as PanelD, SectionHead, Switch, toast, useGo as useGoD } from "./estudiopro-ui.jsx";
import { daysToExam, EPStore, generarPlan, intel, subjectNames, useStore } from "./estudiopro-store.jsx";
import { subjColor, subjShort, subjTextColor, TYPE_LABEL } from "./estudiopro-bank.jsx";

/* ============================ CALENDARIO + EDITOR DEL PLAN ============================
   Una sola página: el mes es editable (arrastra un día sobre otro para intercambiarlos,
   o suéltalo en un día libre para moverlo) y la hoja de cada día permite cambiar estado,
   mover a otra fecha o quitarlo. La pestaña Lista conserva el reordenado lineal. */
function Calendario() {
  const go = useGoD();
  const st = useStore();
  const [cursor, setCursor] = React.useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = React.useState(null);
  const [vista, setVista] = React.useState("agenda");  // agenda | mes | lista
  const [dragDate, setDragDate] = React.useState(null); // arrastre entre celdas del mes
  const [overDate, setOverDate] = React.useState(null);
  const [dragIdx, setDragIdx] = React.useState(null);   // arrastre en la vista lista
  const [overIdx, setOverIdx] = React.useState(null);
  const [confirmRegen, setConfirmRegen] = React.useState(false);
  const [moveTo, setMoveTo] = React.useState("");
  const [edit, setEdit] = React.useState(null);   // evento en edición (o nuevo)
  const [delAsk, setDelAsk] = React.useState(null); // evento por eliminar
  React.useEffect(() => { if (!st.plan.generado) generarPlan(); }, []);
  const dias = (st.plan.dias || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  const byDate = {}; dias.forEach((d) => { byDate[d.fecha] = d; });

  const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const DOW = ["L", "M", "X", "J", "V", "S", "D"];
  const y = cursor.getFullYear(), m = cursor.getMonth();
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const examStr = st.plan.examDate;
  const examTxt = examStr ? new Date(examStr + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "";
  const fmt = (dd) => new Date(y, m, dd).toISOString().slice(0, 10);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let dd = 1; dd <= daysInMonth; dd++) cells.push(dd);

  const estadoCls = { hecho: "cd-done", parcial: "cd-partial", pendiente: "" };
  const planMonth = dias.filter((d) => d.fecha.startsWith(y + "-" + String(m + 1).padStart(2, "0")));
  const hechos = planMonth.filter((d) => d.estado === "hecho").length;

  // --- edición del plan desde el calendario ---
  // mover contenido a otra fecha: si la fecha destino ya tiene plan, se intercambian
  const moveOrSwap = (fromFecha, toFecha) => {
    if (!fromFecha || !toFecha || fromFecha === toFecha) return false;
    const from = byDate[fromFecha];
    if (!from) return false;
    const to = byDate[toFecha];
    let nuevo;
    if (to) {
      // intercambio: el contenido (y su estado) viaja; las fechas quedan fijas
      nuevo = dias.map((d) => d.fecha === fromFecha ? { ...to, fecha: fromFecha } : d.fecha === toFecha ? { ...from, fecha: toFecha } : d);
      toast && toast("Días intercambiados", "ok");
    } else {
      nuevo = dias.map((d) => d.fecha === fromFecha ? { ...d, fecha: toFecha } : d);
      toast && toast("Día movido al " + new Date(toFecha + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }), "ok");
    }
    EPStore.updatePlan(nuevo.sort((a, b) => a.fecha.localeCompare(b.fecha)));
    return true;
  };
  const removeDay = (d) => {
    EPStore.updatePlan(dias.filter((x) => x.fecha !== d.fecha));
    setSel(null);
    toast && toast("Día quitado del plan", "ok");
  };
  const setEstado = (d, estado) => {
    EPStore.setPlanDayState(d.fecha, estado);
    setSel({ ...d, estado });
    toast && toast(estado === "hecho" ? "Día marcado como estudiado" : "Día marcado como pendiente", "ok");
  };
  // vista lista: arrastrar reordena los contenidos sobre las fechas fijas (editor clásico)
  const commitLista = (arr) => {
    const fechas = dias.map((d) => d.fecha);
    EPStore.updatePlan(arr.map((d, i) => ({ ...d, fecha: fechas[i] })));
  };
  const onDropLista = (idx) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
    const arr = dias.slice();
    const [it] = arr.splice(dragIdx, 1);
    arr.splice(idx, 0, it);
    commitLista(arr); setDragIdx(null); setOverIdx(null);
    toast && toast("Plan reprogramado", "ok");
  };

  // --- CRUD de eventos del plan (crear, editar, eliminar desde el propio calendario) ---
  const SUBJECTS_CAL = subjectNames();
  // color efectivo: el personalizado del evento o el de su materia
  const dayColor = (d) => (d && d.color) || (d && d.subject ? subjColor(d.subject) : "var(--accent)");
  // sin fecha explícita, propone el primer día libre desde hoy (evita pisar lo ya planeado)
  const primerDiaLibre = () => {
    const d = new Date(todayStr + "T00:00:00");
    for (let i = 0; i < 400; i++) {
      const iso = d.toISOString().slice(0, 10);
      if (!byDate[iso]) return iso;
      d.setDate(d.getDate() + 1);
    }
    return todayStr;
  };
  const nuevoEvento = (fecha) => setEdit({
    _nuevo: true, fechaOrig: null, fecha: fecha || primerDiaLibre(), tipo: "estudio",
    subject: SUBJECTS_CAL[0] || "", ord: "", titulo: "", min: 45, npreg: 12, estado: "pendiente", color: "", nota: "",
  });
  const editarEvento = (d) => { setSel(null); setEdit({ ...d, _nuevo: false, fechaOrig: d.fecha, color: d.color || "", nota: d.nota || "" }); };
  const guardarEvento = () => {
    const e = edit;
    if (!e || !e.fecha) return;
    const limpio = {
      fecha: e.fecha, tipo: e.tipo,
      subject: e.tipo === "simulacro" || e.tipo === "personal" ? (e.subject || null) : e.subject,
      ord: (e.ord || "").trim(), titulo: (e.titulo || "").trim(),
      estado: e.estado || "pendiente", min: Math.max(1, +e.min || 45), npreg: Math.max(0, +e.npreg || 0),
      color: e.color || undefined, nota: (e.nota || "").trim() || undefined,
    };
    // quita el evento de su fecha anterior (si se movió) y coloca el nuevo
    const resto = dias.filter((d) => d.fecha !== limpio.fecha && d.fecha !== e.fechaOrig);
    EPStore.updatePlan([...resto, limpio].sort((a, b) => a.fecha.localeCompare(b.fecha)));
    setEdit(null);
    toast && toast(e._nuevo ? "Evento agregado al plan" : "Evento actualizado", "ok");
  };
  const eliminarEvento = (d) => {
    EPStore.updatePlan(dias.filter((x) => x.fecha !== d.fecha));
    setDelAsk(null); setEdit(null); setSel(null);
    toast && toast("Evento eliminado del plan", "ok");
  };

  const openDay = (dd) => { const d = byDate[fmt(dd)]; if (d) { setSel(d); setMoveTo(""); } else { nuevoEvento(fmt(dd)); } };
  const startDay = (d) => {
    if (d.tipo === "simulacro") { go("simulacro"); return; }
    window.__epSimulacro = false; window.__epSubject = d.subject;
    EPStore.setNav({ subject: d.subject, ord: d.ord, mode: "practica" });
    go("quiz");
  };

  // --- resumen del plan: cuenta regresiva, avance y sesión de hoy ---
  const diasExamen = daysToExam();
  const totalPlan = dias.length;
  const hechasPlan = dias.filter((d) => d.estado === "hecho").length;
  const pctPlan = totalPlan ? Math.round(hechasPlan / totalPlan * 100) : 0;
  const nSimulacros = dias.filter((d) => d.tipo === "simulacro").length;
  const hoyPlan = byDate[todayStr] || null;
  // agenda: desde hoy en adelante; si ya pasó todo, muestra los últimos días del plan
  const proximos = dias.filter((d) => d.fecha >= todayStr);
  const agenda = proximos.length ? proximos : dias.slice(-7);
  const fmtDia = (f, opts) => new Date(f + "T00:00:00").toLocaleDateString("es-MX", opts);

  return (
    <main className="main">
      <PageHeadD title="Calendario y plan de estudio" sub={"Organiza tu plan hasta el examen" + (examTxt ? " · " + examTxt : "")} crumbs={[["Inicio", "inicio"], "Calendario"]}
        actions={<div className="cal-nav">
          {vista === "mes" && <React.Fragment>
            <button className="btn btn-sm" onClick={() => setCursor(new Date(y, m - 1, 1))} aria-label="Mes anterior">‹</button>
            <span className="cal-month">{MES[m]} {y}</span>
            <button className="btn btn-sm" onClick={() => setCursor(new Date(y, m + 1, 1))} aria-label="Mes siguiente">›</button>
          </React.Fragment>}
          <div className="rep-tabs cal-tabs">
            <button className={"rep-tab" + (vista === "agenda" ? " is-on" : "")} onClick={() => setVista("agenda")}>Agenda</button>
            <button className={"rep-tab" + (vista === "mes" ? " is-on" : "")} onClick={() => setVista("mes")}>Mes</button>
            <button className={"rep-tab" + (vista === "lista" ? " is-on" : "")} onClick={() => setVista("lista")}>Lista</button>
          </div>
          <button className="btn btn-sm" onClick={() => setConfirmRegen(true)}>Regenerar plan</button>
          <button className="btn btn-sm btn-accent" onClick={() => nuevoEvento()}>+ Nuevo evento</button>
        </div>} />

      {/* resumen del plan: cuánto falta, cuánto llevas y qué toca hoy */}
      <div className="plan-hdr">
        <div className="plan-cd" aria-label={diasExamen + " días para el examen"}>
          <b>{diasExamen}</b><span>{diasExamen === 1 ? "día" : "días"}</span>
        </div>
        <div className="plan-hdr-b">
          <div className="plan-hdr-t">{diasExamen === 0 ? "El examen es hoy" : "Faltan " + diasExamen + (diasExamen === 1 ? " día" : " días") + " para el examen"}{examTxt ? " · " + examTxt : ""}</div>
          <div className="mini-bar plan-bar"><i style={{ width: pctPlan + "%" }}></i></div>
          <div className="plan-hdr-s">
            <span><b>{hechasPlan}</b> de <b>{totalPlan}</b> sesiones hechas</span>
            <span><b>{nSimulacros}</b> simulacro{nSimulacros === 1 ? "" : "s"}</span>
            <span><b>{pctPlan}%</b> del plan</span>
          </div>
        </div>
      </div>

      {hoyPlan && (
        <div className="plan-today" style={{ borderLeft: "4px solid " + (hoyPlan.subject ? subjColor(hoyPlan.subject) : "var(--accent)") }}>
          <span className="plan-today-ic" style={{ background: hoyPlan.subject ? subjColor(hoyPlan.subject) : "var(--accent)" }} aria-hidden="true">{hoyPlan.tipo === "simulacro" ? "◎" : "▣"}</span>
          <div className="plan-today-b">
            <div className="plan-today-t">Hoy · {hoyPlan.tipo === "simulacro" ? "Simulacro general" : hoyPlan.subject}</div>
            <div className="plan-today-d">{hoyPlan.ord}{hoyPlan.titulo ? " · " + hoyPlan.titulo : ""} · {hoyPlan.min} min</div>
          </div>
          {hoyPlan.estado === "hecho"
            ? <span className="plan-today-done">✓ Hecho</span>
            : <button className="btn btn-accent" onClick={() => startDay(hoyPlan)}>{hoyPlan.tipo === "simulacro" ? "Ir al simulacro ▸" : "Estudiar ahora ▸"}</button>}
        </div>
      )}

      {vista === "agenda" && (
        agenda.length === 0 ? (
          <EmptyState icon="🗓" title="Sin plan generado"
            desc="Genera tu plan de estudio para ver la agenda de aquí al examen."
            actions={<button className="btn btn-accent" onClick={() => setConfirmRegen(true)}>Generar plan ▸</button>} />
        ) : (
          <div className="plan-agenda">
            {agenda.map((d) => {
              const c = dayColor(d);
              const isToday = d.fecha === todayStr;
              const isExam = d.fecha === examStr;
              return (
                <div className="ag-row" key={d.fecha}>
                  <div className={"ag-date" + (isToday ? " is-today" : "")}>
                    <b>{fmtDia(d.fecha, { day: "numeric" })}</b>
                    <span>{isToday ? "Hoy" : fmtDia(d.fecha, { weekday: "short" })}</span>
                  </div>
                  <div className={"ag-card" + (isToday ? " is-today" : "") + (isExam ? " is-exam" : "") + (d.estado === "hecho" ? " is-done" : "")}
                    style={{ borderLeftColor: c }} onClick={() => { setSel(d); setMoveTo(""); }} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") { setSel(d); setMoveTo(""); } }}>
                    <div className="ag-body">
                      <div className="ag-t">{d.tipo === "simulacro" ? "Simulacro general" : d.tipo === "personal" ? (d.titulo || "Evento") : d.subject}{isExam && <span className="ag-exam">EXAMEN</span>}</div>
                      <div className="ag-s">{d.ord}{d.titulo ? " · " + d.titulo : ""}</div>
                    </div>
                    <span className={"ag-pill ag-" + d.tipo}>{d.tipo}</span>
                    <span className="ag-min">{d.min}′</span>
                    <button className={"ag-done" + (d.estado === "hecho" ? " is-on" : "")} title="Marcar hecho"
                      aria-label={"Marcar " + (d.estado === "hecho" ? "pendiente" : "hecho")}
                      onClick={(e) => { e.stopPropagation(); EPStore.setPlanDayState(d.fecha, d.estado === "hecho" ? "pendiente" : "hecho"); }}>✓</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {vista === "mes" && <React.Fragment>
      <div className="cal-legend">
        <span><i className="cal-dot cd-done"></i> Estudiado</span>
        <span><i className="cal-dot cd-partial"></i> Parcial</span>
        <span><i className="cal-dot"></i> Pendiente</span>
        <span><i className="cal-dot cd-sim"></i> Simulacro (viernes)</span>
        <span className="cal-legend-r">{hechos} días estudiados este mes</span>
      </div>
      <div className="cal-hint">Toca un día con plan para abrirlo, o un <b>día libre para crear un evento</b> ahí. En computadora también puedes <b>arrastrar un día sobre otro</b> para intercambiarlos, o soltarlo en un día libre para moverlo.</div>

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
            const c = d ? dayColor(d) : null;
            return (
              <div key={dd} className={"cal-cell" + (isToday ? " is-today" : "") + (isExam ? " is-exam" : "") + (d ? " has-plan" : "") + (dragDate === ds ? " is-drag" : "") + (overDate === ds && dragDate && dragDate !== ds ? " is-over" : "")}
                onClick={() => openDay(dd)} role={d ? "button" : undefined}
                draggable={!!d}
                onDragStart={d ? () => setDragDate(ds) : undefined}
                onDragOver={(e) => { if (dragDate && dragDate !== ds) { e.preventDefault(); setOverDate(ds); } }}
                onDragLeave={() => { if (overDate === ds) setOverDate(null); }}
                onDrop={() => { moveOrSwap(dragDate, ds); setDragDate(null); setOverDate(null); }}
                onDragEnd={() => { setDragDate(null); setOverDate(null); }}>
                <span className="cal-num">{dd}{isExam && <span className="cal-examflag">EXAMEN</span>}</span>
                {d && d.tipo === "simulacro" && !d.color && <span className="cal-chip cal-chip-sim">Simulacro {d.npreg || 200}</span>}
                {d && d.tipo === "repaso" && !d.color && <span className="cal-chip cal-chip-rep">Repaso</span>}
                {d && (d.tipo === "estudio" || d.tipo === "personal" || d.color) && (
                  <span className="cal-chip" style={{ background: "color-mix(in srgb, " + c + " 16%, transparent)", color: (!d.color && d.subject) ? subjTextColor(d.subject) : c }}>
                    <i className="cal-dot" style={{ background: c }}></i>
                    {d.tipo === "personal" ? (d.titulo || "Evento") : (d.subject ? subjShort(d.subject) : d.tipo)}
                  </span>
                )}
                {d && d.titulo && d.tipo !== "simulacro" && <span className="cal-cap">{d.titulo.replace(/^(Cap\.|Libro|Título)\s*/, "")}</span>}
                {d && <span className={"cal-state " + (estadoCls[d.estado] || "")}></span>}
              </div>
            );
          })}
        </div>
      </div>
      </React.Fragment>}

      {vista === "lista" && <React.Fragment>
      <div className="plan-ed-hint">Sujeta el punto <span className="plan-ed-grip">⠿</span> y arrastra un día sobre otro para intercambiar el orden. Las fechas se mantienen; solo cambia qué estudias cada día.</div>
      <div className="plan-ed-list">
        {dias.map((d, i) => {
          const c = dayColor(d);
          const isToday = d.fecha === todayStr;
          return (
            <div key={d.fecha} draggable
              onDragStart={() => setDragIdx(i)} onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }} onDrop={() => onDropLista(i)} onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
              className={"plan-ed-row" + (d.estado === "hecho" ? " is-done" : "") + (dragIdx === i ? " is-drag" : "") + (overIdx === i && dragIdx !== null && dragIdx !== i ? " is-over" : "") + (isToday ? " is-today" : "")}
              style={{ borderLeft: "4px solid " + c }}
              onClick={() => { setSel(d); setMoveTo(""); }}>
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
              <button className={"plan-ed-done" + (d.estado === "hecho" ? " is-on" : "")} onClick={(e) => { e.stopPropagation(); EPStore.setPlanDayState(d.fecha, d.estado === "hecho" ? "pendiente" : "hecho"); }} title="Marcar hecho" aria-label={"Marcar " + (d.estado === "hecho" ? "pendiente" : "hecho")}>✓</button>
            </div>
          );
        })}
        {dias.length === 0 && <div className="plan-ed-hint">Sin plan generado. Usa «Regenerar plan» para crearlo.</div>}
      </div>
      </React.Fragment>}

      {sel && (
        <div className="cal-sheet" onClick={() => setSel(null)}>
          <div className="cal-sheet-card" onClick={(e) => e.stopPropagation()} style={{ borderTop: "3px solid " + dayColor(sel) }}>
            <button className="cal-sheet-x" onClick={() => setSel(null)} aria-label="Cerrar">✕</button>
            <div className="cal-sheet-date">{new Date(sel.fecha + "T00:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</div>
            <div className="cal-sheet-title">{sel.tipo === "simulacro" ? "Simulacro general" : sel.tipo === "personal" ? (sel.titulo || "Evento") : sel.subject}</div>
            <div className="cal-sheet-sub">{sel.ord}{sel.titulo ? " · " + sel.titulo : ""}</div>
            <div className="cal-sheet-stats">
              <span className="sc"><b>{sel.min}</b> min estimados</span>
              <span className="sc"><b>{sel.npreg}</b> preguntas</span>
              <span className={"sc cal-badge-" + sel.estado}>{sel.estado}</span>
            </div>
            {sel.nota && <div className="cal-sheet-nota">{sel.nota}</div>}
            <div className="cal-sheet-acts">
              {sel.tipo !== "personal" && <button className="btn btn-accent" onClick={() => startDay(sel)}>{sel.tipo === "simulacro" ? "Ir al simulacro ▸" : "Estudiar ahora ▸"}</button>}
              <button className="btn" onClick={() => editarEvento(sel)}>✎ Editar</button>
              {sel.estado !== "hecho"
                ? <button className="btn" onClick={() => setEstado(sel, "hecho")}>Marcar hecho</button>
                : <button className="btn" onClick={() => setEstado(sel, "pendiente")}>Marcar pendiente</button>}
              <button className="btn btn-danger" onClick={() => removeDay(sel)}>Quitar del plan</button>
            </div>
            <div className="cal-sheet-move">
              <label htmlFor="cal-move-date">Mover a otra fecha</label>
              <div className="cal-sheet-move-row">
                <input id="cal-move-date" type="date" className="input input-sm" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} />
                <button className="btn btn-sm" disabled={!moveTo || moveTo === sel.fecha} onClick={() => { if (moveOrSwap(sel.fecha, moveTo)) setSel(null); }}>
                  {moveTo && byDate[moveTo] ? "Intercambiar ▸" : "Mover ▸"}
                </button>
              </div>
              {moveTo && byDate[moveTo] && moveTo !== sel.fecha && <span className="cal-sheet-move-note">Esa fecha ya tiene «{byDate[moveTo].tipo === "simulacro" ? "Simulacro general" : byDate[moveTo].subject}» — se intercambiarán.</span>}
            </div>
          </div>
        </div>
      )}

      {/* editor de evento: crear / editar cualquier día del plan sin salir del calendario */}
      <Modal open={!!edit} onClose={() => setEdit(null)}>
        {edit && (
          <React.Fragment>
            <div className="modal-h">{edit._nuevo ? "Nuevo evento" : "Editar evento"}</div>
            <div className="modal-b ev-form">
              <div className="form-2">
                <div className="field"><label htmlFor="ev-fecha">Fecha</label>
                  <input id="ev-fecha" type="date" className="input" value={edit.fecha} onChange={(e) => setEdit({ ...edit, fecha: e.target.value })} />
                </div>
                <div className="field"><label htmlFor="ev-tipo">Tipo</label>
                  <select id="ev-tipo" className="input" value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value })}>
                    <option value="estudio">Estudio</option>
                    <option value="repaso">Repaso</option>
                    <option value="simulacro">Simulacro</option>
                    <option value="personal">Personal / otro</option>
                  </select>
                </div>
              </div>

              <div className="field"><label htmlFor="ev-titulo">Título</label>
                <input id="ev-titulo" className="input" placeholder={edit.tipo === "personal" ? "Ej. Entrega de documentos" : "Ej. Libro Primero — Reglas generales"}
                  value={edit.titulo} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} />
              </div>

              {edit.tipo !== "personal" && (
                <div className="form-2">
                  <div className="field"><label htmlFor="ev-materia">Materia</label>
                    <select id="ev-materia" className="input" value={edit.subject || ""} onChange={(e) => setEdit({ ...edit, subject: e.target.value })}>
                      <option value="">— sin materia —</option>
                      {SUBJECTS_CAL.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="field"><label htmlFor="ev-ord">Ordenamiento / tema</label>
                    <input id="ev-ord" className="input" placeholder="Ej. Código de Justicia Militar" value={edit.ord} onChange={(e) => setEdit({ ...edit, ord: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="form-2">
                <div className="field"><label htmlFor="ev-min">Duración (min)</label>
                  <input id="ev-min" type="number" min="1" className="input" value={edit.min} onChange={(e) => setEdit({ ...edit, min: e.target.value })} />
                </div>
                {edit.tipo !== "personal" && (
                  <div className="field"><label htmlFor="ev-npreg">Nº de preguntas</label>
                    <input id="ev-npreg" type="number" min="0" className="input" value={edit.npreg} onChange={(e) => setEdit({ ...edit, npreg: e.target.value })} />
                  </div>
                )}
              </div>

              <div className="field"><label htmlFor="ev-nota">Nota (opcional)</label>
                <textarea id="ev-nota" className="input" rows={2} placeholder="Detalles, recordatorios…" value={edit.nota} onChange={(e) => setEdit({ ...edit, nota: e.target.value })}></textarea>
              </div>

              <div className="field">
                <label>Color</label>
                <ColorField value={edit.color || (edit.subject ? subjColor(edit.subject) : "#2F73CE")} onChange={(c) => setEdit({ ...edit, color: c })} />
                {edit.color && <button type="button" className="ev-color-reset" onClick={() => setEdit({ ...edit, color: "" })}>{edit.subject ? "Usar el color de la materia" : "Quitar color personalizado"}</button>}
              </div>

              <div className="field"><label htmlFor="ev-estado">Estado</label>
                <select id="ev-estado" className="input" value={edit.estado} onChange={(e) => setEdit({ ...edit, estado: e.target.value })}>
                  <option value="pendiente">Pendiente</option>
                  <option value="parcial">Parcial</option>
                  <option value="hecho">Hecho</option>
                </select>
              </div>

              {byDate[edit.fecha] && edit.fecha !== edit.fechaOrig && (
                <div className="ev-warn">Ese día ya tiene «{byDate[edit.fecha].tipo === "simulacro" ? "Simulacro general" : (byDate[edit.fecha].titulo || byDate[edit.fecha].subject || "un evento")}» — se reemplazará. El plan admite un evento por día.</div>
              )}
            </div>
            <div className="modal-f">
              {!edit._nuevo && <button className="btn btn-danger" onClick={() => setDelAsk(edit)}>Eliminar</button>}
              <span style={{ flex: 1 }}></span>
              <button className="btn" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn btn-accent" onClick={guardarEvento} disabled={!edit.fecha}>{edit._nuevo ? "Agregar al plan" : "Guardar cambios"}</button>
            </div>
          </React.Fragment>
        )}
      </Modal>

      <ConfirmDialog open={!!delAsk} danger confirmLabel="Eliminar evento"
        title="¿Eliminar este evento del plan?"
        body={delAsk ? <span>Se quitará <b>{delAsk.tipo === "simulacro" ? "Simulacro general" : (delAsk.titulo || delAsk.subject || "el evento")}</b> del {new Date(delAsk.fecha + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" })}.</span> : null}
        onClose={() => setDelAsk(null)} onConfirm={() => eliminarEvento(delAsk)} />

      <ConfirmDialog open={confirmRegen} title="¿Regenerar el plan completo?"
        body="Se creará un plan nuevo desde hoy hasta el examen y se perderán los cambios manuales (días movidos, intercambiados o quitados)."
        confirmLabel="Regenerar plan" danger
        onClose={() => setConfirmRegen(false)}
        onConfirm={() => { generarPlan(); setConfirmRegen(false); toast && toast("Plan regenerado", "ok"); }} />
    </main>
  );
}

/* ====================== SIMULACRO (config + bloques) ====================== */
function SimulacroBody() {
  const go = useGoD();
  const st = useStore();
  const SUBJECTS = subjectNames();
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
    <React.Fragment>
      <SectionHead icon="📝" title="Simulacro de examen" desc="200 preguntas · 120 + 15 descanso + 120 min" />

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
              onClick={() => { EPStore.setNav({ simDist: dist, simFiltro: modo === "filtros" ? filtro : "ninguno" }); go("simrun"); }}>Iniciar simulacro ▸</button>
          </div>
        </aside>
      </div>
    </React.Fragment>
  );
}

/* ====================== SIMULACRO en curso (2 bloques + descanso) ====================== */
function SimRun() {
  const go = useGoD();
  // pool real: preguntas del banco según la distribución configurada, sin repetición
  const pool = React.useMemo(() => {
    const nav = (EPStore.getNav && EPStore.getNav()) || {};
    const dist = nav.simDist || { "Legislación Militar": 40, "Operaciones Militares": 35, "Normatividad Gubernamental": 35, "Aspecto Administrativo": 25, "Adiestramiento y Mando Militar": 30, "Aspecto Técnico": 35 };
    const filtro = nav.simFiltro || "ninguno";
    const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    let bank = (EPStore.get().questions || []).filter((q) => q.type !== "AB");
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
    EPStore.addSimResult({ global: score, byS });
    // marca el banco real con el desempeño del simulacro
    const seen = {}; pool.forEach((qq, k) => { if (qq._id) seen[qq._id] = { id: qq._id, correct: answers[k] === qq.answer }; });
    EPStore.applyQuizResults(Object.values(seen));
    const el = elapsedRef.current;
    const time = String(Math.floor(el / 60)).padStart(2, "0") + ":" + String(el % 60).padStart(2, "0");
    const missed = pool.map((qq, k) => ({ q: qq.q, loc: qq.loc, ord: qq.ord, ok: answers[k] === qq.answer })).filter((m) => !m.ok);
    EPStore.setLastResult({ subject: "Simulacro general", total, correct, wrong: total - correct, time, score, isSim: true,
      byChapter: Object.fromEntries(Object.entries(byMat).map(([k, v]) => [k, v])), missed });
    EPStore.addSession({ subject: "Simulacro general", label: "Simulacro general · " + total + " preg", n: total, time, score, date: new Date().toISOString().slice(0, 10), state: "done" });
    EPStore.bumpToday(answers.filter((a) => a !== null).length);
    setPhase("done");
  };
  // banco sin preguntas para la selección: estado vacío en lugar de sesión
  if (total === 0) {
    return (
      <main className="main main-center">
        <div className="card-stage">
          <EmptyState icon="⌕" title="No hay preguntas para el simulacro"
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
    const r = EPStore.get().lastResult;
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
            <span className="q-tag" style={{ color: subjTextColor(q.subject), fontWeight: 700 }}>{q.subject}</span>
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

/* ============================ ALERTAS ============================ */
function AlertasBody() {
  const [cfg, setCfg] = React.useState({ diaria: true, vencidas: true, simulacro: true, racha: true, meta: false });
  const [perm, setPerm] = React.useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const pedirPermiso = async () => {
    if (typeof Notification === "undefined") { setPerm("unsupported"); toast && toast("Navegador sin soporte de notificaciones", "warn"); return; }
    const p = await Notification.requestPermission(); setPerm(p);
    if (p === "granted") window.epNotify("Notificaciones activadas", "Te avisaremos de tus repasos y simulacros.");
  };
  const t = (k) => setCfg((p) => ({ ...p, [k]: !p[k] }));
  const alerts = [
    ["diaria", "🗓️", "Recordatorio de sesión diaria", "Hoy toca Legislación · CJM Libro Primero", "8:00 a.m.", "var(--accent)"],
    ["vencidas", "🔁", "Tarjetas vencidas", "Tienes 58 tarjetas para repasar hoy", "9:00 a.m.", "#A0742A"],
    ["simulacro", "📝", "Simulacro del viernes", "Hoy: simulacro de 200 preguntas (4 h 15 min)", "viernes 8:00 a.m.", "#2A8A5E"],
    ["racha", "🔥", "Racha en riesgo", "No pierdas tu racha de 12 días", "9:00 p.m.", "#C2410C"],
    ["meta", "🎯", "Meta diaria no cumplida", "Te faltan 12 preguntas para tu meta", "9:30 p.m.", "#7A57C2"],
  ];
  return (
    <React.Fragment>
      <SectionHead icon="🔔" title="Alertas y recordatorios" desc="Notificaciones del plan de estudio" />

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
    </React.Fragment>
  );
}

/* ====================== REPASO PRIORITARIO (cola SRS) ====================== */
function RepasoPrioritario() {
  const go = useGoD();
  const st = useStore();
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
    EPStore.setNav({ subject: window.__epSubject, mode: "practica", filter: t.label === "Falladas" ? "fall" : t.label === "Importantes" ? "imp" : null });
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
                    <span className="rp-item-subj" style={{ color: subjTextColor(it.subject) }}>{(it.subject || "").split(" ")[0]}</span>
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

/* ====================== SESIÓN DE HOY (modo enfoque) ====================== */
function SesionHoy() {
  const go = useGoD();
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
    if (i === 1) { window.__epSubject = ses.subject; EPStore.setNav({ subject: ses.subject, ord: ses.ord, mode: "practica" }); go("tarjetas"); }
    if (i === 2) { window.__epSimulacro = false; window.__epSubject = ses.subject; EPStore.setNav({ subject: ses.subject, ord: ses.ord, mode: "practica" }); go("quiz"); }
  };
  return (
    <main className="main main-center">
      <header className="page-head-card" style={{ borderTop: "3px solid " + color }}>
        <CrumbsD path={[["Inicio", "inicio"], "Sesión de hoy"]} />
        <div className="study-top">
          <div className="study-meta">
            <span className="study-meta-tag" style={{ color: subjTextColor(ses.subject) }}>Sesión de estudio · modo enfoque</span>
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

/* ====================== ONBOARDING GUIADO (multipaso) ====================== */
function Onboarding() {
  const go = useGoD();
  const SUBJECTS = subjectNames();
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
    EPStore.setExamDate(examDate);
    EPStore.setGoal(goal);
    EPStore.setDias(diasNum);
    generarPlan();
    toast && toast("Plan de estudio generado", "ok");
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

/* ====================== INTELIGENCIA DE ESTUDIO ====================== */
function InteligenciaBody() {
  const go = useGoD();
  const st = useStore();
  const x = intel();
  const notaCls = x.nota >= 8 ? "rs-ok" : x.nota >= 6 ? "rs-warn" : "rs-bad";
  const recoIc = { debil: "🎯", fall: "🔁", olvido: "🕓", nota: "📈" };
  const startSubj = (subj, filter) => {
    window.__epSimulacro = false; window.__epSubject = subj;
    EPStore.setNav({ subject: subj, mode: "practica", filter: filter || null });
    go("quiz");
  };
  return (
    <React.Fragment>
      <SectionHead icon="🧠" title="Inteligencia de estudio" desc="Análisis de tu desempeño y qué estudiar a continuación" />

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
                <span className="intel-bar-pct" style={{ color: subjTextColor(m.subj) }}>{m.dominio}%</span>
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
              <span className="intel-focus-v" style={{ color: subjTextColor(x.debil.subj) }}>{x.debil.subj}</span>
              <span className="intel-focus-n">{x.debil.dominio}%</span>
            </div>
            <div className="intel-focus-row">
              <span className="intel-focus-k">Más olvidado</span>
              {x.olvidado
                ? <React.Fragment>
                    <span className="intel-focus-v" style={{ color: subjTextColor(x.olvidado.subj) }}>{x.olvidado.subj}</span>
                    <span className="intel-focus-n">{x.olvidado.dias} d sin repasar</span>
                  </React.Fragment>
                : <span className="intel-focus-n">sin datos aún · registra sesiones o tiempo</span>}
            </div>
            <div className="intel-focus-row">
              <span className="intel-focus-k">Más fuerte</span>
              <span className="intel-focus-v" style={{ color: subjTextColor(x.fuerte.subj) }}>{x.fuerte.subj}</span>
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
                  <td className="ta-r" style={{ width: "36px", fontWeight: 700, color: subjTextColor(subj) }}>{p}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelD>
      </div>

      <div className="rp-note">
        <b>¿Cómo se calcula?</b> La nota proyectada combina tu <b>dominio por materia</b> (avance, aciertos y fallos) ponderado por el peso de cada área en el examen. Las recomendaciones priorizan lo débil, lo fallado y lo que llevas más tiempo sin repasar.
      </div>
    </React.Fragment>
  );
}

/* helper local: Panel ya viene del window */

// Componentes exportados como módulo ES (ya no se publican en window.*; app/merged/pruebas los importan).
export { Calendario, Onboarding, RepasoPrioritario, SesionHoy, SimRun, InteligenciaBody, SimulacroBody, AlertasBody };
