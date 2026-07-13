# Análisis del proyecto y menú de mejoras — EstudioPro

**Fecha:** 2026-07-13 · **Enfoque:** DevOps · DevSecOps · Frontend/UI-UX
**Objetivo declarado:** dejar todo conectado para **comenzar las pruebas reales de práctica**: estudiar, subir preguntas, crear, editar, eliminar y revisar.

---

## 1. Veredicto ejecutivo

La aplicación está **técnicamente lista** para practicar: los 35 tests pasan, el build de
producción compila (PWA con precache offline de 26 entradas), el CRUD del banco es completo y
los cuestionarios/simulacros ya operan sobre el banco real (correcciones del QA de julio
aplicadas y verificadas).

**El bloqueo real ya no es de código: es de contenido.** El único banco real del repositorio
(`data/ciberseguridad-aspecto-tecnico.json`, 278 preguntas) tiene **241 preguntas con
distractores de relleno** («Respuesta idéntica», «Distractor 1/2»), **0 explicaciones** y no
está integrado a la app (hay que importarlo a mano). Además quedan **2 analíticas con datos
simulados** (curva de olvido y matriz de confusiones) que contradicen el principio de "que
todo se conecte".

---

## 2. Estado verificado hoy

| Área | Estado | Evidencia |
|------|--------|-----------|
| Tests | ✅ 35/35 | `npm test` (sm2: 11, smoke 24 pantallas) |
| Build producción | ✅ OK | `npm run build` — PWA precache 26 entradas (849 KiB) |
| Quiz/Simulacro → banco real | ✅ Conectado | `Quiz` lee `EPStore.get().questions`, aplica n/dificultad/temas/tiempo, marca resultados con `applyQuizResults` |
| CRUD banco | ✅ Completo | crear, editar, duplicar, eliminar (individual y por lote), importante, etiquetas, reportar error |
| Tarjetas SM-2 | ✅ Real | derivadas 1:1 del banco; SM-2 puro testeado; "vencen hoy" real |
| Importar | ✅ CSV/JSON wizard 4 pasos | dedupe por enunciado+respuesta; formato nativo detectado |
| Respaldo | ✅ Export/restore JSON | pantalla Respaldo + Config → Datos |
| Taxonomía editable | ✅ | categorías/materias/ordenamientos con renombrado en cascada |
| CI/CD | ⚠️ Parcial | deploy a Pages con test+build **solo en push a `main`**; no hay CI en PRs, sin lint, typecheck desactivado (`tsc --noCheck \|\| true`) |
| Accesibilidad | ✅ AA estructural | axe crítico en 0; residuo de contraste conocido (~122 nodos, decisión de identidad) |

---

## 3. Hallazgos (ordenados por impacto en tu objetivo)

### H-1 · Contenido: el banco real no está listo para estudiar — **BLOQUEANTE**
`data/ciberseguridad-aspecto-tecnico.json` (Aspecto Técnico · Manual de Ciberseguridad):

- 278 preguntas, todas de opción múltiple.
- **241/278 con distractores placeholder** → un cuestionario mostraría «Distractor 1» como
  opción; la práctica no sería realista.
- **278/278 sin explicación** (`explain: ""`) → al fallar no aprendes el porqué.
- El archivo vive en `/data` y **no se incluye en el build**: para usarlo hay que pasar por
  Importar manualmente en cada dispositivo/reinstalación.

La app ya trae la herramienta para esto: la pantalla **Reparar distractores** detecta
placeholders y sugiere reemplazos del mismo tema (offline). Falta ejecutar la curación —
idealmente **en el JSON fuente**, para que el banco versionado en git quede limpio y no haya
que reparar en cada dispositivo.

### H-2 · Analíticas con datos simulados — rompe "que todo se conecte"
- `forgetting()` (curva de olvido, pantalla Inteligencia): los "días desde el último repaso"
  se **simulan con un hash del id** de la tarjeta. El dato real ya existe (`cardSrs[id].sm2`:
  intervalo y fecha de vencimiento) — solo hay que usarlo.
- `confusionMatrix()` (pantalla Confusiones): reparte los fallos entre 4 tipos de error con
  **pesos pseudoaleatorios por hash**; solo el total de falladas es real.
- `bestHours()`: ya es real, con relleno sintético solo para registros antiguos sin hora.

Riesgo UX: decisiones de estudio basadas en números que parecen reales y no lo son (mismo
patrón que el C-04 del QA anterior, ya corregido en el resto de la app).

### H-3 · Robustez de datos (DevSecOps) — tu banco vive solo en el dispositivo
- `importJSON()` **reemplaza el estado sin validar esquema**: un JSON malformado o de otra
  app puede corromper el snapshot (no hay versión de esquema ni migraciones).
- Un único snapshot en IndexedDB, **sin respaldos rotativos**: un guardado corrupto o una
  purga de iOS pierde todo lo no exportado. El export manual existe, pero depende de que te
  acuerdes.
- Borrados (individual, por lote, "borrar todo") **sin deshacer** — solo diálogo de
  confirmación.

### H-4 · CI/CD (DevOps) — la calidad no se verifica antes de mezclar
- No hay workflow de CI para `pull_request`: los tests solo corren al desplegar `main`.
- El typecheck está desactivado en el build (`tsc -b --noCheck || true`) y no hay ESLint.
- La auditoría axe/contraste del QA fue manual; no hay regresión automatizada.

### H-5 · Pulido UI/UX (menor, no bloquea)
- Selector de **Idioma** en Configuración decorativo (English no hace nada).
- Botones **"Exportar JSON"** y **"Respaldar"** en Config hacen exactamente lo mismo.
- Texto de Config dice "Base de datos local (SQLite)" — es IndexedDB.
- Residuales conocidos del QA: ~122 nodos de contraste (color de marca como texto, decisión
  de identidad) y touch targets secundarios bajo el umbral aspiracional de 34px.

### H-6 · Deuda de arquitectura (consciente, no urgente)
Las pantallas siguen el patrón del prototipo (componentes en `window.*`, store observable
global). Funciona, está testeado y es coherente; migrarlo a módulos tipados sería un refactor
grande con retorno bajo **antes** del examen (2026-07-27, a 14 días). Recomendación: posponer.

---

## 4. Menú de mejoras para decidir

### Fase 1 — «Listo para estudiar» (recomendada ahora; desbloquea la práctica real)
| # | Mejora | Esfuerzo |
|---|--------|----------|
| 1.1 | **Curar el banco real**: reparar los 241 distractores en el JSON fuente (script con la misma lógica de `epRepairSuggest` + revisión) y añadir explicaciones donde se pueda | Medio |
| 1.2 | **Integrar el banco al build**: botón "Cargar banco incluido (278)" en Importar/Onboarding que lea el JSON empaquetado (precacheado por la PWA, funciona offline) | Bajo |
| 1.3 | **Curva de olvido con datos SM-2 reales** (quitar el hash; usar fecha/intervalo reales; estado vacío si no hay repasos) | Bajo |
| 1.4 | **Matriz de confusiones honesta**: derivarla solo de datos reales (fallos por ordenamiento/capítulo) o marcarla claramente como estimación | Bajo-Medio |

### Fase 2 — Blindaje de tus datos (antes de acumular semanas de progreso)
| # | Mejora | Esfuerzo |
|---|--------|----------|
| 2.1 | Validación de esquema + versión en `importJSON`/snapshot (con migraciones) | Medio |
| 2.2 | Respaldos rotativos automáticos en IndexedDB (últimos N snapshots) + recordatorio de exportación | Medio |
| 2.3 | Deshacer borrados (toast "Deshacer" 5 s antes de confirmar la eliminación) | Bajo |

### Fase 3 — Calidad continua (DevOps)
| # | Mejora | Esfuerzo |
|---|--------|----------|
| 3.1 | Workflow CI en PRs: `npm test` + `npm run build` | Bajo |
| 3.2 | Typecheck real (`tsc` sin `--noCheck`) + ESLint en CI | Medio |
| 3.3 | Auditoría axe automatizada sobre rutas clave (regresión de a11y) | Medio |

### Fase 4 — Pulido UI/UX
| # | Mejora | Esfuerzo |
|---|--------|----------|
| 4.1 | Quitar/ocultar controles decorativos (idioma), unificar botones de respaldo, corregir texto "SQLite" | Bajo |
| 4.2 | Cerrar residuales de contraste y touch targets secundarios | Medio |

**Recomendación:** Fase 1 completa + 2.3 + 3.1 ahora (un par de sesiones de trabajo); Fase 2
en cuanto empieces a estudiar en serio; Fases 3.2+/4 después del examen.

---

## 5. Prompt de análisis reutilizable

Para repetir esta auditoría en el futuro (o sobre otro proyecto):

> Actúa como desarrollador senior DevOps/DevSecOps y diseñador UI/UX. Analiza este repositorio
> y entrega: (1) estado verificado ejecutando tests y build; (2) mapa de flujos de datos
> señalando cualquier dato simulado/hardcodeado presentado como real; (3) calidad y seguridad
> del contenido y de la persistencia (validación de entradas, respaldos, reversibilidad de
> acciones destructivas); (4) madurez CI/CD (qué se verifica en PRs vs. despliegue);
> (5) hallazgos UI/UX contra WCAG AA y controles sin función; (6) menú de mejoras priorizado
> por impacto en el objetivo del usuario, con esfuerzo estimado, para decidir qué ejecutar.
