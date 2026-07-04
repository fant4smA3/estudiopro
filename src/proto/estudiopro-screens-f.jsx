/* EstudioPro · Prototipo — Pantallas nuevas (F): Cronómetro, Apuntes, Audio, Generador IA, Tutor IA. */
const { useGo: useGoF, PageHead: PageHeadF, Panel: PanelF, EmptyState: EmptyStateF } = window;

const fSubjects = () => Object.keys(window.SUBJECT_COLORS || {});
const fmtDur = (secs) => {
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
};
const fmtMin = (secs) => {
  const m = Math.round(secs / 60);
  if (m < 60) return m + " min";
  return Math.floor(m / 60) + " h " + (m % 60) + " min";
};

/* ============================ CRONÓMETRO (Pomodoro + registro real) ============================ */
function Cronometro() {
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = fSubjects();
  const PRESETS = { enfoque: 25, corto: 5, largo: 15 };
  const LS = "estudiopro:timer";

  const [mode, setMode] = React.useState("enfoque");
  const [mins, setMins] = React.useState(25);
  const [left, setLeft] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const [subject, setSubject] = React.useState(SUBJECTS[0]);
  const [label, setLabel] = React.useState("");
  const startRef = React.useRef(null);       // marca de inicio del segmento en curso
  const accRef = React.useRef(0);            // segundos de enfoque acumulados esta sesión (sin guardar)
  const tickRef = React.useRef(null);

  // rehidratar sesión en curso tras refresco
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.mode) { setMode(d.mode); setMins(d.mins); }
      if (typeof d.left === "number") setLeft(d.left);
      if (d.subject) setSubject(d.subject);
      if (d.label) setLabel(d.label);
      accRef.current = d.acc || 0;
    } catch (e) {}
  }, []);
  const persist = (extra) => {
    try { localStorage.setItem(LS, JSON.stringify({ mode, mins, left, subject, label, acc: accRef.current, ...extra })); } catch (e) {}
  };

  // motor del cronómetro
  React.useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    tickRef.current = setInterval(() => {
      setLeft((prev) => {
        const nx = prev - 1;
        if (mode === "enfoque") accRef.current += 1;
        if (nx <= 0) { finish(); return 0; }
        return nx;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [running, mode]);

  React.useEffect(() => { persist(); }, [left, mode, subject, label]);

  const pickMode = (m) => {
    clearInterval(tickRef.current); setRunning(false);
    setMode(m); setMins(PRESETS[m]); setLeft(PRESETS[m] * 60);
  };
  const setCustom = (v) => {
    const n = Math.max(1, Math.min(120, v || 1));
    setMins(n); if (!running) setLeft(n * 60);
  };
  const finish = () => {
    clearInterval(tickRef.current); setRunning(false);
    if (mode === "enfoque") {
      saveSession(accRef.current);
      try { new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=").play(); } catch (e) {}
    } else {
      window.toast && window.toast("Descanso terminado — ¡a estudiar!", "ok");
    }
    setLeft(mins * 60);
  };
  const saveSession = (secs) => {
    if (secs < 30) { window.toast && window.toast("Sesión muy corta, no se registró", "warn"); accRef.current = 0; return; }
    window.EPStore.logTime({ subject, label: label || "Sesión de enfoque", seconds: secs });
    window.toast && window.toast("Registrados " + fmtMin(secs) + " en " + subject, "ok");
    accRef.current = 0; persist({ acc: 0 });
  };
  const guardarYSeguir = () => {
    clearInterval(tickRef.current); setRunning(false);
    saveSession(accRef.current);
    setLeft(mins * 60);
  };

  const total = mins * 60;
  const frac = total > 0 ? (total - left) / total : 0;
  const R = 92, C = 2 * Math.PI * R;
  const color = mode === "enfoque" ? subjColor(subject) : "var(--ok)";

  // resumen de hoy
  const today = new Date().toISOString().slice(0, 10);
  const logs = st.timeLog || [];
  const todayLogs = logs.filter((t) => t.date === today);
  const todaySecs = todayLogs.reduce((a, t) => a + (t.seconds || 0), 0);
  const week = {};
  logs.forEach((t) => { week[t.subject] = (week[t.subject] || 0) + (t.seconds || 0); });
  const weekTop = Object.entries(week).sort((a, b) => b[1] - a[1]);
  const weekMax = weekTop.length ? weekTop[0][1] : 1;

  return (
    <main className="main">
      <PageHeadF title="Cronómetro de estudio" sub="Pomodoro con registro de tiempo real por materia"
        crumbs={[["Inicio", "inicio"], "Cronómetro"]} />
      <div className="cron-grid">
        <section className="panel cron-timer-panel">
          <div className="cron-modes">
            {[["enfoque", "Enfoque"], ["corto", "Descanso 5"], ["largo", "Descanso 15"]].map(([k, lbl]) => (
              <button key={k} className={"cron-mode" + (mode === k ? " is-on" : "")} onClick={() => pickMode(k)}>{lbl}</button>
            ))}
          </div>
          <div className="cron-ring-wrap">
            <svg viewBox="0 0 220 220" className="cron-ring">
              <circle cx="110" cy="110" r={R} fill="none" stroke="var(--soft-line)" strokeWidth="12" />
              <circle cx="110" cy="110" r={R} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 110 110)"
                style={{ transition: "stroke-dashoffset .8s linear" }} />
            </svg>
            <div className="cron-ring-c">
              <div className="cron-time">{fmtDur(left)}</div>
              <div className="cron-mode-lbl">{mode === "enfoque" ? "Enfoque" : "Descanso"}</div>
            </div>
          </div>
          <div className="cron-ctrls">
            {!running
              ? <button className="btn btn-accent btn-lg" onClick={() => setRunning(true)}>▶ Iniciar</button>
              : <button className="btn btn-lg" onClick={() => { clearInterval(tickRef.current); setRunning(false); }}>⏸ Pausar</button>}
            <button className="btn btn-lg" onClick={() => { clearInterval(tickRef.current); setRunning(false); setLeft(mins * 60); }}>↺ Reiniciar</button>
            {mode === "enfoque" && <button className="btn btn-lg" onClick={guardarYSeguir} disabled={accRef.current < 30}>✓ Guardar sesión</button>}
          </div>
          {mode === "enfoque" && (
            <div className="cron-cfg">
              <label className="cron-cfg-row">
                <span>Duración</span>
                <input type="range" min="5" max="60" step="5" value={mins} onChange={(e) => setCustom(+e.target.value)} disabled={running} />
                <b>{mins} min</b>
              </label>
              <div className="cron-cfg-row">
                <span>Materia</span>
                <select className="input" aria-label="Materia" value={subject} onChange={(e) => setSubject(e.target.value)}>
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="cron-cfg-row">
                <span>Tema</span>
                <input className="input" placeholder="Capítulo o tema (opcional)" value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
            </div>
          )}
        </section>

        <div className="cron-side">
          <PanelF idx="Σ" title="Hoy" meta={todayLogs.length + " sesión(es)"}>
            <div className="cron-today">
              <div className="cron-today-big">{fmtMin(todaySecs)}</div>
              <div className="cron-today-sub">tiempo enfocado hoy</div>
            </div>
            {todayLogs.length === 0
              ? <div className="cron-empty">Aún no registras tiempo hoy. Inicia un Pomodoro.</div>
              : <div className="cron-log">
                  {todayLogs.map((t) => (
                    <div className="cron-log-row" key={t.id}>
                      <span className="cron-dot" style={{ background: subjColor(t.subject) }}></span>
                      <div className="cron-log-txt"><b>{t.label}</b><span>{t.subject}</span></div>
                      <span className="cron-log-min">{fmtMin(t.seconds)}</span>
                      <button className="cron-x" onClick={() => window.EPStore.deleteTime(t.id)} aria-label="Eliminar registro">×</button>
                    </div>
                  ))}
                </div>}
          </PanelF>
          <PanelF idx="◷" title="Tiempo por materia" meta="acumulado">
            {weekTop.length === 0
              ? <div className="cron-empty">Sin datos todavía.</div>
              : <div className="cron-bars">
                  {weekTop.map(([s, secs]) => (
                    <div className="cron-bar-row" key={s}>
                      <span className="cron-bar-lbl">{s}</span>
                      <div className="cron-bar-track"><div className="cron-bar-fill" style={{ width: (secs / weekMax * 100) + "%", background: subjColor(s) }}></div></div>
                      <span className="cron-bar-v">{fmtMin(secs)}</span>
                    </div>
                  ))}
                </div>}
          </PanelF>
        </div>
      </div>
    </main>
  );
}

/* ============================ APUNTES (hub global de notas) ============================ */
function Apuntes() {
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = fSubjects();
  const { PromptDialog } = window;
  const [q, setQ] = React.useState("");
  const [editKey, setEditKey] = React.useState(null);
  const [draft, setDraft] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  const notes = st.notes || {};
  const entries = Object.entries(notes).filter(([, v]) => (v || "").trim() !== "");
  const guessSubject = (key) => SUBJECTS.find((s) => key.includes(s)) || null;
  const filtered = entries.filter(([k, v]) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (k + " " + v).toLowerCase().includes(needle);
  });

  const startEdit = (k) => { setEditKey(k); setDraft(notes[k] || ""); };
  const save = () => { window.EPStore.setNote(editKey, draft); setEditKey(null); window.toast && window.toast("Apunte guardado", "ok"); };
  const del = (k) => { window.EPStore.setNote(k, ""); window.toast && window.toast("Apunte eliminado", "ok"); };

  return (
    <main className="main">
      <PageHeadF title="Apuntes" sub="Todas tus notas del material físico, en un solo lugar"
        crumbs={[["Inicio", "inicio"], "Apuntes"]}
        actions={<button className="btn btn-accent" onClick={() => setAdding(true)}>+ Nuevo apunte</button>} />
      <div className="notas-hub-bar">
        <input className="input search-input" placeholder="Buscar en tus apuntes…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="notas-hub-count">{entries.length} apunte(s)</span>
      </div>
      {filtered.length === 0
        ? <EmptyStateF icon="✎" title={entries.length === 0 ? "Aún no tienes apuntes" : "Sin resultados"}
            desc={entries.length === 0 ? "Crea apuntes desde aquí o desde el detalle de cada materia." : "Prueba con otro término de búsqueda."}
            actions={entries.length === 0 && <button className="btn btn-accent" onClick={() => setAdding(true)}>+ Crear primer apunte</button>} />
        : <div className="notas-hub-grid">
            {filtered.map(([k, v]) => {
              const subj = guessSubject(k);
              const color = subj ? subjColor(subj) : "var(--accent)";
              const isEd = editKey === k;
              return (
                <section className="notas-card" key={k} style={{ borderTop: "3px solid " + color }}>
                  <div className="notas-card-h">
                    <span className="notas-card-t">{k}</span>
                    {subj && <span className="notas-card-tag" style={{ color, background: "color-mix(in srgb," + color + " 12%,#fff)" }}>{subj}</span>}
                  </div>
                  {isEd
                    ? <div>
                        <textarea className="input textarea" style={{ minHeight: "120px" }} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus></textarea>
                        <div className="form-actions" style={{ marginTop: "8px" }}>
                          <button className="btn" onClick={() => setEditKey(null)}>Cancelar</button>
                          <button className="btn btn-accent" onClick={save}>Guardar</button>
                        </div>
                      </div>
                    : <div>
                        <p className="notas-card-body">{v}</p>
                        <div className="notas-card-f">
                          <button className="link-btn" onClick={() => startEdit(k)}>Editar</button>
                          <button className="link-btn link-danger" onClick={() => del(k)}>Eliminar</button>
                        </div>
                      </div>}
                </section>
              );
            })}
          </div>}
      <PromptDialog open={adding} title="Nuevo apunte"
        fields={[
          { key: "subject", label: "Materia", placeholder: SUBJECTS[0], required: true },
          { key: "titulo", label: "Título / capítulo", placeholder: "p. ej. CJM · Libro Primero", required: true },
          { key: "texto", label: "Apunte", type: "textarea", placeholder: "Escribe tu nota…", required: true },
        ]}
        confirmLabel="Guardar apunte"
        onConfirm={(vals) => { window.EPStore.setNote(vals.subject + " · " + vals.titulo, vals.texto); setAdding(false); window.toast && window.toast("Apunte creado", "ok"); }}
        onClose={() => setAdding(false)} />
    </main>
  );
}

/* ============================ TARJETAS EN AUDIO (manos libres) ============================ */
function Audio() {
  const st = window.useStore();
  const subjColor = window.subjColor;
  const SUBJECTS = fSubjects();
  const [subject, setSubject] = React.useState("todas");
  const [i, setI] = React.useState(0);
  const [phase, setPhase] = React.useState("idle"); // idle | front | back
  const [playing, setPlaying] = React.useState(false);
  const [rate, setRate] = React.useState(1);
  const [revealed, setRevealed] = React.useState(false);
  const [supported] = React.useState(() => typeof window.speechSynthesis !== "undefined");
  const playingRef = React.useRef(false);
  const iRef = React.useRef(0);

  const deck = React.useMemo(() => {
    const cards = st.cards || [];
    return subject === "todas" ? cards : cards.filter((c) => c.subject === subject);
  }, [st.cards, subject]);

  React.useEffect(() => { setI(0); iRef.current = 0; setRevealed(false); }, [subject]);
  React.useEffect(() => { iRef.current = i; }, [i]);
  React.useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, []);

  const speak = (text) => new Promise((res) => {
    if (!supported) { setTimeout(res, 700); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-MX"; u.rate = rate;
    const voces = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("es"));
    if (voces[0]) u.voice = voces[0];
    u.onend = res; u.onerror = res;
    window.speechSynthesis.speak(u);
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const runFrom = async (idx) => {
    if (!deck.length) return;
    let k = idx;
    while (playingRef.current && k < deck.length) {
      const c = deck[k];
      setI(k); setRevealed(false); setPhase("front");
      await speak("Frente. " + c.front);
      if (!playingRef.current) return;
      await wait(1400);
      if (!playingRef.current) return;
      setPhase("back"); setRevealed(true);
      await speak("Respuesta. " + (c.back || "sin respuesta registrada"));
      if (!playingRef.current) return;
      await wait(900);
      k++;
    }
    if (k >= deck.length) { stop(); window.toast && window.toast("Fin del mazo de audio", "ok"); }
  };
  const play = () => { if (!deck.length) return; playingRef.current = true; setPlaying(true); runFrom(iRef.current); };
  const stop = () => { playingRef.current = false; setPlaying(false); if (supported) window.speechSynthesis.cancel(); setPhase("idle"); };
  const jump = (d) => {
    const was = playingRef.current; stop();
    const nx = Math.max(0, Math.min(deck.length - 1, iRef.current + d));
    setI(nx); iRef.current = nx; setRevealed(false);
    if (was) setTimeout(play, 120);
  };

  // --- dictado por voz (responder hablando) ---
  const [heard, setHeard] = React.useState(null);   // { text, ok }
  const [listening, setListening] = React.useState(false);
  const recRef = React.useRef(null);
  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
  const dictar = () => {
    if (!SR) { window.toast && window.toast("Tu navegador no soporta dictado por voz", "warn"); return; }
    stop();
    const rec = new SR(); recRef.current = rec; rec.lang = "es-MX"; rec.interimResults = false; rec.maxAlternatives = 1;
    setListening(true); setHeard(null);
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const back = norm(deck[iRef.current] && deck[iRef.current].back);
      const said = norm(text);
      const words = back.split(/\s+/).filter((w) => w.length > 3);
      const hit = words.length ? words.filter((w) => said.includes(w)).length / words.length : 0;
      const ok = hit >= 0.5 || (back && said.includes(back)) || (said && back.includes(said));
      setHeard({ text, ok });
      setRevealed(true);
      if (supported) { const u = new SpeechSynthesisUtterance((ok ? "Correcto. " : "Repasa. ") + (deck[iRef.current].back || "")); u.lang = "es-MX"; u.rate = rate; window.speechSynthesis.speak(u); }
    };
    rec.onerror = () => { setListening(false); window.toast && window.toast("No se captó el audio, intenta de nuevo", "warn"); };
    rec.onend = () => setListening(false);
    try { rec.start(); } catch (e) { setListening(false); }
  };
  React.useEffect(() => { setHeard(null); }, [i, subject]);

  const cur = deck[i];
  const color = cur ? subjColor(cur.subject) : "var(--accent)";

  return (
    <main className="main">
      <PageHeadF title="Tarjetas en audio" sub="Repasa escuchando — ideal para trayectos y manos libres"
        crumbs={[["Inicio", "inicio"], "Tarjetas en audio"]} />
      {!supported && <div className="audio-warn">⚠ Tu navegador no soporta síntesis de voz. El repaso avanzará por temporizador sin audio.</div>}
      <div className="audio-bar">
        <select className="input" aria-label="Materia" value={subject} onChange={(e) => setSubject(e.target.value)}>
          <option value="todas">Todas las materias</option>
          {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="audio-rate">Velocidad
          <input type="range" min="0.7" max="1.5" step="0.1" value={rate} onChange={(e) => setRate(+e.target.value)} />
          <b>{rate.toFixed(1)}×</b>
        </label>
        <span className="audio-count">{deck.length ? (i + 1) + " / " + deck.length : "0"}</span>
      </div>
      {!deck.length
        ? <EmptyStateF icon="🎧" title="No hay tarjetas en esta materia" desc="Crea tarjetas o cambia el filtro." />
        : <section className={"audio-card" + (playing ? " is-playing" : "")} style={{ "--c": color }}>
            <span className="audio-badge" style={{ background: color }}>{cur.subject}</span>
            <div className="audio-phase">{phase === "back" ? "Respuesta" : "Frente"}</div>
            <div className="audio-front">{cur.front}</div>
            <div className={"audio-back" + (revealed ? " is-shown" : "")}>{revealed ? (cur.back || "—") : "· · ·"}</div>
            {heard && <div className={"audio-heard" + (heard.ok ? " ok" : " bad")}><span>{heard.ok ? "✓ Bien" : "✕ Repasa"}</span> escuché: “{heard.text}”</div>}
            {playing && <div className="audio-eq"><i></i><i></i><i></i><i></i></div>}
          </section>}
      <div className="audio-ctrls">
        <button className="btn btn-lg" onClick={() => jump(-1)} disabled={!deck.length}>⏮ Anterior</button>
        {!playing
          ? <button className="btn btn-accent btn-lg" onClick={play} disabled={!deck.length}>▶ Reproducir</button>
          : <button className="btn btn-lg" onClick={stop}>⏸ Pausar</button>}
        <button className={"btn btn-lg" + (listening ? " btn-accent" : "")} onClick={dictar} disabled={!deck.length}>{listening ? "● Escuchando…" : "🎤 Dictar respuesta"}</button>
        <button className="btn btn-lg" onClick={() => jump(1)} disabled={!deck.length}>Siguiente ⏭</button>
      </div>
    </main>
  );
}

Object.assign(window, { Cronometro, Apuntes, Audio });
