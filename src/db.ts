/* Persistencia local en IndexedDB (Dexie).
   Guarda un snapshot del estado del store; IndexedDB soporta bancos grandes
   (2,000+ preguntas) sin el límite de ~5 MB de localStorage. */
import Dexie, { type Table } from "dexie";

interface KV {
  key: string;
  value: unknown;
  savedAt: string;
}

class EstudioProDB extends Dexie {
  kv!: Table<KV, string>;
  constructor() {
    super("estudiopro");
    this.version(1).stores({ kv: "key" });
  }
}

const db = new EstudioProDB();
const SNAP_KEY = "snapshot";
const LEGACY_LS_KEY = "estudiopro:v1";

/** Carga el snapshot guardado. Si no hay, migra el de localStorage (prototipo). */
export async function epLoadSnapshot(): Promise<Record<string, unknown> | null> {
  try {
    const row = await db.kv.get(SNAP_KEY);
    if (row && row.value) return row.value as Record<string, unknown>;
    // migración desde el prototipo (localStorage)
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      await db.kv.put({ key: SNAP_KEY, value: data, savedAt: new Date().toISOString() });
      return data;
    }
  } catch (e) {
    console.warn("EstudioPro: no se pudo cargar el respaldo local", e);
  }
  return null;
}

let pending: Record<string, unknown> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Guarda (con debounce) el snapshot del estado. Síncrono para el llamador. */
export function epSaveSnapshot(snap: Record<string, unknown>): void {
  pending = snap;
  if (timer) return;
  timer = setTimeout(async () => {
    const toSave = pending;
    pending = null;
    timer = null;
    try {
      await db.kv.put({ key: SNAP_KEY, value: toSave, savedAt: new Date().toISOString() });
    } catch (e) {
      console.warn("EstudioPro: no se pudo guardar en IndexedDB", e);
      try { localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(toSave)); } catch { /* lleno */ }
    }
  }, 350);
}

/** Fuerza el guardado inmediato (se usa al ocultar/cerrar la app). */
export async function epFlush(): Promise<void> {
  if (!pending) return;
  const toSave = pending;
  pending = null;
  if (timer) { clearTimeout(timer); timer = null; }
  try {
    await db.kv.put({ key: SNAP_KEY, value: toSave, savedAt: new Date().toISOString() });
  } catch { /* ignora */ }
}

/** Pide almacenamiento persistente al navegador (reduce el riesgo de purga en iOS). */
export async function epRequestPersist(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch { /* no soportado */ }
  return false;
}
