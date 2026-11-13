/** Audit riproducibile dell'area pilota sui dati OSM reali: `npm run audit` scrive docs/AUDIT.md. */
import { readFileSync, writeFileSync } from "node:fs";
import { PILOT } from "@/lib/config";
import { polylineLength, toXY } from "@/lib/geo/planar";
import { isServicePoi, isStreetLamp, isWalkableWay, normalizeLit } from "@/lib/osm/normalize";
import { fetchOverpass } from "@/lib/osm/overpass";
import type { OsmDataset, OsmWay } from "@/lib/osm/types";

const live = process.argv.includes("--live");
const dataset: OsmDataset = live ? await fetchOverpass(PILOT.bbox) : JSON.parse(readFileSync("data/pilot-snapshot.json", "utf8"));

const ways = dataset.elements.filter((e): e is OsmWay => e.type === "way" && isWalkableWay(e.tags));
const metersOf = (w: OsmWay) => polylineLength(w.geometry.map((p) => toXY([p.lon, p.lat])));
const total = ways.reduce((sum, w) => sum + metersOf(w), 0);

function byValue(valueOf: (w: OsmWay) => string): [string, number][] {
  const meters = new Map<string, number>();
  for (const w of ways) meters.set(valueOf(w), (meters.get(valueOf(w)) ?? 0) + metersOf(w));
  return [...meters.entries()].sort((a, b) => b[1] - a[1]);
}

const pct = (m: number) => `${((m / total) * 100).toFixed(1)}%`;
const table = (title: string, rows: [string, number][]) =>
  [`| ${title} | Metri | Quota |`, "|---|---:|---:|", ...rows.map(([k, m]) => `| \`${k}\` | ${Math.round(m)} | ${pct(m)} |`)].join("\n");

const lit = byValue((w) => (w.tags.lit ? normalizeLit(w.tags) : "assente"));
const litKnown = lit.filter(([k]) => k !== "assente").reduce((sum, [, m]) => sum + m, 0);
const lamps = dataset.elements.filter((e) => e.type === "node" && isStreetLamp(e.tags)).length;
const services = dataset.elements.filter((e) => e.type === "node" && isServicePoi(e.tags)).length;
const { south, west, north, east } = PILOT.bbox;

writeFileSync(
  "docs/AUDIT.md",
  `# Audit dei dati — area pilota

Generato da \`npm run audit\` (\`scripts/audit.mts\`). I numeri sono calcolati sull'estrazione indicata, non stimati.

\`\`\`text
Area pilota: ${PILOT.name} — bbox S ${south}, W ${west}, N ${north}, E ${east}
Data estrazione: ${dataset.retrievedAt} (dati OSM al ${dataset.osmBase ?? "n/d"}, via ${new URL(dataset.endpoint).host})
Rete analizzata (m): ${Math.round(total)} su ${ways.length} way con tag highway percorribili
Rete con lit noto (m / %): ${Math.round(litKnown)} / ${pct(litKnown)}
Rete con lit ignoto (m / %): ${Math.round(total - litKnown)} / ${pct(total - litKnown)}
Punti street_lamp mappati (n): ${lamps}
Densità punti mappati (n/km di rete): ${(lamps / (total / 1000)).toFixed(2)}
Servizi e attività mappati come nodi (n): ${services}
\`\`\`

La densità riguarda i **punti mappati**, non i lampioni esistenti.

## Illuminazione dichiarata (\`lit\`)

${table("lit", lit)}

## Tipo di way (\`highway\`)

${table("highway", byValue((w) => w.tags.highway))}

## Marciapiede (\`sidewalk\`)

${table("sidewalk", byValue((w) => w.tags.sidewalk ?? "assente"))}

## Superficie (\`surface\`)

${table("surface", byValue((w) => w.tags.surface ?? "assente"))}
`,
);
console.log(`docs/AUDIT.md scritto: rete ${Math.round(total)} m, lit noto ${pct(litKnown)}, ${lamps} punti luce`);
