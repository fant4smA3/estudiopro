/* EstudioPro — arranque de la aplicación.
   1) Fuentes y CSS del sistema de diseño
   2) React como global (los módulos del prototipo lo usan así)
   3) Carga del estado guardado (IndexedDB) ANTES de montar
   4) Carga ordenada de los módulos y render */
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/hanken-grotesk/700.css";
import "@fontsource/hanken-grotesk/800.css";
import "./styles.css";

import React from "react";
import * as ReactDOMClient from "react-dom/client";
import { createPortal } from "react-dom";
import { registerSW } from "virtual:pwa-register";
import { epLoadSnapshot, epFlush, epRequestPersist, epListBackups, epGetBackup } from "./db";

window.React = React;
window.ReactDOM = { ...ReactDOMClient, createPortal };
// copias de seguridad automáticas (para la pantalla Respaldo)
window.epBackups = { list: epListBackups, get: epGetBackup };

// PWA: service worker + captura del prompt de instalación (Android/desktop)
registerSW({ immediate: true });
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.__epInstallPrompt = e;
  window.dispatchEvent(new Event("ep:can-install"));
});

// guarda pendientes al ocultar la app (cambio de app en iPhone, cierre de pestaña)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") epFlush();
});

async function boot() {
  window.__epSnapshot = await epLoadSnapshot();
  epRequestPersist(); // pide almacenamiento persistente (mitiga purgas de iOS)
  await import("./proto/index.js");
  const { default: App } = await import("./app.jsx");
  ReactDOMClient.createRoot(document.getElementById("root")).render(<App />);
}

boot();
