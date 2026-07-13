# EstudioPro — Sistema de estudio para promoción militar

PWA **offline-first** para preparar el examen de promoción: banco de preguntas, tarjetas con
**repetición espaciada SM-2** (estilo Anki), cuestionarios, simulacros, plan de estudio y estadísticas.
Recreación en producción del prototipo de diseño (handoff "Azul cielo").

**Stack:** React 18 + Vite + vite-plugin-pwa · IndexedDB (Dexie) · SM-2 en módulo puro con tests (vitest).

## Correr en tu PC

Requisitos: [Node.js](https://nodejs.org) 18 o superior.

```bash
cd app
npm install
npm run dev        # abre http://localhost:5173
```

Otros comandos: `npm test` (pruebas), `npm run build` (build de producción en `dist/`),
`npm run preview` (sirve el build), `npm run lint` (ESLint) y `npm run typecheck` (TypeScript).
En cada pull request, CI ejecuta lint + typecheck + pruebas + build (`.github/workflows/ci.yml`).

## Instalar en tu iPhone (offline)

Safari solo permite instalar PWAs desde **HTTPS**, así que hay que publicarla una vez
(gratis). Después funciona 100% sin internet.

1. Sube este proyecto a un repositorio de GitHub.
2. En el repo: Settings → Pages → Source: **GitHub Actions**. El workflow incluido
   (`.github/workflows/deploy.yml`) publica automáticamente en cada push.
3. En tu iPhone abre la URL (`https://TU-USUARIO.github.io/TU-REPO/`) en **Safari**.
4. Botón **Compartir → Agregar a pantalla de inicio**.
5. Abre "EstudioPro" desde el icono. Ya funciona en modo avión.

Alternativa en red local: `npm run build && npm run preview -- --host` y abre la IP de tu PC
en el iPhone (sin HTTPS no se instala como app, pero sirve para probar).

### Importante: respaldos en iOS

iOS puede purgar el almacenamiento local de apps web con poco uso o poco espacio.
La app pide almacenamiento persistente, pero **haz respaldos** con regularidad:
pantalla **Respaldo** (o Configuración → Datos) → *Exportar JSON*. Ese archivo restaura todo.

## Repetición espaciada (SM-2)

Cada tarjeta se califica **Otra vez / Difícil / Bien / Fácil** (teclas 1-4; en iPhone,
desliza → Bien, ← Otra vez). El algoritmo SM-2 recalcula el intervalo y la próxima fecha;
el filtro **"Vencen hoy"** de Tarjetas muestra solo lo pendiente. Lógica en `src/sm2.ts`
(pura, con 11 pruebas unitarias) — intervalos: 1 día → 6 días → ×EF (1.3–2.5+).

## Datos

- Todo vive en tu dispositivo (IndexedDB); no hay servidor ni cuentas.
- **Banco incluido**: la app empaqueta un banco curado (`public/data/`) que se carga con un
  botón desde la pantalla **Importar** — funciona offline. La fuente cruda está en `data/` y
  se cura con `node scripts/curar-banco.mjs <entrada> <salida>`.
- Importación masiva: pantalla **Importar** (CSV/JSON, wizard de 4 pasos).
- Exportar/restaurar: pantalla **Respaldo** (JSON completo). Además se guarda una **copia
  automática diaria** (últimas 5) restaurable desde esa misma pantalla.

## Estructura

```
app/
├─ src/
│  ├─ main.jsx           # arranque: fuentes, CSS, estado guardado, render
│  ├─ app.jsx            # shell (Topbar + Sidebar + enrutado por estado)
│  ├─ sm2.ts             # algoritmo SM-2 (puro, testeado)
│  ├─ db.ts              # persistencia IndexedDB (Dexie) + respaldo
│  ├─ styles.css         # sistema de diseño "Azul cielo" (portado del handoff)
│  ├─ sm2.test.ts        # pruebas del algoritmo
│  ├─ smoke.test.jsx     # prueba de humo: monta la app y 16 pantallas
│  └─ proto/             # pantallas y store (portados del prototipo hifi)
├─ public/icons/         # iconos PWA
└─ vite.config.ts        # PWA: manifest + precache offline
```

Nota de arquitectura: las pantallas del handoff se portaron como módulos ES conservando su
patrón de store observable (`EPStore`), con la persistencia migrada de localStorage a
IndexedDB y el repaso simple sustituido por SM-2. Los módulos nuevos son TypeScript.
