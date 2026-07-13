// @vitest-environment happy-dom
/* Regresión de accesibilidad: axe-core (reglas estructurales) sobre las pantallas clave.
   Solo se ejecutan reglas que no dependen de layout/pintado real (el entorno de pruebas no
   calcula geometría ni colores): nombres accesibles, labels, roles y atributos ARIA.
   El contraste y los objetivos táctiles se auditan aparte, en navegador (ver REPORTE-QA.md). */
import { describe, it, expect, beforeAll } from "vitest";
import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { createPortal } from "react-dom";
import axe from "axe-core";

let W;

beforeAll(async () => {
  window.React = React;
  window.ReactDOM = { ...ReactDOMClient, createPortal };
  window.__epSnapshot = null; // arranque limpio → siembra datos de ejemplo
  await import("./proto/index.js");
  W = window;
});

const mount = async (node) => {
  const div = document.createElement("div");
  document.body.appendChild(div);
  const root = ReactDOMClient.createRoot(div);
  await new Promise((res) => {
    root.render(node);
    setTimeout(res, 30);
  });
  return div;
};

// reglas estructurales (sin geometría): las que la auditoría QA llevó a 0
const RUN_ONLY = [
  "label", "select-name", "button-name", "input-button-name", "link-name",
  "aria-required-attr", "aria-valid-attr", "aria-valid-attr-value", "aria-roles",
  "aria-allowed-attr", "duplicate-id-aria", "image-alt", "list", "listitem",
];

const SCREENS = ["Inicio", "Categorias", "Materias", "Banco", "Tarjetas", "TarjetaForm", "PreguntaForm", "Cuestionarios", "Simulacro", "Estadisticas", "Config", "Importar", "SesionHoy", "RepasoPrioritario", "Perfil", "Respaldo", "ReparaDistractores"];

describe("EstudioPro — a11y estructural (axe)", () => {
  for (const name of SCREENS) {
    it("pantalla " + name + " sin violaciones axe", async () => {
      const C = W[name];
      expect(C, name + " no existe en window").toBeTypeOf("function");
      const div = await mount(
        React.createElement(W.NavCtx.Provider, { value: () => {} }, React.createElement(C))
      );
      const res = await axe.run(div, {
        runOnly: { type: "rule", values: RUN_ONLY },
        resultTypes: ["violations"],
      });
      const resumen = res.violations.map((v) => v.id + ": " + v.nodes.length + " nodo(s) — " + v.nodes.slice(0, 3).map((n) => n.html).join(" | "));
      expect(resumen, name + " tiene violaciones:\n" + resumen.join("\n")).toEqual([]);
    });
  }
});
