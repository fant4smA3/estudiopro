# Reporte de auditoría QA — EstudioPro

> **Estado (2026-07-03): las 3 olas de corrección están aplicadas y verificadas.**
> - **Ola 1** (`4993fc3`): C-01…C-04 — quiz/simulacro conectados al banco real, configuración aplicada, métricas derivadas del store.
> - **Ola 2** (`0618ef4`): A-01…A-08 — gates de IA, tema persistente, resultado consistente, iconos PWA, a11y (select/button/label: 0 violaciones axe), contraste `--mute` a AA.
> - **Ola 3** (`e051b42`): M-01…M-13 y B-01/B-03 — orden de columnas y selección por página en Banco, ordenamientos reales en formularios, dedupe de etiquetas, modales con Escape/max-height/foco, touch targets ≥44px y font 16px en móvil, pestaña historial, onboarding accesible, tests sin ruido, deps limpias.
> - **Residuales conocidos:** ~68 nodos de contraste por el acento de marca usado como texto pequeño (decisión de diseño pendiente) y la fecha de examen por defecto (editable en Configuración).
> Verificación: Playwright E2E por ola + barrido de 40 rutas sin errores + vitest 35/35.

**Fecha:** 2026-07-03 · **Auditor:** QA integral (funcional + responsive + visual + técnica)
**Método:** servidor levantado (`npm run dev`), navegación real con Chromium/Playwright sobre las **41 rutas navegables** (+ 7 de detalle), pruebas E2E de flujos completos, medición de overflow en 4 anchos (360/768/1280/1920), auditoría axe-core (WCAG 2.0 A/AA) por ruta, y revisión de código de los 19 módulos de `src/proto/`.

---

## Resumen ejecutivo

La app **arranca limpia, es estable (0 crashes en 41 rutas) y el responsive básico es sólido: ninguna ruta genera scroll horizontal en ninguno de los 4 anchos**. El CRUD del banco, tarjetas SM-2, respaldo (export/restore), importación (272 preguntas reales importadas OK) y el shell (menú móvil, dark mode, paleta ⌘K, búsqueda global) funcionan.

El problema central es de **herencia del prototipo**: el motor de cuestionarios/simulacros está desconectado del banco real del usuario, gran parte de las métricas de progreso son números inventados fijos, y varias funciones ("IA", personalización) dependen de infraestructura que no existe en producción.

**Totales: 4 Críticos · 8 Altos · 13 Medios · 3 Bajos.**

---

## Tabla resumen (ordenada por severidad)

| ID | Severidad | Ruta(s) | Componente | Hallazgo |
|----|-----------|---------|------------|----------|
| C-01 | Crítico | quiz, simrun | Quiz / SimRun | Los cuestionarios y simulacros usan el banco semilla estático, nunca las preguntas reales del usuario |
| C-02 | Crítico | simrun | SimRun | El simulacro "de 200 preguntas" repite cíclicamente las ~30 preguntas semilla |
| C-03 | Crítico | cuestionarios → quiz | Config de sesión | Toda la configuración del cuestionario se ignora (nº preguntas, dificultad, temas, tiempo límite) |
| C-04 | Crítico | inicio, estadisticas, cuestionarios, perfil, topbar, sidebar | Métricas | Datos de progreso fabricados/fijos presentados como reales |
| A-01 | Alto | generador, tutor, importar-ia | Funciones IA | Dependen de `window.claude.complete` (sandbox de prototipo); nunca funcionarán en la PWA desplegada |
| A-02 | Alto | global | Tweaks/tema | Tema oscuro, acento y densidad no persisten (postMessage a un host inexistente) |
| A-03 | Alto | resultado | Resultado | Conteo de "falladas" inconsistente; respuestas abiertas se descartan y cuentan como falladas |
| A-04 | Alto | simrun, inicio | Historial | Sesión de simulacro se guarda con materia fija "Normatividad Gubernamental"; resume con `missed: 18` fijo |
| A-05 | Alto | quiz | Timer | Cronómetro fijo de 20:00 aun en modo "sin límite"; al llegar a 0 no ocurre nada; tiempo reportado incorrecto si dura >20 min |
| A-06 | Alto | PWA/iOS | index.html | `apple-touch-icon` con ruta absoluta rompe bajo GitHub Pages; falta `<link rel="icon">` → 404 en cada carga |
| A-07 | Alto | 13+ rutas | Formularios | 24 `<select>` sin nombre accesible, 9 switches sin texto, 9 inputs sin label (axe: critical) |
| A-08 | Alto | 41/41 rutas | Contraste | 874 nodos fallan WCAG AA de contraste (grises `--mute`, brand-tag, metas de paneles) |
| M-01 | Medio | banco | Tabla | `key={r.id}` con campo inexistente (es `_id`) → warning React en consola en cada render |
| M-02 | Medio | pregunta | PreguntaForm | Selects "Categoría" y "Ordenamiento/Capítulo" decorativos; `ord` se guarda vacío |
| M-03 | Medio | pregunta | Etiquetas | Permite etiquetas duplicadas → chips repetidos y keys duplicadas |
| M-04 | Medio | banco | Selección lote | "Seleccionar todas" marca todas las filas filtradas (todas las páginas), no solo las visibles; tabla sin ordenamiento por columnas |
| M-05 | Medio | resultado | Navegación | "Ver historial" abre Cuestionarios en la pestaña "Por materia", no en Historial |
| M-06 | Medio | config | Botones | Botón muerto "No disponible aquí"; botones de icono sin texto accesible |
| M-07 | Medio | cuestionarios | Temas | Chips de temas hardcodeados ("Tema 1/2/3, Cap. II") sin relación con el contenido real |
| M-08 | Medio | quiz | Teclado | Efecto de atajos sin array de dependencias: re-suscribe el listener en cada render |
| M-09 | Medio | global | Modal | `.modal` sin `max-height`/scroll interno: modales largos se cortan en viewports bajos; sin trampa de foco ni cierre con Escape |
| M-10 | Medio | onboarding | Ruta | Solo alcanzable con banco vacío; con datos es ruta huérfana |
| M-11 | Medio | móvil global | Touch targets | Objetivos táctiles <44px generalizados: acciones de fila 28px, topbar ◎/☾ 35×32, avatar 30×30, link-btn 72×22 |
| M-12 | Medio | móvil/iOS | Inputs | Font-size de inputs ~12.5–13px < 16px → Safari iOS hace zoom automático al enfocar (el target declarado es iPhone) |
| M-13 | Medio | tests | Vitest | Smoke tests emiten DexieError `MissingAPIError` (falta fake-indexeddb) — ruido en CI |
| B-01 | Bajo | deps | package.json | `react-router-dom`, `zustand` y `magic-string` declarados y sin uso |
| B-02 | Bajo | resultado | Falladas | Solo se muestran 4 de N falladas sin indicar que hay más |
| B-03 | Bajo | banco | Columna fecha | Columna "cuándo" usa valores rotativos falsos ("hoy, ayer, 2 d…") |

---

## Detalle de hallazgos

### CRÍTICOS

**C-01 — Cuestionarios y simulacros ignoran el banco real del usuario**
- Ruta: `quiz`, `simrun` · Componentes: `Quiz` (`src/proto/estudiopro-screens-b.jsx:626,642,646`), `SimRun` (`src/proto/estudiopro-screens-d.jsx:213,217`)
- Ambos leen `window.QUESTION_BANK` (la constante semilla de `estudiopro-bank.jsx` con ~30 preguntas de ejemplo) en lugar de `EPStore.get().questions`.
- Evidencia E2E: se importaron **272 preguntas reales** (toast "272 preguntas importadas") y el cuestionario siguió usando solo semillas; tras **borrar todo el banco** (0 preguntas), el quiz arrancó igual con preguntas de Legislación Militar. Además `applyQuizResults` marca por `qq.id`, campo que las preguntas del usuario no tienen (solo `_id`), así que el progreso tampoco les llega de vuelta.
- Impacto: la función principal del producto (estudiar TU banco) no existe. El usuario estudia siempre el mismo material demo.
- Corrección propuesta: en `Quiz`/`SimRun`, sustituir `QUESTION_BANK` por las preguntas del store; unificar `id`/`_id` en `applyQuizResults`.

**C-02 — Simulacro de "200 preguntas" recicla el banco semilla**
- Ruta: `simrun` · `estudiopro-screens-d.jsx:217`: `while (out.length < 200) out.push({ ...QUESTION_BANK[i % QUESTION_BANK.length] ... })`
- Evidencia: pantalla "Pregunta 1 de 200" con hoja de respuestas 1–100 por bloque; cada pregunta semilla aparece ~6-7 veces.
- Corrección: tomar del banco real, `min(200, banco.length)` sin repetición (o avisar si no alcanza).

**C-03 — La configuración del cuestionario no se aplica**
- Ruta: `cuestionarios` → `quiz` · `estudiopro-screens-c.jsx:112` solo pasa `{subject, mode, filter}` a `setNav`; `n` (slider "Número de preguntas"), `dif`, `temas` y el select "Tiempo límite" (sin `onChange`, c:97) no viajan; `Quiz` tampoco los lee.
- Evidencia E2E: configuré 20 preguntas → el quiz corrió con **3** ("3 preguntas · 00:00" en Resultado) sin ningún aviso. Además `if (pool.length < 4) pool = QUESTION_BANK.slice()` (b:646) cambia silenciosamente a TODO el banco de otra materia.
- Corrección: pasar la config completa por `setNav` y aplicarla en `Quiz` (recorte a N, filtro por dificultad/tema, timer según selección).

**C-04 — Métricas de progreso inventadas presentadas como reales**
- Rutas/componentes y evidencia (valores fijos en código):
  - Inicio: subtítulo **"Viernes 20 jun"** hardcodeado (a:100) — hoy es 3 de julio.
  - Topbar: racha **"12 días"** fija (`estudiopro-ui.jsx:79`), contradice el heatmap ("14 días de racha").
  - Sidebar footer: **"47% · 1,498 / 3,184"** fijo (ui:153-154).
  - Estadísticas (a:487-522): actividad semanal (62/88/45/96/74/120/40), dominio del banco (1,498/920/412/354 = "3,184 preguntas" cuando el banco real tiene 15–288), avance por materia (24/12/18/8/15/5 %), temas débiles, "récord: 23"; heatmap de constancia **sintético** por fórmula (a:510-514, comentario "demo realista").
  - Cuestionarios: historial de 6 sesiones **falso** (c:22-29) mezclado con la pestaña real; contadores "18 falladas / 42 importantes" fijos (c:73-74).
  - Perfil: kpis e historial fijos (c:163-186). Categorías: "1,120 preguntas · 21 ordenamientos" fijo (a:233).
- Impacto: el usuario toma decisiones de estudio con números falsos; rompe la confianza en todo el módulo Progreso.
- Corrección: derivar todo de `EPStore` (ya hay datos suficientes: sessions, cardSrs, timeLog) y eliminar constantes; donde no haya dato, mostrar estado vacío.

### ALTOS

**A-01 — Funciones "IA" imposibles en producción** · `generador`, `tutor`, `importar-ia`
- Dependen de `window.claude.complete` (g:22,37,150,175; i:92,119), API que solo existe dentro del sandbox de artefactos de Claude, no en una PWA desplegada. E2E: "⚠ No pude responder ahora mismo. La IA puede estar ocupada o no disponible en este entorno."
- Corrección: ocultar las 3 pantallas tras un flag "requiere conexión IA", o integrar una API real opcional.

**A-02 — Personalización (tema/acento/densidad) no persiste** · global
- `useTweaks` "persiste" con `window.parent.postMessage({type:'__edit_mode_set_keys'})` a un host de herramienta de diseño inexistente (`tweaks-panel.jsx:178-186`). E2E: activé modo oscuro → recargué → volvió a claro. El `TweaksPanel` completo es tooling del prototipo empacado en producción.
- Corrección: persistir tweaks en IndexedDB (`db.ts`) y retirar el panel/protocolo del host.

**A-03 — Conteo de falladas inconsistente; respuestas abiertas descartadas** · `resultado`
- `missed` marca `ok: qq.type !== "AB" && ...` (b:675): toda pregunta abierta o saltada entra a "falladas" aunque el resumen diga otra cosa. Evidencia E2E: "**2 incorrectas**" y "**PREGUNTAS FALLADAS (3)**" en la misma pantalla. El textarea de respuesta abierta no es controlado (b:753): lo escrito se ignora.
- Corrección: excluir AB del missed (o pedir autoevaluación), distinguir "sin contestar", capturar la respuesta abierta.

**A-04 — Historial corrupto tras simulacro** · `simrun`
- `addSession({ subject: isSim ? "Normatividad Gubernamental" : subject ...})` (b:691) — materia fija arbitraria. `setResume(..., missed: 18)` fijo (b:698).

**A-05 — Timer del quiz fijo e inerte** · `quiz`
- `useState(20*60)` siempre (b:654), aunque el modo práctica promete "Sin tiempo límite" y el select ofrezca 10/30 min. Al llegar a 0 no finaliza (solo se queda en 00:00 en rojo). `elapsed = 20*60 - secs` (b:677) reporta mal si la sesión supera 20 min. El rail "Tiempo límite 20:00" también fijo (b:808).

**A-06 — Iconos PWA / favicon** · `index.html`
- `<link rel="apple-touch-icon" href="/icons/icon-192.png">` con ruta absoluta contradice `base: "./"` → roto bajo `usuario.github.io/repo/` (el README indica ese despliegue). No hay `<link rel="icon">` → `favicon.ico` 404 en consola en cada carga (detectado en el crawl).
- Corrección: rutas relativas y favicon declarado.

**A-07 — Accesibilidad de formularios (axe critical)** · 13+ rutas
- `select-name`: 24 selects sin nombre accesible (cronometro, audio, podcast, glosario, metas, crear-rapido, tarjetas, cuestionarios, tutor, evolucion, mapa, alertas…). `button-name`: 9 switches sin texto (Alertas, Config). `label`: 9 inputs (range de Cuestionarios/Simulacro/Config). Los `<label>` existen visualmente pero no están asociados (`for`/`id`).

**A-08 — Contraste WCAG AA** · 41/41 rutas
- axe reporta **874 nodos** con contraste insuficiente (serious). Reincidentes: `.brand-tag`, `.gsearch-meta`, textos `--mute` sobre `--bg`, metas de paneles, hints. Corrección: oscurecer `--mute`/`--ink-soft` un paso en ambos temas y re-validar.

### MEDIOS

- **M-01** `banco` — `key={r.id}` (b:87); el campo es `_id` → "Each child in a list should have a unique key" en consola (reproducido en tests y en vivo). Riesgo real de estado cruzado al duplicar/eliminar filas.
- **M-02** `pregunta` — selects "Categoría" y "Ordenamiento/Capítulo" con una sola opción fija y sin `onChange` (b:216-218); `build()` guarda `ord: ""` (b:188), por lo que el desglose por capítulo del Resultado agrupa en "General".
- **M-03** `pregunta` — `setTags([...tags, value])` sin deduplicar (b:280) → chips y keys duplicadas.
- **M-04** `banco` — `visibleIds = rows.map(...)` usa todas las filas filtradas, no la página visible (b:35): con >25 filas, "seleccionar todas" + "Eliminar" borra registros que el usuario no ve. La tabla no tiene ordenamiento por columnas.
- **M-05** `resultado` — "Ver historial" navega a `cuestionarios` pero la pestaña por defecto es "Por materia" (c:6); no se abre el historial prometido.
- **M-06** `config` — botón "No disponible aquí" (muerto, confirmado en E2E) y botones de icono sin texto accesible.
- **M-07** `cuestionarios` — `TEMAS = ["Todos","Tema 1","Tema 2","Tema 3","Cap. II"]` (c:14) sin relación con los ordenamientos reales; además el filtro no se aplica (ver C-03).
- **M-08** `quiz` — `useEffect` de atajos sin deps (b:703-714): añade/quita listener en cada render.
- **M-09** global — `.modal { width:440px; max-width:100% }` sin `max-height` ni scroll del cuerpo (styles.css:1047): el modal de Reportes (5 campos) se corta en viewports bajos (p. ej. 360×640 landscape). Modales sin trampa de foco ni cierre con tecla Escape.
- **M-10** `onboarding` — solo se llega desde el estado vacío de Inicio (a:59); con datos semilla la pantalla queda huérfana.
- **M-11** móvil — touch targets bajo 44×44px en todas las rutas (medición a 360px): acciones de fila del Banco ✎★⧉✕ ~28×28, topbar ◎/☾ 35×32, avatar 30×30, `link-btn` "Ver todas ▸" 72×22, días L-M-X del plan 30×30. Banco: 69 objetivos pequeños; Editor del plan: 28; Config: 23.
- **M-12** móvil/iOS — inputs con font-size 12.5–13px (< 16px): Safari iOS hace zoom automático al enfocar cualquier campo; siendo iPhone el target declarado del README, degrada todos los formularios.
- **M-13** tests — el smoke test emite `DexieError MissingAPIError` por falta de IndexedDB en el entorno node (falta `fake-indexeddb`); ruido que puede ocultar fallos reales.

### BAJOS

- **B-01** `package.json` — `react-router-dom`, `zustand` y `magic-string` declarados como dependencias y sin uso en `src/` (peso e ilusión de stack).
- **B-02** `resultado` — `missed.slice(0, 4)` muestra 4 falladas aunque el título diga "(N)"; sin indicador "ver más".
- **B-03** `banco` — columna de fecha usa `whenAt = ["hoy","ayer","2 d","3 d","5 d","1 sem"]` rotativo (b:30): fechas falsas por posición.

---

## Resultados por fase

### Fase 1 — Funcional (lo que SÍ funciona, verificado E2E)
✅ Crear → validar → editar → duplicar → eliminar pregunta (con confirmación) · búsqueda/filtros/estado vacío/paginación del Banco · selección en lote · crear tarjeta · sesión SM-2 (voltear, calificar, toast con próximo intervalo) · quiz completo hasta Resultado · simulacro arranca y el modal de salida protege el progreso · wizard de Importar (272 preguntas del JSON real, 6 duplicadas omitidas) · Respaldo: exportar descarga `estudiopro-respaldo-2026-07-03.json`, archivo corrupto rechazado con toast, restauración con confirmación OK · persistencia IndexedDB tras recarga (288 preguntas antes/después) · dark mode aplica en toda la UI · menú móvil abre/cierra/navega · ⌘K y búsqueda global · cronómetro corre · calendario navega meses · switches de Config alternan.

### Fase 2 — Responsive
✅ **0 rutas con scroll horizontal** en 360/768/1280/1920 (41 rutas × 4 anchos medidos). Tablas con scroll interno correcto. Modales caben a 360×740. Imágenes: no hay `<img>` (iconografía tipográfica).
⚠ Pendientes: touch targets (M-11), zoom iOS en inputs (M-12), modales altos en viewports bajos (M-09).

### Fase 3 — Diseño y consistencia
✅ Sistema de diseño sólido: 787 usos de `var(--token)`, hover (49 reglas), `:focus-visible` y `[disabled]` definidos; jerarquía tipográfica consistente; dark mode sin colores rotos en las pantallas inspeccionadas; toasts consistentes (posición fija inferior, variantes ok/warn/danger).
⚠ Contraste AA es el gran pendiente (A-08). Font base 12.5px es agresivamente pequeña.

### Fase 4 — Técnica
- Consola: limpia en 41 rutas salvo **favicon 404** (A-06) y **warning de key en Banco** (M-01).
- Red: sin requests fallidos ni duplicados (app 100% local; las únicas peticiones "IA" fallan por diseño, A-01).
- Tests: 35/35 pasan con los ruidos de M-13.
- Teclado: sidebar navegable (tabIndex + Enter), atajos de quiz y "/" para buscar funcionan; modales sin trampa de foco (M-09).

---

## Plan de corrección propuesto (3 olas)

### Ola 1 — Críticos (C-01 a C-04) · **~2 días** · el producto pasa de demo a real
1. Conectar `Quiz` y `SimRun` al store real (`EPStore.get().questions`); unificar `id`/`_id` en `applyQuizResults`. → `estudiopro-screens-b.jsx`, `estudiopro-screens-d.jsx`
2. Simulacro sin repetición, tamaño = min(200, banco). → `estudiopro-screens-d.jsx`
3. Aplicar config del cuestionario (N, dificultad, temas reales desde `ord` del banco, tiempo límite; aviso si el pool no alcanza). → `estudiopro-screens-c.jsx`, `estudiopro-screens-b.jsx`
4. Sustituir métricas fabricadas por datos del store o estados vacíos (Inicio/fecha real, Topbar/racha, Sidebar/avance, Estadísticas completa, historial de Cuestionarios, Perfil, Categorías). → `estudiopro-screens-a.jsx`, `-c.jsx`, `estudiopro-ui.jsx`

### Ola 2 — Altos (A-01 a A-08) · **~2 días** · confianza y accesibilidad
5. Gate de funciones IA (banner "no disponible sin conexión IA" + ocultar del menú) o integración real. → `estudiopro-screens-f/g/i.jsx`, `estudiopro-ui.jsx`
6. Persistir tweaks en IndexedDB; retirar protocolo de host del panel. → `tweaks-panel.jsx`, `db.ts`, `app.jsx`
7. Arreglar Resultado (falladas/AB/sin contestar, capturar respuesta abierta) y sesión de simulacro (A-04). → `estudiopro-screens-b.jsx`
8. Timer real según config; auto-finalizar al agotarse; tiempo transcurrido correcto. → `estudiopro-screens-b.jsx`
9. favicon + rutas relativas de iconos. → `index.html`
10. Labels/names accesibles (selects, switches, ranges) y subir contraste de `--mute`/tokens grises. → pantallas afectadas + `styles.css`

### Ola 3 — Medios/Bajos · **~1 día** · pulido
11. `key={r._id}`, dedupe de etiquetas, selección por página, ordenamiento de tabla, "Ver historial" → pestaña historial, quitar botón muerto, temas reales en chips, deps de useEffect, `max-height` + focus-trap + Escape en modales, touch targets ≥44px y font-size 16px en inputs móviles, `fake-indexeddb` en tests, limpiar dependencias sin uso, columna de fechas real, indicador "ver más" en falladas.
→ `estudiopro-screens-b/c.jsx`, `estudiopro-ui.jsx`, `styles.css`, `package.json`, `smoke.test.jsx`

**Verificación por ola:** re-ejecutar la suite E2E de esta auditoría (scripts Playwright ya escritos: crawl de 41 rutas + flujos) + `npm test` después de cada ola.

---

*Evidencia disponible: resultados JSON del crawl (overflow/axe/touch targets por ruta), logs de consola por ruta, y ~100 capturas (360/1280 de cada ruta + flujos + dark mode).*
