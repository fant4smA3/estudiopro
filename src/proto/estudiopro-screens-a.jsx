/* EstudioPro · Prototipo — Pantallas A */
import React from "react";
import { ConfirmDialog, Crumbs, Diff, PageHead, Panel, PromptDialog, SectionHead, Switch, TaxEditDialog, toast, useGo } from "./estudiopro-ui.jsx";
import { daysToExam, EPStore, generarPlan, intel, realStreak, smartStudy, subjectNames, useStore } from "./estudiopro-store.jsx";
import { subjColor, subjTextColor, TYPE_LABEL } from "./estudiopro-bank.jsx";
import { MATERIA_DETAIL } from "./estudiopro-data.jsx";
import { MetasBody } from "./estudiopro-screens-k.jsx";
import { AlertasBody } from "./estudiopro-screens-d.jsx";
import { ActivityHeatmap } from "./estudiopro-screens-i.jsx";

/* ============================ INICIO ============================ */
function Inicio() {
  const go = useGo();
  const st = useStore();
  const plan = st.plan;
  const goalPct = Math.min(100, Math.round(plan.doneToday / plan.dailyGoal * 100));
  const dExam = daysToExam();
  const nQ = st.questions.length;
  const falladas = st.questions.filter((q) => q.status === "fall").length;
  const importantes = st.questions.filter((q) => q.status === "imp").length;
  const enRepaso = st.cards.filter((c) => c.nivel === "medio").length;
  const nuevasC = st.cards.filter((c) => c.nivel === "nuevo").length;
  const vencenHoy = falladas + enRepaso + nuevasC;
  const intelData = (intel && intel()) || { porMateria: [] };
  const domBySubj = {}; intelData.porMateria.forEach((m) => { domBySubj[m.subj] = m.dominio; });
  const recientesQ = st.questions.slice(0, 3);
  const examFecha = (() => { try { return new Date(plan.examDate + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" }); } catch { return ""; } })();
  // top 3 materias por volumen real de preguntas (ordenamientos y conteos del banco)
  const cats = subjectNames()
    .map((s) => {
      const qs = st.questions.filter((q) => q.subject === s);
      return [s, new Set(qs.map((q) => q.ord).filter(Boolean)).size, qs.length];
    })
    .filter(([, , q]) => q > 0)
    .sort((a, b) => b[2] - a[2])
    .slice(0, 3);
  // materias con actividad real más reciente (sesiones y tiempo registrado)
  const recientes = (() => {
    const last = {};
    [...st.sessions.filter((x) => x.date), ...st.timeLog].forEach((x) => {
      if (!x.subject || !x.date) return;
      if (!last[x.subject] || x.date > last[x.subject].date) last[x.subject] = { date: x.date, label: x.label || "" };
    });
    const rel = (date) => {
      const d = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(date + "T00:00:00")) / 86400000);
      return d <= 0 ? "hoy" : d === 1 ? "ayer" : d < 7 ? d + " d" : Math.floor(d / 7) + " sem";
    };
    return Object.entries(last)
      .sort((a, b) => (a[1].date < b[1].date ? 1 : -1))
      .slice(0, 3)
      .map(([s, v]) => [s, v.label, "", rel(v.date)]);
  })();
  const ring = (pct) => (119.4 * (1 - pct / 100)).toFixed(1);
  if (st.questions.length === 0 && st.cards.length === 0) {
    return (
      <main className="main main-center">
        <PageHead title="Bienvenido a EstudioPro" crumbs={["Inicio"]} />
        <div className="onboard">
          <div className="onboard-mark">EP</div>
          <h2 className="onboard-h">Prepara tu examen de promoción</h2>
          <p className="onboard-p">Aún no tienes contenido. Empieza importando tu banco de preguntas, creando preguntas y tarjetas, o explorando el temario de las 6 materias.</p>
          <div className="onboard-steps">
            <div className="onboard-step" onClick={() => go("importar")}><span className="onboard-num">1</span><div><div className="onboard-st">Importa tu banco</div><div className="onboard-sd">CSV o JSON con tus preguntas</div></div></div>
            <div className="onboard-step" onClick={() => { window.__epEditQ = null; go("pregunta"); }}><span className="onboard-num">2</span><div><div className="onboard-st">Crea preguntas y tarjetas</div><div className="onboard-sd">Una por una, con validación</div></div></div>
            <div className="onboard-step" onClick={() => go("materias")}><span className="onboard-num">3</span><div><div className="onboard-st">Explora el temario</div><div className="onboard-sd">6 materias · 21 ordenamientos</div></div></div>
          </div>
          <button className="btn btn-accent btn-lg" onClick={() => go("onboarding")}>Crear mi plan de estudio ▸</button>
        </div>
      </main>
    );
  }
  // --- héroe «Estudiar ahora» inteligente: misma lógica que el botón central de la barra
  //     (smartStudy decide: reanudar → vencidas → plan de hoy → falladas → materia débil) ---
  const smart = smartStudy();
  const nextStep = { ...smart, act: () => smart.act(go) };
  const streakDays = realStreak ? realStreak() : 0;
  const weekMark = Array.from({ length: 7 }, (_, i) => i < Math.min(7, streakDays));
  // materias del examen desde la lista editable (icono por materia conocida; genérico para las nuevas)
  const ICON = { "Legislación Militar": "⚖", "Operaciones Militares": "🎯", "Normatividad Gubernamental": "📋", "Aspecto Administrativo": "🗂", "Adiestramiento y Mando Militar": "🎖", "Aspecto Técnico": "🛡" };
  const mats = subjectNames().map((n) => ({ n, ic: ICON[n] || "📘", p: domBySubj[n] != null ? domBySubj[n] : 0 }));
  return (
    <main className="main">
      <PageHead title="Resumen" sub={(() => { const t = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" }); return t.charAt(0).toUpperCase() + t.slice(1) + " · sesión local"; })()} crumbs={["Inicio"]} />

      {/* La tarjeta es clicable por conveniencia (mouse); el control accesible por teclado es el botón CTA. */}
      <div className="home-next" onClick={nextStep.act}>
        <div className="home-next-l">
          <span className="home-next-badge">{nextStep.badge}</span>
          <div className="home-next-t">{nextStep.title}</div>
          <div className="home-next-d">{nextStep.desc}</div>
          <div className="home-next-prog">{Array.from({ length: nextStep.of }, (_, i) => <i key={i} className={i < nextStep.done ? "on" : ""}></i>)}</div>
        </div>
        <button className="home-next-cta" onClick={(e) => { e.stopPropagation(); nextStep.act(); }} aria-label={nextStep.badge + ": " + nextStep.title}>{nextStep.cta}</button>
      </div>

      <div className="home-bento">
        <div className="home-card home-hero" onClick={() => go("perfil")} role="button">
          <div className="home-hero-l">Cuenta regresiva al examen</div>
          <div className="home-hero-n">{dExam} días</div>
          <div className="home-hero-s">{examFecha ? "Examen · " + examFecha : "Fija tu fecha en el perfil"}</div>
        </div>
        <div className="home-card home-goal">
          <div className="resume-ring" aria-hidden="true">
            <svg viewBox="0 0 44 44"><circle className="rr-bg" cx="22" cy="22" r="19"></circle><circle className="rr-fg" cx="22" cy="22" r="19" strokeDasharray="119.4" strokeDashoffset={ring(goalPct)}></circle></svg>
            <span className="resume-ring-n">{goalPct}%</span>
          </div>
          <div>
            <div className="home-goal-l">Meta de hoy</div>
            <div className="home-goal-n">{plan.doneToday} / {plan.dailyGoal}</div>
            <div className="home-goal-s">{plan.doneToday >= plan.dailyGoal ? "¡Meta cumplida! 🎯" : "preguntas resueltas"}</div>
          </div>
        </div>
        <div className="home-card home-streak">
          <div className="home-streak-n">{streakDays}</div>
          <div className="home-streak-l">días de racha</div>
          <div className="home-streak-week">{weekMark.map((on, i) => <i key={i} className={on ? "on" : ""}></i>)}</div>
        </div>
      </div>

      <ActivityHeatmap />

      <div className="home-sec">Tus materias <button className="link-btn" onClick={() => go("materias")}>Ver todas ▸</button></div>
      <div className="home-mats">
        {mats.map((m) => {
          const c = subjColor(m.n);
          return (
            <button className="home-mat" key={m.n} style={{ "--c": c }} onClick={() => { window.__epSubject = m.n; go("materia"); }}>
              <span className="home-mat-bar"></span>
              <span className="home-mat-ic">{m.ic}</span>
              <div className="home-mat-nm">{m.n}</div>
              <div className="home-mat-mt">dominio del banco</div>
              <div className="home-mat-track"><i style={{ width: m.p + "%" }}></i></div>
              <div className="home-mat-row"><span className="home-mat-pct">{m.p}%</span><span className="home-mat-qz">Estudiar ▸</span></div>
            </button>
          );
        })}
      </div>

      <div className="grid-2">
        <Panel idx="01" title="Materias con más contenido" meta={String(cats.length)} action="ver todas" onAction={() => go("categorias")}>
          <div className="cat-list">
            {cats.length === 0 && <p className="reco-p">Aún no hay preguntas en el banco.</p>}
            {cats.map(([n, m, q]) => {
              const p = domBySubj[n] != null ? domBySubj[n] : 0;
              return (
              <div className="cat clickable" key={n} onClick={() => { window.__epSubject = n; go("materia"); }}>
                <div className="cat-top">
                  <span className="cat-name">{n}</span>
                  <span className="cat-pct" style={{ color: subjTextColor(n) }}>{p}%</span>
                </div>
                <div className="mini-bar"><i style={{ width: p + "%", background: subjColor(n), color: subjTextColor(n) }}></i></div>
                <div className="cat-meta">{m} ordenamiento{m === 1 ? "" : "s"} · {q} preguntas</div>
              </div>
              );
            })}
          </div>
        </Panel>

        <Panel idx="02" title="Materias recientes" meta={String(recientes.length)} action="ver todas" onAction={() => go("materias")}>
          <div className="rows">
            {recientes.length === 0 && <p className="reco-p">Sin actividad aún. Completa un cuestionario o registra tiempo de estudio.</p>}
            {recientes.map(([n, c, t, d]) => (
              <div className="row3 clickable" key={n} onClick={() => { window.__epSubject = n; go("materia"); }}>
                <span className="r-dot" style={{ background: subjColor(n) }}></span>
                <div className="r-main">
                  <div className="r-title">{n}</div>
                  <div className="r-sub">{c}{t ? " · " + t : ""}</div>
                </div>
                <span className="r-when">{d}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid-2">
        <Panel idx="03" title="Preguntas recientes" meta={nQ.toLocaleString() + " totales"} action="banco ▸" onAction={() => go("banco")}>
          <table className="tbl tbl-mini">
            <tbody>
              {recientesQ.map((q) => (
                <tr key={q._id} className="clickable" onClick={() => { window.__epEditQ = q; go("pregunta"); }}>
                  <td className="t-q">{q.q}</td>
                  <td><span className="chip">{(TYPE_LABEL && TYPE_LABEL[q.type]) || q.type}</span></td>
                  <td><Diff level={q.dif || "medio"} /></td>
                </tr>
              ))}
              {recientesQ.length === 0 && <tr><td className="t-q t-mute" colSpan="3">Aún no tienes preguntas en el banco.</td></tr>}
            </tbody>
          </table>
        </Panel>

        <Panel idx="04" title="Repaso de hoy" meta={vencenHoy + " tarjetas"} action="prioritario ▸" onAction={() => go("repaso")}>
          <div className="due">
            <div className="due-n"><b>{vencenHoy}</b><span>vencen hoy</span></div>
            <div className="due-split">
              <div className="due-cell"><span className="due-c due-c-danger"></span>Falladas <b>{falladas}</b></div>
              <div className="due-cell"><span className="due-c due-c-warn"></span>En repaso <b>{enRepaso}</b></div>
              <div className="due-cell"><span className="due-c due-c-ok"></span>Nuevas <b>{nuevasC}</b></div>
            </div>
            <div className="quick-sessions">
              <button className="btn btn-sm" disabled={!falladas} onClick={() => go("repaso")}>Solo falladas ({falladas})</button>
              <button className="btn btn-sm" disabled={!importantes} onClick={() => go("repaso")}>Marcadas ({importantes})</button>
            </div>
            <button className="btn btn-accent" style={{ width: "100%", marginTop: "10px" }} onClick={() => go("tarjetas")}>Iniciar repaso ▸</button>
          </div>
        </Panel>
      </div>

      {/* metas semanales y racha (antes página propia; la ruta «metas» sigue viva) */}
      <MetasBody />
    </main>
  );
}

/* ========================== CATEGORÍAS ========================== */
function CategoriasBody() {
  const go = useGo();
  const st = useStore();
  const [dlg, setDlg] = React.useState(null); // { mode:"add"|"edit", cat }
  const [del, setDel] = React.useState(null);
  const nQ = st.questions.length;
  const nDom = st.cards.filter((c) => c.nivel === "dominado").length;
  const nMats = subjectNames().length;
  const nOrds = Object.keys(MATERIA_DETAIL || {}).length;
  const cats = st.categories || [];
  const avancePct = nQ ? Math.round(nDom / nQ * 100) : 0;
  return (
    <React.Fragment>
      <SectionHead icon="🗂" title="Categorías" desc={cats.length + (cats.length === 1 ? " categoría" : " categorías") + " · organiza tus exámenes o convocatorias"} actions={<button className="btn btn-accent" onClick={() => setDlg({ mode: "add" })}>+ Nueva categoría</button>} />
      <div className="cat-grid">
        {cats.map((cat, i) => {
          const isPrimary = i === 0;
          return (
          <div className="catcard" key={cat.id}>
            <div className="catcard-top" style={{ background: cat.color }}></div>
            <div className="catcard-b">
              <div className="catcard-head">
                <div className="catcard-name">{cat.name}</div>
                <div className="rowacts" onClick={(e) => e.stopPropagation()}>
                  <button className="ra-btn" title="Editar" aria-label={"Editar " + cat.name} onClick={() => setDlg({ mode: "edit", cat })}>✎</button>
                  <button className="ra-btn ra-del" title="Eliminar" aria-label={"Eliminar " + cat.name} onClick={() => setDel(cat)}>✕</button>
                </div>
              </div>
              <div className="catcard-desc">{cat.desc || (isPrimary ? "Cap. 1/o. I.C.I. · Examen de promoción general." : "Categoría personalizada.")}</div>
              <div className="catcard-stats">
                <span><b>{nMats}</b> materias</span>
                <span><b>{isPrimary ? nQ.toLocaleString() : 0}</b> preguntas</span>
                <span><b>{nOrds}</b> ordenamientos</span>
              </div>
              <div className="catcard-foot">
                <div className="mini-bar"><i style={{ width: (isPrimary ? avancePct : 0) + "%", background: cat.color }}></i></div>
                <span className="catcard-pct">{isPrimary ? avancePct : 0}%</span>
              </div>
              <button className="btn btn-sm catcard-go" onClick={() => go("materias")}>Ver materias ▸</button>
            </div>
          </div>
          );
        })}
      </div>

      <TaxEditDialog open={!!dlg} title={dlg && dlg.mode === "edit" ? "Editar categoría" : "Nueva categoría"}
        initial={dlg && dlg.cat} showName showDesc showColor
        confirmLabel={dlg && dlg.mode === "edit" ? "Guardar cambios" : "Crear categoría"}
        onClose={() => setDlg(null)}
        onConfirm={(v) => {
          if (dlg.mode === "edit") { EPStore.updateCategory(dlg.cat.id, { name: v.name, desc: v.desc, color: v.color }); toast && toast("Categoría actualizada", "ok"); }
          else { EPStore.addCategory({ name: v.name, desc: v.desc, color: v.color }); toast && toast("Categoría creada", "ok"); }
          setDlg(null);
        }} />

      <ConfirmDialog open={!!del} danger confirmLabel="Eliminar categoría"
        title="¿Eliminar esta categoría?"
        body={del && <span>Se eliminará <b>“{del.name}”</b>. Tus materias y preguntas no se tocan; solo desaparece esta agrupación.</span>}
        onClose={() => setDel(null)}
        onConfirm={() => { EPStore.deleteCategory(del.id); setDel(null); toast && toast("Categoría eliminada", "ok"); }} />
    </React.Fragment>
  );
}

/* =========================== MATERIAS =========================== */
function MateriasBody() {
  const go = useGo();
  const st = useStore();
  const [dlg, setDlg] = React.useState(null); // { mode:"add"|"edit", subj }
  const [del, setDel] = React.useState(null); // { name, count }
  // descripciones del temario base (contenido fijo); las materias nuevas no la tienen
  const DESC = {
    "Legislación Militar": "CJM, LOEFAM, ISSFAM, disciplina, ascensos y deberes.",
    "Operaciones Militares": "Logística, operaciones, op. conjuntas y planeamiento.",
    "Normatividad Gubernamental": "Uso de la fuerza, transparencia, APF y DD.HH.",
    "Aspecto Administrativo": "PMBOK 7a Ed. y Ley de Adquisiciones.",
    "Adiestramiento y Mando Militar": "Mando, liderazgo y adiestramiento.",
    "Aspecto Técnico": "Ciberseguridad y ciberdefensa.",
  };
  const DETAIL = MATERIA_DETAIL || {};
  const mats = (st.subjects || []).map((s) => {
    const qs = st.questions.filter((q) => q.subject === s.name);
    const dom = st.cards.filter((c) => c.subject === s.name && c.nivel === "dominado").length;
    const nOrds = new Set([...Object.keys(DETAIL).filter((k) => DETAIL[k].cat === s.name), ...((st.userOrds || {})[s.name] || []).map((o) => o.name), ...qs.map((q) => q.ord).filter(Boolean)]).size;
    return { name: s.name, color: s.color, desc: DESC[s.name] || "Materia personalizada.", nOrds, q: qs.length, p: qs.length ? Math.round(dom / qs.length * 100) : 0 };
  });
  const askDelete = (name) => {
    const count = st.questions.filter((q) => q.subject === name).length;
    setDel({ name, count });
  };
  return (
    <React.Fragment>
      <SectionHead icon="📚" title="Materias" desc={mats.length + " materias · edita nombre, color o crea las tuyas"} actions={<button className="btn btn-accent" onClick={() => setDlg({ mode: "add" })}>+ Nueva materia</button>} />
      <div className="cat-grid">
        {mats.map((mt) => (
          <div className="catcard" key={mt.name}>
            <div className="catcard-top" style={{ background: mt.color }}></div>
            <div className="catcard-b">
              <div className="catcard-head">
                <div className="catcard-name">{mt.name}</div>
                <div className="rowacts" onClick={(e) => e.stopPropagation()}>
                  <button className="ra-btn" title="Editar nombre y color" aria-label={"Editar " + mt.name} onClick={() => setDlg({ mode: "edit", subj: mt })}>✎</button>
                  <button className="ra-btn ra-del" title="Eliminar" aria-label={"Eliminar " + mt.name} onClick={() => askDelete(mt.name)}>✕</button>
                </div>
              </div>
              <div className="catcard-desc">{mt.desc}</div>
              <div className="catcard-stats">
                <span><b>{mt.nOrds}</b> {mt.nOrds === 1 ? "ordenamiento" : "ordenamientos"}</span>
                <span><b>{mt.q}</b> preguntas</span>
              </div>
              <div className="catcard-foot">
                <div className="mini-bar"><i style={{ width: mt.p + "%", background: mt.color }}></i></div>
                <span className="catcard-pct">{mt.p}%</span>
              </div>
              <button className="btn btn-sm catcard-go" onClick={() => { window.__epSubject = mt.name; go("materia"); }}>Ver temario ▸</button>
            </div>
          </div>
        ))}
      </div>

      <TaxEditDialog open={!!dlg} title={dlg && dlg.mode === "edit" ? "Editar materia" : "Nueva materia"}
        initial={dlg && dlg.subj} showName showColor
        confirmLabel={dlg && dlg.mode === "edit" ? "Guardar cambios" : "Crear materia"}
        onClose={() => setDlg(null)}
        onConfirm={(v) => {
          if (dlg.mode === "edit") {
            const old = dlg.subj.name;
            if (v.name && v.name !== old) {
              const r = EPStore.renameSubject(old, v.name);
              if (!r.ok) { toast && toast(r.reason === "ya existe" ? "Ya existe una materia con ese nombre" : "No se pudo renombrar", "danger"); return; }
            }
            EPStore.setSubjectColor(v.name || old, v.color);
            toast && toast("Materia actualizada", "ok");
          } else {
            const ok = EPStore.addSubject({ name: v.name, color: v.color });
            if (!ok) { toast && toast("Ya existe una materia con ese nombre", "danger"); return; }
            toast && toast("Materia creada", "ok");
          }
          setDlg(null);
        }} />

      <ConfirmDialog open={!!del} danger={del && del.count === 0} confirmLabel={del && del.count === 0 ? "Eliminar materia" : "Entendido"}
        title={del && del.count > 0 ? "No se puede eliminar todavía" : "¿Eliminar esta materia?"}
        body={del && (del.count > 0
          ? <span>La materia <b>“{del.name}”</b> tiene <b>{del.count}</b> pregunta{del.count === 1 ? "" : "s"}. Muévelas o elimínalas primero (o renombra la materia) para no dejar preguntas huérfanas.</span>
          : <span>Se eliminará <b>“{del.name}”</b>. No tiene preguntas asociadas, así que es seguro.</span>)}
        onClose={() => setDel(null)}
        onConfirm={() => {
          if (del.count > 0) { setDel(null); return; }
          EPStore.deleteSubject(del.name); setDel(null); toast && toast("Materia eliminada", "ok");
        }} />
    </React.Fragment>
  );
}

/* ====================== DETALLE DE MATERIA ====================== */
function MateriaDetalle() {
  const go = useGo();
  const st = useStore();
  const [open, setOpen] = React.useState(0);
  const [ordOpen, setOrdOpen] = React.useState(false);
  const [ordEdit, setOrdEdit] = React.useState(null); // ordenamiento a renombrar
  const [ordDel, setOrdDel] = React.useState(null);   // ordenamiento a eliminar
  const DETAIL = MATERIA_DETAIL || {};
  const SUBJECTS = {
    "Legislación Militar": "Ordenamientos jurídico-militares: justicia, organización, disciplina, ascensos y deberes del Ejto. y F.A.M.",
    "Operaciones Militares": "Doctrina de logística, operaciones, operaciones conjuntas y planeamiento operacional.",
    "Normatividad Gubernamental": "Uso de la fuerza, transparencia, administración pública, responsabilidades y derechos humanos.",
    "Aspecto Administrativo": "Dirección de proyectos (PMBOK) y contrataciones del sector público.",
    "Adiestramiento y Mando Militar": "Mando, liderazgo y proceso de adiestramiento militar.",
    "Aspecto Técnico": "Ciberseguridad, ciberdefensa y operaciones en el ciberespacio.",
  };
  const names = subjectNames();
  const subject = (window.__epSubject && names.includes(window.__epSubject)) ? window.__epSubject : (names[0] || "Legislación Militar");
  const color = subjColor(subject);
  // each ordenamiento of this subject = a tree-tema; its títulos = cap-rows
  // conteos reales del banco: preguntas cuyo `ord` coincide con el ordenamiento (y `loc` con el título)
  const subjQs = st.questions.filter((x) => x.subject === subject);
  const ords = Object.keys(DETAIL).filter((k) => DETAIL[k].cat === subject);
  const temasBase = ords.map((ordName) => {
    const ordQs = subjQs.filter((x) => x.ord === ordName);
    const caps = DETAIL[ordName].titulos.map((tt) => {
      const capList = tt.caps.map((c) => c[0]).join(" · ");
      const cq = ordQs.filter((x) => (x.loc || "").startsWith(tt.n)).length;
      return [tt.n, capList, cq, cq, ""];
    });
    const q = ordQs.length;
    return { n: ordName, ref: DETAIL[ordName].desc, q, t: q, caps };
  });
  const userOrds = ((st.userOrds || {})[subject] || []).map((o) => {
    const q = subjQs.filter((x) => x.ord === o.name).length;
    return { n: o.name, ref: o.desc || "Ordenamiento personalizado", q, t: q, caps: [], isNew: true, id: o.id };
  });
  const temas = [...temasBase, ...userOrds];
  const totQ = subjQs.length;
  const totT = subjQs.length;
  const domS = st.cards.filter((c) => c.subject === subject && c.nivel === "dominado").length;
  const avance = totQ ? Math.round(domS / totQ * 100) : 0;
  return (
    <main className="main">
      <header className="page-head-card subj" style={{ borderTop: "3px solid " + color }}>
        <Crumbs path={[["Inicio", "inicio"], ["Promoción 2026", "categorias"], ["Materias", "materias"], subject]} />
        <div className="subj-grid">
          <div className="subj-l">
            <h1 className="page-title">{subject}</h1>
            <p className="subj-desc">{SUBJECTS[subject] || "Materia de tu banco de estudio."}</p>
            <div className="stat-chips">
              <span className="sc"><b>{temas.length}</b> {temas.length === 1 ? "ordenamiento" : "ordenamientos"}</span>
              <span className="sc"><b>{totQ}</b> preguntas</span>
              <span className="sc"><b>{totT}</b> tarjetas</span>
              <span className="sc"><b>{avance}%</b> avance</span>
            </div>
          </div>
          <div className="subj-r">
            <button className="btn btn-accent btn-lg" onClick={() => { window.__epSimulacro = false; window.__epSubject = subject; EPStore.setNav({ subject, mode: "practica" }); go("quiz"); }}>Estudiar ▸</button>
            <div className="subj-actions">
              <button className="btn" onClick={() => { window.__epEditQ = null; go("pregunta"); }}>+ Pregunta</button>
              <button className="btn" onClick={() => go("tarjeta")}>+ Tarjeta</button>
              <button className="btn" onClick={() => setOrdOpen(true)}>+ Ordenamiento</button>
            </div>
          </div>
        </div>
      </header>

      <Panel idx="—" title="Ordenamientos, títulos y capítulos" meta={temas.length + (temas.length === 1 ? " ordenamiento · " : " ordenamientos · ") + totQ + " preguntas"}>
        <div className="tree">
          {temas.map((tm, i) => {
            const isOpen = open === i;
            return (
              <div className={"tree-tema" + (isOpen ? " is-open" : "")} key={tm.n}>
                <div className="tema-row" onClick={() => setOpen(isOpen ? -1 : i)}>
                  <span className="tw">{isOpen ? "▾" : "▸"}</span>
                  <span className="tema-name">{tm.n}{tm.isNew && <span className="tag" style={{ marginLeft: "6px" }}>tuyo</span>}</span>
                  <span className="tema-counts">{tm.q} preg · {tm.t} tarj</span>
                  {tm.isNew && (
                    <span className="rowacts" onClick={(e) => e.stopPropagation()}>
                      <button className="ra-btn" title="Renombrar ordenamiento" aria-label={"Renombrar " + tm.n} onClick={() => setOrdEdit(tm)}>✎</button>
                      <button className="ra-btn ra-del" title="Eliminar ordenamiento" aria-label={"Eliminar " + tm.n} onClick={() => setOrdDel(tm)}>✕</button>
                    </span>
                  )}
                  <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); window.__epSimulacro = false; window.__epSubject = subject; EPStore.setNav({ subject, ord: tm.n, mode: "practica" }); go("quiz"); }}>Estudiar</button>
                </div>
                {isOpen && tm.caps.map(([cn, cd, cq, ct, cu]) => (
                  <div className="cap-row" key={cn}>
                    <span className="cap-bar" aria-hidden="true"></span>
                    <div className="cap-main">
                      <div className="cap-name">{cn}</div>
                      <div className="cap-desc">{cd}</div>
                    </div>
                    <div className="cap-counts">
                      <span><b>{cq}</b> preg</span>
                      <span><b>{ct}</b> tarj</span>
                      <span className="cap-when">{cu}</span>
                    </div>
                    <div className="cap-acts">
                      <button className="btn btn-sm" onClick={() => { window.__epEditQ = null; go("pregunta"); }}>+ P</button>
                      <button className="btn btn-sm" onClick={() => go("tarjeta")}>+ T</button>
                      <button className="btn btn-sm btn-accent" onClick={() => { window.__epSimulacro = false; window.__epSubject = subject; EPStore.setNav({ subject, ord: tm.n, loc: cn, mode: "practica" }); go("quiz"); }}>Estudiar</button>
                    </div>
                  </div>
                ))}
                {isOpen && tm.caps.length === 0 && (
                  <div className="cap-row cap-row-empty">
                    <span className="cap-bar" aria-hidden="true"></span>
                    <div className="cap-main">
                      <div className="cap-desc">Aún sin títulos ni capítulos. Empieza a estudiar o agrega preguntas y tarjetas a este ordenamiento.</div>
                    </div>
                    <div className="cap-acts">
                      <button className="btn btn-sm" onClick={() => { window.__epEditQ = null; go("pregunta"); }}>+ P</button>
                      <button className="btn btn-sm" onClick={() => go("tarjeta")}>+ T</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <PromptDialog open={ordOpen} title={"Nuevo ordenamiento · " + subject} confirmLabel="Crear ordenamiento"
        fields={[
          { key: "name", label: "Nombre del ordenamiento", placeholder: "p. ej. Ley de Ascensos y Recompensas", required: true },
          { key: "desc", label: "Referencia / descripción", placeholder: "Ref. legal o breve descripción" },
        ]}
        onClose={() => setOrdOpen(false)}
        onConfirm={(v) => { EPStore.addOrdenamiento(subject, { name: v.name.trim(), desc: (v.desc || "").trim() }); setOrdOpen(false); setOpen(temas.length); toast && toast("Ordenamiento creado", "ok"); }} />

      <PromptDialog open={!!ordEdit} title="Renombrar ordenamiento" confirmLabel="Guardar"
        fields={[{ key: "name", label: "Nuevo nombre", placeholder: ordEdit ? ordEdit.n : "", required: true }]}
        onClose={() => setOrdEdit(null)}
        onConfirm={(v) => { const r = EPStore.renameOrdenamiento(subject, ordEdit.id, v.name.trim()); setOrdEdit(null); toast && toast(r.ok ? "Ordenamiento renombrado" : "No se pudo renombrar", r.ok ? "ok" : "danger"); }} />

      <ConfirmDialog open={!!ordDel} danger={ordDel && ordDel.q === 0} confirmLabel={ordDel && ordDel.q === 0 ? "Eliminar" : "Entendido"}
        title={ordDel && ordDel.q > 0 ? "No se puede eliminar todavía" : "¿Eliminar este ordenamiento?"}
        body={ordDel && (ordDel.q > 0
          ? <span>“{ordDel.n}” tiene <b>{ordDel.q}</b> pregunta{ordDel.q === 1 ? "" : "s"}. Muévelas o renómbralo primero.</span>
          : <span>Se eliminará <b>“{ordDel.n}”</b>. No tiene preguntas asociadas.</span>)}
        onClose={() => setOrdDel(null)}
        onConfirm={() => { if (ordDel.q > 0) { setOrdDel(null); return; } EPStore.deleteOrdenamiento(subject, ordDel.id); setOrdDel(null); toast && toast("Ordenamiento eliminado", "ok"); }} />

      <NotasPanel keyName={"materia:" + subject} color={color} />
    </main>
  );
}

function NotasPanel({ keyName, color }) {
  const st = useStore();
  const saved = st.notes[keyName] || "";
  const [val, setVal] = React.useState(saved);
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => { setVal(st.notes[keyName] || ""); }, [keyName]);
  const save = () => { EPStore.setNote(keyName, val); setEditing(false); toast && toast("Apuntes guardados", "ok"); };
  return (
    <Panel idx="✎" title="Apuntes personales" meta={saved ? "guardados" : "vacío"}
      action={editing ? "guardar" : "editar"} onAction={editing ? save : () => setEditing(true)}>
      {editing ? (
        <div className="notas-edit">
          <textarea className="input textarea" style={{ minHeight: "120px" }} value={val} onChange={(e) => setVal(e.target.value)} placeholder="Escribe tus apuntes, mnemotecnias o dudas sobre esta materia…" autoFocus></textarea>
          <div className="form-actions" style={{ marginTop: "10px" }}>
            <button className="btn" onClick={() => { setVal(saved); setEditing(false); }}>Cancelar</button>
            <button className="btn btn-accent" onClick={save}>Guardar apuntes</button>
          </div>
        </div>
      ) : saved ? (
        <div className="notas-view" style={{ borderLeft: "3px solid " + color }}>{saved}</div>
      ) : (
        <div className="notas-empty" onClick={() => setEditing(true)}>
          <span className="notas-empty-ic">✎</span> Aún no tienes apuntes en esta materia. Haz clic para añadir.
        </div>
      )}
    </Panel>
  );
}

/* ========================= ESTADÍSTICAS ========================= */
function EstadisticasBody() {
  const go = useGo();
  const st = useStore();
  // actividad real de los últimos 7 días (unidades ≈ min: tarjetas, cuestionarios y tiempo registrado)
  const week = (() => {
    const act = st.activity || {};
    const byDate = { ...act };
    (st.timeLog || []).forEach((t) => { byDate[t.date] = (byDate[t.date] || 0) + Math.round((t.seconds || 0) / 60); });
    const DOW = ["D", "L", "M", "X", "J", "V", "S"];
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      out.push([DOW[d.getDay()], byDate[d.toISOString().slice(0, 10)] || 0]);
    }
    return out;
  })();
  const maxW = Math.max(1, ...week.map(([, v]) => v));
  // dominio real del banco por nivel SRS + falladas por estado
  const cardsAll = st.cards;
  const nDominadas = cardsAll.filter((c) => c.nivel === "dominado").length;
  const nRepaso = cardsAll.filter((c) => c.nivel === "medio").length;
  const nFall = st.questions.filter((q) => q.status === "fall").length;
  const nSin = Math.max(0, cardsAll.length - nDominadas - nRepaso - nFall);
  const dominio = [
    ["Dominadas", nDominadas, "var(--ok)"],
    ["En repaso", nRepaso, "var(--accent)"],
    ["Falladas", nFall, "var(--danger)"],
    ["Sin estudiar", nSin, "var(--mute)"],
  ];
  const totDom = Math.max(1, dominio.reduce((a, b) => a + b[1], 0));
  // temas débiles reales: ordenamientos con menor % de dominio (mín. 1 pregunta)
  const weak = (() => {
    const byOrd = {};
    st.cards.forEach((c) => {
      const k = c.ord || "General";
      if (!byOrd[k]) byOrd[k] = { dom: 0, total: 0 };
      byOrd[k].total++;
      if (c.nivel === "dominado") byOrd[k].dom++;
    });
    return Object.entries(byOrd)
      .map(([k, v]) => [k, Math.round(v.dom / v.total * 100)])
      .sort((a, b) => a[1] - b[1])
      .slice(0, 4);
  })();
  const porMateria = subjectNames().map((s) => {
    const cs = st.cards.filter((c) => c.subject === s);
    const dom = cs.filter((c) => c.nivel === "dominado").length;
    return [s, cs.length ? Math.round(dom / cs.length * 100) : 0, cs.length, subjColor(s)];
  });
  const streak = realStreak ? realStreak() : 0;
  // constancia real (últimos 91 días) desde el mapa de actividad
  const heat = (window.activityMap ? window.activityMap().cells.slice(-91) : []).map((c) => c.level);
  const doneS = st.sessions.filter((x) => x.state === "done");
  const avgScore = doneS.length ? (doneS.reduce((a, x) => a + (x.score || 0), 0) / doneS.length) : 0;
  const kpis = [
    ["Racha actual", streak + " día" + (streak === 1 ? "" : "s"), "días consecutivos de estudio"],
    ["Cuestionarios", String(st.sessions.length), doneS.length ? "media " + avgScore.toFixed(1) + " / 10" : "aún sin sesiones"],
    ["Acierto medio", doneS.length ? Math.round(avgScore * 10) + "%" : "—", doneS.length + " completados"],
    ["Banco", st.questions.length.toLocaleString(), "preguntas = tarjetas"],
  ];
  return (
    <React.Fragment>
      <SectionHead icon="📊" title="Resumen" desc="Tu actividad de estudio de un vistazo" />

      <div className="kpis">
        {kpis.map(([k, v, s]) => (
          <div className="kpi" key={k}>
            <div className="kpi-k">{k}</div>
            <div className="kpi-v">{v}</div>
            <div className="kpi-s">{s}</div>
          </div>
        ))}
      </div>

      <Panel idx="02" title="Avance por materia" meta="6 materias del examen" action="ver materias ▸" onAction={() => go("materias")}>
        <div className="matstats">
          {porMateria.map(([n, p, tot, c]) => (
            <div className="matstat-row" key={n} onClick={() => { window.__epSubject = n; go("materia"); }}>
              <span className="matstat-dot" style={{ background: c }}></span>
              <span className="matstat-name">{n}</span>
              <div className="matstat-track"><i style={{ width: p + "%", background: c, color: c }}></i></div>
              <span className="matstat-pct">{p}%</span>
              <span className="matstat-tot">{Math.round(tot * p / 100)} / {tot}</span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid-2">
        <Panel idx="03" title="Actividad semanal" meta="actividad / día (≈min)">
          <div className="barchart">
            {week.map(([d, v]) => (
              <div className="barcol" key={d}>
                <div className="bar-track"><div className="bar" style={{ height: (v / maxW * 100) + "%" }}></div></div>
                <span className="bar-v">{v}</span>
                <span className="bar-l">{d}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel idx="04" title="Dominio del banco" meta={totDom.toLocaleString() + " preguntas"}>
          <div className="stackbar">
            {dominio.map(([n, v, c]) => (
              <div key={n} className="stackseg" style={{ width: (v / totDom * 100) + "%", background: c }} title={n}></div>
            ))}
          </div>
          <div className="stacklegend">
            {dominio.map(([n, v, c]) => (
              <div className="sl-row" key={n}>
                <span className="sl-dot" style={{ background: c }}></span>
                <span className="sl-name">{n}</span>
                <span className="sl-v">{v.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid-2">
        <Panel idx="05" title="Temas más débiles" action="ir al banco ▸" onAction={() => go("banco")}>
          <div className="weak">
            {weak.length === 0 && <p className="reco-p">Sin datos aún: estudia tarjetas para medir tu dominio por tema.</p>}
            {weak.map(([n, p]) => (
              <div className="weak-row" key={n}>
                <span className="weak-name">{n}</span>
                <div className="mini-bar mini-bar-thin"><i style={{ width: p + "%" }} className={p < 50 ? "i-danger" : "i-warn"}></i></div>
                <span className="weak-pct">{p}%</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel idx="06" title="Constancia" meta="últimos 3 meses">
          <div className="heat">
            {heat.map((lv, i) => <span key={i} className={"heat-c heat-" + lv}></span>)}
          </div>
          <div className="heat-legend"><span>menos</span><span className="heat-c heat-0"></span><span className="heat-c heat-2"></span><span className="heat-c heat-4"></span><span>más</span></div>
        </Panel>
      </div>
    </React.Fragment>
  );
}

/* ========================= CONFIGURACIÓN ======================== */
function Config() {
  const go = useGo();
  const st = useStore();
  const [s, setS] = React.useState({ explica: true, mezclar: true, sonido: false, autoguardar: true });
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [nombre, setNombre] = React.useState(st.plan.nombre || "Aspirante");
  const [fecha, setFecha] = React.useState(st.plan.examDate || "2026-07-27");
  const DOW = [["L", 1], ["M", 2], ["X", 3], ["J", 4], ["V", 5], ["S", 6], ["D", 0]];
  const [dias, setDias] = React.useState(st.plan.diasDisponibles || [1, 2, 3, 4, 5, 6]);
  const toggleDia = (n) => setDias((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]);
  const [canInstall, setCanInstall] = React.useState(!!window.__epInstallPrompt);
  React.useEffect(() => { const h = () => setCanInstall(true); window.addEventListener("ep:can-install", h); return () => window.removeEventListener("ep:can-install", h); }, []);
  const guardarAspirante = () => {
    EPStore.setNombre(nombre); EPStore.setExamDate(fecha); EPStore.setDias(dias);
    generarPlan(); toast && toast("Configuración guardada y plan recalculado", "ok");
  };
  const instalar = async () => { const p = window.__epInstallPrompt; if (!p) { toast && toast("La instalación no está disponible en este navegador", "warn"); return; } p.prompt(); try { await p.userChoice; } catch {} window.__epInstallPrompt = null; setCanInstall(false); };
  const t = (k) => setS((p) => ({ ...p, [k]: !p[k] }));
  return (
    <main className="main">
      <PageHead title="Configuración" sub="Preferencias del sistema, alertas y recordatorios" crumbs={[["Inicio", "inicio"], "Configuración"]} />
      <div className="cfg-metrics">
        <div className="cfg-metric"><div className="cfg-metric-v">{st.questions.length}</div><div className="cfg-metric-k">Preguntas</div></div>
        <div className="cfg-metric"><div className="cfg-metric-v">{st.cards.filter((c) => c.nivel === "dominado").length}</div><div className="cfg-metric-k">Dominadas</div></div>
        <div className="cfg-metric"><div className="cfg-metric-v">{st.sessions.length}</div><div className="cfg-metric-k">Sesiones</div></div>
        <div className="cfg-metric"><div className="cfg-metric-v">{st.plan.dias ? st.plan.dias.length : 0}</div><div className="cfg-metric-k">Días de plan</div></div>
        <div className="cfg-metric"><div className="cfg-metric-v">v1.0</div><div className="cfg-metric-k">Local · IndexedDB</div></div>
      </div>
      <div className="settings">
        <Panel idx="01" title="Aspirante y examen">
          <div className="set-row"><div><div className="set-label">Nombre del aspirante</div><div className="set-desc">Aparece en tu perfil y respaldos.</div></div><input className="input input-sm" aria-label="Nombre del aspirante" style={{ maxWidth: "240px" }} value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div className="set-row"><div><div className="set-label">Fecha del examen</div><div className="set-desc">Recalcula la cuenta regresiva y el plan.</div></div><input type="date" className="input input-sm" aria-label="Fecha del examen" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="set-row"><div><div className="set-label">Días disponibles</div><div className="set-desc">Días de la semana en que estudias.</div></div><div className="dow-pick">{DOW.map(([l, n]) => <button key={n} className={"dow-b" + (dias.includes(n) ? " is-on" : "")} onClick={() => toggleDia(n)}>{l}</button>)}</div></div>
          <div className="set-row"><div><div className="set-label">Guardar y recalcular</div><div className="set-desc">Aplica los cambios y regenera el plan hasta el examen.</div></div><button className="btn btn-sm btn-accent" onClick={guardarAspirante}>Guardar cambios</button></div>
          <div className="set-row"><div><div className="set-label">Asistente inicial</div><div className="set-desc">Vuelve a configurar examen, materias y ritmo paso a paso.</div></div><button className="btn btn-sm" onClick={() => go("onboarding")}>Abrir asistente ▸</button></div>
        </Panel>

        <Panel idx="02" title="Estudio">
          <div className="set-row"><div><div className="set-label">Meta diaria de preguntas</div><div className="set-desc">Objetivo que verás en el panel de Inicio.</div></div><select className="input input-sm" aria-label="Meta diaria de preguntas" value={st.plan.dailyGoal} onChange={(e) => EPStore.setGoal(+e.target.value)}><option>20</option><option>30</option><option>40</option><option>50</option></select></div>
          <div className="set-row"><div><div className="set-label">Mostrar explicación tras responder</div><div className="set-desc">Revela la explicación al confirmar cada pregunta.</div></div><Switch on={s.explica} onClick={() => t("explica")} label="Mostrar explicación tras responder" /></div>
          <div className="set-row"><div><div className="set-label">Mezclar preguntas y respuestas</div><div className="set-desc">Orden aleatorio en cada sesión.</div></div><Switch on={s.mezclar} onClick={() => t("mezclar")} label="Mezclar preguntas y respuestas" /></div>
          <div className="set-row"><div><div className="set-label">Sonido de respuesta</div><div className="set-desc">Efecto al acertar o fallar.</div></div><Switch on={s.sonido} onClick={() => t("sonido")} label="Sonido de respuesta" /></div>
        </Panel>

        <Panel idx="03" title="Apariencia">
          <div className="set-row"><div><div className="set-label">Menú lateral</div><div className="set-desc">Reordena u oculta páginas y agrega separadores o espacios.</div></div><button className="btn btn-sm" onClick={() => window.dispatchEvent(new Event("ep:editnav"))}>Personalizar…</button></div>
          <div className="set-row"><div><div className="set-label">Instalar como app (PWA)</div><div className="set-desc">{canInstall ? "Úsala como programa de escritorio, sin navegador." : "En iPhone: Safari → Compartir → Agregar a pantalla de inicio. En escritorio, tu navegador la ofrecerá al usarla."}</div></div><button className="btn btn-sm" onClick={instalar} disabled={!canInstall} title={canInstall ? undefined : "Este navegador no expone el aviso de instalación"}>{canInstall ? "Instalar app" : "Instalación manual"}</button></div>
        </Panel>

        <Panel idx="04" title="Datos">
          <div className="set-row"><div><div className="set-label">Autoguardado</div><div className="set-desc">Guarda el progreso automáticamente.</div></div><Switch on={s.autoguardar} onClick={() => t("autoguardar")} label="Autoguardado" /></div>
          <div className="set-row"><div><div className="set-label">Respaldo y exportación</div><div className="set-desc">Base de datos local (IndexedDB) en este dispositivo.</div></div>
            <div className="set-btns"><button className="btn btn-sm" onClick={() => { const n = EPStore.exportJSON(); toast && toast("Respaldo exportado (" + n + " elementos)", "ok"); }}>Exportar respaldo</button><button className="btn btn-sm" onClick={() => go("respaldo")}>Copias y restauración ▸</button></div></div>
          <div className="set-row"><div><div className="set-label">Importar banco</div><div className="set-desc">CSV, JSON o texto.</div></div><div className="set-btns"><button className="btn btn-sm" onClick={() => go("importar")}>Importar…</button></div></div>
          <div className="set-row"><div><div className="set-label danger-text">Borrar todos los datos</div><div className="set-desc">Acción irreversible.</div></div><button className="btn btn-sm btn-danger" onClick={() => setConfirmDel(true)}>Borrar</button></div>
        </Panel>
      </div>

      {/* Alertas y recordatorios (antes página propia; la ruta «alertas» abre esta página) */}
      <AlertasBody />

      <ConfirmDialog open={confirmDel} danger confirmLabel="Sí, borrar todo"
        title="¿Borrar todos los datos?"
        body={<span>Se eliminarán <b>todas</b> tus preguntas, tarjetas, sesiones y apuntes. Esta acción no se puede deshacer.</span>}
        onClose={() => setConfirmDel(false)} onConfirm={() => { EPStore.reset(); setConfirmDel(false); toast && toast("Datos borrados", "ok"); go("inicio"); }} />
    </main>
  );
}

/* ============================ IMPORTAR =========================== */
function ImportarBody() {
  const go = useGo();
  const [step, setStep] = React.useState(1);
  const [fileName, setFileName] = React.useState("");
  const [headers, setHeaders] = React.useState([]);
  const [rows, setRows] = React.useState([]);
  const [map, setMap] = React.useState([]);          // campo asignado a cada columna (CSV)
  const [nativeQs, setNativeQs] = React.useState(null); // JSON nativo de EstudioPro (objetos con q/answer)
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState("");
  const fileRef = React.useRef(null);
  const steps = ["Archivo", "Columnas", "Destino", "Confirmar"];
  const SUBJECTS = subjectNames();
  const [destSubj, setDestSubj] = React.useState(SUBJECTS[0] || "");
  const [destOrd, setDestOrd] = React.useState("");

  // very small CSV parser (handles quoted fields + commas)
  const parseCSV = (text) => {
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
    const parseLine = (line) => {
      const out = []; let cur = ""; let q = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (ch === "," && !q) { out.push(cur); cur = ""; }
        else cur += ch;
      }
      out.push(cur); return out.map((s) => s.trim());
    };
    return lines.map(parseLine);
  };

  // guess field mapping from header names
  const guessField = (h) => {
    const s = h.toLowerCase();
    if (/(enunciad|pregunt|question|front)/.test(s)) return "Enunciado";
    if (/(opci[oó]n|option)\s*a/.test(s)) return "Opción A";
    if (/(opci[oó]n|option)\s*b/.test(s)) return "Opción B";
    if (/(opci[oó]n|option)\s*c/.test(s)) return "Opción C";
    if (/(opci[oó]n|option)\s*d/.test(s)) return "Opción D";
    if (/(tipo|type)/.test(s)) return "Tipo";
    if (/(respuesta|answer|correct|back)/.test(s)) return "Respuesta correcta";
    if (/(dificult|difficul|nivel)/.test(s)) return "Dificultad";
    if (/(etiq|tag|categor)/.test(s)) return "Etiquetas";
    if (/(explica|explan)/.test(s)) return "Explicación";
    if (/(referen|fuente|ref\b|loc)/.test(s)) return "Referencia";
    return "Ignorar";
  };
  const FIELDS = ["Enunciado", "Tipo", "Respuesta correcta", "Opción A", "Opción B", "Opción C", "Opción D", "Dificultad", "Etiquetas", "Explicación", "Referencia", "Ignorar"];

  const handleFile = (file) => {
    if (!file) return;
    setError(""); setFileName(file.name); setNativeQs(null); setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target.result || "");
      try {
        if (file.name.toLowerCase().endsWith(".json")) {
          const data = JSON.parse(text);
          const arr = Array.isArray(data) ? data : (data.preguntas || data.questions || (data.data && data.data.questions) || []);
          if (!arr.length) throw new Error("vacío");
          if (arr[0] && arr[0].q !== undefined && arr[0].answer !== undefined) {
            // formato nativo de EstudioPro: sin mapeo de columnas
            setNativeQs(arr);
            setRows(arr.map((o) => [String(o.q || "")]));
            setHeaders(["Enunciado"]);
            if (arr[0].subject && SUBJECTS.includes(arr[0].subject)) setDestSubj(arr[0].subject);
            if (arr[0].ord) setDestOrd(String(arr[0].ord));
            setStep(3);
            return;
          }
          const hs = Object.keys(arr[0]);
          setHeaders(hs);
          setRows(arr.map((o) => hs.map((h) => String(o[h] ?? ""))));
          setMap(hs.map(guessField));
        } else {
          const matrix = parseCSV(text);
          if (matrix.length < 2) throw new Error("vacío");
          setHeaders(matrix[0]);
          setRows(matrix.slice(1));
          setMap(matrix[0].map(guessField));
        }
        setStep(2);
      } catch {
        setError("No se pudo leer el archivo. Verifica que sea un CSV o JSON válido con encabezados.");
      }
    };
    reader.readAsText(file);
  };

  // bancos incluidos en la app (empaquetados con la PWA, funcionan offline)
  const [banks, setBanks] = React.useState([]);
  const [bankBusy, setBankBusy] = React.useState("");
  React.useEffect(() => {
    if (import.meta.env && import.meta.env.MODE === "test") return; // sin red en pruebas
    let alive = true;
    try {
      fetch("data/bancos.json").then((r) => r.ok ? r.json() : [])
        .then((list) => { if (alive && Array.isArray(list)) setBanks(list); })
        .catch(() => { /* sin manifiesto: se oculta la sección */ });
    } catch { /* entorno sin fetch relativo (tests) */ }
    return () => { alive = false; };
  }, []);
  const loadBank = (b) => {
    setBankBusy(b.file); setError("");
    Promise.resolve()
      .then(() => fetch("data/" + b.file))
      .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then((arr) => {
        if (!Array.isArray(arr) || !arr.length) throw new Error("vacío");
        const list = arr.filter((o) => o.q && String(o.q).length > 3).map((o) => ({
          subject: (o.subject && SUBJECTS.includes(o.subject)) ? o.subject : (b.materia || destSubj),
          ord: o.ord || "", loc: o.loc || "", type: o.type || "OM", dif: o.dif || "medio",
          status: "nuevo", tags: o.tags || [], q: o.q, options: o.options, answer: o.answer,
          explain: o.explain || "", ref: o.ref || "" }));
        const res = EPStore.addQuestions(list);
        setFileName(b.nombre);
        setResult({ detected: arr.length, valid: list.length, ...res });
        setStep(4);
        toast && toast(res.added + " preguntas importadas" + (res.skipped ? " · " + res.skipped + " duplicadas omitidas" : ""), "ok");
      })
      .catch(() => setError("No se pudo cargar el banco incluido. Revisa tu conexión e inténtalo de nuevo."))
      .finally(() => setBankBusy(""));
  };

  const loadSample = () => {
    const sample = "enunciado,tipo,respuesta,opcion a,opcion b,opcion c,opcion d,dificultad,etiquetas\n" +
      '"¿Cómo se clasifican los delitos según la voluntad del agente?",OM,"Intencionales y no intencionales","Intencionales y no intencionales","Graves y no graves","Comunes y federales","Dolosos y de querella",medio,"cjm;delitos"\n' +
      '"El arresto es un correctivo disciplinario.",VF,Verdadero,,,,,fácil,"disciplina"\n' +
      '"Explica el deber esencial de un jefe según el RGDM.",AB,"Velar por instrucción y disciplina",,,,,difícil,"rgdm;deberes"';
    setFileName("ejemplo_legislacion.csv"); setNativeQs(null); setResult(null);
    const matrix = parseCSV(sample);
    setHeaders(matrix[0]); setRows(matrix.slice(1)); setMap(matrix[0].map(guessField)); setStep(2);
  };

  const qCol = map.indexOf("Enunciado");
  const valid = nativeQs
    ? nativeQs.filter((o) => o.q && String(o.q).length > 3).length
    : rows.filter((r) => { const t = qCol >= 0 ? r[qCol] : r[0]; return t && t.length > 3; }).length;

  // construye preguntas desde filas CSV/JSON genérico según el mapeo
  const buildFromRows = () => {
    const get = (r, name) => { const i = map.indexOf(name); return i >= 0 ? (r[i] || "").trim() : ""; };
    return rows.map((r) => {
      const q = get(r, "Enunciado"); if (!q || q.length <= 3) return null;
      const opts = ["Opción A", "Opción B", "Opción C", "Opción D"].map((f) => get(r, f)).filter(Boolean);
      const ansTxt = get(r, "Respuesta correcta");
      let type = (get(r, "Tipo") || "").toUpperCase().trim();
      let options, answer;
      if (opts.length >= 2) {
        options = opts;
        const ix = opts.findIndex((o) => o.toLowerCase() === ansTxt.toLowerCase());
        answer = ix >= 0 ? ix : 0;
        type = type || "OM";
      } else if (type === "VF" || /^(verdadero|falso)$/i.test(ansTxt)) {
        options = ["Verdadero", "Falso"];
        answer = /^falso$/i.test(ansTxt) ? 1 : 0;
        type = "VF";
      } else {
        options = undefined; answer = ansTxt; type = type || "AB";
      }
      let dif = (get(r, "Dificultad") || "medio").toLowerCase();
      if (!["fácil", "medio", "difícil"].includes(dif)) dif = "medio";
      return { subject: destSubj, ord: destOrd, loc: "", type, dif, status: "nuevo",
        tags: (get(r, "Etiquetas") || "").split(/[;,]/).map((s) => s.trim()).filter(Boolean),
        q, options, answer, explain: get(r, "Explicación"), ref: get(r, "Referencia") };
    }).filter(Boolean);
  };

  const doImport = () => {
    const list = nativeQs
      ? nativeQs.filter((o) => o.q && String(o.q).length > 3).map((o) => ({
          subject: (o.subject && SUBJECTS.includes(o.subject)) ? o.subject : destSubj,
          ord: o.ord || destOrd, loc: o.loc || "", type: o.type || "OM", dif: o.dif || "medio",
          status: "nuevo", tags: o.tags || [], q: o.q, options: o.options, answer: o.answer,
          explain: o.explain || "", ref: o.ref || "" }))
      : buildFromRows();
    const res = EPStore.addQuestions(list);
    setResult({ detected: rows.length, valid: list.length, ...res });
    setStep(4);
    toast && toast(res.added + " preguntas importadas" + (res.skipped ? " · " + res.skipped + " duplicadas omitidas" : ""), "ok");
  };

  return (
    <React.Fragment>
      <SectionHead icon="⇪" title="Importar banco de preguntas" desc="CSV · JSON · banco incluido — o usa la plantilla de ejemplo" />

      <div className="stepper">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={"step" + (i + 1 === step ? " is-on" : "") + (i + 1 < step ? " is-done" : "")} onClick={() => (i + 1 < step) && setStep(i + 1)}>
              <span className="step-n">{i + 1 < step ? "✓" : i + 1}</span><span className="step-l">{s}</span>
            </div>
            {i < steps.length - 1 && <span className="step-line"></span>}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <Panel idx="01" title="Selecciona el archivo">
          <input ref={fileRef} type="file" accept=".csv,.json,.txt" style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])} />
          <div className="drop" onClick={() => fileRef.current && fileRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("is-over"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("is-over")}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("is-over"); handleFile(e.dataTransfer.files[0]); }}>
            <div className="drop-ic">⇪</div>
            <div className="drop-t">Arrastra un archivo aquí o haz clic para seleccionar</div>
            <div className="drop-s">Formatos: .csv · .json — la primera fila debe contener los encabezados</div>
            <div className="drop-formats">
              <span className="ffmt">CSV</span><span className="ffmt">JSON</span><span className="ffmt">Texto</span>
            </div>
          </div>
          {error && <div className="import-error">⚠ {error}</div>}
          <div className="form-actions" style={{ justifyContent: "space-between" }}>
            <button className="btn" onClick={loadSample}>Usar plantilla de ejemplo</button>
            <button className="btn btn-accent" onClick={() => fileRef.current && fileRef.current.click()}>Seleccionar archivo</button>
          </div>
          <div className="imp-hint">⚠ Las preguntas duplicadas (mismo enunciado) se detectan y omiten automáticamente al importar.</div>
        </Panel>
      )}

      {step === 1 && banks.length > 0 && (
        <Panel idx="02" title="Banco incluido en la app" meta="sin archivo · funciona offline">
          {banks.map((b) => (
            <div className="set-row" key={b.file}>
              <div>
                <div className="set-label">{b.nombre}</div>
                <div className="set-desc">{b.n} preguntas{b.desc ? " · " + b.desc : ""}</div>
              </div>
              <button className="btn btn-sm btn-accent" disabled={bankBusy === b.file} onClick={() => loadBank(b)}>
                {bankBusy === b.file ? "Cargando…" : "Cargar " + b.n + " preguntas ▸"}
              </button>
            </div>
          ))}
        </Panel>
      )}

      {step === 2 && (
        <Panel idx="02" title="Asignar columnas" meta={fileName + " · " + rows.length + " filas detectadas"}>
          <div className="map-grid">
            {headers.map((h, i) => (
              <div className="map-row" key={i}>
                <span className="map-src">{h} <em className="map-sample">{rows[0] && rows[0][i] ? "“" + rows[0][i].slice(0, 24) + "”" : ""}</em></span>
                <span className="map-arrow">→</span>
                <select className="input input-sm" aria-label={"Mapear columna " + (i + 1)} value={map[i] || "Ignorar"} onChange={(e) => setMap((m) => { const n = m.slice(); n[i] = e.target.value; return n; })}>
                  {FIELDS.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="form-actions"><button className="btn" onClick={() => setStep(1)}>‹ Atrás</button><button className="btn btn-accent" onClick={() => setStep(3)}>Continuar ▸</button></div>
        </Panel>
      )}

      {step === 3 && (
        <React.Fragment>
          <Panel idx="03" title="Destino y previsualización" meta={rows.length + " filas · " + valid + " válidas" + (nativeQs ? " · formato EstudioPro" : "")}>
            <div className="form-3">
              <div className="field"><label>Materia{nativeQs ? " (si la pregunta no trae)" : ""}</label>
                <select className="input" aria-label="Materia de destino" value={destSubj} onChange={(e) => setDestSubj(e.target.value)}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div className="field"><label>Ordenamiento / Manual</label>
                <input className="input" placeholder="p. ej. Manual de Ciberseguridad y Ciberdefensa" value={destOrd} onChange={(e) => setDestOrd(e.target.value)} /></div>
              <div className="field"><label>Estado inicial</label><select className="input" aria-label="Estado inicial" disabled><option>Nuevas (sin estudiar)</option></select></div>
            </div>
            <table className="tbl tbl-mini import-prev">
              <thead><tr><th>Enunciado</th><th>Estado</th></tr></thead>
              <tbody>
                {rows.slice(0, 6).map((r, i) => {
                  const t = nativeQs ? r[0] : (qCol >= 0 ? r[qCol] : r[0]);
                  const ok = t && t.length > 3;
                  return (
                    <tr key={i}>
                      <td className="t-q">{t}</td>
                      <td><span className={"st st-" + (ok ? "ok" : "imp")}><i className="st-dot"></i>{ok ? "Válida" : "Revisar"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > 6 && <div className="import-more">+ {rows.length - 6} filas más…</div>}
          </Panel>
          <div className="form-actions"><button className="btn" onClick={() => setStep(nativeQs ? 1 : 2)}>‹ Atrás</button><button className="btn btn-accent" onClick={doImport}>Importar {valid} preguntas ▸</button></div>
        </React.Fragment>
      )}

      {step === 4 && result && (
        <Panel idx="✓" title="Importación completada">
          <div className="import-done">
            <div className="import-done-ic">✓</div>
            <div className="import-done-t">{result.added} preguntas importadas</div>
            <div className="res-tags" style={{ justifyContent: "center", marginTop: "14px" }}>
              <span className="res-pill"><b>{result.detected}</b> detectadas</span>
              <span className="res-pill res-ok"><b>{result.added}</b> añadidas</span>
              <span className="res-pill"><b>{result.skipped}</b> duplicadas omitidas</span>
              <span className="res-pill res-bad"><b>{result.detected - result.valid}</b> con errores</span>
            </div>
            <div className="form-actions" style={{ justifyContent: "center", marginTop: "20px" }}>
              <button className="btn" onClick={() => { setStep(1); setFileName(""); setHeaders([]); setRows([]); setNativeQs(null); setResult(null); }}>Importar otro</button>
              <button className="btn btn-accent" onClick={() => go("banco")}>Ver en el banco ▸</button>
            </div>
          </div>
        </Panel>
      )}
    </React.Fragment>
  );
}


// Componentes exportados como módulo ES (ya no se publican en window.*; app/merged/pruebas los importan).
export { Inicio, MateriaDetalle, Config, MateriasBody, CategoriasBody, EstadisticasBody, ImportarBody };
