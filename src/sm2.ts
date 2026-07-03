/* SM-2 (estilo Anki) — módulo puro, sin dependencias.
   Calificaciones: "otra" (Again), "dificil" (Hard), "medio" (Good/Bien), "facil" (Easy). */

export type Grade = "otra" | "dificil" | "medio" | "facil";

export interface Sm2State {
  reps: number;      // repasos correctos consecutivos
  ef: number;        // factor de facilidad (mín. 1.3)
  interval: number;  // intervalo actual en días
  due: string;       // próxima fecha de repaso (ISO yyyy-mm-dd)
  lapses: number;    // veces que se olvidó
}

const QUALITY: Record<Grade, number> = { otra: 2, dificil: 3, medio: 4, facil: 5 };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function sm2Init(now: Date = new Date()): Sm2State {
  return { reps: 0, ef: 2.5, interval: 0, due: iso(now), lapses: 0 };
}

/** Aplica una calificación al estado SM-2 y devuelve el estado nuevo. */
export function sm2Grade(prev: Sm2State | undefined, grade: Grade, now: Date = new Date()): Sm2State {
  const s = prev && typeof prev.ef === "number" ? prev : sm2Init(now);
  const q = QUALITY[grade];

  // actualización del factor de facilidad (fórmula SM-2)
  let ef = s.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < 1.3) ef = 1.3;

  if (grade === "otra") {
    // olvido: reinicia repeticiones, vuelve a hoy
    const next = new Date(now);
    return { reps: 0, ef, interval: 0, due: iso(next), lapses: (s.lapses || 0) + 1 };
  }

  const reps = s.reps + 1;
  let interval: number;
  if (reps === 1) interval = 1;
  else if (reps === 2) interval = 6;
  else interval = Math.round(s.interval * ef);

  // modificadores estilo Anki
  if (grade === "dificil") interval = Math.max(1, Math.round(Math.max(s.interval * 1.2, 1)));
  if (grade === "facil") interval = Math.max(interval, Math.round(interval * 1.3));

  interval = Math.min(interval, 365); // tope razonable para un ciclo de promoción

  const next = new Date(now);
  next.setDate(next.getDate() + interval);
  return { reps, ef, interval, due: iso(next), lapses: s.lapses || 0 };
}

/** Nivel de dominio derivado (compatible con la UI del prototipo). */
export function sm2Nivel(s: Sm2State | undefined): "nuevo" | "medio" | "dominado" {
  if (!s || !s.reps) return "nuevo";
  return s.interval >= 21 ? "dominado" : "medio";
}

/** ¿La tarjeta vence hoy (o antes)? Las que no tienen estado SM-2 son nuevas → vencen. */
export function sm2Due(s: Sm2State | undefined, now: Date = new Date()): boolean {
  if (!s || !s.due) return true;
  return s.due <= iso(now);
}

/** Vista previa del intervalo por calificación (para mostrar bajo los botones). */
export function sm2Preview(prev: Sm2State | undefined, now: Date = new Date()): Record<Grade, string> {
  const out = {} as Record<Grade, string>;
  (["otra", "dificil", "medio", "facil"] as Grade[]).forEach((g) => {
    const n = sm2Grade(prev, g, now);
    out[g] = n.interval <= 0 ? "hoy (10 min)" : n.interval === 1 ? "1 día" : n.interval + " días";
  });
  return out;
}

/** Repasos que vencen en los próximos n días (carga futura, para el pronóstico). */
export function dueForecast(states: (Sm2State | undefined)[], days = 7, now: Date = new Date()): number[] {
  const buckets = Array.from({ length: days }, () => 0);
  const base = iso(now);
  states.forEach((s) => {
    const due = s?.due || base;
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      if (due <= iso(d)) { buckets[i]++; break; }
    }
  });
  return buckets;
}
