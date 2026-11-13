import { describe, expect, it } from "vitest";
import { findPlaces } from "@/lib/agent/places";
import { prepare } from "@/lib/osm/dataset";
import { streetRuns } from "@/lib/agent/summaries";
import { placesRequestSchema, sessionRequestSchema } from "@/lib/schemas/agent";
import type { AnalyzedRoute } from "@/lib/schemas/routes";
import { node, way } from "@/tests/fixtures";

const data = prepare({
  elements: [
    node(1, 0, 0, { historic: "monument", name: "Piramide di Caio Cestio" }),
    node(2, 50, 0, { railway: "station", name: "Piramide" }),
    way(3, [[0, 0], [100, 0]], { name: "Via della Piramide Cestia" }),
    node(4, 10, 10, { amenity: "cafe" }),
  ],
  retrievedAt: "2026-01-01T00:00:00.000Z",
  endpoint: "https://example.test/api",
  origin: "live",
});

describe("ricerca dei luoghi nell'area pilota", () => {
  it("trova per nome ignorando maiuscole e accenti, luoghi prima delle strade", () => {
    const names = findPlaces(data, "PIRAMIDE").map((p) => p.name);
    expect(names).toEqual(["Piramide", "Piramide di Caio Cestio", "Via della Piramide Cestia"]);
  });

  it("richiede tutte le parole della ricerca", () => {
    expect(findPlaces(data, "piramide cestia").map((p) => p.kind)).toEqual(["strada"]);
  });

  it("non inventa risultati per luoghi non mappati", () => {
    expect(findPlaces(data, "Colosseo")).toEqual([]);
    expect(findPlaces(data, "")).toEqual([]);
  });
});

describe("riassunti per l'agente", () => {
  const route = {
    segments: [
      { matched: true, streetName: "Via A", lit: "yes", walk: "sidewalk", lengthM: 30 },
      { matched: true, streetName: "Via A", lit: "yes", walk: "sidewalk", lengthM: 30 },
      { matched: true, streetName: "Via A", lit: "unknown", walk: "sidewalk", lengthM: 30 },
      { matched: false, lit: "unknown", walk: "unknown", lengthM: 20 },
    ],
  } as AnalyzedRoute;

  it("raggruppa i tratti consecutivi e tiene distinto il dato ignoto", () => {
    expect(streetRuns(route)).toEqual([
      { street: "Via A", lit: "yes", walk: "sidewalk", meters: 60 },
      { street: "Via A", lit: "unknown", walk: "sidewalk", meters: 30 },
      { street: "non agganciato a OSM", lit: "unknown", walk: "unknown", meters: 20 },
    ]);
  });
});

describe("validazione delle richieste dell'assistente", () => {
  it("accetta solo le modalità voce e testo", () => {
    expect(sessionRequestSchema.safeParse({ mode: "voice" }).success).toBe(true);
    expect(sessionRequestSchema.safeParse({ mode: "video" }).success).toBe(false);
  });

  it("rifiuta ricerche vuote o troppo lunghe", () => {
    expect(placesRequestSchema.safeParse({ query: "  " }).success).toBe(false);
    expect(placesRequestSchema.safeParse({ query: "x".repeat(121) }).success).toBe(false);
  });
});
