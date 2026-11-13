import { describe, expect, it } from "vitest";
import { PILOT } from "@/lib/config";
import { buildOverpassQuery, fetchOverpass, OverpassError } from "@/lib/osm/overpass";
import { decodePolyline6, fetchPedestrianRoutes } from "@/lib/routing/valhalla";
import { routesRequestSchema } from "@/lib/schemas/routes";

const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });
// Polyline di esempio dalla documentazione dell'algoritmo, ricodificata a precisione 6.
const SHAPE = "_izlhA~rlgdF_{geC~ywl@_kwzCn`{nI";
const trip = (length: number, time: number) => ({ summary: { length, time }, legs: [{ shape: SHAPE }] });
const A = { lat: 41.8745, lon: 12.4735 };
const B = { lat: 41.883, lon: 12.479 };

describe("Valhalla", () => {
  it("decodifica polyline6 in [lon, lat]", () => {
    expect(decodePolyline6(SHAPE)).toEqual([[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]]);
  });

  it("restituisce un solo percorso quando il provider ne dà uno, senza inventarne altri", async () => {
    const routes = await fetchPedestrianRoutes(A, B, json({ trip: trip(1.357, 1137.6) }) as typeof fetch);
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ distanceMeters: 1357, durationSeconds: 1138 });
  });

  it("include le alternative quando presenti", async () => {
    const body = { trip: trip(1, 800), alternates: [{ trip: trip(1.2, 950) }, { trip: trip(1.5, 1200) }] };
    expect(await fetchPedestrianRoutes(A, B, json(body) as typeof fetch)).toHaveLength(3);
  });

  it("traduce 429 in rate_limited", async () => {
    await expect(fetchPedestrianRoutes(A, B, json({}, 429) as typeof fetch)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("traduce «nessun percorso» in no_route", async () => {
    const noPath = json({ error_code: 442, error: "No path could be found for input" }, 400);
    await expect(fetchPedestrianRoutes(A, B, noPath as typeof fetch)).rejects.toMatchObject({ code: "no_route" });
  });

  it("traduce il timeout in timeout", async () => {
    const timeout = async () => {
      throw new DOMException("timed out", "TimeoutError");
    };
    await expect(fetchPedestrianRoutes(A, B, timeout as typeof fetch)).rejects.toMatchObject({ code: "timeout" });
  });

  it("rifiuta una risposta malformata invece di usarla", async () => {
    await expect(fetchPedestrianRoutes(A, B, json({ trip: {} }) as typeof fetch)).rejects.toMatchObject({ code: "provider_error" });
  });
});

describe("Overpass", () => {
  it("costruisce la query con sole coordinate numeriche", () => {
    expect(buildOverpassQuery(PILOT.bbox)).toContain('node["highway"="street_lamp"](41.866,12.464,41.886,12.488);');
    expect(() => buildOverpassQuery({ ...PILOT.bbox, south: Number.NaN })).toThrow(OverpassError);
  });

  it("passa all'endpoint successivo se il primo fallisce", async () => {
    let calls = 0;
    const flaky = async () => (++calls === 1 ? new Response("busy", { status: 502 }) : new Response(JSON.stringify({ elements: [] })));
    const dataset = await fetchOverpass(PILOT.bbox, flaky as typeof fetch);
    expect(calls).toBe(2);
    expect(dataset.origin).toBe("live");
  });

  it("fallisce in modo esplicito se nessun endpoint risponde", async () => {
    await expect(fetchOverpass(PILOT.bbox, json({}, 504) as typeof fetch)).rejects.toBeInstanceOf(OverpassError);
  });
});

describe("validazione della richiesta", () => {
  const ok = { origin: A, destination: B };

  it("accetta due punti nell'area pilota", () => {
    expect(routesRequestSchema.safeParse(ok).success).toBe(true);
  });

  it.each([
    ["stessa coordinata", { origin: A, destination: A }],
    ["fuori zona", { origin: A, destination: { lat: 41.95, lon: 12.5 } }],
    ["non numerico", { origin: A, destination: { lat: "41.88", lon: 12.479 } }],
    ["non finito", { origin: A, destination: { lat: Infinity, lon: 12.479 } }],
    ["campi extra", { ...ok, extra: true }],
  ])("rifiuta: %s", (_, body) => {
    expect(routesRequestSchema.safeParse(body).success).toBe(false);
  });
});
