import { LIT_STYLE } from "@/lib/map-config";
import type { LitValue } from "@/lib/osm/normalize";

const LINES: { lit: LitValue; label: string }[] = [
  { lit: "yes", label: "Illuminazione dichiarata" },
  { lit: "limited", label: "Dichiarata limitata" },
  { lit: "no", label: "Dichiarata assente" },
  { lit: "unknown", label: "Ignota: nessuno l'ha mappata" },
];

function LineSample({ lit }: { lit: LitValue }) {
  const { color, dashArray } = LIT_STYLE[lit];
  return (
    <svg width="36" height="8" aria-hidden="true" className="shrink-0">
      <line x1="0" y1="4" x2="36" y2="4" stroke={color} strokeWidth="4" strokeDasharray={dashArray} />
    </svg>
  );
}

function LampSample({ filled }: { filled: boolean }) {
  return (
    <svg width="36" height="12" aria-hidden="true" className="shrink-0">
      <circle cx="18" cy="6" r="4.5" fill={filled ? "#ffb347" : "none"} stroke="#ffb347" strokeWidth="2" />
    </svg>
  );
}

export function EvidenceLegend() {
  return (
    <section aria-labelledby="legend-title" className="text-sm">
      <h2 id="legend-title" className="font-bold">
        Come leggere la mappa
      </h2>
      <ul className="mt-2 grid gap-1.5 text-dim">
        {LINES.map(({ lit, label }) => (
          <li key={lit} className="flex items-center gap-3">
            <LineSample lit={lit} />
            {label}
          </li>
        ))}
        <li className="flex items-center gap-3">
          <LampSample filled />
          Punto luce mappato lungo il percorso
        </li>
        <li className="flex items-center gap-3">
          <LampSample filled={false} />
          Punto luce vicino, forse su un&apos;altra strada
        </li>
      </ul>
      <p className="mt-3 text-dim">
        Sono dati di OpenStreetMap: descrivono ciò che i volontari hanno mappato, non lo stato reale di stasera. Un punto luce mappato non è un
        lampione acceso.
      </p>
    </section>
  );
}
