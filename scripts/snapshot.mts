/** Salva un'estrazione OSM reale e datata dell'area pilota: `npm run snapshot`. */
import { writeFileSync } from "node:fs";
import { PILOT } from "@/lib/config";
import { fetchOverpass } from "@/lib/osm/overpass";

const dataset = await fetchOverpass(PILOT.bbox);
writeFileSync("data/pilot-snapshot.json", JSON.stringify({ ...dataset, origin: "snapshot", bbox: PILOT.bbox }));
console.log(`${dataset.elements.length} elementi da ${dataset.endpoint} (OSM base ${dataset.osmBase})`);
