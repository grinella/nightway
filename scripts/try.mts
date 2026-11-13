import { analyzeRoutes } from "@/lib/analyze";
const [a, b, c, d] = process.argv.slice(2).map(Number);
const t = Date.now();
const r = await analyzeRoutes({ lat: a, lon: b }, { lat: c, lon: d });
console.log(Date.now() - t, "ms", r.evidence, r.comparisonNotes, "layer", r.layer.lamps.length, r.layer.litWays.length);
for (const x of r.routes) console.log(x.id, x.distanceMeters, x.durationSeconds, "ERS", x.environmentalScore, x.evidenceCoverage, JSON.stringify(x.dimensions), x.counts, x.warnings, "matched", x.segments.filter((s) => s.matched).length, "/", x.segments.length);
