import { ANALYSIS_VERSION, analysis } from "@/lib/config";
import { attributeLamps, countNearby, matchSegmentToWay, type IndexedWay } from "@/lib/geo/match-evidence";
import { toLonLat, toXY, type LonLat } from "@/lib/geo/planar";
import { segmentRoute, type RouteSegment } from "@/lib/geo/segment";
import { getPilotData, type PilotData } from "@/lib/osm/dataset";
import { normalizeLit, normalizeWalk, provenanceOf } from "@/lib/osm/normalize";
import { fetchPedestrianRoutes } from "@/lib/routing/valhalla";
import type { LatLon, PedestrianRoute } from "@/lib/routing/types";
import { routesResponseSchema, type AnalyzedRoute, type RoutesResponse } from "@/lib/schemas/routes";
import { computeDimensions, coverageOf, type SegmentEvidence } from "@/lib/scoring/coverage";
import { computeErs } from "@/lib/scoring/ers";
import { getVisionStatus } from "@/lib/vision";

const OSM_UNAVAILABLE = "Evidenze OpenStreetMap non disponibili in questo momento: lo stato è sconosciuto, non assente.";
const DISCLAIMER_LAMPS = "I punti luce mappati non indicano lampioni accesi né una strada realmente illuminata.";

const streetKeyOf = (way: IndexedWay | null) => (way ? (way.tags.name ?? `way/${way.id}`) : null);

/** Un tratto è vicino a un punto luce se ne ha uno attribuito entro `lampSpacingM` lungo il percorso. */
function lampNearFlags(segments: RouteSegment[], lampSegments: number[]): boolean[] {
  const reach = Math.floor(analysis.lampSpacingM / (segments[0]?.lengthM || analysis.segmentLengthM));
  return segments.map((s) => lampSegments.some((i) => Math.abs(i - s.index) <= reach));
}

/** Analizza un percorso reale contro i dati OSM; senza dati tutte le evidenze restano sconosciute. */
export function analyzeRoute(route: PedestrianRoute, id: string, data: PilotData | null): AnalyzedRoute {
  const segments = segmentRoute(route.coordinates, analysis.segmentLengthM);
  const matches = segments.map((s) => (data ? matchSegmentToWay(s, data.ways) : null));
  const lamps = data ? attributeLamps(segments, matches, data.lamps, data.ways) : [];
  const attributed = lamps.filter((l) => l.status === "attributed");
  const lampNear = lampNearFlags(segments, attributed.map((l) => l.segmentIndex));
  const services = data ? countNearby(segments, data.services, analysis.serviceMaxDistM) : segments.map(() => 0);

  const evidence: SegmentEvidence[] = segments.map((s, i) => ({
    lengthM: s.lengthM,
    streetKey: streetKeyOf(matches[i]),
    lit: matches[i] ? normalizeLit(matches[i].tags) : "unknown",
    walk: matches[i] ? normalizeWalk(matches[i].tags) : "unknown",
    lampNear: lampNear[i],
    serviceNear: services[i] > 0,
  }));
  const dimensions = computeDimensions(evidence);
  const ers = computeErs(dimensions);
  const unmatched = matches.filter((m) => !m).length;

  return {
    id,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    geometry: { type: "LineString", coordinates: route.coordinates },
    environmentalScore: data ? ers.environmentalScore : null,
    evidenceCoverage: { overall: data ? ers.evidenceCoverage : 0, litKnownFraction: coverageOf(dimensions.lightingDeclared) },
    dimensions,
    segments: segments.map((s, i) => ({
      coords: s.coords,
      lengthM: s.lengthM,
      lit: evidence[i].lit,
      walk: evidence[i].walk,
      matched: Boolean(matches[i]),
      streetName: matches[i]?.tags.name,
    })),
    lamps: lamps.map(({ id: lampId, coord, status }) => ({ id: lampId, coord, status })),
    counts: {
      lampsAttributed: attributed.length,
      lampsUncertain: lamps.length - attributed.length,
      servicesNearby: services.reduce((a, b) => a + b, 0),
    },
    warnings: data
      ? [
          ...ers.warnings,
          ...(unmatched ? [`${unmatched} tratti su ${segments.length} non agganciati con certezza a una strada OSM: trattati come sconosciuti.`] : []),
          ...(attributed.length ? [DISCLAIMER_LAMPS] : []),
        ]
      : [OSM_UNAVAILABLE],
    sources: data ? ["Valhalla (routing)", "OpenStreetMap"] : ["Valhalla (routing)"],
  };
}

/** Evita classifiche fuorvianti tra percorsi con quantità di evidenze molto diverse. */
export function comparisonNotes(routes: AnalyzedRoute[]): string[] {
  const coverages = routes.map((r) => r.evidenceCoverage.overall);
  const gap = Math.max(...coverages) - Math.min(...coverages);
  if (routes.length > 1 && gap > analysis.coverageGapWarning) {
    return ["I percorsi hanno coperture di evidenze molto diverse: il confronto tra punteggi non è affidabile."];
  }
  return [];
}

function corridor(routes: PedestrianRoute[], padM = 120) {
  const points = routes.flatMap((r) => r.coordinates.map(toXY));
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { minX: Math.min(...xs) - padM, maxX: Math.max(...xs) + padM, minY: Math.min(...ys) - padM, maxY: Math.max(...ys) + padM };
}

function buildLayer(routes: PedestrianRoute[], data: PilotData | null): RoutesResponse["layer"] {
  if (!data) return { lamps: [], litWays: [] };
  const box = corridor(routes);
  const inside = ([lon, lat]: LonLat) => {
    const p = toXY([lon, lat]);
    return p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;
  };
  return {
    lamps: data.lamps.map((l): LonLat => [l.lon, l.lat]).filter(inside),
    litWays: data.ways
      .filter((w) => w.tags.lit && w.maxX >= box.minX && w.minX <= box.maxX && w.maxY >= box.minY && w.minY <= box.maxY)
      .map((w) => ({ coords: w.points.map(toLonLat), lit: normalizeLit(w.tags) })),
  };
}

/** Pipeline completa: percorsi reali da Valhalla, evidenze OSM, coverage, ERS e stato vision. */
export async function analyzeRoutes(origin: LatLon, destination: LatLon): Promise<RoutesResponse> {
  const [routes, data] = await Promise.all([fetchPedestrianRoutes(origin, destination), getPilotData().catch(() => null)]);
  const analyzed = routes.map((route, i) => analyzeRoute(route, `route-${i + 1}`, data));
  const box = corridor(routes, 0);
  const [west, south] = toLonLat({ x: box.minX, y: box.minY });
  const [east, north] = toLonLat({ x: box.maxX, y: box.maxY });
  return routesResponseSchema.parse({
    routes: analyzed,
    comparisonNotes: comparisonNotes(analyzed),
    evidence: data ? provenanceOf(data.dataset) : null,
    layer: buildLayer(routes, data),
    vision: await getVisionStatus([west, south, east, north]),
    analysisVersion: ANALYSIS_VERSION,
    generatedAt: new Date().toISOString(),
  } satisfies RoutesResponse);
}
