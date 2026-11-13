import { providers, type Bbox } from "@/lib/config";
import { overpassResponseSchema, type OsmDataset } from "@/lib/osm/types";

export class OverpassError extends Error {}

/** Una sola query aggregata per area: strade con geometria, punti luce, servizi e luoghi con nome. */
export function buildOverpassQuery(bbox: Bbox): string {
  const b = [bbox.south, bbox.west, bbox.north, bbox.east].map(Number);
  if (b.some((n) => !Number.isFinite(n))) throw new OverpassError("bbox non valida");
  const area = `(${b.join(",")})`;
  return `[out:json][timeout:25];
(
  way["highway"]${area};
  node["highway"="street_lamp"]${area};
  node["amenity"]${area};
  node["shop"]${area};
  node["public_transport"]${area};
  node["railway"="station"]${area};
  node["tourism"]["name"]${area};
  node["historic"]["name"]${area};
  way["amenity"]["name"]${area};
  way["tourism"]["name"]${area};
  way["historic"]["name"]${area};
  way["leisure"]["name"]${area};
);
out tags geom;`;
}

async function queryEndpoint(endpoint: string, query: string, fetchImpl: typeof fetch): Promise<OsmDataset> {
  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": providers.userAgent,
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(providers.overpassTimeoutMs),
  });
  if (!res.ok) throw new OverpassError(`Overpass ${res.status}`);
  const parsed = overpassResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new OverpassError("Risposta Overpass non valida");
  return {
    elements: parsed.data.elements,
    osmBase: parsed.data.osm3s?.timestamp_osm_base,
    retrievedAt: new Date().toISOString(),
    endpoint,
    origin: "live",
  };
}

/** Prova gli endpoint configurati in ordine; lancia OverpassError se nessuno risponde. */
export async function fetchOverpass(bbox: Bbox, fetchImpl: typeof fetch = fetch): Promise<OsmDataset> {
  const query = buildOverpassQuery(bbox);
  let lastError: unknown;
  for (const endpoint of providers.overpassUrls) {
    try {
      return await queryEndpoint(endpoint, query, fetchImpl);
    } catch (error) {
      lastError = error;
    }
  }
  throw new OverpassError(`Nessun endpoint Overpass disponibile: ${String(lastError)}`);
}
