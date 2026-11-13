/** Configurazione centrale: area pilota, provider, soglie. Le soglie sono ipotesi di prodotto, non valori calibrati. */

export type Bbox = { south: number; west: number; north: number; east: number };

export const PILOT = {
  name: "Testaccio / Ostiense, Roma",
  bbox: { south: 41.866, west: 12.464, north: 41.886, east: 12.488 } satisfies Bbox,
  center: { lat: 41.876, lon: 12.476 },
} as const;

export const ANALYSIS_VERSION = "mvp-0.1";

const list = (value: string | undefined, fallback: string[]) =>
  value?.split(",").map((s) => s.trim()).filter(Boolean) ?? fallback;

export const providers = {
  valhallaUrl: process.env.VALHALLA_URL || "https://valhalla1.openstreetmap.de",
  /** Più endpoint separati da virgola: vengono provati in ordine. */
  overpassUrls: list(process.env.OVERPASS_URL, [
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass-api.de/api/interpreter",
  ]),
  userAgent: "NIGHTWAY-hackathon-demo/0.1 (pedestrian route evidence; Rome pilot)",
  valhallaTimeoutMs: 10_000,
  overpassTimeoutMs: 12_000,
  overpassCacheMs: 6 * 60 * 60 * 1000,
};

export const limits = {
  /** Distanza massima in linea d'aria tra A e B. */
  maxStraightDistanceM: 3_500,
  minStraightDistanceM: 20,
  maxBodyBytes: 2_000,
  rateLimit: { requests: 20, windowMs: 60_000 },
};

export const analysis = {
  segmentLengthM: 30,
  wayMatchMaxDistM: 8,
  wayMatchMaxAngleDeg: 30,
  lampMaxDistM: 15,
  /** Un segmento è «vicino a un punto luce mappato» entro questa distanza lungo strada. */
  lampSpacingM: 35,
  serviceMaxDistM: 30,
  /** Sotto questa Evidence Coverage complessiva l'ERS resta null. Ipotesi da validare. */
  minCoverageForScore: 0.6,
  /** Oltre questa differenza di coverage tra percorsi il confronto dell'ERS è sconsigliato. */
  coverageGapWarning: 0.25,
  weights: {
    lightingDeclared: 0.3,
    lamps: 0.2,
    visibility: 0.2,
    walkability: 0.2,
    services: 0.1,
  },
} as const;

export const vision = {
  enabled: process.env.VISION_ENABLED === "true",
  mapillaryToken: process.env.MAPILLARY_TOKEN || "",
};
