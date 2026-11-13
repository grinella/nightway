import { analysis } from "@/lib/config";
import { angleDiff, bearing, pointToPolyline, pointToSegment, toXY, type LonLat, type XY } from "@/lib/geo/planar";
import type { RouteSegment } from "@/lib/geo/segment";
import type { OsmNode, OsmWay } from "@/lib/osm/types";

export type IndexedWay = {
  id: number;
  tags: Record<string, string>;
  points: XY[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function indexWays(ways: OsmWay[]): IndexedWay[] {
  return ways.map((way) => {
    const points = way.geometry.map((p) => toXY([p.lon, p.lat]));
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
      id: way.id,
      tags: way.tags,
      points,
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  });
}

const nearBbox = (p: XY, way: IndexedWay, pad: number) =>
  p.x >= way.minX - pad && p.x <= way.maxX + pad && p.y >= way.minY - pad && p.y <= way.maxY + pad;

/** Aggancia un tratto al way OSM più vicino che corre nella stessa direzione; null se nessuno è plausibile. */
export function matchSegmentToWay(
  segment: RouteSegment,
  ways: IndexedWay[],
  maxDistM: number = analysis.wayMatchMaxDistM,
  maxAngleDeg: number = analysis.wayMatchMaxAngleDeg,
): IndexedWay | null {
  let best: IndexedWay | null = null;
  let bestDist = maxDistM;
  for (const way of ways) {
    if (!nearBbox(segment.mid, way, maxDistM)) continue;
    for (let i = 1; i < way.points.length; i++) {
      const a = way.points[i - 1];
      const b = way.points[i];
      const d = pointToSegment(segment.mid, a, b);
      if (d <= bestDist && angleDiff(segment.bearing, bearing(a, b)) <= maxAngleDeg) {
        best = way;
        bestDist = d;
      }
    }
  }
  return best;
}

export type LampMatch = {
  id: number;
  coord: LonLat;
  /** "uncertain": vicino al percorso ma plausibilmente su un'altra strada; non entra nei calcoli. */
  status: "attributed" | "uncertain";
  segmentIndex: number;
  distanceM: number;
};

/** Un way entro questa distanza dal tratto è considerato la stessa strada (es. carreggiata accanto al marciapiede). */
const SAME_STREET_M = 12;

/** Associa i punti luce ai tratti. Un punto luce più vicino a un'altra strada che al percorso resta "uncertain". */
export function attributeLamps(
  segments: RouteSegment[],
  matches: (IndexedWay | null)[],
  lamps: OsmNode[],
  ways: IndexedWay[],
  maxDistM: number = analysis.lampMaxDistM,
): LampMatch[] {
  const result: LampMatch[] = [];
  for (const lamp of lamps) {
    const p = toXY([lamp.lon, lamp.lat]);
    let segmentIndex = -1;
    let distanceM = maxDistM;
    for (const segment of segments) {
      const d = pointToPolyline(p, segment.points);
      if (d <= distanceM) {
        segmentIndex = segment.index;
        distanceM = d;
      }
    }
    if (segmentIndex < 0) continue;
    const matched = matches[segmentIndex];
    const mid = segments[segmentIndex].mid;
    const onOtherStreet = ways.some(
      (way) =>
        way.id !== matched?.id &&
        nearBbox(p, way, distanceM) &&
        pointToPolyline(p, way.points) < distanceM &&
        pointToPolyline(mid, way.points) > SAME_STREET_M,
    );
    result.push({
      id: lamp.id,
      coord: [lamp.lon, lamp.lat],
      status: matched && !onOtherStreet ? "attributed" : "uncertain",
      segmentIndex,
      distanceM,
    });
  }
  return result;
}

/** Per ogni tratto, il numero di punti (es. servizi mappati) entro `maxDistM`. */
export function countNearby(segments: RouteSegment[], nodes: OsmNode[], maxDistM: number): number[] {
  const points = nodes.map((n) => toXY([n.lon, n.lat]));
  return segments.map((segment) => points.filter((p) => pointToPolyline(p, segment.points) <= maxDistM).length);
}
