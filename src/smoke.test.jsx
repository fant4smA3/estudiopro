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

  it("addQuestions importa y omite duplicados", () => {
    const before = W.EPStore.get().questions.length;
    const lote = [
      { subject: "Aspecto Técnico", ord: "Manual X", q: "¿Pregunta nueva de importación uno?", type: "OM", options: ["a", "b", "c", "d"], answer: 0 },
      { subject: "Aspecto Técnico", ord: "Manual X", q: "¿Pregunta nueva de importación dos?", type: "OM", options: ["a", "b"], answer: 1 },
    ];
    const r1 = W.EPStore.addQuestions(lote);
    expect(r1.added).toBe(2);
    const r2 = W.EPStore.addQuestions(lote); // mismo lote → todo duplicado
    expect(r2.added).toBe(0);
    expect(r2.skipped).toBe(2);
    expect(W.EPStore.get().questions.length).toBe(before + 2);
  });

  it("el banco real de ciberseguridad es importable (278 preguntas)", () => {
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.cwd() + "/data/ciberseguridad-aspecto-tecnico.json", "utf8"));
    expect(data.length).toBe(278);
    const r = W.EPStore.addQuestions(data);
    // el documento fuente trae 6 preguntas repetidas exactas (misma pregunta y respuesta) → se omiten
    expect(r.added).toBe(272);
    expect(r.skipped).toBe(6);
    data.forEach((q) => {
      expect(q.subject).toBe("Aspecto Técnico");
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
    });
  });

  it("el banco curado empaquetado es válido (sin placeholders, manifiesto consistente)", () => {
    const fs = require("fs");
    const bancos = JSON.parse(fs.readFileSync(process.cwd() + "/public/data/bancos.json", "utf8"));
    expect(bancos.length).toBeGreaterThan(0);
    for (const b of bancos) {
      const data = JSON.parse(fs.readFileSync(process.cwd() + "/public/data/" + b.file, "utf8"));
      expect(data.length, b.file + ": el manifiesto declara " + b.n).toBe(b.n);
      data.forEach((q) => {
        expect(q.q.length).toBeGreaterThan(10);
        expect(q.options.length).toBe(4);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        q.options.forEach((o) => expect(W.epIsPlaceholder(o), b.file + " trae placeholder: " + o).toBe(false));
        expect(new Set(q.options.map(W.epNorm)).size, "opciones repetidas en: " + q.q.slice(0, 60)).toBe(4);
      });
    }
  });

  it("reparar distractores: detecta, sugiere y aplica", () => {
    const r0 = W.EPStore.addQuestions([
      { subject: "Aspecto Técnico", ord: "Manual Y", loc: "Cap. I", q: "¿Concepto base de prueba de reparación?", type: "OM",
        options: ["Protección de activos de información", "Respuesta idéntica", "Distractor 1", "Distractor 2"], answer: 0 },
      { subject: "Aspecto Técnico", ord: "Manual Y", loc: "Cap. I", q: "¿Candidato uno de prueba?", type: "OM",
        options: ["Defensa del ciberespacio nacional", "Gestión de riesgos de información", "Continuidad de operaciones", "Análisis de vulnerabilidades"], answer: 0 },
    ]);
    expect(r0.added).toBe(2);
    const found = W.epScanPlaceholders();
    const mine = found.find((f) => f.q.q === "¿Concepto base de prueba de reparación?");
    expect(mine).toBeTruthy();
    expect(mine.bad).toEqual([1, 2, 3]);
    const sug = W.epRepairSuggest(mine.q, 3, 0);
    expect(sug.length).toBeGreaterThanOrEqual(3);
    sug.forEach((t) => expect(W.epIsPlaceholder(t)).toBe(false));
    expect(new Set(sug.map(W.epNorm)).size).toBe(sug.length); // sin repetidos
    expect(sug.map(W.epNorm)).not.toContain(W.epNorm(mine.q.options[0])); // nunca la correcta
    W.epRepairApply(mine.q, mine.bad, sug);
    const after = W.epScanPlaceholders().find((f) => f.q.q === "¿Concepto base de prueba de reparación?");
    expect(after).toBeFalsy();
    const fixed = W.EPStore.get().questions.find((q) => q.q === "¿Concepto base de prueba de reparación?");
    expect(fixed.options[0]).toBe("Protección de activos de información"); // correcta intacta
  });

  const SCREENS = ["Inicio", "Categorias", "Materias", "Banco", "Tarjetas", "TarjetaForm", "PreguntaForm", "Cuestionarios", "Simulacro", "Estadisticas", "Config", "Importar", "SesionHoy", "RepasoPrioritario", "Perfil", "Respaldo", "ReparaDistractores"];
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
