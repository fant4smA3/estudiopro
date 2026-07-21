/* EstudioPro — Páginas fusionadas.
   Cada página compone varios cuerpos (XxxBody) en un solo lugar, con SectionHead
   como separador. Los nombres viejos quedan como alias para rutas y pruebas. */
import React from "react";
import { PageHead as PageHeadM } from "./estudiopro-ui.jsx";
import { CategoriasBody, Config, EstadisticasBody, ImportarBody, Inicio, MateriasBody } from "./estudiopro-screens-a.jsx";
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

Object.assign(window, {
  MateriasHub, Cuaderno, Practica, PracticaSimulacro, Mantenimiento, MiPreparacion, EstadisticasHub, Datos,
  // alias de compatibilidad: rutas viejas y pruebas siguen usando estos nombres
  Materias: MateriasHub, Categorias: MateriasHub, MapaTemario: MateriasHub,
  Glosario: Cuaderno, Bitacora: Cuaderno,
  Cuestionarios: Practica, Simulacro: PracticaSimulacro,
  Duplicados: Mantenimiento, ReparaDistractores: Mantenimiento, Reportes: Mantenimiento,
  Preparacion: MiPreparacion, Inteligencia: MiPreparacion, Simulador: MiPreparacion,
  Estadisticas: EstadisticasHub, Evolucion: EstadisticasHub, Habitos: EstadisticasHub, Confusiones: EstadisticasHub, Informe: EstadisticasHub,
  Importar: Datos, Respaldo: Datos,
  Alertas: Config, // Configuración absorbe Alertas (sección al final)
  Metas: Inicio,   // las metas semanales viven en Inicio
});

// Exportaciones ES (Fase 4): app.jsx/merged consumen por import; se conserva window.* (doble publicación) para las pruebas.
export { MateriasHub, Cuaderno, Practica, PracticaSimulacro, Mantenimiento, MiPreparacion, EstadisticasHub, Datos };
