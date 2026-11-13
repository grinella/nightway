import type { AnalyzedRoute, RoutesResponse } from "@/lib/schemas/routes";

/** Riassunti compatti dell'analisi, nella forma che l'agente riceve come risultato degli strumenti. */

const pct = (n: number) => Math.round(n * 100);

function summarizeRoute(route: AnalyzedRoute) {
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

export function summarizeAnalysis(analysis: RoutesResponse) {
  return {
    routes: analysis.routes.map(summarizeRoute),
    comparisonNotes: analysis.comparisonNotes,
    evidenceSource: analysis.evidence ?? "non disponibile: stato sconosciuto",
    vision: analysis.vision.message,
  };
}

/** Raggruppa i tratti consecutivi sulla stessa strada con le stesse evidenze dichiarate. */
export function streetRuns(route: AnalyzedRoute) {
  const runs: { street: string; lit: string; walk: string; meters: number }[] = [];
  for (const segment of route.segments) {
    const street = segment.matched ? (segment.streetName ?? "tratto senza nome") : "non agganciato a OSM";
    const last = runs[runs.length - 1];
    if (last && last.street === street && last.lit === segment.lit && last.walk === segment.walk) last.meters += segment.lengthM;
    else runs.push({ street, lit: segment.lit, walk: segment.walk, meters: segment.lengthM });
  }
  return runs.map((run) => ({ ...run, meters: Math.round(run.meters) }));
}
