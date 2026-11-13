import { analysis } from "@/lib/config";
import { DIMENSIONS, overallCoverage, type Dimensions, type Weights } from "@/lib/scoring/coverage";

export type ErsResult = {
  /** Environmental Route Score 0..100, comparativo e sperimentale; null se le evidenze non bastano. */
  environmentalScore: number | null;
  evidenceCoverage: number;
  warnings: string[];
};

export const INSUFFICIENT_EVIDENCE = "Evidenze insufficienti: punteggio non calcolabile.";

/** Media pesata delle sole dimensioni valutabili, con pesi rinormalizzati; null sotto la soglia di copertura. */
export function computeErs(
  dimensions: Dimensions,
  weights: Weights = analysis.weights,
  minCoverage: number = analysis.minCoverageForScore,
): ErsResult {
  const evidenceCoverage = overallCoverage(dimensions, weights);
  const valid = DIMENSIONS.filter((d) => dimensions[d].score !== null);
  if (evidenceCoverage < minCoverage || valid.length === 0) {
    return { environmentalScore: null, evidenceCoverage, warnings: [INSUFFICIENT_EVIDENCE] };
  }
  const weightSum = valid.reduce((sum, d) => sum + weights[d], 0);
  const score = valid.reduce((sum, d) => sum + weights[d] * (dimensions[d].score as number), 0) / weightSum;
  const missing = DIMENSIONS.length - valid.length;
  return {
    environmentalScore: Math.round(score),
    evidenceCoverage,
    warnings: missing
      ? [`Punteggio calcolato su ${valid.length} dimensioni su ${DIMENSIONS.length}, con pesi rinormalizzati.`]
      : [],
  };
}
