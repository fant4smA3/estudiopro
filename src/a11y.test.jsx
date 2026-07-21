// @vitest-environment happy-dom
/* Regresión de accesibilidad: axe-core (reglas estructurales) sobre las pantallas clave.
   Solo se ejecutan reglas que no dependen de layout/pintado real (el entorno de pruebas no
   calcula geometría ni colores): nombres accesibles, labels, roles y atributos ARIA.
   El contraste y los objetivos táctiles se auditan aparte, en navegador (ver REPORTE-QA.md). */
import { describe, it, expect, beforeAll } from "vitest";
import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { flushSync } from "react-dom";
import axe from "axe-core";

let W, SCREEN;

beforeAll(async () => {
  window.__epSnapshot = null; // arranque limpio → siembra datos de ejemplo
  await import("./proto/index.js");
  W = window; // NavCtx sigue publicado en window (bus de runtime)
  // los componentes se resuelven por import (ya no por window.*)
  const [a, b, c, d, m] = await Promise.all([
    import("./proto/estudiopro-screens-a.jsx"),
    import("./proto/estudiopro-screens-b.jsx"),
    import("./proto/estudiopro-screens-c.jsx"),
    import("./proto/estudiopro-screens-d.jsx"),
    import("./proto/estudiopro-merged.jsx"),
  ]);
  SCREEN = {
    Inicio: a.Inicio, Config: a.Config,
    Banco: b.Banco, Tarjetas: b.Tarjetas, TarjetaForm: b.TarjetaForm, PreguntaForm: b.PreguntaForm,
    Perfil: c.Perfil,
    Calendario: d.Calendario, SesionHoy: d.SesionHoy, RepasoPrioritario: d.RepasoPrioritario,
    MateriasHub: m.MateriasHub, Cuaderno: m.Cuaderno, Practica: m.Practica, PracticaSimulacro: m.PracticaSimulacro,
    Mantenimiento: m.Mantenimiento, MiPreparacion: m.MiPreparacion, EstadisticasHub: m.EstadisticasHub, Datos: m.Datos,
  };
});

/* commit síncrono + desmontaje por prueba (ver smoke.test.jsx) */
const mount = async (node) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = ReactDOMClient.createRoot(div);
  flushSync(() => root.render(node));
  await new Promise((res) => setTimeout(res, 20));
  return { div, root };
};

// reglas estructurales (sin geometría): las que la auditoría QA llevó a 0
const RUN_ONLY = [
  "label", "select-name", "button-name", "input-button-name", "link-name",
  "aria-required-attr", "aria-valid-attr", "aria-valid-attr-value", "aria-roles",
  "aria-allowed-attr", "duplicate-id-aria", "image-alt", "list", "listitem",
];

const SCREENS = ["Inicio", "MateriasHub", "Cuaderno", "Banco", "Tarjetas", "Practica", "PracticaSimulacro", "Calendario", "Mantenimiento", "MiPreparacion", "EstadisticasHub", "Datos", "Config", "TarjetaForm", "PreguntaForm", "SesionHoy", "RepasoPrioritario", "Perfil"];

describe("EstudioPro — a11y estructural (axe)", () => {
  for (const name of SCREENS) {
    it("pantalla " + name + " sin violaciones axe", async () => {
      const C = SCREEN[name];
      expect(C, name + " no exportado").toBeTypeOf("function");
      const { div, root } = await mount(
        React.createElement(W.NavCtx.Provider, { value: () => {} }, React.createElement(C))
      );
      expect(div.querySelector("main.main"), name + " no renderizó <main>").toBeTruthy();
      const res = await axe.run(div, {
        runOnly: { type: "rule", values: RUN_ONLY },
        resultTypes: ["violations"],
      });
      const resumen = res.violations.map((v) => v.id + ": " + v.nodes.length + " nodo(s) — " + v.nodes.slice(0, 3).map((n) => n.html).join(" | "));
      expect(resumen, name + " tiene violaciones:\n" + resumen.join("\n")).toEqual([]);
      root.unmount(); div.remove();
    });
  }
});
