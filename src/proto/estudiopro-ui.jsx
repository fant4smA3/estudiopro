/* EstudioPro · Prototipo — shell interactivo + helpers.
   La navegación se hace con NavCtx (función go(route)).
   CSS vive en el HTML (clases proapp/soft/mist/source/ff-grotesk). */

const NavCtx = React.createContext(() => {});
const useGo = () => React.useContext(NavCtx);

/* Menú simplificado: las páginas afines están FUSIONADAS en una sola página
   (secciones con SectionHead). Las rutas viejas siguen vivas como alias — ver app.jsx. */
const NAV = [
  { g: "estudio", items: [
    ["inicio", "Inicio"],
    ["materias", "Materias"],
    ["cuaderno", "Cuaderno"],
  ]},
  { g: "banco", items: [
    ["banco", "Banco de preguntas"],
    ["tarjetas", "Tarjetas"],
    ["practica", "Práctica"],
    ["calendario", "Calendario y plan"],
    ["mantenimiento", "Mantenimiento del banco"],
  ]},
  { g: "progreso", items: [
    ["preparacion", "Mi preparación"],
    ["estadisticas", "Estadísticas"],
  ]},
  { g: "gestión", items: [
    ["datos", "Datos"],
    ["config", "Configuración"],
  ]},
];

/* Encabezado de sección dentro de páginas fusionadas (varias pantallas → una página) */
function SectionHead({ icon, title, desc, actions }) {
  return (
    <div className="sec-head">
      <div className="sec-head-l">
        {icon && <span className="sec-ic" aria-hidden="true">{icon}</span>}
        <div>
          <h2 className="sec-t">{title}</h2>
          {desc && <div className="sec-d">{desc}</div>}
        </div>
      </div>
      {actions && <div className="sec-a">{actions}</div>}
    </div>
  );
}
window.SectionHead = SectionHead;
/* Secciones y páginas fuera del menú pero vivas (accesibles por botones, alias y ⌘K) */
window.NAV_EXTRA = [
  ["crear-rapido", "Crear preguntas"],
  ["imprimir", "Hoja de repaso"],
  ["metas", "Metas semanales"],
  ["repaso", "Repaso prioritario"],
  ["categorias", "Categorías"],
  ["mapa", "Mapa del temario"],
  ["glosario", "Glosario"],
  ["bitacora", "Bitácora"],
  ["simulacro", "Simulacro"],
  ["distractores", "Reparar distractores"],
  ["reportes", "Reportes del banco"],
  ["inteligencia", "Inteligencia de estudio"],
  ["simulador", "Simulador de nota"],
  ["evolucion", "Evolución de simulacros"],
  ["habitos", "Hábitos de estudio"],
  ["confusiones", "Matriz de confusión"],
  ["informe", "Informe semanal"],
  ["respaldo", "Respaldo y copias"],
  ["alertas", "Alertas"],
];

/* Registro de etiquetas por id (fuente de verdad de qué páginas existen) */
const NAV_LABELS = {};
NAV.forEach((g) => g.items.forEach(([id, label]) => { NAV_LABELS[id] = label; }));

/* Layout por defecto del menú: lista plana de entradas grupo/ítem */
function sidebarDefault() {
  const out = [];
  NAV.forEach((g) => { out.push({ t: "grp", label: g.g }); g.items.forEach(([id]) => out.push({ t: "item", id })); });
  return out;
}
/* Layout efectivo: el guardado (reconciliado contra las páginas que existen) o el por defecto */
function sidebarLayout() {
  const st = window.EPStore ? window.EPStore.get() : null;
  const saved = st && Array.isArray(st.sidebar) ? st.sidebar : null;
  if (!saved) return sidebarDefault();
  // descarta ítems de páginas que ya no existen; conserva grupos/separadores/espacios
  return saved.filter((e) => e && e.t && (e.t !== "item" || NAV_LABELS[e.id])).map((e) => ({ ...e }));
}
window.NAV_LABELS = NAV_LABELS;
window.sidebarDefault = sidebarDefault;
window.sidebarLayout = sidebarLayout;

function Topbar({ onMenu, onFocus, onDark, dark }) {
  const go = useGo();
  return (
    <header className="topbar">
      <button className="topbar-menu" onClick={onMenu} aria-label="Abrir menú de navegación">
        <span></span><span></span><span></span>
      </button>
      <div className="brand" onClick={() => go("inicio")} role="button">
        <span className="brand-mark">EP</span>
        <span className="brand-name">EstudioPro</span>
        <span className="brand-tag">v1.0 · LOCAL</span>
      </div>
      <GlobalSearch />
      <div className="qbar">
        <button className="btn qbar-opt" onClick={() => window.dispatchEvent(new Event("ep:cmdk"))} title="Paleta de comandos (Ctrl/Cmd+K)">⌘K</button>
        <button className="btn topbar-ico" onClick={onFocus} title="Modo concentración" aria-label="Modo concentración">◎</button>
        <button className="btn topbar-ico" onClick={onDark} title="Modo oscuro" aria-label="Modo oscuro">{dark ? "☀" : "☾"}</button>
        <button className="btn btn-accent" onClick={() => { window.__epEditQ = null; go("pregunta"); }}>+ Pregunta</button>
        <button className="btn qbar-opt" onClick={() => { window.__epEditC = null; go("tarjeta"); }}>+ Tarjeta</button>
        <span className="qbar-rule qbar-opt"></span>
        <TopbarStreak />
        <TopbarAvatar onClick={() => go("perfil")} />
      </div>
    </header>
  );
}

/* racha real (días consecutivos con actividad) e iniciales del aspirante */
function TopbarStreak() {
  const st = window.useStore ? window.useStore() : null;
  const streak = st && window.realStreak ? window.realStreak() : 0;
  return <span className="streak qbar-opt"><b>{streak}</b> día{streak === 1 ? "" : "s"}</span>;
}
function TopbarAvatar({ onClick }) {
  const st = window.useStore ? window.useStore() : null;
  const nombre = ((st && st.plan.nombre) || "Aspirante").trim();
  const ini = nombre.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "A";
  return <button className="topbar-av" onClick={onClick} title="Perfil">{ini}</button>;
}

function GlobalSearch() {
  const go = useGo();
  const st = window.useStore ? window.useStore() : { questions: [], cards: [] };
  const SUBJECTS = window.subjectNames();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef(null);
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") { e.preventDefault(); inputRef.current && inputRef.current.focus(); setOpen(true); } if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); window.removeEventListener("keydown", onKey); };
  }, []);
  const needle = q.trim().toLowerCase();
  let results = [];
  if (needle) {
    const subj = SUBJECTS.filter((s) => s.toLowerCase().includes(needle)).map((s) => ({ kind: "Materia", label: s, subject: s, go: () => { window.__epSubject = s; go("materia"); } }));
    const qs = (st.questions || []).filter((x) => (x.q + " " + x.tags.join(" ") + " " + x.subject).toLowerCase().includes(needle)).slice(0, 5).map((x) => ({ kind: "Pregunta", label: x.q, subject: x.subject, go: () => { window.EPStore.setNav({ search: x.q }); go("banco"); } }));
    const cs = (st.cards || []).filter((x) => (x.front + " " + x.back).toLowerCase().includes(needle)).slice(0, 4).map((x) => ({ kind: "Tarjeta", label: x.front, subject: x.subject, go: () => { window.__epSubject = x.subject; go("tarjetas"); } }));
    results = [...subj, ...qs, ...cs];
  }
  const totalItems = (st.questions || []).length + (st.cards || []).length;
  const pick = (r) => { r.go(); setOpen(false); setQ(""); };
  return (
    <div className="gsearch" ref={boxRef}>
      <span className="gsearch-key">/</span>
      <input ref={inputRef} className="gsearch-in" placeholder="Buscar preguntas, tarjetas, materias…"
        value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      <span className="gsearch-meta">{totalItems} ítems</span>
      {open && needle && (
        <div className="gsearch-pop">
          {results.length === 0
            ? <div className="gsearch-empty">Sin resultados para “{q}”</div>
            : results.map((r, i) => (
              <div className="gsearch-res" key={i} onClick={() => pick(r)}>
                <span className="gsearch-kind" style={{ color: window.subjTextColor(r.subject) }}>{r.kind}</span>
                <span className="gsearch-label">{r.label}</span>
                <span className="gsearch-subj">{r.subject}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function Side({ active, open }) {
  const go = useGo();
  if (window.useStore) window.useStore(); // re-render al cambiar el layout guardado
  const [editOpen, setEditOpen] = React.useState(false);
  React.useEffect(() => {
    const h = () => setEditOpen(true);
    window.addEventListener("ep:editnav", h);
    return () => window.removeEventListener("ep:editnav", h);
  }, []);
  const layout = window.sidebarLayout ? window.sidebarLayout() : [];
  return (
    <nav className={"side" + (open ? " is-open" : "")}>
      <div className="side-list">
        {layout.map((e, i) => {
          if (e.t === "grp") return <div className="side-grp-h" key={i}>{e.label}</div>;
          if (e.t === "sep") return <div className="side-sep" key={i} aria-hidden="true"></div>;
          if (e.t === "gap") return <div className="side-gap" key={i} aria-hidden="true"></div>;
          const label = NAV_LABELS[e.id];
          if (!label) return null;
          return (
            <a key={i}
               className={"side-item" + (e.id === active ? " is-active" : "")}
               onClick={() => go(e.id)} role="button" tabIndex={0}
               onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(e.id); } }}>
              <span className="side-tick" aria-hidden="true"></span>
              <span className="side-label">{label}</span>
            </a>
          );
        })}
      </div>
      <div className="side-tools">
        <button className="side-edit" onClick={() => window.dispatchEvent(new Event("ep:editnav"))}>
          <span aria-hidden="true">✎</span> Personalizar menú
        </button>
      </div>
      <SideFoot />
      <SidebarEditor open={editOpen} onClose={() => setEditOpen(false)} />
    </nav>
  );
}

/* Editor del menú lateral: reordenar, ocultar páginas y agregar/quitar separadores y espacios */
function SidebarEditor({ open, onClose }) {
  const [draft, setDraft] = React.useState([]);
  React.useEffect(() => { if (open) setDraft(window.sidebarLayout()); }, [open]);
  const known = NAV_LABELS;
  const usedIds = new Set(draft.filter((e) => e.t === "item").map((e) => e.id));
  const hidden = Object.keys(known).filter((id) => !usedIds.has(id));

  const move = (i, d) => setDraft((a) => {
    const j = i + d; if (j < 0 || j >= a.length) return a;
    const b = a.slice(); const t = b[i]; b[i] = b[j]; b[j] = t; return b;
  });
  const removeAt = (i) => setDraft((a) => a.filter((_, k) => k !== i));
  const append = (entry) => setDraft((a) => [...a, entry]);
  const setLabel = (i, v) => setDraft((a) => a.map((e, k) => (k === i ? { ...e, label: v } : e)));
  const save = () => { window.EPStore.setSidebar(draft); window.toast && window.toast("Menú actualizado", "ok"); onClose && onClose(); };

  const badge = { grp: "grupo", sep: "separador", gap: "espacio", item: "ítem" };
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-h">Personalizar menú lateral</div>
      <div className="modal-b navedit">
        <p className="navedit-hint">Reordena con ▲ ▼ y oculta con ✕. Agrega <b>separadores</b> (línea) o <b>espacios</b> (hueco) para agrupar visualmente. Las páginas ocultas siguen disponibles desde ⌘K.</p>
        <div className="navedit-list">
          {draft.length === 0 && <div className="navedit-empty">El menú está vacío. Agrega páginas desde abajo.</div>}
          {draft.map((e, i) => (
            <div className={"navedit-row nr-" + e.t} key={i}>
              <div className="navedit-move">
                <button type="button" className="navedit-arrow" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
                <button type="button" className="navedit-arrow" aria-label="Bajar" disabled={i === draft.length - 1} onClick={() => move(i, 1)}>▼</button>
              </div>
              <span className={"navedit-badge b-" + e.t}>{badge[e.t]}</span>
              {e.t === "grp"
                ? <input className="input navedit-in" value={e.label || ""} onChange={(ev) => setLabel(i, ev.target.value)} aria-label="Nombre del grupo" />
                : e.t === "sep" ? <span className="navedit-name navedit-rule" aria-hidden="true"></span>
                : e.t === "gap" ? <span className="navedit-name navedit-dim">— hueco vertical —</span>
                : <span className="navedit-name">{known[e.id] || e.id}</span>}
              <button type="button" className="navedit-del" aria-label={e.t === "item" ? "Ocultar página" : "Quitar"} onClick={() => removeAt(i)}>✕</button>
            </div>
          ))}
        </div>
        <div className="navedit-add">
          <button type="button" className="btn btn-sm" onClick={() => append({ t: "sep" })}>+ Separador</button>
          <button type="button" className="btn btn-sm" onClick={() => append({ t: "gap" })}>+ Espacio</button>
          <button type="button" className="btn btn-sm" onClick={() => append({ t: "grp", label: "nuevo grupo" })}>+ Grupo</button>
        </div>
        {hidden.length > 0 && (
          <div className="navedit-pool">
            <div className="navedit-pool-h">Páginas ocultas · toca para añadir</div>
            <div className="navedit-chips">
              {hidden.map((id) => (
                <button type="button" className="navedit-chip" key={id} onClick={() => append({ t: "item", id })}>+ {known[id]}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="modal-f navedit-f">
        <button type="button" className="btn" onClick={() => setDraft(window.sidebarDefault())}>Restablecer</button>
        <span className="navedit-spacer"></span>
        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-accent" onClick={save}>Guardar</button>
      </div>
    </Modal>
  );
}

/* avance global real: % de tarjetas dominadas sobre el banco */
function SideFoot() {
  const st = window.useStore ? window.useStore() : null;
  const total = st ? st.questions.length : 0;
  const dom = st ? st.cards.filter((c) => c.nivel === "dominado").length : 0;
  const pct = total ? Math.round(dom / total * 100) : 0;
  return (
    <div className="side-foot">
      <div className="side-foot-h">avance global</div>
      <div className="mini-bar"><i style={{ width: pct + "%" }}></i></div>
      <div className="side-foot-n"><b>{pct}%</b> · {dom.toLocaleString()} / {total.toLocaleString()}</div>
    </div>
  );
}

function Crumbs({ path }) {
  const go = useGo();
  return (
    <div className="crumbs">
      {path.map((p, i) => {
        const [label, route] = Array.isArray(p) ? p : [p, null];
        const here = i === path.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="crumb-sep">/</span>}
            <span className={"crumb" + (here ? " is-here" : "") + (route && !here ? " crumb-link" : "")}
                  onClick={() => route && !here && go(route)}
                  role={route && !here ? "button" : undefined}>{label}</span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PageHead({ title, sub, actions, crumbs }) {
  return (
    <header className="page-head-card">
      {crumbs && <Crumbs path={crumbs} />}
      <div className="page-h">
        <div>
          <h1 className="page-title">{title}</h1>
          {sub && <span className="page-sub">{sub}</span>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
    </header>
  );
}

function Panel({ idx, title, meta, action, onAction, children, className, bodyClass }) {
  return (
    <section className={"panel" + (className ? " " + className : "")}>
      <div className="panel-h">
        <div className="panel-h-l">
          {idx && <span className="panel-idx">{idx}</span>}
          <span className="panel-title">{title}</span>
        </div>
        <div className="panel-h-r">
          {meta && <span className="panel-meta">{meta}</span>}
          {action && <span className="panel-act" onClick={onAction} role="button">{action}</span>}
        </div>
      </div>
      <div className={"panel-b" + (bodyClass ? " " + bodyClass : "")}>{children}</div>
    </section>
  );
}

function Diff({ level }) {
  const map = { fácil: "ok", medio: "warn", difícil: "danger" };
  return <span className={"diff diff-" + map[level]}>{level}</span>;
}

/* Toggle switch for settings/forms */
function Switch({ on, onClick, label }) {
  return (
    <button className={"switch" + (on ? " is-on" : "")} onClick={onClick} aria-pressed={on} aria-label={label || "Activar o desactivar"}>
      <i></i>
    </button>
  );
}

/* Empty / done state */
function EmptyState({ icon, title, desc, actions, tone }) {
  return (
    <div className={"empty" + (tone ? " empty-" + tone : "")}>
      <div className="empty-ic" aria-hidden="true">{icon}</div>
      <div className="empty-t">{title}</div>
      {desc && <div className="empty-d">{desc}</div>}
      {actions && <div className="empty-acts">{actions}</div>}
    </div>
  );
}

/* Modal dialog (confirm, etc.) — cierra con Escape y devuelve el foco al abrir/cerrar */
function Modal({ open, onClose, children }) {
  const boxRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose && onClose(); } };
    window.addEventListener("keydown", onKey);
    // foco inicial dentro del diálogo (primer control o el contenedor)
    const t = setTimeout(() => {
      const el = boxRef.current && (boxRef.current.querySelector("input, textarea, select, button") || boxRef.current);
      if (el && el.focus) el.focus();
    }, 30);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(t); if (prev && prev.focus) prev.focus(); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" ref={boxRef} tabIndex={-1} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onClose }) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-h">{title}</div>
      <div className="modal-b">{body}</div>
      <div className="modal-f">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className={"btn " + (danger ? "btn-danger-solid" : "btn-accent")} onClick={onConfirm}>{confirmLabel || "Confirmar"}</button>
      </div>
    </Modal>
  );
}

/* Diálogo con campos de texto (crear categoría / materia / ordenamiento, etc.) */
function PromptDialog({ open, title, fields, confirmLabel, onConfirm, onClose }) {
  const [vals, setVals] = React.useState({});
  React.useEffect(() => { if (open) setVals({}); }, [open]);
  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));
  const req = (fields || []).filter((f) => f.required);
  const ready = req.every((f) => (vals[f.key] || "").trim() !== "");
  const submit = () => { if (ready) { onConfirm(vals); } };
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-h">{title}</div>
      <div className="modal-b">
        <div className="form-stack">
          {(fields || []).map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}{f.required && <span className="req-star"> *</span>}</label>
              {f.type === "textarea"
                ? <textarea className="input textarea" rows="2" placeholder={f.placeholder || ""} value={vals[f.key] || ""} onChange={(e) => set(f.key, e.target.value)}></textarea>
                : <input className="input" placeholder={f.placeholder || ""} value={vals[f.key] || ""} autoFocus={f.required} onChange={(e) => set(f.key, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ready) submit(); }} />}
            </div>
          ))}
        </div>
      </div>
      <div className="modal-f">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-accent" disabled={!ready} onClick={submit}>{confirmLabel || "Crear"}</button>
      </div>
    </Modal>
  );
}

/* Selector de color: muestras + color personalizado */
function ColorField({ value, onChange }) {
  const PALETTE = ["#1B8FBE", "#2F73CE", "#2A8A5E", "#A0742A", "#7A57C2", "#C2410C", "#0E7490", "#B83280", "#15803D", "#475569"];
  return (
    <div className="colorfield">
      <div className="colorfield-swatches">
        {PALETTE.map((c) => (
          <button key={c} type="button" className={"colorsw" + (value === c ? " is-on" : "")} style={{ background: c }}
            onClick={() => onChange(c)} aria-label={"Color " + c} aria-pressed={value === c}></button>
        ))}
      </div>
      <label className="colorfield-custom"><input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Color personalizado" /><span>Personalizado</span></label>
    </div>
  );
}

/* Diálogo genérico para crear/editar un elemento de taxonomía (nombre / descripción / color) */
function TaxEditDialog({ open, title, initial, showName = true, showDesc = false, showColor = true, confirmLabel, onConfirm, onClose }) {
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [color, setColor] = React.useState("#1B8FBE");
  React.useEffect(() => { if (open) { setName((initial && initial.name) || ""); setDesc((initial && initial.desc) || ""); setColor((initial && initial.color) || "#1B8FBE"); } }, [open]);
  const ready = !showName || name.trim() !== "";
  const submit = () => { if (ready) onConfirm({ name: name.trim(), desc: desc.trim(), color }); };
  return (
    <Modal open={open} onClose={onClose}>
      <div className="modal-h">{title}</div>
      <div className="modal-b">
        <div className="form-stack">
          {showName && <div className="field"><label>Nombre</label><input className="input" value={name} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ready) submit(); }} /></div>}
          {showDesc && <div className="field"><label>Descripción</label><textarea className="input textarea" rows="2" value={desc} onChange={(e) => setDesc(e.target.value)}></textarea></div>}
          {showColor && <div className="field"><label>Color</label><ColorField value={color} onChange={setColor} /></div>}
        </div>
      </div>
      <div className="modal-f">
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn btn-accent" disabled={!ready} onClick={submit}>{confirmLabel || "Guardar"}</button>
      </div>
    </Modal>
  );
}

/* Toast (ephemeral feedback) */
function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

/* Toast host + global window.toast(msg, tone, action?)
   action = { label, run }: muestra un botón (p. ej. «Deshacer») y alarga la duración. */
(function () {
  let pushFn = null;
  window.toast = (msg, tone, action) => { if (pushFn) pushFn(msg, tone || "ok", action); };
  window.ToastHost = function ToastHost() {
    const [items, setItems] = React.useState([]);
    React.useEffect(() => {
      pushFn = (msg, tone, action) => {
        const id = Date.now() + Math.random();
        setItems((xs) => [...xs, { id, msg, tone, action }]);
        setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), action ? 6000 : 2600);
      };
      return () => { pushFn = null; };
    }, []);
    const runAction = (t) => {
      try { t.action.run(); } finally { setItems((xs) => xs.filter((x) => x.id !== t.id)); }
    };
    return (
      <div className="toast-host">
        {items.map((t) => (
          <div key={t.id} className={"toast toast-" + t.tone}>
            <span className="toast-ic">{t.tone === "danger" ? "⚠" : t.tone === "warn" ? "!" : "✓"}</span>
            <span className="toast-msg">{t.msg}</span>
            {t.action && <button type="button" className="toast-act" onClick={() => runAction(t)}>{t.action.label}</button>}
          </div>
        ))}
      </div>
    );
  };
})();

Object.assign(window, {
  NavCtx, useGo, NAV, Topbar, Side, Crumbs, PageHead, Panel, Diff, Switch,
  EmptyState, Modal, ConfirmDialog, PromptDialog, ColorField, TaxEditDialog, Toast, ToastHost: window.ToastHost,
});
