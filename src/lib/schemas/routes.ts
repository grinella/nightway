import { z } from "zod";
import { PILOT, limits } from "@/lib/config";
import { distance, toXY } from "@/lib/geo/planar";

const { south, west, north, east } = PILOT.bbox;

const pointSchema = z.object({
  lat: z.number().finite().min(south, "Punto fuori dall'area pilota").max(north, "Punto fuori dall'area pilota"),
  lon: z.number().finite().min(west, "Punto fuori dall'area pilota").max(east, "Punto fuori dall'area pilota"),
});

export const routesRequestSchema = z
  .object({ origin: pointSchema, destination: pointSchema })
  .strict()
  .superRefine(({ origin, destination }, ctx) => {
    const meters = distance(toXY([origin.lon, origin.lat]), toXY([destination.lon, destination.lat]));
    if (meters < limits.minStraightDistanceM) ctx.addIssue({ code: "custom", message: "Partenza e arrivo coincidono o sono troppo vicini." });
    if (meters > limits.maxStraightDistanceM) ctx.addIssue({ code: "custom", message: "Partenza e arrivo sono troppo distanti." });
  });

const lonLat = z.tuple([z.number(), z.number()]);
const litValue = z.enum(["yes", "no", "limited", "automatic", "24/7", "other", "unknown"]);
const walkValue = z.enum(["pedestrian", "sidewalk", "steps", "no_sidewalk", "unknown"]);
const dimensionValue = z.object({ score: z.number().nullable(), coveredMeters: z.number(), totalMeters: z.number() });

const provenanceSchema = z.object({
  source: z.literal("OpenStreetMap"),
  via: z.string(),
  retrievedAt: z.string(),
  osmBase: z.string().optional(),
  origin: z.enum(["live", "snapshot"]),
  license: z.literal("ODbL 1.0"),
});

const routeSchema = z.object({
  id: z.string(),
  distanceMeters: z.number(),
  durationSeconds: z.number(),
  geometry: z.object({ type: z.literal("LineString"), coordinates: z.array(lonLat) }),
  environmentalScore: z.number().nullable(),
  evidenceCoverage: z.object({ overall: z.number(), litKnownFraction: z.number() }),
  dimensions: z.object({
    lightingDeclared: dimensionValue,
    lamps: dimensionValue,
    visibility: dimensionValue,
    walkability: dimensionValue,
    services: dimensionValue,
  }),
  segments: z.array(
    z.object({
      coords: z.array(lonLat),
      lengthM: z.number(),
      lit: litValue,
      walk: walkValue,
      matched: z.boolean(),
      streetName: z.string().optional(),
    }),
  ),
  lamps: z.array(z.object({ id: z.number(), coord: lonLat, status: z.enum(["attributed", "uncertain"]) })),
  counts: z.object({ lampsAttributed: z.number(), lampsUncertain: z.number(), servicesNearby: z.number() }),
  warnings: z.array(z.string()),
  sources: z.array(z.string()),
});

export const routesResponseSchema = z.object({
  routes: z.array(routeSchema),
  comparisonNotes: z.array(z.string()),
  /** Provenienza delle evidenze OSM; null se non disponibili (stato sconosciuto, non assenza). */
  evidence: provenanceSchema.nullable(),
  /** Punti luce e way con `lit` dichiarato attorno ai percorsi, per il layer della mappa. */
  layer: z.object({
    lamps: z.array(lonLat),
    litWays: z.array(z.object({ coords: z.array(lonLat), lit: litValue })),
  }),
  vision: z.object({ status: z.enum(["disabled", "unavailable"]), message: z.string(), detections: z.array(z.unknown()) }),
  analysisVersion: z.string(),
  generatedAt: z.string(),
});

export type RoutesRequest = z.infer<typeof routesRequestSchema>;
export type RoutesResponse = z.infer<typeof routesResponseSchema>;
export type AnalyzedRoute = RoutesResponse["routes"][number];
