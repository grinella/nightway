import { z } from "zod";

const tags = z.record(z.string(), z.string()).default({});
const point = z.object({ lat: z.number(), lon: z.number() });

export const osmNodeSchema = z.object({
  type: z.literal("node"),
  id: z.number(),
  lat: z.number(),
  lon: z.number(),
  tags,
});

export const osmWaySchema = z.object({
  type: z.literal("way"),
  id: z.number(),
  geometry: z.array(point).min(2),
  tags,
});

export const overpassResponseSchema = z.object({
  osm3s: z.object({ timestamp_osm_base: z.string().optional() }).optional(),
  elements: z.array(z.union([osmNodeSchema, osmWaySchema])),
});

export type OsmNode = z.infer<typeof osmNodeSchema>;
export type OsmWay = z.infer<typeof osmWaySchema>;

/** Dati OSM grezzi dell'area, con provenienza. */
export type OsmDataset = {
  elements: (OsmNode | OsmWay)[];
  /** Data dei dati OSM dichiarata da Overpass. */
  osmBase?: string;
  retrievedAt: string;
  endpoint: string;
  /** "live" = interrogazione appena fatta o in cache; "snapshot" = estrazione salvata nel repository. */
  origin: "live" | "snapshot";
};
