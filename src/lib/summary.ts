import { formatDistance, formatMinutes, formatPercent } from "@/lib/format";
import type { AnalyzedRoute, RoutesResponse } from "@/lib/schemas/routes";

function routeSentence(route: AnalyzedRoute, index: number): string {
  const score =
    route.environmentalScore === null
      ? "Il punteggio ambientale non è calcolabile perché le evidenze non bastano."
      : `Il punteggio ambientale sperimentale è ${route.environmentalScore} su 100.`;
  return (
    `Percorso ${index + 1}: ${formatDistance(route.distanceMeters)}, circa ${formatMinutes(route.durationSeconds)}. ` +
    `L'illuminazione è nota sul ${formatPercent(route.evidenceCoverage.litKnownFraction)} del tracciato ` +
    `e i punti luce mappati lungo il percorso sono ${route.counts.lampsAttributed}. ${score}`
  );
}

/** Riassunto del confronto da leggere ad alta voce: solo numeri dell'analisi, composti senza modello linguistico. */
export function spokenSummary(result: RoutesResponse): string {
  const count = result.routes.length === 1 ? "Un percorso disponibile." : `${result.routes.length} percorsi disponibili.`;
  return [
    count,
    ...result.routes.map(routeSentence),
    ...result.comparisonNotes,
    "Sono dati di OpenStreetMap: descrivono ciò che è stato mappato, non lampioni accesi né la sicurezza del percorso.",
  ].join(" ");
}
