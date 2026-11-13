import { describe, expect, it } from "vitest";
import { findPlaces } from "@/lib/agent/places";
import { prepare } from "@/lib/osm/dataset";
import { agentRequestSchema } from "@/lib/schemas/agent";
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

describe("validazione della richiesta all'assistente", () => {
  it("accetta una conversazione che termina con l'utente", () => {
    expect(agentRequestSchema.safeParse({ messages: [{ role: "user", content: "ciao" }] }).success).toBe(true);
  });

  it("rifiuta messaggi vuoti, troppo lunghi o che terminano con l'assistente", () => {
    expect(agentRequestSchema.safeParse({ messages: [] }).success).toBe(false);
    expect(agentRequestSchema.safeParse({ messages: [{ role: "user", content: "x".repeat(1501) }] }).success).toBe(false);
    expect(agentRequestSchema.safeParse({ messages: [{ role: "assistant", content: "ciao" }] }).success).toBe(false);
  });
});
