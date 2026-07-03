/* EstudioPro · Prototipo — shell interactivo + helpers.
   La navegación se hace con NavCtx (función go(route)).
   CSS vive en el HTML (clases proapp/soft/mist/source/ff-grotesk). */

const NavCtx = React.createContext(() => {});
const useGo = () => React.useContext(NavCtx);

const NAV = [
  { g: "estudio", items: [
    ["inicio", "Inicio"],
    ["categorias", "Categorías"],
    ["materias", "Materias"],
    ["cronometro", "Cronómetro"],
    ["audio", "Tarjetas en audio"],
    ["notas", "Apuntes"],
    ["imprimir", "Hoja de repaso"],
    ["reto", "Reto diario"],
    ["examen-adaptativo", "Examen adaptativo"],
    ["podcast", "Podcast de repaso"],
    ["glosario", "Glosario"],
    ["metas", "Metas semanales"],
    ["bitacora", "Bitácora"],
  ]},
  { g: "banco", items: [
    ["banco", "Banco de preguntas"],
    ["crear-rapido", "Crear preguntas"],
    ["generador", "Generador IA"],
    ["duplicados", "Duplicados"],
    ["distractores", "Reparar distractores"],
    ["tarjetas", "Tarjetas"],
    ["repaso", "Repaso prioritario"],
    ["cuestionarios", "Cuestionarios"],
    ["simulacro", "Simulacro"],
    ["calendario", "Calendario"],
    ["plan", "Editor del plan"],
    ["tutor", "Tutor de dudas"],
    ["reportes", "Reportes"],
  ]},
  { g: "progreso", items: [
    ["preparacion", "Índice de preparación"],
    ["inteligencia", "Inteligencia"],
    ["estadisticas", "Estadísticas"],
    ["evolucion", "Evolución simulacros"],
    ["mapa", "Mapa del temario"],
    ["confusiones", "Matriz de confusión"],
    ["simulador", "Simulador de nota"],
    ["informe", "Informe semanal"],
    ["habitos", "Hábitos"],
  ]},
  { g: "gestión", items: [
    ["importar", "Importar"],
    ["importar-ia", "Importar con IA"],
    ["respaldo", "Respaldo"],
    ["alertas", "Alertas"],
    ["config", "Configuración"],
  ]},
];

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
  const SUBJECTS = Object.keys(window.SUBJECT_COLORS || {});
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
                <span className="gsearch-kind" style={{ color: window.subjColor(r.subject) }}>{r.kind}</span>
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
  return (
    <nav className={"side" + (open ? " is-open" : "")}>
      {NAV.map((sec) => (
        <div className="side-grp" key={sec.g}>
          <div className="side-grp-h">{sec.g}</div>
          {sec.items.map(([id, label]) => (
            <a key={id}
               className={"side-item" + (id === active ? " is-active" : "")}
               onClick={() => go(id)} role="button" tabIndex={0}
               onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(id); } }}>
              <span className="side-tick" aria-hidden="true"></span>
              <span className="side-label">{label}</span>
            </a>
          ))}
        </div>
      ))}
      <SideFoot />
    </nav>
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

/* Toast (ephemeral feedback) */
function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast">{msg}</div>;
}

/* Toast host + global window.toast(msg, tone) */
(function () {
  let pushFn = null;
  window.toast = (msg, tone) => { if (pushFn) pushFn(msg, tone || "ok"); };
  window.ToastHost = function ToastHost() {
    const [items, setItems] = React.useState([]);
    React.useEffect(() => {
      pushFn = (msg, tone) => {
        const id = Date.now() + Math.random();
        setItems((xs) => [...xs, { id, msg, tone }]);
        setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2600);
      };
      return () => { pushFn = null; };
    }, []);
    return (
      <div className="toast-host">
        {items.map((t) => (
          <div key={t.id} className={"toast toast-" + t.tone}>
            <span className="toast-ic">{t.tone === "danger" ? "⚠" : t.tone === "warn" ? "!" : "✓"}</span>
            <span className="toast-msg">{t.msg}</span>
          </div>
        ))}
      </div>
    );
  };
})();

Object.assign(window, {
  NavCtx, useGo, NAV, Topbar, Side, Crumbs, PageHead, Panel, Diff, Switch,
  EmptyState, Modal, ConfirmDialog, PromptDialog, Toast, ToastHost: window.ToastHost,
});
