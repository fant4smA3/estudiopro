/* EstudioPro — Páginas fusionadas.
   Cada página compone varios cuerpos (XxxBody) en un solo lugar, con SectionHead
   como separador. Los nombres viejos quedan como alias para rutas y pruebas. */
import React from "react";
import { PageHead as PageHeadM } from "./estudiopro-ui.jsx";
import { CategoriasBody, EstadisticasBody, ImportarBody, MateriasBody } from "./estudiopro-screens-a.jsx";
import { CuestionariosBody } from "./estudiopro-screens-c.jsx";
import { InteligenciaBody, SimulacroBody } from "./estudiopro-screens-d.jsx";
import { EvolucionBody, MapaTemarioBody, PreparacionBody, ReportesBody, RespaldoBody } from "./estudiopro-screens-h.jsx";
import { InformeBody } from "./estudiopro-screens-i.jsx";
import { BitacoraBody, DuplicadosBody, HabitosBody } from "./estudiopro-screens-j.jsx";
import { ConfusionesBody, GlosarioBody, SimuladorBody } from "./estudiopro-screens-k.jsx";
import { ReparaDistractoresBody } from "./estudiopro-screens-l.jsx";

/* Materias = Materias · Mapa del temario · Categorías */
function MateriasHub() {
  return (
    <main className="main">
      <PageHeadM title="Materias" sub="Tus materias, el mapa del temario y las categorías, en un solo lugar" crumbs={[["Inicio", "inicio"], "Materias"]} />
      <MateriasBody />
      <MapaTemarioBody />
      <CategoriasBody />
    </main>
  );
}

/* Cuaderno = Glosario · Bitácora */
function Cuaderno() {
  return (
    <main className="main">
      <PageHeadM title="Cuaderno" sub="Glosario de términos y bitácora de estudio" crumbs={[["Inicio", "inicio"], "Cuaderno"]} />
      <GlosarioBody />
      <BitacoraBody />
    </main>
  );
}

/* Práctica = Cuestionario · Simulacro (un modo a la vez: son flujos distintos) */
function Practica({ modo: modoInicial }) {
  const [modo, setModo] = React.useState(modoInicial || "cuestionario");
  return (
    <main className="main">
      <PageHeadM title="Práctica" sub="Cuestionarios por materia y simulacros del examen completo" crumbs={[["Inicio", "inicio"], "Práctica"]}
        actions={<div className="seg seg-tabs">
          <span className={"segchip" + (modo === "cuestionario" ? " is-on" : "")} onClick={() => setModo("cuestionario")}>Cuestionario</span>
          <span className={"segchip" + (modo === "simulacro" ? " is-on" : "")} onClick={() => setModo("simulacro")}>Simulacro</span>
        </div>} />
      {modo === "cuestionario" ? <CuestionariosBody /> : <SimulacroBody />}
    </main>
  );
}
const PracticaSimulacro = () => <Practica modo="simulacro" />;

/* Mantenimiento del banco = Duplicados · Reparar distractores · Reportes */
function Mantenimiento() {
  return (
    <main className="main">
      <PageHeadM title="Mantenimiento del banco" sub="Duplicados, distractores por reparar y reportes de reactivos" crumbs={[["Banco de preguntas", "banco"], "Mantenimiento"]} />
      <DuplicadosBody />
      <ReparaDistractoresBody />
      <ReportesBody />
    </main>
  );
}

/* Mi preparación = Índice · Inteligencia · Simulador de nota */
function MiPreparacion() {
  return (
    <main className="main">
      <PageHeadM title="Mi preparación" sub="¿Voy a pasar? Índice, análisis y proyección de nota en una sola página" crumbs={[["Inicio", "inicio"], "Mi preparación"]} />
      <PreparacionBody />
      <InteligenciaBody />
      <SimuladorBody />
    </main>
  );
}

/* Estadísticas = Resumen · Evolución · Hábitos · Errores · Informe */
function EstadisticasHub() {
  return (
    <main className="main" tabIndex={0} aria-label="Estadísticas de estudio, región desplazable">
      <PageHeadM title="Estadísticas" sub="Resumen, simulacros, hábitos, errores e informe semanal" crumbs={[["Inicio", "inicio"], "Estadísticas"]} />
      <EstadisticasBody />
      <EvolucionBody />
      <HabitosBody />
      <ConfusionesBody />
      <InformeBody />
    </main>
  );
}

/* Datos = Importar · Respaldo y copias */
function Datos() {
  return (
    <main className="main">
      <PageHeadM title="Datos" sub="Importa bancos de preguntas y administra tus respaldos" crumbs={[["Inicio", "inicio"], "Datos"]} />
      <ImportarBody />
      <RespaldoBody />
    </main>
  );
}


// Componentes exportados como módulo ES (ya no se publican en window.*; app/merged/pruebas los importan).
export { MateriasHub, Cuaderno, Practica, PracticaSimulacro, Mantenimiento, MiPreparacion, EstadisticasHub, Datos };
