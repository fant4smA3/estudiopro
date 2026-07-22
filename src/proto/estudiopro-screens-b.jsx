/* EstudioPro · Prototipo — Pantallas B */
import React from "react";
import { ConfirmDialog, Crumbs as CrumbsB, Diff as DiffB, EmptyState, PageHead as PageHeadB, Panel as PanelB, toast, useGo as useGoB } from "./estudiopro-ui.jsx";
import { dueCards, EPStore, ordsFor, realStreak, srsPreview, subjectNames, undoableToast, useStore } from "./estudiopro-store.jsx";
import { STATUS_LABEL, subjColor, subjShort, subjTextColor, TYPE_LABEL } from "./estudiopro-bank.jsx";

/* ====================== BANCO DE PREGUNTAS ====================== */
function Banco() {
  const go = useGoB();
  const st = useStore();
  const bank = st.questions;
  const subjects = ["Todas", ...subjectNames()];
  const navInit = (EPStore.getNav && EPStore.getNav()) || {};
  const [q, setQ] = React.useState(navInit.search || "");
  React.useEffect(() => { if (navInit.search) EPStore.setNav({}); }, []);
  const [subj, setSubj] = React.useState("Todas");
  const [onlyFall, setOnlyFall] = React.useState(false);
  const [delRow, setDelRow] = React.useState(null);
  const [sel, setSel] = React.useState(() => new Set());
  const [bulkDel, setBulkDel] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const PER_PAGE = 25;
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSel(new Set());
  const [sort, setSort] = React.useState(null); // { col, dir }
  const needle = q.trim().toLowerCase();
  const rows = bank.filter((r) => {
    if (subj !== "Todas" && r.subject !== subj) return false;
    if (onlyFall && r.status !== "fall") return false;
    if (needle && !(r.q + " " + r.subject + " " + r.ord + " " + r.tags.join(" ")).toLowerCase().includes(needle)) return false;
    return true;
  });
  const DIF_ORD = { "fácil": 0, medio: 1, "difícil": 2 };
  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const key = { pregunta: (r) => (r.q || "").toLowerCase(), tipo: (r) => r.type || "", dificultad: (r) => DIF_ORD[r.dif] ?? 1, estado: (r) => r.status || "" }[sort.col];
    if (!key) return rows;
    return [...rows].sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort.dir === "desc" ? -1 : 1); });
  }, [rows, sort]);
  const toggleSort = (col) => setSort((s) => (!s || s.col !== col) ? { col, dir: "asc" } : s.dir === "asc" ? { col, dir: "desc" } : null);
  const sortMark = (col) => (sort && sort.col === col ? (sort.dir === "asc" ? " ▲" : " ▼") : "");
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const curPage = Math.min(page, totalPages - 1);
  React.useEffect(() => { setPage(0); }, [needle, subj, onlyFall]);
  const pageRows = sorted.slice(curPage * PER_PAGE, curPage * PER_PAGE + PER_PAGE);
  // "seleccionar todas" opera solo sobre la página visible (evita borrar filas fuera de vista)
  const visibleIds = pageRows.map((r) => r._id);
  const allSel = visibleIds.length > 0 && visibleIds.every((id) => sel.has(id));
  const toggleAll = () => setSel((s) => { const n = new Set(s); allSel ? visibleIds.forEach((id) => n.delete(id)) : visibleIds.forEach((id) => n.add(id)); return n; });
  const bulkMarkImp = () => { EPStore.markImportant([...sel], true); toast && toast(sel.size + " marcadas como importantes", "ok"); clearSel(); };
  // todas las preguntas YA son tarjetas; esta acción solo lleva a repasarlas como tarjetas
  const bulkToCards = () => {
    const chosen = bank.filter((q) => sel.has(q._id));
    if (!chosen.length) return;
    window.__epSubject = chosen[0].subject;
    window.__epCardVista = "estudiar";
    clearSel();
    go("tarjetas");
  };
  return (
    <main className="main">
      <PageHeadB title="Banco de preguntas" sub={bank.length + " preguntas · cada una es también una tarjeta de repaso"} crumbs={[["Inicio", "inicio"], "Banco de preguntas"]}
        actions={<div className="qr-head-acts"><button className="btn" onClick={() => go("imprimir")}>🖨 Hoja de repaso</button><button className="btn" onClick={() => go("crear-rapido")}>✨ Creación rápida</button><button className="btn btn-accent" onClick={() => { window.__epEditQ = null; go("pregunta"); }}>+ Nueva pregunta</button></div>} />

      <div className="filterbar">
        <div className="fb-search">
          <span className="gsearch-key">/</span>
          <input className="fb-search-in" placeholder="Buscar por enunciado, etiqueta o referencia…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="fb-clear" onClick={() => setQ("")} aria-label="limpiar">✕</button>}
        </div>
        <div className="fb-selects fb-subjects">
          {subjects.map((s) => (
            <span key={s} className={"subjchip" + (s === subj ? " is-on" : "")} onClick={() => setSubj(s)}
              style={s === subj && s !== "Todas" ? { background: subjColor(s), borderColor: subjColor(s), color: "#fff" } : (s !== "Todas" ? { borderColor: subjColor(s) } : {})}>
              {s !== "Todas" && <i className="subjchip-dot" style={{ background: subjColor(s) }}></i>}{s}
            </span>
          ))}
        </div>
        <div className="fb-toggles">
          <span className={"tg" + (onlyFall ? " is-on" : "")} onClick={() => setOnlyFall(!onlyFall)}>Solo falladas</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="⌕" title="Sin resultados"
          desc={'Ninguna pregunta coincide con los filtros actuales. Prueba con otra palabra o quita filtros.'}
          actions={<button className="btn" onClick={() => { setQ(""); setSubj("Todas"); setOnlyFall(false); }}>Limpiar filtros</button>} />
      ) : (
      <div className="tbl-wrap">
        <div className="tbl-scroll">
        <table className="tbl tbl-bank">
          <thead>
            <tr>
              <th className="cb"><span className={"box" + (allSel ? " is-on" : "")} onClick={toggleAll} role="checkbox" aria-checked={allSel} aria-label="Seleccionar las de esta página"></span></th>
              <th className="th-sort" onClick={() => toggleSort("pregunta")} role="button" title="Ordenar">Pregunta{sortMark("pregunta")}</th>
              <th className="th-sort" onClick={() => toggleSort("tipo")} role="button" title="Ordenar">Tipo{sortMark("tipo")}</th>
              <th className="th-sort" onClick={() => toggleSort("dificultad")} role="button" title="Ordenar">Dificultad{sortMark("dificultad")}</th>
              <th className="th-sort" onClick={() => toggleSort("estado")} role="button" title="Ordenar">Estado{sortMark("estado")}</th>
              <th className="ta-c">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={r._id} className={"clickable" + (sel.has(r._id) ? " is-sel-row" : "")} onClick={() => { window.__epEditQ = r; go("pregunta"); }}>
                <td className="cb" onClick={(e) => e.stopPropagation()}><span className={"box" + (sel.has(r._id) ? " is-on" : "")} onClick={() => toggleSel(r._id)} role="checkbox" aria-checked={sel.has(r._id)} aria-label="Seleccionar"></span></td>
                <td className="t-q">
                  <span className="t-q-bar" style={{ background: subjColor(r.subject) }}></span>
                  <span className="t-q-body">
                    <span className="t-q-text">{r.q}</span>
                    <span className="t-q-loc">
                      <span className="t-q-subj" style={{ color: subjTextColor(r.subject) }}>{r.subject}</span>
                      <span className="t-q-path">· {r.ord} · {r.loc}</span>
                      {r.tags.map((t) => <span className="tag" key={t}>#{t}</span>)}
                    </span>
                  </span>
                </td>
                <td><span className="type-tag">{r.type}</span></td>
                <td><DiffB level={r.dif} /></td>
                <td><span className={"st st-" + r.status}><i className="st-dot"></i>{STATUS_LABEL[r.status]}</span></td>
                <td className="ta-c" onClick={(e) => e.stopPropagation()}>
                  <div className="rowacts">
                    <button className="ra-btn" title="Editar" onClick={() => { window.__epEditQ = r; go("pregunta"); }}>✎</button>
                    <button className="ra-btn" title="Importante" onClick={() => EPStore.toggleImportant(r._id)}>{r.status === "imp" ? "★" : "☆"}</button>
                    <button className="ra-btn" title="Duplicar" onClick={() => { EPStore.duplicateQuestion(r._id); toast && toast("Pregunta duplicada", "ok"); }}>⧉</button>
                    <button className="ra-btn ra-del" title="Eliminar" onClick={() => setDelRow(r)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {totalPages > 1 && (
          <div className="pager">
            <button className="btn btn-sm" disabled={curPage === 0} onClick={() => setPage(curPage - 1)}>‹ Anterior</button>
            <span className="pager-info">Página {curPage + 1} de {totalPages} · {rows.length} preguntas</span>
            <button className="btn btn-sm" disabled={curPage >= totalPages - 1} onClick={() => setPage(curPage + 1)}>Siguiente ›</button>
          </div>
        )}
      </div>
      )}

      <div className="tbl-foot">
        {sel.size > 0 ? (
          <React.Fragment>
            <span className="tf-l"><b>{sel.size}</b> seleccionada{sel.size === 1 ? "" : "s"} · <span className="clickable" style={{ color: "var(--accent)", fontWeight: 600 }} onClick={clearSel}>quitar selección</span></span>
            <div className="tf-bulk">
              <button className="btn btn-sm" onClick={bulkMarkImp}>★ Marcar importante</button>
              <button className="btn btn-sm" onClick={bulkToCards}>Repasar como tarjetas ▸</button>
              <button className="btn btn-sm btn-danger" onClick={() => setBulkDel(true)}>Eliminar</button>
            </div>
          </React.Fragment>
        ) : (
          <React.Fragment>
            <span className="tf-l">{rows.length} de {bank.length} preguntas{subj !== "Todas" ? " · " + subj : ""}</span>
            <div className="tf-bulk">
              <button className="btn btn-sm" onClick={() => go("cuestionarios")}>Configurar cuestionario</button>
              <button className="btn btn-sm" onClick={() => { window.__epEditQ = null; go("pregunta"); }}>+ Nueva pregunta</button>
            </div>
          </React.Fragment>
        )}
        <span className="tf-hint">Selecciona filas para acciones en lote</span>
      </div>

      <ConfirmDialog open={bulkDel} danger confirmLabel={"Eliminar " + sel.size + " pregunta" + (sel.size === 1 ? "" : "s")}
        title="¿Eliminar las preguntas seleccionadas?"
        body={<span>Se eliminarán <b>{sel.size}</b> pregunta{sel.size === 1 ? "" : "s"} del banco. Podrás deshacerlo justo después desde el aviso.</span>}
        onClose={() => setBulkDel(false)} onConfirm={() => { const n = sel.size; EPStore.deleteQuestions([...sel]); setBulkDel(false); clearSel(); undoableToast && undoableToast(n + " pregunta" + (n === 1 ? " eliminada" : "s eliminadas")); }} />

      <ConfirmDialog open={!!delRow} danger confirmLabel="Eliminar pregunta"
        title="¿Eliminar esta pregunta?"
        body={delRow && <span>Se eliminará <b>“{delRow.q}”</b> del banco. Podrás deshacerlo justo después desde el aviso.</span>}
        onClose={() => setDelRow(null)} onConfirm={() => { EPStore.deleteQuestion(delRow._id); setDelRow(null); undoableToast && undoableToast("Pregunta eliminada"); }} />
    </main>
  );
}

/* ==================== CREAR / EDITAR PREGUNTA =================== */
function PreguntaForm() {
  const go = useGoB();
  const editing = window.__epEditQ || null;
  const SUBJECTS = subjectNames();
  const tipoMap = { "Opción múltiple": "OM", "Verdadero / Falso": "VF", "Respuesta corta": "AB", "Abierta": "AB", "Relacionar": "REL", "Completar": "COMP" };
  const tipoFromCode = { OM: "Opción múltiple", VF: "Verdadero / Falso", AB: "Abierta", REL: "Relacionar", COMP: "Completar" };
  const tipos = ["Opción múltiple", "Verdadero / Falso", "Respuesta corta", "Relacionar", "Completar", "Abierta"];
  const [tipo, setTipo] = React.useState(editing ? (tipoFromCode[editing.type] || "Opción múltiple") : "Opción múltiple");
  const [subject, setSubject] = React.useState(editing ? editing.subject : SUBJECTS[0]);
  const [ord, setOrd] = React.useState(editing ? (editing.ord || "") : "");
  const ordOpts = (ordsFor && ordsFor(subject)) || [];
  const [correcta, setCorrecta] = React.useState(editing && typeof editing.answer === "number" ? editing.answer : 0);
  const [dif, setDif] = React.useState(editing ? editing.dif : "medio");
  const [tags, setTags] = React.useState(editing ? (editing.tags || []) : []);
  const [enunciado, setEnunciado] = React.useState(editing ? editing.q : "");
  const [opciones, setOpciones] = React.useState(editing && editing.options ? editing.options.slice() : ["", "", "", ""]);
  const [respuesta, setRespuesta] = React.useState(editing && typeof editing.answer === "string" ? editing.answer : "");
  const [explica, setExplica] = React.useState(editing ? (editing.explain || "") : "");
  const [ref, setRef] = React.useState(editing ? (editing.ref || "") : "");
  const [importante, setImportante] = React.useState(editing ? editing.status === "imp" : false);
  const [tried, setTried] = React.useState(false);
  const isChoice = tipo === "Opción múltiple" || tipo === "Verdadero / Falso";
  const choiceList = tipo === "Verdadero / Falso" ? ["Verdadero", "Falso"] : opciones;
  const errEnunciado = tried && !enunciado.trim();
  const errOpts = tried && tipo === "Opción múltiple" && choiceList.filter((o) => o.trim()).length < 2;
  const errResp = tried && !isChoice && !respuesta.trim();
  const setOpt = (i, v) => setOpciones((a) => a.map((x, k) => (k === i ? v : x)));
  const build = () => ({
    subject, ord, loc: editing ? (editing.loc || "") : "",
    type: tipoMap[tipo] || "OM", dif, status: importante ? "imp" : "nuevo", tags,
    q: enunciado.trim(),
    options: isChoice ? choiceList : undefined,
    answer: isChoice ? correcta : respuesta.trim(),
    explain: explica.trim(), ref: ref.trim(),
  });
  const validate = () => {
    if (!enunciado.trim()) return false;
    if (tipo === "Opción múltiple" && choiceList.filter((o) => o.trim()).length < 2) return false;
    if (!isChoice && !respuesta.trim()) return false;
    return true;
  };
  const reset = () => { setEnunciado(""); setOpciones(["", "", "", ""]); setRespuesta(""); setExplica(""); setTags([]); setImportante(false); setCorrecta(0); setTried(false); };
  const save = (again) => {
    if (!validate()) { setTried(true); toast && toast("Revisa los campos obligatorios", "danger"); return; }
    if (editing) { EPStore.updateQuestion(editing._id, build()); window.__epEditQ = null; toast && toast("Pregunta actualizada", "ok"); go("banco"); return; }
    EPStore.addQuestion(build());
    toast && toast("Pregunta guardada en el banco", "ok");
    if (again) reset(); else go("banco");
  };
  return (
    <main className="main">
      <PageHeadB title={editing ? "Editar pregunta" : "Nueva pregunta"} sub={editing ? "Modifica y guarda los cambios" : "Registra una pregunta en el banco"} crumbs={[["Inicio", "inicio"], ["Banco de preguntas", "banco"], editing ? "Editar" : "Nueva pregunta"]} />

      <div className="form">
        <PanelB idx="01" title="Clasificación">
          <div className="form-3">
            <div className="field"><label>Categoría</label><select className="input" aria-label="Categoría"><option>Promoción 2026</option></select></div>
            <div className="field"><label>Materia</label><select className="input" aria-label="Materia" value={subject} onChange={(e) => { setSubject(e.target.value); setOrd(""); }}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Ordenamiento / Capítulo</label>
              <select className="input" aria-label="Ordenamiento o capítulo" value={ord} onChange={(e) => setOrd(e.target.value)}>
                <option value="">— Sin ordenamiento —</option>
                {ordOpts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </PanelB>

        <PanelB idx="02" title="Tipo de pregunta">
          <div className="seg">
            {tipos.map((t) => (
              <span key={t} className={"segchip" + (t === tipo ? " is-on" : "")} onClick={() => setTipo(t)}>{t}</span>
            ))}
          </div>
        </PanelB>

        <PanelB idx="03" title="Contenido">
          <div className="field">
            <label>Enunciado <span className="req">*</span></label>
            <textarea className={"input textarea" + (errEnunciado ? " input-err" : "")} value={enunciado} onChange={(e) => setEnunciado(e.target.value)} placeholder="Escribe el enunciado de la pregunta…"></textarea>
            {errEnunciado && <span className="field-err">El enunciado es obligatorio.</span>}
          </div>

          {isChoice && (
            <div className="field">
              <label>Opciones · marca la correcta {tipo === "Opción múltiple" && <span className="req">*</span>}</label>
              <div className="opt-edit-list">
                {choiceList.map((o, i) => (
                  <div className={"opt-edit" + (correcta === i ? " is-correct" : "")} key={i}>
                    <button className="opt-radio-btn" onClick={() => setCorrecta(i)} aria-label="correcta"></button>
                    {tipo === "Verdadero / Falso"
                      ? <input className="input opt-input" value={o} readOnly />
                      : <input className="input opt-input" value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={"Opción " + String.fromCharCode(65 + i)} />}
                    {tipo === "Opción múltiple" && opciones.length > 2 && <button className="opt-del" aria-label="eliminar" onClick={() => setOpciones(opciones.filter((_, k) => k !== i))}>✕</button>}
                  </div>
                ))}
              </div>
              {errOpts && <span className="field-err">Agrega al menos 2 opciones.</span>}
              {tipo === "Opción múltiple" && opciones.length < 6 && <button className="btn btn-sm" style={{ marginTop: "8px" }} onClick={() => setOpciones([...opciones, ""])}>+ Añadir opción</button>}
            </div>
          )}
          {!isChoice && (
            <div className="field"><label>Respuesta correcta <span className="req">*</span></label><input className={"input" + (errResp ? " input-err" : "")} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Escribe la respuesta esperada" />{errResp && <span className="field-err">La respuesta es obligatoria.</span>}</div>
          )}

          <div className="field"><label>Explicación <span className="opt-note">(opcional)</span></label><textarea className="input textarea" value={explica} onChange={(e) => setExplica(e.target.value)} placeholder="Aparece tras responder, si está activada."></textarea></div>
        </PanelB>

        <PanelB idx="04" title="Metadatos">
          <div className="form-2">
            <div className="field">
              <label>Dificultad</label>
              <div className="seg">
                {["fácil", "medio", "difícil"].map((d) => (
                  <span key={d} className={"segchip seg-" + d + (dif === d ? " is-on" : "")} onClick={() => setDif(d)}>{d}</span>
                ))}
              </div>
            </div>
            <div className="field"><label>Fuente / referencia</label><input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="p. ej. CJM, Libro Primero, Cap. I" /></div>
          </div>
          <div className="field">
            <label>Etiquetas</label>
            <div className="taginput">
              {tags.map((t) => (
                <span className="tagchip" key={t}>#{t}<button onClick={() => setTags(tags.filter((x) => x !== t))} aria-label="quitar">✕</button></span>
              ))}
              <input className="taginput-in" placeholder="añadir etiqueta…" onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { const v = e.target.value.trim(); setTags((p) => p.includes(v) ? p : [...p, v]); e.target.value = ""; } }} />
            </div>
          </div>
        </PanelB>

        <div className="form-actions form-actions-sticky">
          <label className={"flag-chk" + (importante ? " is-on" : "")} onClick={() => setImportante(!importante)}><span className="box"></span> Marcar como importante</label>
          <span style={{ flex: 1 }}></span>
          <button className="btn" onClick={() => { window.__epEditQ = null; go("banco"); }}>Cancelar</button>
          {!editing && <button className="btn" onClick={() => save(true)}>Guardar y crear otra</button>}
          <button className="btn btn-accent" onClick={() => save(false)}>{editing ? "Guardar cambios" : "Guardar pregunta"}</button>
        </div>
      </div>
    </main>
  );
}

/* ===================== TARJETAS · ESTUDIO + GESTIÓN ====================== */
function Tarjetas() {
  const go = useGoB();
  const st = useStore();
  const [vista, setVista] = React.useState(window.__epCardVista || "estudiar"); // estudiar | gestionar
  React.useEffect(() => { window.__epCardVista = vista; }, [vista]);
  const subject = (window.__epSubject && subjectNames().includes(window.__epSubject)) ? window.__epSubject : (subjectNames()[0] || "Legislación Militar");
  const setSubject = (s) => { window.__epSubject = s; setI(0); setFlip(false); setDone(false); setResultados({ facil: 0, medio: 0, dificil: 0, otra: 0 }); };
  const color = subjColor(subject);
  const SUBJECTS = subjectNames();

  // filtro de la sesión de estudio: hoy (vencen · SM-2) | todas | nuevas | repaso
  const [filtro, setFiltro] = React.useState(window.__epCardFilter || "hoy");
  React.useEffect(() => { window.__epCardFilter = null; }, []);
  const allCards = st.cards.filter((c) => c.subject === subject);
  const deck = allCards.filter((c) => filtro === "nuevas" ? c.nivel === "nuevo" : filtro === "repaso" ? c.nivel !== "dominado" : filtro === "hoy" ? c.isDue : true);

  const [i, setI] = React.useState(0);
  const [flip, setFlip] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [resultados, setResultados] = React.useState({ facil: 0, medio: 0, dificil: 0, otra: 0 });
  const [delCard, setDelCard] = React.useState(null);
  const total = deck.length;
  const card = deck[Math.min(i, Math.max(0, total - 1))];

  const FILTROS = [["hoy", "Vencen hoy", allCards.filter((c) => c.isDue).length], ["todas", "Todas", allCards.length], ["repaso", "Por repasar", allCards.filter((c) => c.nivel !== "dominado").length], ["nuevas", "Nuevas", allCards.filter((c) => c.nivel === "nuevo").length]];
  const counters = {
    repaso: allCards.filter((c) => c.nivel === "medio").length,
    nuevas: allCards.filter((c) => c.nivel === "nuevo").length,
    dominadas: allCards.filter((c) => c.nivel === "dominado").length,
  };

  const grade = (g) => {
    const preview = card ? srsPreview(card._id) : null;
    if (card) EPStore.gradeCard(card._id, g);
    setResultados((r) => ({ ...r, [g]: (r[g] || 0) + 1 }));
    const txt = preview ? preview[g] : "";
    toast && toast(g === "otra" ? "Vuelve hoy en 10 min" : "Próxima revisión en " + txt, g === "otra" ? "warn" : "ok");
    if (navigator.vibrate) { try { navigator.vibrate(g === "otra" ? 24 : 12); } catch { /* sin haptics */ } }
    if (i >= total - 1) { setDone(true); return; }
    setFlip(false); setI(i + 1);
  };
  // califica con salida animada de la tarjeta hacia el lado del gesto
  const [leaving, setLeaving] = React.useState(null); // "left" | "right" | null
  const gradeAnimated = (g, dir) => {
    if (leaving) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { grade(g); return; }
    setLeaving(dir || (g === "otra" ? "left" : "right"));
    window.setTimeout(() => { setLeaving(null); grade(g); }, 200);
  };
  const reiniciar = () => { setDone(false); setI(0); setFlip(false); setResultados({ facil: 0, medio: 0, dificil: 0, otra: 0 }); };

  // atajos de teclado: Espacio = voltear · 1 otra vez · 2 difícil · 3 bien · 4 fácil
  React.useEffect(() => {
    if (vista !== "estudiar" || done) return;
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlip((f) => !f); }
      else if (flip && ["1", "2", "3", "4"].includes(e.key)) { const g = { "1": "otra", "2": "dificil", "3": "medio", "4": "facil" }[e.key]; gradeAnimated(g, g === "otra" || g === "dificil" ? "left" : "right"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // gestos táctiles (iPhone): la tarjeta sigue al dedo con feedback visual.
  // Con reverso visible, desliza → «Bien» · ← «Otra vez»; sin voltear, desliza para voltear.
  const [drag, setDrag] = React.useState(0);
  const touchRef = React.useRef(null);
  const onTouchStart = (e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, lock: null }; };
  const onTouchMove = (e) => {
    const t0 = touchRef.current; if (!t0 || leaving) return;
    const dx = e.touches[0].clientX - t0.x, dy = e.touches[0].clientY - t0.y;
    if (t0.lock === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) t0.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (t0.lock === "x") setDrag(dx);
  };
  const onTouchEnd = () => {
    const t0 = touchRef.current; touchRef.current = null;
    const dx = drag; setDrag(0);
    if (!t0 || t0.lock !== "x" || Math.abs(dx) < 70) return; // no llegó al umbral: la tarjeta regresa
    if (!flip) { setFlip(true); return; }
    gradeAnimated(dx > 0 ? "medio" : "otra", dx > 0 ? "right" : "left");
  };
  const dragPct = Math.max(0, Math.min(1, (Math.abs(drag) - 24) / 66)); // opacidad de la etiqueta del gesto

  // ----- cabecera enfocada (Opción C): el panel titula con la acción del día -----
  // fila de materias (compartida por ambas vistas)
  const subjectChips = (
    <div className="chiprow chiprow-center">
      {SUBJECTS.map((s) => (
        <span key={s} className={"subjchip" + (s === subject ? " is-on" : "")} onClick={() => setSubject(s)}
          style={s === subject ? { background: subjColor(s), borderColor: subjColor(s), color: "#fff" } : { borderColor: subjColor(s) }}>
          <i className="subjchip-dot" style={{ background: subjColor(s) }}></i>{subjShort(s)}
        </span>
      ))}
    </div>
  );
  // titular según el filtro activo: «4 tarjetas vencen hoy», «3 tarjetas por repasar»…
  const HEAD_PHRASE = { hoy: "vencen hoy", todas: "en total", repaso: "por repasar", nuevas: "nuevas" };
  const activeN = (FILTROS.find(([k]) => k === filtro) || FILTROS[0])[2];
  const headline = activeN + " tarjeta" + (activeN === 1 ? "" : "s") + " " + (HEAD_PHRASE[filtro] || "");

  const Header = ({ progPct }) => {
    // Vista Gestionar: cabecera de administración (conmutador de modo visible)
    if (vista === "gestionar") {
      return (
        <header className="page-head-card" style={{ borderTop: "3px solid " + color }}>
          <CrumbsB path={[["Inicio", "inicio"], "Tarjetas"]} />
          <div className="study-top">
            <div className="study-meta">
              <span className="study-meta-tag" style={{ color: subjTextColor(subject) }}>Gestión de tarjetas</span>
              <span className="study-meta-name">{subject}</span>
            </div>
            <div className="seg seg-tabs">
              <span className="segchip" onClick={() => setVista("estudiar")}>Estudiar</span>
              <span className="segchip is-on">Gestionar</span>
              <span className="segchip" onClick={() => go("repaso")}>⚡ Repaso prioritario</span>
            </div>
          </div>
          {subjectChips}
        </header>
      );
    }
    // Vista Estudiar: cabecera enfocada — titular, progreso y estados juntos; materias abajo
    return (
      <header className="page-head-card th-focus" style={{ borderTop: "3px solid " + color }}>
        <CrumbsB path={[["Inicio", "inicio"], "Tarjetas"]} />
        <div className="th-center">
          <span className="study-meta-tag" style={{ color: subjTextColor(subject) }}>{subject} · repaso</span>
          <h2 className="th-headline">{headline}</h2>
          {total > 0 && (
            <div className="th-prog">
              <span className="sp-n">{i + 1} de {total} repasadas</span>
              <div className="mini-bar th-bar"><i style={{ width: progPct + "%", background: color }}></i></div>
            </div>
          )}
          <div className="th-filters">
            {FILTROS.map(([k, label, n]) => (
              <span key={k} className={"fchip" + (filtro === k ? " is-on" : "")} onClick={() => { setFiltro(k); setI(0); setFlip(false); }}>{label} · {n}</span>
            ))}
          </div>
        </div>
        <div className="th-div"></div>
        {subjectChips}
        <div className="th-links">
          <button type="button" className="th-link" onClick={() => go("repaso")}><span className="th-bolt">⚡</span> Repaso prioritario</button>
          <span className="th-sep" aria-hidden="true">·</span>
          <button type="button" className="th-link" onClick={() => setVista("gestionar")}>Gestionar tarjetas</button>
        </div>
      </header>
    );
  };

  /* ============ VISTA GESTIONAR ============ */
  if (vista === "gestionar") {
    return (
      <main className="main">
        <Header />
        <Panel idx="—" title={"Tarjetas de " + subject} meta={allCards.length + (allCards.length === 1 ? " tarjeta" : " tarjetas")}
          action="+ nueva tarjeta" onAction={() => { window.__epEditC = null; go("tarjeta"); }}>
          {allCards.length === 0 ? (
            <EmptyState icon="🃏" title="Sin tarjetas en esta materia"
              desc="Crea tu primera tarjeta para empezar a repasar con repetición espaciada."
              actions={<button className="btn btn-accent" onClick={() => { window.__epEditC = null; go("tarjeta"); }}>+ Nueva tarjeta</button>} />
          ) : (
            <div className="cardman-list">
              {allCards.map((c) => (
                <div className="cardman-row" key={c._id} style={{ borderLeft: "3px solid " + color }}>
                  <div className="cardman-main">
                    <div className="cardman-front">{c.front}</div>
                    <div className="cardman-back">{c.back}</div>
                    <div className="cardman-tags">{(c.tags || []).map((t) => <span className="tag" key={t}>#{t}</span>)}</div>
                  </div>
                  <span className={"st st-" + (c.nivel === "dominado" ? "ok" : c.nivel === "nuevo" ? "nuevo" : "imp")}><i className="st-dot"></i>{c.nivel}</span>
                  <div className="rowacts">
                    <button className="ra-btn" title="Editar" onClick={() => { window.__epEditC = c; go("tarjeta"); }}>✎</button>
                    <button className="ra-btn ra-del" title="Eliminar" onClick={() => setDelCard(c)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <ConfirmDialog open={!!delCard} danger confirmLabel="Eliminar tarjeta"
          title="¿Eliminar esta tarjeta?"
          body={delCard && <span>Se eliminará <b>“{delCard.front}”</b>. Podrás deshacerlo justo después desde el aviso.</span>}
          onClose={() => setDelCard(null)} onConfirm={() => { EPStore.deleteCard(delCard._id); setDelCard(null); undoableToast && undoableToast("Tarjeta eliminada"); }} />
      </main>
    );
  }

  /* ============ VISTA ESTUDIAR · fin de sesión (cierre gratificante) ============ */
  if (done) {
    const repasadas = resultados.facil + resultados.medio + resultados.dificil + (resultados.otra || 0);
    const acertadas = resultados.facil + resultados.medio + resultados.dificil;
    const reten = repasadas ? Math.round(acertadas / repasadas * 100) : 0;
    const streak = realStreak ? realStreak() : 0;
    const dueLeft = dueCards ? dueCards().length : 0;
    const RING = 2 * Math.PI * 52; // circunferencia del anillo (r=52)
    return (
      <main className="main main-center">
        <Header progLabel={total + " / " + total} progPct={100} />
        <div className="cierre">
          <div className="cierre-ring" role="img" aria-label={"Retención de la sesión: " + reten + " por ciento"}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="cr-track" cx="60" cy="60" r="52" />
              <circle className="cr-fill" cx="60" cy="60" r="52"
                style={{ stroke: color, strokeDasharray: RING, strokeDashoffset: RING * (1 - reten / 100) }} />
            </svg>
            <div className="cierre-pct"><b>{reten}%</b><span>retención</span></div>
          </div>
          <div className="cierre-h">¡Repaso completado!</div>
          <div className="cierre-sub">Calificaste <b>{repasadas}</b> tarjeta{repasadas === 1 ? "" : "s"} de <b>{subject}</b>. La próxima revisión de cada una ya se ajustó a tu desempeño.</div>
          <div className="cierre-stats">
            <div className="cierre-stat"><b>{acertadas}</b><span>acertadas</span></div>
            <div className="cierre-stat cs-warn"><b>{resultados.otra || 0}</b><span>para reforzar</span></div>
            <div className="cierre-stat cs-fire"><b>🔥 {streak}</b><span>día{streak === 1 ? "" : "s"} de racha</span></div>
          </div>
          <div className={"cierre-next" + (dueLeft ? "" : " cn-free")}>
            {dueLeft > 0
              ? <span>Aún vencen hoy <b>{dueLeft}</b> tarjeta{dueLeft === 1 ? "" : "s"} en otras materias.</span>
              : <span>Nada más vence hoy. Día completado — descansa con la conciencia tranquila.</span>}
          </div>
          <div className="form-actions cierre-actions">
            <button className="btn" onClick={reiniciar}>Repasar de nuevo</button>
            {dueLeft > 0
              ? <button className="btn btn-accent" onClick={() => { window.__epSubject = null; window.__epCardFilter = "hoy"; go("repaso"); }}>Seguir con lo que vence ▸</button>
              : <button className="btn btn-accent" onClick={() => go("inicio")}>Volver al inicio ▸</button>}
          </div>
        </div>
      </main>
    );
  }

  /* ============ VISTA ESTUDIAR · mazo vacío ============ */
  if (total === 0) {
    return (
      <main className="main main-center">
        <Header />
        <div className="card-stage">
          <EmptyState icon="🃏" title={filtro === "todas" ? "Sin tarjetas en esta materia" : "Nada que repasar con este filtro"}
            desc={filtro === "todas" ? "Crea tarjetas o cambia de materia para empezar a repasar." : "Prueba con el filtro «Todas» o cambia de materia."}
            actions={<React.Fragment>
              {filtro !== "todas" && <button className="btn" onClick={() => setFiltro("todas")}>Ver todas</button>}
              <button className="btn btn-accent" onClick={() => { window.__epEditC = null; go("tarjeta"); }}>+ Nueva tarjeta</button>
            </React.Fragment>} />
        </div>
      </main>
    );
  }

  /* ============ VISTA ESTUDIAR · sesión activa ============ */
  const nivelLabel = { nuevo: "Nueva", medio: "En repaso", dominado: "Dominada" };
  return (
    <main className="main main-study">
      <Header progPct={(i + 1) / total * 100} />

      <div className="card-stage">
        <div key={card._id}
          className={"flashcard fc-study fc-enter" + (flip ? " is-flip" : "") + (drag ? " is-drag" : "") + (leaving ? " fc-leave-" + leaving : "")}
          style={{ "--fc-accent": color, ...(drag ? { transform: "translateX(" + drag + "px) rotate(" + (drag * 0.045) + "deg)" } : null) }}
          onClick={() => { if (!drag && !leaving) setFlip(!flip); }}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          role="button" tabIndex={0} aria-label={flip ? "Reverso de la tarjeta, toca para volver" : "Frente de la tarjeta, toca para revelar"}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlip((f) => !f); } }}>
          <span className="fc-accent" aria-hidden="true"></span>
          {flip && <span className="fc-swipe fc-swipe-l" aria-hidden="true" style={{ opacity: drag < 0 ? dragPct : 0 }}>Otra vez</span>}
          {flip && <span className="fc-swipe fc-swipe-r" aria-hidden="true" style={{ opacity: drag > 0 ? dragPct : 0 }}>Bien</span>}
          <div className="fc-top">
            <span className="fc-side">{flip ? "Reverso" : "Frente"}</span>
            <span className={"fc-lvl lvl-" + card.nivel}>{nivelLabel[card.nivel] || card.nivel}</span>
          </div>
          <div className="fc-body" key={flip ? "reverso" : "frente"}>
            <div className="fc-q">{flip ? card.back : card.front}</div>
          </div>
          <div className="fc-foot">
            <div className="fc-tags">{(card.tags || []).map((t) => <span className="tag" key={t}>#{t}</span>)}</div>
            <span className="fc-hint">{flip ? "¿Qué tal lo recordaste?" : "Toca para revelar ▸"}</span>
          </div>
        </div>
      </div>

      {flip ? (
        <div className="study-controls">
          {(() => { const p = srsPreview(card._id); return (
            <React.Fragment>
              <button className="btn study-btn study-danger" onClick={() => gradeAnimated("otra", "left")}><span>Otra vez</span><small>{p.otra}</small></button>
              <button className="btn study-btn study-warn" onClick={() => gradeAnimated("dificil", "left")}><span>Difícil</span><small>{p.dificil}</small></button>
              <button className="btn study-btn study-ok" onClick={() => gradeAnimated("medio", "right")}><span>Bien</span><small>{p.medio}</small></button>
              <button className="btn study-btn study-easy" onClick={() => gradeAnimated("facil", "right")}><span>Fácil</span><small>{p.facil}</small></button>
            </React.Fragment>
          ); })()}
        </div>
      ) : (
        <div className="study-controls study-controls-1">
          <button className="btn btn-accent btn-lg study-reveal" onClick={() => setFlip(true)}>Revelar respuesta</button>
        </div>
      )}

      <div className="study-rail">
        <div className="sr-cell"><b>{counters.repaso}</b><span>en repaso</span></div>
        <div className="sr-cell"><b>{counters.nuevas}</b><span>nuevas</span></div>
        <div className="sr-cell"><b>{counters.dominadas}</b><span>dominadas</span></div>
        <div className="sr-cell sr-cell-act"><button className="btn btn-sm" onClick={() => { window.__epEditC = null; go("tarjeta"); }}>+ Nueva tarjeta</button></div>
      </div>
    </main>
  );
}

/* ==================== CREAR / EDITAR TARJETA =================== */
function TarjetaForm() {
  const go = useGoB();
  const editing = window.__epEditC || null;
  const SUBJECTS = subjectNames();
  const [front, setFront] = React.useState(editing ? editing.front : "");
  const [back, setBack] = React.useState(editing ? editing.back : "");
  const [subject, setSubject] = React.useState(editing ? editing.subject : SUBJECTS[0]);
  const [ord, setOrd] = React.useState(editing ? (editing.ord || "") : "");
  const ordOpts = (ordsFor && ordsFor(subject)) || [];
  const [side, setSide] = React.useState("front");
  const [nivel, setNivel] = React.useState(editing ? (editing.nivel || "nuevo") : "nuevo");
  const [tags, setTags] = React.useState(editing ? (editing.tags || []) : []);
  const [tried, setTried] = React.useState(false);
  const errFront = tried && !front.trim();
  const errBack = tried && !back.trim();
  const validate = () => front.trim() && back.trim();
  const reset = () => { setFront(""); setBack(""); setTags([]); setNivel("nuevo"); setSide("front"); setTried(false); };
  const save = (again) => {
    if (!validate()) { setTried(true); toast && toast("El frente y el reverso son obligatorios", "danger"); return; }
    if (editing) { EPStore.updateCard(editing._id, { subject, front: front.trim(), back: back.trim(), tags, nivel, ord }); window.__epEditC = null; toast && toast("Tarjeta actualizada", "ok"); go("tarjetas"); return; }
    EPStore.addCard({ subject, front: front.trim(), back: back.trim(), tags, nivel, ord });
    toast && toast("Tarjeta guardada", "ok");
    if (again) reset(); else go("tarjetas");
  };
  return (
    <main className="main">
      <PageHeadB title={editing ? "Editar tarjeta" : "Nueva tarjeta"} sub={editing ? "Los cambios se reflejan también en el banco de preguntas" : "Se añadirá al banco como pregunta abierta (frente → enunciado, reverso → respuesta)"} crumbs={[["Inicio", "inicio"], ["Tarjetas", "tarjetas"], editing ? "Editar" : "Nueva tarjeta"]} />

      <div className="form-split">
        <div className="form">
          <PanelB idx="01" title="Contenido">
            <div className="field"><label>Frente <span className="req">*</span></label><textarea className={"input textarea" + (errFront ? " input-err" : "")} value={front} onChange={(e) => setFront(e.target.value)} placeholder="Pregunta o concepto…"></textarea>{errFront && <span className="field-err">El frente es obligatorio.</span>}</div>
            <div className="field"><label>Reverso <span className="req">*</span></label><textarea className={"input textarea" + (errBack ? " input-err" : "")} value={back} onChange={(e) => setBack(e.target.value)} placeholder="Respuesta o definición…"></textarea>{errBack && <span className="field-err">El reverso es obligatorio.</span>}</div>
          </PanelB>
          <PanelB idx="02" title="Clasificación">
            <div className="form-3">
              <div className="field"><label>Categoría</label><select className="input" aria-label="Categoría"><option>Promoción 2026</option></select></div>
              <div className="field"><label>Materia</label><select className="input" aria-label="Materia" value={subject} onChange={(e) => { setSubject(e.target.value); setOrd(""); }}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div className="field"><label>Ordenamiento / Capítulo</label>
                <select className="input" aria-label="Ordenamiento o capítulo" value={ord} onChange={(e) => setOrd(e.target.value)}>
                  <option value="">— Sin ordenamiento —</option>
                  {ordOpts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="form-2">
              <div className="field">
                <label>Nivel de dominio</label>
                <div className="seg">
                  {["nuevo", "medio", "dominado"].map((n) => (
                    <span key={n} className={"segchip" + (nivel === n ? " is-on" : "")} onClick={() => setNivel(n)}>{n}</span>
                  ))}
                </div>
              </div>
              <div className="field"><label>Próxima revisión</label><span className="opt-note" style={{ display: "block", paddingTop: "8px" }}>La fija el repaso espaciado (SM-2) según tus calificaciones.</span></div>
            </div>
            <div className="field">
              <label>Etiquetas</label>
              <div className="taginput">
                {tags.map((t) => (
                  <span className="tagchip" key={t}>#{t}<button onClick={() => setTags(tags.filter((x) => x !== t))} aria-label="quitar">✕</button></span>
                ))}
                <input className="taginput-in" placeholder="añadir…" onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { const v = e.target.value.trim(); setTags((p) => p.includes(v) ? p : [...p, v]); e.target.value = ""; } }} />
              </div>
            </div>
          </PanelB>
        </div>

        <div className="form-preview">
          <div className="preview-label">Previsualización</div>
          <div className="flashcard fc-preview" style={{ borderTop: "3px solid " + subjColor(subject) }} onClick={() => setSide(side === "front" ? "back" : "front")}>
            <div className="fc-corner fc-tl">{side === "front" ? "FRENTE" : "REVERSO"}</div>
            <div className="fc-body"><div className="fc-q">{side === "front" ? (front || "Frente de la tarjeta…") : (back || "Reverso de la tarjeta…")}</div></div>
            <div className="fc-foot">{tags.map((t) => <span className="tag" key={t}>#{t}</span>)}</div>
          </div>
          <div className="preview-flip">
            <button className="btn btn-sm" onClick={() => setSide(side === "front" ? "back" : "front")}>Voltear ⟲</button>
          </div>
        </div>
      </div>

      <div className="form-actions form-actions-sticky">
        <button className="btn" onClick={() => go("tarjetas")}>Cancelar</button>
        <button className="btn" onClick={() => save(true)}>Guardar y crear otra</button>
        <button className="btn btn-accent" onClick={() => save(false)}>Guardar tarjeta</button>
      </div>
    </main>
  );
}

/* ======================== CUESTIONARIO ========================= */
function Quiz() {
  const go = useGoB();
  const nav = (EPStore && EPStore.getNav && EPStore.getNav()) || {};
  const isSim = !!window.__epSimulacro;
  const strict = nav.mode === "examen";
  const subject = isSim ? "Simulacro general" : ((window.__epSubject && subjectNames().includes(window.__epSubject)) ? window.__epSubject : (subjectNames()[0] || "Legislación Militar"));
  const color = isSim ? "var(--accent)" : subjColor(subject);
  const qs = React.useMemo(() => {
    const bank = EPStore.get().questions || [];
    const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    if (isSim) {
      // mezcla las materias del banco real, una pasada equilibrada
      const bySubj = {};
      bank.forEach((x) => { (bySubj[x.subject] = bySubj[x.subject] || []).push(x); });
      const subs = Object.keys(bySubj);
      const out = []; let added = true; let r = 0;
      while (added) { added = false; subs.forEach((s) => { if (bySubj[s][r]) { out.push(bySubj[s][r]); added = true; } }); r++; }
      return out;
    }
    let pool = bank.filter((x) => x.subject === subject);
    if (nav.loc) { const byLoc = pool.filter((x) => x.loc === nav.loc); if (byLoc.length) pool = byLoc; }
    if (nav.temas && nav.temas.length && !nav.temas.includes("Todos")) pool = pool.filter((x) => nav.temas.includes(x.ord));
    if (nav.dif && nav.dif !== "todas") pool = pool.filter((x) => x.dif === nav.dif);
    if (nav.filter === "fall") pool = pool.filter((x) => x.status === "fall");
    if (nav.filter === "imp") pool = pool.filter((x) => x.status === "imp");
    if (nav.n && pool.length > nav.n) pool = shuffle(pool).slice(0, nav.n);
    return pool;
  }, [subject, isSim]);
  const N = qs.length;
  // tiempo límite en minutos; null = sin límite (el reloj cuenta hacia arriba)
  const limitMin = nav.tiempo != null ? nav.tiempo : (strict ? 20 : null);
  const [cur, setCur] = React.useState(Math.min((nav.at ? nav.at - 1 : 0), Math.max(0, (qs.length || 1) - 1)));
  const [answers, setAnswers] = React.useState(() => qs.map(() => null));
  const [revealed, setRevealed] = React.useState(() => qs.map(() => false));
  const [flags, setFlags] = React.useState(() => qs.map(() => false));
  const [secs, setSecs] = React.useState(limitMin ? limitMin * 60 : 0);
  const [showPause, setShowPause] = React.useState(false);
  const finishedRef = React.useRef(false);
  React.useEffect(() => {
    const t = setInterval(() => setSecs((s) => (limitMin ? (s > 0 ? s - 1 : 0) : s + 1)), 1000);
    return () => clearInterval(t);
  }, [limitMin]);
  const q = qs[cur];
  const sel = answers[cur];
  const isOpen = q ? q.type === "AB" : false;
  const checked = revealed[cur];
  const correct = q ? q.answer : null;
  const mmss = String(Math.floor(secs / 60)).padStart(2, "0") + ":" + String(secs % 60).padStart(2, "0");
  const setAns = (i) => { if (checked || isOpen) return; setAnswers((a) => a.map((v, k) => (k === cur ? i : v))); };
  const comprobar = () => {
    setRevealed((r) => r.map((v, k) => (k === cur ? true : v)));
    if (navigator.vibrate && !isOpen) { try { navigator.vibrate(sel === correct ? 12 : [28, 36, 28]); } catch { /* sin haptics */ } }
  };
  const toggleFlag = () => setFlags((f) => f.map((v, k) => (k === cur ? !v : v)));
  const [dir, setDir] = React.useState("fwd"); // dirección del cambio de pregunta: fwd | back
  const goto = (n) => { setDir(n >= cur ? "fwd" : "back"); setCur(n); };
  const answeredCount = answers.filter((a) => a !== null).length;
  const navState = (n) => (n === cur ? "cur" : flags[n] ? "flag" : answers[n] !== null ? "done" : "");
  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // solo las preguntas calificables (no abiertas) puntúan; se separa incorrecta de sin contestar
    const correctCount = qs.reduce((a, qq, k) => a + (qq.type !== "AB" && answers[k] === qq.answer ? 1 : 0), 0);
    const nGradable = qs.filter((qq) => qq.type !== "AB").length;
    const graded = nGradable || 1;
    const answeredG = qs.reduce((a, qq, k) => a + (qq.type !== "AB" && answers[k] !== null ? 1 : 0), 0);
    const wrongCount = answeredG - correctCount;
    const blankCount = nGradable - answeredG;
    const abiertas = qs.length - nGradable;
    const missed = qs.map((qq, k) => ({ q: qq.q, loc: qq.loc, ord: qq.ord, blank: qq.type !== "AB" && answers[k] === null, ok: qq.type === "AB" || answers[k] === qq.answer }))
      .filter((m) => !m.ok);
    const elapsed = limitMin ? limitMin * 60 - secs : secs;
    const time = String(Math.floor(elapsed / 60)).padStart(2, "0") + ":" + String(elapsed % 60).padStart(2, "0");
    const score = +(correctCount / graded * 10).toFixed(1);
    const byChapter = {};
    qs.forEach((qq, k) => {
      if (qq.type === "AB") return; // las abiertas no puntúan: fuera del desglose
      const key = isSim ? qq.subject : (qq.loc || qq.ord || "General");
      if (!byChapter[key]) byChapter[key] = { ok: 0, total: 0 };
      byChapter[key].total++; if (answers[k] === qq.answer) byChapter[key].ok++;
    });
    EPStore.setLastResult({ subject, total: graded, correct: correctCount, wrong: wrongCount, blank: blankCount, abiertas, time, score, missed, byChapter, isSim });
    // marca el banco real: aciertos → dominada, errores → fallada (alimenta repaso e inteligencia)
    const results = [];
    qs.forEach((qq, k) => { if (qq.type !== "AB" && qq._id) results.push({ id: qq._id, correct: answers[k] === qq.answer }); });
    EPStore.applyQuizResults(results);
    EPStore.addSession({ subject: isSim ? "Simulacro general" : subject, label: isSim ? "Simulacro general" : (subject + " · " + (strict ? "examen" : "práctica")), n: N, time, score, date: new Date().toISOString().slice(0, 10), state: "done" });
    EPStore.bumpToday(answeredCount);
    if (!isSim) EPStore.clearResume();
    go("resultado");
  };
  // al agotarse el tiempo límite, el cuestionario se entrega solo
  React.useEffect(() => { if (limitMin && secs === 0 && N > 0) finish(); }, [secs]);
  const next = () => { if (cur >= N - 1) { finish(); return; } setDir("fwd"); setCur(cur + 1); };
  const doPause = () => {
    if (!isSim) EPStore.setResume({ subject, label: subject + " — " + (nav.ord || "en curso"), at: cur + 1, total: N });
    go("inicio");
  };
  const skip = () => { if (cur < N - 1) { setDir("fwd"); setCur(cur + 1); } };
  // keyboard shortcuts: 1-9 select option, Enter comprobar/siguiente, F flag, ←/→ nav
  React.useEffect(() => {
    const onKey = (e) => {
      if (showPause || !q) return;
      if (e.key >= "1" && e.key <= "9" && !isOpen && !checked) { const i = +e.key - 1; if (i < q.options.length) setAns(i); }
      else if (e.key === "Enter") { e.preventDefault(); if (!checked) { if (isOpen || sel !== null) comprobar(); } else next(); }
      else if (e.key.toLowerCase() === "f") toggleFlag();
      else if (e.key === "ArrowLeft" && cur > 0) { setDir("back"); setCur(cur - 1); }
      else if (e.key === "ArrowRight" && cur < N - 1) { setDir("fwd"); setCur(cur + 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPause, isOpen, checked, sel, cur, N, q]);
  const optClass = (i) => {
    if (!checked) return sel === i ? " is-sel" : "";
    if (i === correct) return " is-correct";
    if (i === sel) return " is-wrong";
    return " is-dim";
  };
  // sin preguntas que coincidan con la materia/filtros: estado vacío en lugar de sesión
  if (N === 0) {
    return (
      <main className="main main-center">
        <CrumbsB path={[["Inicio", "inicio"], ["Cuestionarios", "cuestionarios"], "Cuestionario"]} />
        <div className="card-stage">
          <EmptyState icon="⌕" title="No hay preguntas para esta sesión"
            desc="Ninguna pregunta de tu banco coincide con la materia y filtros elegidos. Ajusta la configuración o agrega preguntas."
            actions={<React.Fragment>
              <button className="btn" onClick={() => go("cuestionarios")}>‹ Ajustar configuración</button>
              <button className="btn btn-accent" onClick={() => { window.__epEditQ = null; go("pregunta"); }}>+ Nueva pregunta</button>
            </React.Fragment>} />
        </div>
      </main>
    );
  }
  return (
    <main className="main main-flush">
      <header className="page-head-card" style={{ borderTop: "3px solid " + color }}>
        <CrumbsB path={[["Inicio", "inicio"], [subject, "materia"], "Cuestionario"]} />
        <div className="quiz-bar">
          <div className="quiz-headline">
            <span className="quiz-headline-tag" style={{ color: subjTextColor(subject) }}>{isSim ? "Simulacro general · cronometrado" : strict ? "Cuestionario · modo examen" : "Cuestionario · modo práctica"}</span>
            <span className="quiz-headline-name">{isSim ? "Examen de promoción · 6 materias" : subject}</span>
          </div>
          <div className="quiz-meta">
            <span className="quiz-prog">Pregunta <b>{cur + 1}</b> / {N}</span>
            <span className={"quiz-timer" + (limitMin && secs < 120 ? " is-low" : "")}>⏱ {mmss}</span>
            <button className="btn btn-sm" onClick={() => setShowPause(true)}>Pausar</button>
            <button className="btn btn-sm btn-accent" onClick={finish}>Finalizar</button>
          </div>
        </div>
      </header>

      <div className="quiz-grid">
        <section className="quiz-main">
          <div className={"q-slide qs-" + dir} key={cur}>
          <div className="q-head">
            <span className="type-tag">{TYPE_LABEL[q.type] || q.type}</span>
            <DiffB level={q.dif} />
            {isSim
              ? <span className="q-tag" style={{ color: subjTextColor(q.subject), fontWeight: 700 }}>{q.subject}</span>
              : <span className="q-tag">{q.ord} · {q.loc}</span>}
            {flags[cur] && <span className="q-flagged" style={{ color: subjTextColor(subject) }}>★ marcada</span>}
          </div>
          <div className="q-text">{q.q}</div>

          {isOpen ? (
            <div className="opts">
              <textarea className="input textarea" placeholder="Escribe tu respuesta…" disabled={checked}
                aria-label="Tu respuesta"
                value={typeof sel === "string" ? sel : ""}
                onChange={(e) => { const v = e.target.value; setAnswers((a) => a.map((x, k) => (k === cur ? (v.trim() ? v : null) : x))); }}></textarea>
            </div>
          ) : (
            <div className="opts">
              {q.options.map((t, i) => (
                <label className={"opt" + optClass(i)} key={i} onClick={() => setAns(i)}>
                  <span className="opt-k">{String.fromCharCode(65 + i)}</span>
                  <span className="opt-t">{t}</span>
                  {checked && i === correct && <span className="opt-mark opt-mark-ok">✓</span>}
                  {checked && i === sel && i !== correct && <span className="opt-mark opt-mark-bad">✕</span>}
                  {!checked && <span className="opt-radio" aria-hidden="true"></span>}
                </label>
              ))}
            </div>
          )}

          {checked && !strict && (
            <div className={"explain" + (isOpen ? " explain-ok" : sel === correct ? " explain-ok" : " explain-bad")}>
              <div className="explain-h">{isOpen ? "Respuesta modelo" : sel === correct ? "✓ Correcto" : "✕ Incorrecto"}</div>
              {isOpen && <p className="explain-p"><b>{q.answer}</b></p>}
              <p className="explain-p">{q.explain}</p>
              <span className="explain-ref explain-ref-link" onClick={() => { window.__epSubject = q.subject || subject; go("materia"); }} role="button" title="Ver en el temario">Fuente: {q.ref || [q.ord, q.loc].filter(Boolean).join(" · ") || "temario"} ▸</span>
            </div>
          )}

          <div className="q-foot">
            <button className="btn" disabled={cur === 0} onClick={() => { setDir("back"); setCur(Math.max(0, cur - 1)); }}>‹ Anterior</button>
            <label className={"flag-chk" + (flags[cur] ? " is-on" : "")} onClick={toggleFlag}><span className="box"></span> Marcar para revisar</label>
            <span style={{ flex: 1 }}></span>
            {strict ? (
              <button className="btn btn-accent" onClick={next}>{cur >= N - 1 ? "Finalizar ▸" : "Siguiente ▸"}</button>
            ) : (!checked
              ? <React.Fragment><button className="btn" onClick={skip}>Saltar</button><button className="btn btn-accent" disabled={!isOpen && sel === null} onClick={comprobar}>Comprobar</button></React.Fragment>
              : <button className="btn btn-accent" onClick={next}>{cur >= N - 1 ? "Finalizar ▸" : "Siguiente ▸"}</button>)}
          </div>
          </div>
        </section>

        <aside className="quiz-rail">
          <div className="rail-h">Navegador · {answeredCount}/{N} contestadas</div>
          <div className="qnav">
            {qs.map((_, n) => (
              <span key={n} className={"qn qn-" + navState(n)} onClick={() => goto(n)}
                style={navState(n) === "cur" ? { background: color, borderColor: color, color: "#fff" } : {}}>{n + 1}</span>
            ))}
          </div>
          <div className="rail-legend">
            <div><span className="qn qn-done"></span> Contestada</div>
            <div><span className="qn qn-flag"></span> Para revisar</div>
            <div><span className="qn qn-cur"></span> Actual</div>
            <div><span className="qn"></span> Sin contestar</div>
          </div>
          <div className="rail-cfg">
            <div className="rail-cfg-h">configuración</div>
            <div className="cfg-row"><span>Materia</span><b style={{ color: subjTextColor(subject) }}>{subjShort(subject)}</b></div>
            <div className="cfg-row"><span>Mostrar respuestas</span><b>{strict ? "al final" : "tras responder"}</b></div>
            <div className="cfg-row"><span>Tiempo límite</span><b>{limitMin ? String(limitMin).padStart(2, "0") + ":00" : "Sin límite"}</b></div>
          </div>
        </aside>
      </div>

      <ConfirmDialog open={showPause} confirmLabel="Pausar y salir"
        title="¿Pausar el cuestionario?"
        body={<span>Tu progreso (<b>{answeredCount} de {N}</b> contestadas) se guardará y podrás reanudarlo desde Inicio.</span>}
        onClose={() => setShowPause(false)} onConfirm={doPause} />
    </main>
  );
}

/* ========================== RESULTADO ========================== */
function Resultado() {
  const go = useGoB();
  const r = EPStore.get().lastResult;
  if (!r) {
    return (
      <main className="main main-center">
        <CrumbsB path={[["Inicio", "inicio"], ["Cuestionarios", "cuestionarios"], "Resultado"]} />
        <div className="card-stage">
          <EmptyState icon="◎" title="Aún no hay resultados"
            desc="Completa un cuestionario para ver aquí tu nota, aciertos y temas a reforzar."
            actions={<button className="btn btn-accent" onClick={() => go("cuestionarios")}>Iniciar cuestionario ▸</button>} />
        </div>
      </main>
    );
  }
  const color = subjColor(r.subject);
  const pct = Math.round(r.correct / r.total * 100);
  const chapters = Object.entries(r.byChapter).map(([k, v]) => [k, v.total ? Math.round(v.ok / v.total * 100) : 0]).sort((a, b) => a[1] - b[1]);
  const scoreClass = r.score >= 8 ? "rs-ok" : r.score >= 6 ? "rs-warn" : "rs-bad";
  return (
    <main className="main main-center">
      <CrumbsB path={[["Inicio", "inicio"], [r.subject, "materia"], ["Cuestionario", "cuestionarios"], "Resultado"]} />

      <div className="res-hero" style={{ borderTop: "3px solid " + color }}>
        <div className={"res-score " + scoreClass}>
          <div className="res-score-n">{r.score}</div>
          <div className="res-score-d">/ 10</div>
        </div>
        <div className="res-headline">
          <div className="res-title">Cuestionario completado</div>
          <div className="res-sub"><span style={{ color: subjTextColor(r.subject), fontWeight: 700 }}>{r.subject}</span> · {r.total} preguntas · {r.time}</div>
          <div className="res-tags">
            <span className="res-pill res-ok"><b>{r.correct}</b> correctas</span>
            <span className="res-pill res-bad"><b>{r.wrong}</b> incorrectas</span>
            {(r.blank || 0) > 0 && <span className="res-pill"><b>{r.blank}</b> sin contestar</span>}
            {(r.abiertas || 0) > 0 && <span className="res-pill"><b>{r.abiertas}</b> abierta{r.abiertas === 1 ? "" : "s"} · no puntúa{r.abiertas === 1 ? "" : "n"}</span>}
            <span className="res-pill"><b>{pct}%</b> de acierto</span>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <PanelB idx="01" title="Desempeño por capítulo" meta="prioriza los más bajos">
          {chapters.length === 0 ? <p className="reco-p">Sin desglose disponible.</p> : (
            <div className="weak">
              {chapters.map(([n, p]) => (
                <div className="weak-row" key={n}>
                  <span className="weak-name">{n}</span>
                  <div className="mini-bar mini-bar-thin"><i style={{ width: p + "%" }} className={p < 50 ? "i-danger" : p < 80 ? "i-warn" : ""}></i></div>
                  <span className="weak-pct">{p}%</span>
                </div>
              ))}
            </div>
          )}
        </PanelB>

        <PanelB idx="02" title={"Preguntas falladas (" + r.missed.length + ")"}>
          {r.missed.length === 0
            ? <p className="reco-p">¡Sin errores! Dominaste todas las preguntas evaluadas de esta sesión.</p>
            : (
              <div className="missed-list">
                {r.missed.slice(0, 4).map((m, i) => (
                  <div className="missed-row" key={i}>
                    <span className="missed-x">{m.blank ? "—" : "✕"}</span>
                    <div><div className="missed-q">{m.q}</div><div className="missed-loc">{m.ord || ""} {m.loc ? "· " + m.loc : ""}{m.blank ? " · sin contestar" : ""}</div></div>
                  </div>
                ))}
                {r.missed.length > 4 && <div className="missed-loc" style={{ paddingLeft: "26px" }}>…y {r.missed.length - 4} más en tu repaso prioritario.</div>}
                <div className="reco-acts" style={{ marginTop: "12px" }}>
                  <button className="btn btn-accent" onClick={() => { window.__epSimulacro = false; window.__epSubject = r.subject; EPStore.setNav({ subject: r.subject, mode: "practica", filter: "fall" }); go("quiz"); }}>Reintentar falladas ({r.missed.length})</button>
                  <button className="btn" onClick={() => { window.__epSubject = r.subject; window.__epCardVista = "estudiar"; go("tarjetas"); }}>Repasar como tarjetas ▸</button>
                </div>
              </div>
            )}
        </PanelB>
      </div>

      <div className="res-foot">
        <button className="btn" onClick={() => go("inicio")}>‹ Volver al inicio</button>
        <button className="btn" onClick={() => { window.__epQTab = "historial"; go("cuestionarios"); }}>Ver historial</button>
        <button className="btn btn-accent" onClick={() => { window.__epSubject = r.subject; go("quiz"); }}>Nuevo cuestionario ▸</button>
      </div>
    </main>
  );
}


// Componentes exportados como módulo ES (ya no se publican en window.*; app/merged/pruebas los importan).
export { Banco, PreguntaForm, Quiz, Resultado, TarjetaForm, Tarjetas };
