/* Persistencia local en IndexedDB (Dexie).
   Guarda un snapshot del estado del store; IndexedDB soporta bancos grandes
   (2,000+ preguntas) sin el límite de ~5 MB de localStorage. */
import Dexie, { type Table } from "dexie";

interface KV {
  key: string;
  value: unknown;
  savedAt: string;
  v?: number; // versión de esquema del snapshot
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
const SNAP_VERSION = 1;
const BACKUP_PREFIX = "backup:";
const BACKUP_KEEP = 5; // copias diarias que se conservan
const LEGACY_LS_KEY = "estudiopro:v1";
// Sin IndexedDB (tests en node, navegadores muy viejos): opera en memoria sin ruido en consola.
const hasIDB = typeof indexedDB !== "undefined";

/** Migra un snapshot guardado con una versión de esquema anterior a la actual.
    Al cambiar el esquema: sube SNAP_VERSION y añade aquí un paso `if (from < N) { … }`. */
function migrateSnapshot(value: Record<string, unknown>, from: number): Record<string, unknown> {
  void from; // sin migraciones pendientes (versión actual: SNAP_VERSION)
  return value;
}

/** Copia diaria del snapshot (rotativa): una por día, se conservan las últimas BACKUP_KEEP. */
async function rotateBackups(snapshot: Record<string, unknown>): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const key = BACKUP_PREFIX + today;
  const existing = await db.kv.get(key);
  if (!existing) {
    await db.kv.put({ key, value: snapshot, savedAt: new Date().toISOString(), v: SNAP_VERSION });
    const all = (await db.kv.toArray()).filter((r) => r.key.startsWith(BACKUP_PREFIX)).sort((a, b) => a.key.localeCompare(b.key));
    const extra = all.length - BACKUP_KEEP;
    for (let i = 0; i < extra; i++) await db.kv.delete(all[i].key);
  }
}

/** Lista las copias de seguridad automáticas disponibles (más reciente primero). */
export async function epListBackups(): Promise<{ date: string; savedAt: string }[]> {
  if (!hasIDB) return [];
  try {
    const all = (await db.kv.toArray()).filter((r) => r.key.startsWith(BACKUP_PREFIX));
    return all
      .map((r) => ({ date: r.key.slice(BACKUP_PREFIX.length), savedAt: r.savedAt }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch { return []; }
}

/** Devuelve el contenido de una copia automática. */
export async function epGetBackup(date: string): Promise<Record<string, unknown> | null> {
  if (!hasIDB) return null;
  try {
    const row = await db.kv.get(BACKUP_PREFIX + date);
    return row && row.value ? (row.value as Record<string, unknown>) : null;
  } catch { return null; }
}

/** Carga el snapshot guardado. Si no hay, migra el de localStorage (prototipo). */
export async function epLoadSnapshot(): Promise<Record<string, unknown> | null> {
  if (!hasIDB) return null;
  try {
    const row = await db.kv.get(SNAP_KEY);
    if (row && row.value) {
      const snap = migrateSnapshot(row.value as Record<string, unknown>, row.v ?? 1);
      // copia de seguridad del día ANTES de que la sesión de hoy escriba encima
      await rotateBackups(snap).catch(() => { /* sin espacio: la app sigue */ });
      return snap;
    }
    // migración desde el prototipo (localStorage)
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      await db.kv.put({ key: SNAP_KEY, value: data, savedAt: new Date().toISOString(), v: SNAP_VERSION });
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
  if (!hasIDB) return;
  pending = snap;
  if (timer) return;
  timer = setTimeout(async () => {
    const toSave = pending;
    pending = null;
    timer = null;
    try {
      await db.kv.put({ key: SNAP_KEY, value: toSave, savedAt: new Date().toISOString(), v: SNAP_VERSION });
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
    await db.kv.put({ key: SNAP_KEY, value: toSave, savedAt: new Date().toISOString(), v: SNAP_VERSION });
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
