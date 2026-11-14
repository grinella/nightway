import { EXAMPLES } from "@/lib/map-config";
import type { LatLon } from "@/lib/routing/types";

type Props = { hasResult: boolean; disabled: boolean; onChoose: (origin: LatLon, destination: LatLon) => void };

/** Tragitti di prova tra luoghi reali dell'area pilota. */
export function RouteExamples({ hasResult, disabled, onChoose }: Props) {
  return (
    <section aria-labelledby="pick-title" className="grid gap-2">
      <h3 id="pick-title" className="font-semibold">
        {hasResult ? "Prova un altro tragitto" : "Prova un tragitto"}
      </h3>
      <p className="text-sm text-dim">Scegli due punti sulla mappa, oppure parti da luoghi reali della zona.</p>
      {EXAMPLES.map((example) => (
        <button key={example.label} type="button" disabled={disabled} onClick={() => onChoose(example.origin, example.destination)} className="btn btn-row">
          {example.label}
        </button>
      ))}
    </section>
  );
}
