import { describe, expect, it } from "vitest";
import { normalizeLit, normalizeWalk } from "@/lib/osm/normalize";
import { computeDimensions, coverageOf, overallCoverage } from "@/lib/scoring/coverage";
import { evidence } from "@/tests/fixtures";

describe("normalizzazione dei tag", () => {
  it("tiene distinti i valori di lit e tratta il tag assente come sconosciuto", () => {
    expect(normalizeLit({})).toBe("unknown");
    expect(normalizeLit({ lit: "yes" })).toBe("yes");
    expect(normalizeLit({ lit: "no" })).toBe("no");
    expect(normalizeLit({ lit: "limited" })).toBe("limited");
    expect(normalizeLit({ lit: "automatic" })).toBe("automatic");
    expect(normalizeLit({ lit: "sunset-sunrise" })).toBe("other");
  });

  it("non deduce l'assenza di marciapiede da un tag mancante", () => {
    expect(normalizeWalk({ highway: "residential" })).toBe("unknown");
    expect(normalizeWalk({ highway: "residential", sidewalk: "no" })).toBe("no_sidewalk");
    expect(normalizeWalk({ highway: "footway" })).toBe("pedestrian");
    expect(normalizeWalk({ highway: "steps" })).toBe("steps");
  });
});

describe("coverage per metri", () => {
  it("misura i metri con lit noto, non il numero di tratti", () => {
    const d = computeDimensions([evidence({ lengthM: 300, lit: "yes" }), evidence({ lengthM: 100 }), evidence({ lengthM: 100 })]);
    expect(d.lightingDeclared.coveredMeters).toBe(300);
    expect(d.lightingDeclared.totalMeters).toBe(500);
    expect(coverageOf(d.lightingDeclared)).toBeCloseTo(0.6);
  });

  it("lit assente non abbassa il punteggio: resta fuori dalla copertura", () => {
    const d = computeDimensions([evidence({ lit: "yes" }), evidence()]);
    expect(d.lightingDeclared.score).toBe(100);
    expect(d.lightingDeclared.coveredMeters).toBe(100);
  });

  it("lit=no conta come evidenza nota con punteggio zero, limited a metà", () => {
    const d = computeDimensions([evidence({ lit: "no" }), evidence({ lit: "limited" })]);
    expect(d.lightingDeclared.coveredMeters).toBe(200);
    expect(d.lightingDeclared.score).toBe(25);
  });

  it("zero lampioni mappati rende la dimensione non valutabile, non zero", () => {
    const d = computeDimensions([evidence(), evidence()]);
    expect(d.lamps.score).toBeNull();
    expect(d.lamps.coveredMeters).toBe(0);
  });

  it("valuta i lampioni solo sulle strade dove almeno uno è mappato", () => {
    const d = computeDimensions([
      evidence({ streetKey: "A", lampNear: true }),
      evidence({ streetKey: "A" }),
      evidence({ streetKey: "B" }),
    ]);
    expect(d.lamps.coveredMeters).toBe(200);
    expect(d.lamps.score).toBe(50);
  });

  it("la visibilità non è mai valutata in questa versione", () => {
    const d = computeDimensions([evidence({ lit: "yes" })]);
    expect(d.visibility).toEqual({ score: null, coveredMeters: 0, totalMeters: 100 });
  });

  it("aggrega la coverage con i pesi dichiarati", () => {
    const d = computeDimensions([evidence({ lit: "yes", walk: "sidewalk" })]);
    // lighting .30 + walkability .20 coperte al 100%, le altre a zero
    expect(overallCoverage(d)).toBeCloseTo(0.5);
  });

  it("un percorso senza tratti ha coverage zero", () => {
    expect(overallCoverage(computeDimensions([]))).toBe(0);
  });
});
