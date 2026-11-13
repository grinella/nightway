import { analysis } from "@/lib/config";
import { litScore, walkScore, type LitValue, type WalkValue } from "@/lib/osm/normalize";

export type Dimension = "lightingDeclared" | "lamps" | "visibility" | "walkability" | "services";
export const DIMENSIONS: Dimension[] = ["lightingDeclared", "lamps", "visibility", "walkability", "services"];

/** `score` è 0..100 sui soli metri valutabili; null se nessun metro è valutabile. */
export type DimensionValue = { score: number | null; coveredMeters: number; totalMeters: number };
export type Dimensions = Record<Dimension, DimensionValue>;
export type Weights = Record<Dimension, number>;

/** Evidenze di un tratto di percorso, già agganciate al way. */
export type SegmentEvidence = {
  lengthM: number;
  /** Strada di appartenenza (nome o id del way); null se il tratto non è agganciato. */
  streetKey: string | null;
  lit: LitValue;
  walk: WalkValue;
  lampNear: boolean;
  serviceNear: boolean;
};

const round = (n: number) => Math.round(n * 10) / 10;

/** Dimensione basata su un attributo del way: valutabile solo dove l'attributo è noto. */
function attributeDimension(segments: SegmentEvidence[], scoreOf: (s: SegmentEvidence) => number | null): DimensionValue {
  let covered = 0;
  let weighted = 0;
  let total = 0;
  for (const segment of segments) {
    total += segment.lengthM;
    const score = scoreOf(segment);
    if (score === null) continue;
    covered += segment.lengthM;
    weighted += score * segment.lengthM;
  }
  return { score: covered ? round((weighted / covered) * 100) : null, coveredMeters: round(covered), totalMeters: round(total) };
}

/** Dimensione basata su punti mappati (lampioni, servizi): l'assenza di punti non prova nulla, quindi
 *  è valutabile solo sulle strade dove almeno un punto è mappato lungo il percorso. */
function presenceDimension(segments: SegmentEvidence[], isNear: (s: SegmentEvidence) => boolean): DimensionValue {
  const mappedStreets = new Set(segments.filter((s) => s.streetKey && isNear(s)).map((s) => s.streetKey));
  return attributeDimension(segments, (s) => (s.streetKey && mappedStreets.has(s.streetKey) ? Number(isNear(s)) : null));
}

export function computeDimensions(segments: SegmentEvidence[]): Dimensions {
  const totalMeters = round(segments.reduce((sum, s) => sum + s.lengthM, 0));
  return {
    lightingDeclared: attributeDimension(segments, (s) => litScore(s.lit)),
    lamps: presenceDimension(segments, (s) => s.lampNear),
    // Occlusioni e linee di vista richiedono dati 3D verificati: non valutata in questa versione.
    visibility: { score: null, coveredMeters: 0, totalMeters },
    walkability: attributeDimension(segments, (s) => walkScore(s.walk)),
    services: presenceDimension(segments, (s) => s.serviceNear),
  };
}

export const coverageOf = (d: DimensionValue) => (d.totalMeters ? d.coveredMeters / d.totalMeters : 0);

/** Evidence Coverage complessiva 0..1: quota di metri valutabili per dimensione, pesata con i pesi dichiarati. */
export function overallCoverage(dimensions: Dimensions, weights: Weights = analysis.weights): number {
  const weightSum = DIMENSIONS.reduce((sum, d) => sum + weights[d], 0);
  return DIMENSIONS.reduce((sum, d) => sum + weights[d] * coverageOf(dimensions[d]), 0) / weightSum;
}
