// @vitest-environment happy-dom
/* Prueba de humo: monta la app completa y cada pantalla clave de la Fase 1,
   verificando que rendericen sin errores con el store real (datos semilla). */
import { describe, it, expect, beforeAll } from "vitest";
import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { createPortal } from "react-dom";

let App, W;

beforeAll(async () => {
  window.React = React;
  window.ReactDOM = { ...ReactDOMClient, createPortal };
  window.__epSnapshot = null; // arranque limpio → siembra datos de ejemplo
  await import("./proto/index.js");
  App = (await import("./app.jsx")).default;
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

describe("EstudioPro — humo", () => {
  it("la app completa monta y muestra el Inicio", async () => {
    const div = await mount(React.createElement(App));
    expect(div.querySelector(".proapp")).toBeTruthy();
    expect(div.querySelector(".main")).toBeTruthy();
    expect(div.textContent).toContain("Resumen");
  });

  it("el store siembra el banco de ejemplo", () => {
    const st = W.EPStore.get();
    expect(st.questions.length).toBeGreaterThan(10);
    expect(st.cards.length).toBe(st.questions.length);
  });

  it("SM-2 conectado: calificar una tarjeta fija próxima fecha", () => {
    const st = W.EPStore.get();
    const id = st.questions[0]._id;
    W.EPStore.gradeCard(id, "medio");
    const srs = W.EPStore.get().cardSrs[id];
    expect(srs.sm2).toBeTruthy();
    expect(srs.sm2.interval).toBe(1);
    expect(srs.nivel).toBe("medio");
  });

  it("dueCards y pronóstico funcionan", () => {
    expect(Array.isArray(W.dueCards())).toBe(true);
    const f = W.dueForecast7();
    expect(f.length).toBe(7);
  });

  const SCREENS = ["Inicio", "Categorias", "Materias", "Banco", "Tarjetas", "TarjetaForm", "PreguntaForm", "Cuestionarios", "Simulacro", "Estadisticas", "Config", "Importar", "SesionHoy", "RepasoPrioritario", "Perfil", "Respaldo"];
  for (const name of SCREENS) {
    it("pantalla " + name + " renderiza", async () => {
      const C = W[name];
      expect(C, name + " no existe en window").toBeTypeOf("function");
      const div = await mount(
        React.createElement(W.NavCtx.Provider, { value: () => {} }, React.createElement(C))
      );
      expect(div.querySelector("main.main"), name + " no renderizó <main>").toBeTruthy();
    });
  }
});
