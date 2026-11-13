import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { analyzeRoutes } from "@/lib/analyze";
import { findPlaces } from "@/lib/agent/places";
import { getPilotData } from "@/lib/osm/dataset";
import { RoutingError } from "@/lib/routing/types";
import { routesRequestSchema, type AnalyzedRoute, type RoutesResponse } from "@/lib/schemas/routes";

/** Stato di una singola conversazione: l'ultima analisi serve alla UI per disegnare la mappa. */
export type AgentSession = { analysis: RoutesResponse | null };

const pct = (n: number) => Math.round(n * 100);

function summarize(route: AnalyzedRoute) {
  return {
    id: route.id,
    distanceMeters: route.distanceMeters,
    durationMinutes: Math.round(route.durationSeconds / 60),
    environmentalScore: route.environmentalScore,
    evidenceCoveragePercent: pct(route.evidenceCoverage.overall),
    litKnownPercent: pct(route.evidenceCoverage.litKnownFraction),
    dimensions: route.dimensions,
    mappedLampsAttributed: route.counts.lampsAttributed,
    mappedLampsUncertain: route.counts.lampsUncertain,
    mappedServicesNearby: route.counts.servicesNearby,
    warnings: route.warnings,
  };
}

/** Raggruppa i tratti consecutivi sulla stessa strada con lo stesso stato di illuminazione dichiarata. */
function streetRuns(route: AnalyzedRoute) {
  const runs: { street: string; lit: string; walk: string; meters: number }[] = [];
  for (const segment of route.segments) {
    const street = segment.matched ? (segment.streetName ?? "tratto senza nome") : "non agganciato a OSM";
    const last = runs[runs.length - 1];
    if (last && last.street === street && last.lit === segment.lit && last.walk === segment.walk) last.meters += segment.lengthM;
    else runs.push({ street, lit: segment.lit, walk: segment.walk, meters: segment.lengthM });
  }
  return runs.map((run) => ({ ...run, meters: Math.round(run.meters) }));
}

const coordinate = z.object({ lat: z.number(), lon: z.number() });

export function buildTools(session: AgentSession) {
  const findPlace = betaZodTool({
    name: "find_place",
    description:
      "Cerca un luogo o una strada per nome tra gli elementi OpenStreetMap dell'area pilota (Testaccio/Ostiense, Roma) e ne restituisce le coordinate. Usalo quando l'utente nomina un posto invece di indicare i punti sulla mappa. Non è un geocoder generale: se non trova nulla, il luogo è fuori area o non è mappato con quel nome.",
    inputSchema: z.object({ query: z.string().describe("Nome o parte del nome, es. «Piramide» o «Via Galvani»") }),
    run: async ({ query }) => {
      const matches = findPlaces(await getPilotData(), query);
      return JSON.stringify(matches.length ? { matches } : { matches: [], note: "Nessun luogo trovato nell'area pilota." });
    },
  });

  const compareRoutes = betaZodTool({
    name: "compare_routes",
    description:
      "Calcola i percorsi pedonali reali tra due punti (Valhalla) e li analizza sulle evidenze OpenStreetMap: illuminazione dichiarata, punti luce mappati, infrastruttura pedonale, servizi mappati, Evidence Coverage ed eventuale ERS. Chiamalo ogni volta che servono dati sui percorsi; il risultato viene anche disegnato sulla mappa dell'utente.",
    inputSchema: z.object({ origin: coordinate, destination: coordinate }),
    run: async (input) => {
      const parsed = routesRequestSchema.safeParse(input);
      if (!parsed.success) return JSON.stringify({ error: parsed.error.issues[0]?.message });
      try {
        const analysis = await analyzeRoutes(parsed.data.origin, parsed.data.destination);
        session.analysis = analysis;
        return JSON.stringify({
          routes: analysis.routes.map(summarize),
          comparisonNotes: analysis.comparisonNotes,
          evidenceSource: analysis.evidence ?? "non disponibile: stato sconosciuto",
          vision: analysis.vision.message,
        });
      } catch (error) {
        return JSON.stringify({ error: error instanceof RoutingError ? error.message : "Analisi non riuscita." });
      }
    },
  });

  const routeStreets = betaZodTool({
    name: "route_streets",
    description:
      "Dettaglio strada per strada di un percorso già calcolato con compare_routes: per ogni tratto il nome della strada, il valore di `lit` dichiarato (unknown = tag assente, non «buio»), il tipo di infrastruttura pedonale e i metri. Usalo per dire dove mancano i dati o dove cambiano le evidenze.",
    inputSchema: z.object({ routeId: z.string().describe("Id del percorso, es. route-1") }),
    run: async ({ routeId }) => {
      const route = session.analysis?.routes.find((r) => r.id === routeId);
      return JSON.stringify(route ? { routeId, streets: streetRuns(route) } : { error: "Percorso non trovato: chiama prima compare_routes." });
    },
  });

  return [findPlace, compareRoutes, routeStreets];
}
