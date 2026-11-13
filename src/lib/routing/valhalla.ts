import { z } from "zod";
import { providers } from "@/lib/config";
import type { LonLat } from "@/lib/geo/planar";
import { RoutingError, type LatLon, type PedestrianRoute } from "@/lib/routing/types";

/** Decodifica una polyline Valhalla (precisione 6) in coordinate GeoJSON [lon, lat]. */
export function decodePolyline6(encoded: string): LonLat[] {
  const coords: LonLat[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  const next = () => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += next();
    lon += next();
    coords.push([lon / 1e6, lat / 1e6]);
  }
  return coords;
}

const tripSchema = z.object({
  summary: z.object({ length: z.number(), time: z.number() }),
  legs: z.array(z.object({ shape: z.string() })).min(1),
});

const responseSchema = z.object({
  trip: tripSchema,
  alternates: z.array(z.object({ trip: tripSchema })).optional(),
});

/** Codici Valhalla che significano «nessun percorso / punto non raggiungibile». */
const NO_ROUTE_CODES = new Set([170, 171, 441, 442, 443, 444]);

const toRoute = (trip: z.infer<typeof tripSchema>): PedestrianRoute => ({
  distanceMeters: Math.round(trip.summary.length * 1000),
  durationSeconds: Math.round(trip.summary.time),
  coordinates: trip.legs.flatMap((leg, i) => decodePolyline6(leg.shape).slice(i ? 1 : 0)),
});

async function failure(res: Response): Promise<RoutingError> {
  if (res.status === 429) return new RoutingError("rate_limited", "Il servizio di routing ha raggiunto il limite di richieste.");
  const body = (await res.json().catch(() => null)) as { error_code?: number } | null;
  if (body?.error_code && NO_ROUTE_CODES.has(body.error_code)) {
    return new RoutingError("no_route", "Nessun percorso pedonale trovato tra i due punti.");
  }
  return new RoutingError("provider_error", `Il servizio di routing ha risposto con un errore (${res.status}).`);
}

/** Chiede a Valhalla da 1 a 3 percorsi pedonali reali. Restituisce solo ciò che il provider fornisce. */
export async function fetchPedestrianRoutes(
  origin: LatLon,
  destination: LatLon,
  fetchImpl: typeof fetch = fetch,
): Promise<PedestrianRoute[]> {
  let res: Response;
  try {
    res = await fetchImpl(`${providers.valhallaUrl.replace(/\/$/, "")}/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": providers.userAgent },
      body: JSON.stringify({ locations: [origin, destination], costing: "pedestrian", alternates: 2, units: "kilometers" }),
      signal: AbortSignal.timeout(providers.valhallaTimeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new RoutingError(timedOut ? "timeout" : "provider_error", "Il servizio di routing non risponde.");
  }
  if (!res.ok) throw await failure(res);
  const parsed = responseSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new RoutingError("provider_error", "Risposta del servizio di routing non valida.");
  const trips = [parsed.data.trip, ...(parsed.data.alternates ?? []).map((a) => a.trip)];
  return trips.map(toRoute).filter((route) => route.coordinates.length >= 2);
}
