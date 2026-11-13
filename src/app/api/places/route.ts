import { findPlaces } from "@/lib/agent/places";
import { errorResponse, readJson } from "@/lib/http";
import { getPilotData } from "@/lib/osm/dataset";
import { placesRequestSchema } from "@/lib/schemas/agent";

/** Ricerca per nome tra i luoghi OpenStreetMap dell'area pilota (strumento `find_place` dell'agente). */
export async function POST(request: Request) {
  const input = await readJson(request, placesRequestSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json({ matches: findPlaces(await getPilotData(), input.query) });
  } catch {
    return errorResponse(503, "osm_unavailable", "Dati OpenStreetMap non disponibili in questo momento.");
  }
}
