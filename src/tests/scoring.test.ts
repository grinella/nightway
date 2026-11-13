import { describe, expect, it } from "vitest";
import { analyzeRoute, comparisonNotes } from "@/lib/analyze";
import type { AnalyzedRoute } from "@/lib/schemas/routes";
import { computeDimensions, type Dimensions } from "@/lib/scoring/coverage";
import { computeErs, INSUFFICIENT_EVIDENCE } from "@/lib/scoring/ers";
import { at, evidence } from "@/tests/fixtures";

const full = { score: 100, coveredMeters: 100, totalMeters: 100 };
const none = { score: null, coveredMeters: 0, totalMeters: 100 };

describe("ERS", () => {
  it("resta null sotto la soglia di copertura", () => {
    const dimensions = computeDimensions([evidence({ lit: "yes" }), evidence()]);
    const ers = computeErs(dimensions);
    expect(ers.environmentalScore).toBeNull();
    expect(ers.warnings).toContain(INSUFFICIENT_EVIDENCE);
  });

  it("rinormalizza i pesi sulle sole dimensioni valutabili", () => {
    const dimensions: Dimensions = {
      lightingDeclared: full,
      lamps: { ...full, score: 50 },
      visibility: none,
      walkability: full,
      services: { ...full, score: 0 },
    };
    const ers = computeErs(dimensions);
    // (.30*100 + .20*50 + .20*100 + .10*0) / .80
    expect(ers.environmentalScore).toBe(75);
    expect(ers.evidenceCoverage).toBeCloseTo(0.8);
    expect(ers.warnings[0]).toMatch(/4 dimensioni su 5/);
  });

  it("rispetta una soglia configurabile", () => {
    const dimensions = computeDimensions([evidence({ lit: "yes", walk: "sidewalk" })]);
    expect(computeErs(dimensions, undefined, 0.6).environmentalScore).toBeNull();
    expect(computeErs(dimensions, undefined, 0.5).environmentalScore).toBe(100);
  });

  it("una dimensione nota con punteggio zero resta zero, non null", () => {
    const dimensions = computeDimensions([evidence({ lit: "no", walk: "no_sidewalk" })]);
    expect(computeErs(dimensions, undefined, 0.5).environmentalScore).toBe(0);
  });
});

describe("confronto tra percorsi", () => {
  const withCoverage = (overall: number) => ({ evidenceCoverage: { overall, litKnownFraction: 0 } }) as AnalyzedRoute;

  it("segnala coperture molto diverse invece di una classifica", () => {
    expect(comparisonNotes([withCoverage(0.8), withCoverage(0.3)])).toHaveLength(1);
  });

  it("non segnala nulla con coperture simili o un solo percorso", () => {
    expect(comparisonNotes([withCoverage(0.5), withCoverage(0.45)])).toEqual([]);
    expect(comparisonNotes([withCoverage(0.1)])).toEqual([]);
  });
});

describe("percorso senza dati OSM", () => {
  it("riporta stato sconosciuto e nessun punteggio, mai «nessun lampione»", () => {
    const route = { distanceMeters: 200, durationSeconds: 150, coordinates: [at(0, 0), at(200, 0)] };
    const analyzed = analyzeRoute(route, "route-1", null);
    expect(analyzed.environmentalScore).toBeNull();
    expect(analyzed.evidenceCoverage.overall).toBe(0);
    expect(analyzed.segments.every((s) => s.lit === "unknown")).toBe(true);
    expect(analyzed.warnings.join(" ")).toMatch(/sconosciuto, non assente/);
    expect(analyzed.distanceMeters).toBe(200);
  });
});

describe("riassunto vocale", () => {
  it("riporta i numeri dell'analisi e il limite dei dati, senza parlare di sicurezza come esito", async () => {
    const { spokenSummary } = await import("@/lib/summary");
    const route = analyzeRoute({ distanceMeters: 1400, durationSeconds: 1080, coordinates: [at(0, 0), at(200, 0)] }, "route-1", null);
    const text = spokenSummary({ routes: [route], comparisonNotes: [] } as never);
    expect(text).toContain("Un percorso disponibile.");
    expect(text).toContain("1,4 km, circa 18 min");
    expect(text).toContain("non è calcolabile");
    expect(text).toMatch(/non lampioni accesi né la sicurezza/);
  });
});
