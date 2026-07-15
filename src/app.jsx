/* Shell de la aplicación (portado del prototipo). Requiere que ./proto/index.js
   ya se haya evaluado (todos los componentes viven en window.*). */
const {
  NavCtx, Topbar, Side, Inicio, MateriaDetalle, Config,
  Banco, PreguntaForm, Tarjetas, TarjetaForm, Quiz, Resultado, Perfil,
  ToastHost, Calendario, SimRun, RepasoPrioritario, SesionHoy, Onboarding,
  CreaRapido, HojaRepaso, CommandPalette,
  MateriasHub, Cuaderno, Practica, PracticaSimulacro, Mantenimiento, MiPreparacion, EstadisticasHub, Datos,
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor,
} = window;

const React = window.React;

/* ruta → entrada del menú que se resalta. Las rutas viejas son alias de las
   12 páginas fusionadas (el contenido vive como secciones dentro de ellas). */
const ACTIVE = {
  materia: "materias", categorias: "materias", mapa: "materias",
  glosario: "cuaderno", bitacora: "cuaderno",
  pregunta: "banco", "crear-rapido": "banco", imprimir: "banco",
  tarjeta: "tarjetas", repaso: "tarjetas",
  cuestionarios: "practica", simulacro: "practica", resultado: "practica", quiz: "practica", simrun: "practica",
  duplicados: "mantenimiento", distractores: "mantenimiento", reportes: "mantenimiento",
  plan: "calendario",
  inteligencia: "preparacion", simulador: "preparacion",
  evolucion: "estadisticas", habitos: "estadisticas", confusiones: "estadisticas", informe: "estadisticas",
  importar: "datos", respaldo: "datos",
  alertas: "config",
  sesion: "inicio", metas: "inicio",
};

const TWEAK_DEFAULTS = { estilo: "sereno", acento: "#1B8FBE", densidad: "compacta", tema: "claro" };

const ESTILO_CLS = { sereno: "opt-sereno", "nítido": "opt-nitido", "vívido": "opt-vivido" };

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState("inicio");
  const [navOpen, setNavOpen] = React.useState(false);
  const go = React.useCallback((r) => setRoute(r), []);
  React.useEffect(() => { const m = document.querySelector(".main"); if (m) m.scrollTop = 0; setNavOpen(false); }, [route]);
  const screens = {
    // 12 páginas destino
    inicio: Inicio, materias: MateriasHub, cuaderno: Cuaderno, banco: Banco, tarjetas: Tarjetas,
    practica: Practica, calendario: Calendario, mantenimiento: Mantenimiento,
    preparacion: MiPreparacion, estadisticas: EstadisticasHub, datos: Datos, config: Config,
    // flujos y detalle (no son destinos del menú)
    materia: MateriaDetalle, pregunta: PreguntaForm, "crear-rapido": CreaRapido, tarjeta: TarjetaForm,
    quiz: Quiz, resultado: Resultado, simrun: SimRun, repaso: RepasoPrioritario,
    sesion: SesionHoy, onboarding: Onboarding, imprimir: HojaRepaso, perfil: Perfil,
    // alias de rutas viejas → página fusionada que contiene esa sección
    categorias: MateriasHub, mapa: MateriasHub, glosario: Cuaderno, bitacora: Cuaderno,
    cuestionarios: Practica, simulacro: PracticaSimulacro,
    duplicados: Mantenimiento, distractores: Mantenimiento, reportes: Mantenimiento,
    inteligencia: MiPreparacion, simulador: MiPreparacion,
    evolucion: EstadisticasHub, habitos: EstadisticasHub, confusiones: EstadisticasHub, informe: EstadisticasHub,
    importar: Datos, respaldo: Datos, alertas: Config, metas: Inicio, plan: Calendario,
  };
  const Screen = screens[route] || Inicio;
  const estiloCls = ESTILO_CLS[t.estilo] || "opt-sereno";
  const densCls = t.densidad === "compacta" ? "dens-compact" : (t.densidad === "amplia" ? "dens-comfy" : "");
  const [focus, setFocus] = React.useState(false);
  const dark = t.tema === "oscuro";
  const accentStyle = { "--accent": t.acento, "--accent-press": "color-mix(in srgb, " + t.acento + " 80%, #000)", "--accent-tint": "color-mix(in srgb, " + t.acento + " 16%, transparent)" };
  return (
    <div className={"proapp soft mist source ff-grotesk " + estiloCls + " " + densCls + (dark ? " theme-dark" : "") + (focus ? " is-focus" : "")} style={accentStyle}>
      <NavCtx.Provider value={go}>
        <Topbar onMenu={() => setNavOpen(true)} onFocus={() => setFocus((f) => !f)} onDark={() => setTweak("tema", dark ? "claro" : "oscuro")} dark={dark} />
        <div className="shell">
          <div className={"nav-scrim" + (navOpen ? " is-open" : "")} onClick={() => setNavOpen(false)}></div>
          <Side active={ACTIVE[route] || route} open={navOpen} />
          <Screen />
        </div>
        <CommandPalette />
      </NavCtx.Provider>
      <ToastHost />
      <TweaksPanel>
        <TweakSection label="Apariencia" />
        <TweakRadio label="Estilo" value={t.estilo} options={["sereno", "nítido", "vívido"]} onChange={(v) => setTweak("estilo", v)} />
        <TweakColor label="Acento" value={t.acento} options={["#1B8FBE", "#2F73CE", "#1F8A5B", "#5A55D6"]} onChange={(v) => setTweak("acento", v)} />
        <TweakRadio label="Densidad" value={t.densidad} options={["compacta", "regular", "amplia"]} onChange={(v) => setTweak("densidad", v)} />
        <TweakRadio label="Tema" value={t.tema} options={["claro", "oscuro"]} onChange={(v) => setTweak("tema", v)} />
      </TweaksPanel>
    </div>
  );
}
