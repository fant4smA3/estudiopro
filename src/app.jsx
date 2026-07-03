/* Shell de la aplicación (portado del prototipo). Requiere que ./proto/index.js
   ya se haya evaluado (todos los componentes viven en window.*). */
const {
  NavCtx, Topbar, Side, Inicio, Categorias, Materias, MateriaDetalle, Estadisticas, Config,
  Importar, Banco, PreguntaForm, Tarjetas, TarjetaForm, Quiz, Resultado, Cuestionarios, Perfil,
  ToastHost, Calendario, Simulacro, SimRun, Alertas, RepasoPrioritario, SesionHoy, Onboarding,
  Inteligencia, CreaRapido,
  Cronometro, Apuntes, Audio, Generador, Tutor, Preparacion, Evolucion, MapaTemario, Respaldo, Reportes,
  Informe, HojaRepaso, EditorPlan, CommandPalette,
  ImportarIA, Duplicados, RetoDiario, Habitos, Bitacora,
  ExamenAdaptativo, Confusiones, Metas, Podcast, Glosario, Simulador,
  ReparaDistractores,
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor,
} = window;

const React = window.React;

const ACTIVE = { materia: "materias", pregunta: "banco", tarjeta: "tarjetas", resultado: "cuestionarios", quiz: "cuestionarios", simrun: "simulacro", sesion: "inicio", "crear-rapido": "banco", generador: "generador", tutor: "tutor", reportes: "reportes", plan: "plan", imprimir: "imprimir", informe: "informe", "importar-ia": "importar-ia", duplicados: "duplicados", reto: "reto", habitos: "habitos", bitacora: "bitacora", "examen-adaptativo": "examen-adaptativo", confusiones: "confusiones", metas: "metas", podcast: "podcast", glosario: "glosario", simulador: "simulador" };

const TWEAK_DEFAULTS = { estilo: "sereno", acento: "#1B8FBE", densidad: "compacta", tema: "claro" };

const ESTILO_CLS = { sereno: "opt-sereno", "nítido": "opt-nitido", "vívido": "opt-vivido" };

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState("inicio");
  const [navOpen, setNavOpen] = React.useState(false);
  const go = React.useCallback((r) => setRoute(r), []);
  React.useEffect(() => { const m = document.querySelector(".main"); if (m) m.scrollTop = 0; setNavOpen(false); }, [route]);
  const screens = { inicio: Inicio, categorias: Categorias, materias: Materias, materia: MateriaDetalle, banco: Banco, pregunta: PreguntaForm, "crear-rapido": CreaRapido, tarjetas: Tarjetas, tarjeta: TarjetaForm, cuestionarios: Cuestionarios, quiz: Quiz, resultado: Resultado, importar: Importar, estadisticas: Estadisticas, config: Config, perfil: Perfil, calendario: Calendario, simulacro: Simulacro, simrun: SimRun, alertas: Alertas, repaso: RepasoPrioritario, sesion: SesionHoy, onboarding: Onboarding, inteligencia: Inteligencia, cronometro: Cronometro, notas: Apuntes, audio: Audio, generador: Generador, tutor: Tutor, preparacion: Preparacion, evolucion: Evolucion, mapa: MapaTemario, respaldo: Respaldo, reportes: Reportes, informe: Informe, imprimir: HojaRepaso, plan: EditorPlan, "importar-ia": ImportarIA, duplicados: Duplicados, reto: RetoDiario, habitos: Habitos, bitacora: Bitacora, "examen-adaptativo": ExamenAdaptativo, confusiones: Confusiones, metas: Metas, podcast: Podcast, glosario: Glosario, simulador: Simulador, distractores: ReparaDistractores };
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
