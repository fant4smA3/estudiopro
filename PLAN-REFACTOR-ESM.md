# Plan de refactor — `window.*` → módulos ES

> Deuda técnica heredada del prototipo. El handoff (`mejora/loop-estudio`) pidió planearla
> **aparte** y arrancar con un **piloto de 2-3 módulos** antes de tocar el resto. Este documento
> es ese plan; **no cambia arquitectura todavía** — es para revisar y aprobar la estrategia.

## 1. Situación actual

- ~8,000 líneas en **16 módulos** bajo `src/proto/`, cargados por su efecto secundario: cada uno
  se **auto-registra** en `window.*` al importarse, y `src/proto/index.js` los importa en un orden
  fijo (data → bank → store → ui → screens). `src/app.jsx` **desestructura** todo desde `window`.
- Medido hoy: **~130 asignaciones** a `window.*` (el store concentra 28; screens-a/b/d otras ~56)
  y **765 lecturas** de `window.*` entre módulos. Ese es el acoplamiento a desmontar.
- `React` también es global (`window.React`, fijado en `src/main.jsx`); los módulos usan `React`
  sin importarlo.
- Ya son módulos ES limpios: `src/db.ts`, `src/sm2.ts` (con tests). Sirven de referencia del destino.
- **Red de seguridad existente:** `src/smoke.test.jsx` monta las 12 páginas y flujos clave, y
  `src/a11y.test.jsx` corre axe sobre ellas. Ambas referencian `window.X`. Son la prueba de
  regresión que debe seguir en verde en **cada paso**.

## 2. Principios

1. **Strangler incremental, nunca big-bang.** Un módulo a la vez, cada uno en su PR, CI verde
   (lint + typecheck + 56 tests + build) como puerta.
2. **Doble publicación durante la transición.** Un módulo migrado *exporta* (ES) **y además**
   mantiene su `window.*` mientras existan consumidores sin migrar. Se retira el `window.*` solo
   cuando nadie lo lee.
3. **Sin cambios de comportamiento.** El refactor es estructural; la UI y la lógica no cambian.
   Regla de oro: el diff no debe alterar ningún texto renderizado ni ningún cálculo.
4. **Singleton preservado.** `EPStore`, `useStore` y el estado viven en una sola instancia; se
   exporta la instancia, nunca se reinstancia.

## 3. Orden de migración (de las hojas al centro)

| Fase | Módulos | Por qué en este orden | Riesgo |
|------|---------|------------------------|--------|
| **Piloto** | `estudiopro-data.jsx`, `estudiopro-bank.jsx` + 1 pantalla hoja (`estudiopro-screens-l.jsx`) | Datos/helpers casi puros + una pantalla chica: prueba el patrón de punta a punta (dato → helper → componente → test) con riesgo mínimo | Bajo |
| **1** | `estudiopro-ui.jsx` (NavCtx, Topbar, Side, TabBar, helpers de UI) | Lo consume todo; exportarlo habilita imports en las pantallas | Medio |
| **2** | `estudiopro-store.jsx` | El hub (28 writes, leído por todos). Exportar `EPStore`/`useStore`/analíticas | **Alto** |
| **3** | `screens-a…e`, `screens-h…l`, `merged`, `tweaks-panel` | Convertir consumo: `import` en vez de desestructurar `window`; quitar lecturas `window.*` | Medio |
| **4** | `app.jsx`, `main.jsx`, `proto/index.js` | `app.jsx` importa; retirar el cargador por efecto; quitar `window.React` (añadir `import React`) | Medio |
| **5** (opcional) | `.jsx` → `.tsx` incremental | Tipado real de props/estado una vez desacoplado | Bajo |

## 4. Patrón de migración por módulo (receta)

Para un módulo `X`:
1. Añadir `export` a cada función/const que otros consumen; añadir `import` de lo que X usa de
   otros módulos ya migrados.
2. **Mantener** los `window.X = …` existentes (doble publicación) para no romper consumidores sin
   migrar ni las pruebas.
3. Añadir `import React from "react"` si el módulo usa `React` (deja de depender del global).
4. Correr `npm run lint && npm run typecheck && npm test && npm run build`. Todo verde o se revierte.
5. Cuando **ningún** módulo lea ya `window.X` (verificable con `grep -r "window.X" src`), borrar el
   `window.X = …` y, si aplica, la línea de `proto/index.js`.

## 5. Piloto propuesto (1 sesión corta, su propio PR)

- **`estudiopro-data.jsx`** → `export const MATERIA_DETAIL = …` (mantener `window.MATERIA_DETAIL`).
- **`estudiopro-bank.jsx`** → `export { QUESTION_BANK, subjColor, subjTextColor, subjShort, … }`
  (mantener sus `window.*`).
- **`estudiopro-screens-l.jsx`** (Reparar distractores) → `import` de lo anterior + `import React`;
  seguir publicando `window.ReparaDistractoresBody` para el ruteo/tests.
- **Criterio de aceptación del piloto:** 56/56 tests, lint 0, build OK, y `screens-l` sin ninguna
  lectura `window.*` de lo ya migrado. Si el patrón se siente limpio, se aprueba y se sigue con la Fase 1.

## 6. Riesgos y mitigaciones

- **Orden de carga / efectos:** los `import` ES conservan orden; la doble publicación mantiene
  `window` poblado para lo no migrado. Mitiga romper consumidores intermedios.
- **`window.React`:** se retira **al final** (Fase 4), tras `import React` en todos los archivos.
- **Pruebas acopladas a `window`:** siguen verdes por la doble publicación; en la Fase 4 se migran
  a `import` de los componentes.
- **Ruteo:** `app.jsx` mapea rutas→componentes desde `window`. Cambia a `import` en la Fase 4; hasta
  entonces, doble publicación.
- **Regla anti-regresión visual:** además de tests, re-certificación Playwright a 360/768/1280/1920
  al cerrar las Fases 2 y 4 (precedente: `REPORTE-QA.md` y las validaciones de esta rama).

## 7. Esfuerzo y entregables

- **Piloto:** 1 PR corto. **Fases 1-4:** 1 PR por fase (la Fase 2, store, es la delicada).
  **Fase 5:** opcional, incremental.
- Cada PR: CI verde + nota de "qué `window.*` quedaron y por qué" hasta llegar a **cero** al final.
- Estado final: sin `window.*` de aplicación (se conservan solo globales legítimos del navegador,
  p. ej. el `beforeinstallprompt` de la PWA), `proto/index.js` eliminado, y base lista para TS.

## 8. Qué NO hace este refactor

No agrega funciones ni cambia UI. No toca el algoritmo SM-2 ni la persistencia (Dexie). No es
requisito para el examen; es higiene de mantenibilidad para después. Si el tiempo aprieta, el
piloto solo ya deja el patrón probado y documentado para retomar sin fricción.
