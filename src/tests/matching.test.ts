import { describe, expect, it } from "vitest";
import { analyzeRoute } from "@/lib/analyze";
import { attributeLamps, indexWays, matchSegmentToWay } from "@/lib/geo/match-evidence";
import { segmentRoute } from "@/lib/geo/segment";
import { prepare } from "@/lib/osm/dataset";
import { at, node, way } from "@/tests/fixtures";

const routeOnA = [at(0, 0), at(300, 0)];
const streetA = way(1, [[0, 0], [300, 0]], { name: "Via A", lit: "yes" });
const parallelB = way(2, [[0, 20], [300, 20]], { name: "Via B" });
const crossing = way(3, [[150, -50], [150, 50]], { name: "Via C", lit: "no" });

describe("segmentazione", () => {
  it("preserva la lunghezza totale e usa finestre vicine al target", () => {
    const segments = segmentRoute([at(0, 0), at(100, 0), at(100, 85)], 30);
    expect(segments).toHaveLength(6);
    expect(segments.reduce((sum, s) => sum + s.lengthM, 0)).toBeCloseTo(185, 3);
  });

  it("restituisce nessun tratto per una geometria degenere", () => {
    expect(segmentRoute([at(0, 0), at(0, 0)], 30)).toEqual([]);
  });
});

describe("aggancio ai way", () => {
  const ways = indexWays([streetA, parallelB, crossing]);
  const segments = segmentRoute(routeOnA, 30);

  it("aggancia il tratto alla strada percorsa, non a quella parallela", () => {
    expect(segments.every((s) => matchSegmentToWay(s, ways)?.id === 1)).toBe(true);
  });

  it("non aggancia una strada che incrocia in direzione diversa", () => {
    const onlyCrossing = indexWays([crossing]);
    expect(segments.every((s) => matchSegmentToWay(s, onlyCrossing) === null)).toBe(true);
  });

  it("lascia non agganciato un tratto lontano da ogni way", () => {
    const far = segmentRoute([at(0, 200), at(60, 200)], 30);
    expect(matchSegmentToWay(far[0], ways)).toBeNull();
  });
});

describe("attribuzione dei punti luce", () => {
  const ways = indexWays([streetA, parallelB]);
  const segments = segmentRoute(routeOnA, 30);
  const matches = segments.map((s) => matchSegmentToWay(s, ways));

  it("attribuisce un punto luce sul bordo della strada percorsa", () => {
    const [lamp] = attributeLamps(segments, matches, [node(10, 45, 4)], ways);
    expect(lamp.status).toBe("attributed");
    expect(lamp.segmentIndex).toBe(1);
  });

  it("non attribuisce automaticamente un punto luce più vicino alla strada parallela", () => {
    const [lamp] = attributeLamps(segments, matches, [node(11, 45, 13)], ways);
    expect(lamp.status).toBe("uncertain");
  });

  it("ignora i punti luce oltre la distanza massima", () => {
    expect(attributeLamps(segments, matches, [node(12, 45, 60)], ways)).toEqual([]);
  });

  it("considera stessa strada una carreggiata adiacente al marciapiede percorso", () => {
    const sidewalk = way(4, [[0, 0], [300, 0]], { highway: "footway", footway: "sidewalk" });
    const carriageway = way(5, [[0, 5], [300, 5]], { name: "Via A" });
    const indexed = indexWays([sidewalk, carriageway]);
    const m = segments.map((s) => matchSegmentToWay(s, indexed));
    const [lamp] = attributeLamps(segments, m, [node(13, 45, 4)], indexed);
    expect(lamp.status).toBe("attributed");
  });
});

describe("analisi di un percorso con dati controllati", () => {
  const dataset = {
    elements: [streetA, parallelB, node(20, 45, 4, { highway: "street_lamp" }), node(21, 200, 13, { highway: "street_lamp" })],
    retrievedAt: "2026-01-01T00:00:00.000Z",
    endpoint: "https://example.test/api",
    origin: "live" as const,
  };

  it("conta separatamente punti luce attribuiti e incerti e copre lit sull'intero tracciato", () => {
    const route = { distanceMeters: 300, durationSeconds: 220, coordinates: routeOnA };
    const analyzed = analyzeRoute(route, "route-1", prepare(dataset));
    expect(analyzed.counts.lampsAttributed).toBe(1);
    expect(analyzed.counts.lampsUncertain).toBe(1);
    expect(analyzed.evidenceCoverage.litKnownFraction).toBeCloseTo(1);
    expect(analyzed.dimensions.walkability.score).toBeNull();
  });
});
