import { DIMENSION_LABELS, formatDateTime, formatDistance, formatPercent } from "@/lib/format";
import type { AnalyzedRoute, RoutesResponse } from "@/lib/schemas/routes";
import { coverageOf, DIMENSIONS } from "@/lib/scoring/coverage";

type Props = { route: AnalyzedRoute; evidence: RoutesResponse["evidence"]; visionMessage: string };

function DimensionRow({ label, score, coverage, covered }: { label: string; score: number | null; coverage: number; covered: number }) {
  return (
    <tr className="border-t border-white/10">
      <th scope="row" className="py-2 pr-2 text-left font-normal">
        {label}
      </th>
      <td className="py-2 pr-2 text-right whitespace-nowrap">{score === null ? <span className="text-unknown">non valutabile</span> : `${Math.round(score)}/100`}</td>
      <td className="py-2 text-right whitespace-nowrap text-dim">
        {formatPercent(coverage)} · {formatDistance(covered)}
      </td>
    </tr>
  );
}

export function RouteDetails({ route, evidence, visionMessage }: Props) {
  return (
    <div className="grid gap-4 text-sm">
      <table className="w-full">
        <caption className="sr-only">Evidenze per dimensione: punteggio sui metri valutabili e quota di percorso coperta da dati</caption>
        <thead>
          <tr className="text-dim">
            <th scope="col" className="pb-1 text-left font-normal">
              Dimensione
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              Punteggio
            </th>
            <th scope="col" className="pb-1 text-right font-normal">
              Copertura
            </th>
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((dimension) => (
            <DimensionRow
              key={dimension}
              label={DIMENSION_LABELS[dimension]}
              score={route.dimensions[dimension].score}
              coverage={coverageOf(route.dimensions[dimension])}
              covered={route.dimensions[dimension].coveredMeters}
            />
          ))}
        </tbody>
      </table>

      <p className="text-dim">
        {route.counts.lampsAttributed} punti luce mappati lungo il percorso
        {route.counts.lampsUncertain > 0 && `, ${route.counts.lampsUncertain} con attribuzione incerta`} · {route.counts.servicesNearby} servizi e
        attività mappati entro 30 m.
      </p>

      {route.warnings.length > 0 && (
        <ul className="grid gap-1 text-dim">
          {route.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <p className="text-dim">
        {evidence ? (
          <>
            Fonte: OpenStreetMap ({evidence.license}) via {evidence.via},{" "}
            {evidence.origin === "snapshot" ? "estrazione salvata del" : "interrogazione del"} {formatDateTime(evidence.retrievedAt)}. Percorsi:
            Valhalla.
          </>
        ) : (
          "Percorsi: Valhalla. Evidenze OpenStreetMap non disponibili in questo momento."
        )}{" "}
        {visionMessage}
      </p>
    </div>
  );
}
