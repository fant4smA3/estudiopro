import { describe, it, expect } from "vitest";
import { sm2Init, sm2Grade, sm2Nivel, sm2Due, sm2Preview } from "./sm2";

const NOW = new Date("2026-07-02T12:00:00");

describe("SM-2", () => {
  it("estado inicial: nuevo, vence hoy", () => {
    const s = sm2Init(NOW);
    expect(s.reps).toBe(0);
    expect(s.ef).toBe(2.5);
    expect(sm2Nivel(s)).toBe("nuevo");
    expect(sm2Due(s, NOW)).toBe(true);
  });

  it("primer 'Bien' → 1 día", () => {
    const s = sm2Grade(undefined, "medio", NOW);
    expect(s.interval).toBe(1);
    expect(s.due).toBe("2026-07-03");
    expect(s.reps).toBe(1);
  });

  it("segundo 'Bien' → 6 días", () => {
    let s = sm2Grade(undefined, "medio", NOW);
    s = sm2Grade(s, "medio", NOW);
    expect(s.interval).toBe(6);
    expect(s.due).toBe("2026-07-08");
  });

  it("tercer 'Bien' → interval * EF (~15 días)", () => {
    let s = sm2Grade(undefined, "medio", NOW);
    s = sm2Grade(s, "medio", NOW);
    const ef = s.ef;
    s = sm2Grade(s, "medio", NOW);
    expect(s.interval).toBe(Math.round(6 * ef));
    expect(s.interval).toBeGreaterThanOrEqual(13);
  });

  it("'Otra vez' reinicia reps y suma lapso, vence hoy", () => {
    let s = sm2Grade(undefined, "medio", NOW);
    s = sm2Grade(s, "medio", NOW);
    s = sm2Grade(s, "otra", NOW);
    expect(s.reps).toBe(0);
    expect(s.interval).toBe(0);
    expect(s.lapses).toBe(1);
    expect(sm2Due(s, NOW)).toBe(true);
    expect(sm2Nivel(s)).toBe("nuevo");
  });

  it("'Otra vez' repetido baja el EF pero nunca menos de 1.3", () => {
    let s = sm2Init(NOW);
    for (let i = 0; i < 20; i++) s = sm2Grade(s, "otra", NOW);
    expect(s.ef).toBeGreaterThanOrEqual(1.3);
  });

  it("'Fácil' crece más rápido que 'Bien'", () => {
    let a = sm2Grade(undefined, "medio", NOW); a = sm2Grade(a, "medio", NOW); a = sm2Grade(a, "medio", NOW);
    let b = sm2Grade(undefined, "facil", NOW); b = sm2Grade(b, "facil", NOW); b = sm2Grade(b, "facil", NOW);
    expect(b.interval).toBeGreaterThan(a.interval);
  });

  it("'Difícil' crece más lento que 'Bien'", () => {
    let base = sm2Grade(undefined, "medio", NOW);
    base = sm2Grade(base, "medio", NOW); // interval 6
    const hard = sm2Grade(base, "dificil", NOW);
    const good = sm2Grade(base, "medio", NOW);
    expect(hard.interval).toBeLessThan(good.interval);
    expect(hard.interval).toBeGreaterThanOrEqual(7); // 6*1.2
  });

  it("intervalo ≥21 días = dominado", () => {
    let s = sm2Grade(undefined, "facil", NOW);
    s = sm2Grade(s, "facil", NOW);
    s = sm2Grade(s, "facil", NOW);
    expect(s.interval).toBeGreaterThanOrEqual(21);
    expect(sm2Nivel(s)).toBe("dominado");
  });

  it("preview muestra textos legibles", () => {
    const p = sm2Preview(undefined, NOW);
    expect(p.otra).toContain("hoy");
    expect(p.medio).toBe("1 día");
  });

  it("tope de 365 días", () => {
    let s = sm2Init(NOW);
    for (let i = 0; i < 30; i++) s = sm2Grade(s, "facil", NOW);
    expect(s.interval).toBeLessThanOrEqual(365);
  });
});
