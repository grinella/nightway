import { toLonLat } from "@/lib/geo/planar";
import type { OsmNode, OsmWay } from "@/lib/osm/types";
import type { SegmentEvidence } from "@/lib/scoring/coverage";

/** Coordinate costruite in metri attorno al centro dell'area pilota: geometrie di test, non dati reali. */
export const at = (x: number, y: number) => toLonLat({ x, y });

export const way = (id: number, points: [number, number][], tags: Record<string, string> = {}): OsmWay => ({
  type: "way",
  id,
  tags: { highway: "residential", ...tags },
  geometry: points.map(([x, y]) => {
    const [lon, lat] = at(x, y);
    return { lat, lon };
  }),
});

export const node = (id: number, x: number, y: number, tags: Record<string, string> = {}): OsmNode => {
  const [lon, lat] = at(x, y);
  return { type: "node", id, lat, lon, tags };
};

export const evidence = (overrides: Partial<SegmentEvidence> = {}): SegmentEvidence => ({
  lengthM: 100,
  streetKey: "Via di Prova",
  lit: "unknown",
  walk: "unknown",
  lampNear: false,
  serviceNear: false,
  ...overrides,
});
