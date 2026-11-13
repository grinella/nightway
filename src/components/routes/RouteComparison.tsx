import { RouteDetails } from "@/components/routes/RouteDetails";
import { formatDistance, formatMinutes, formatPercent } from "@/lib/format";
import type { AnalyzedRoute, RoutesResponse } from "@/lib/schemas/routes";

type Props = { result: RoutesResponse; selectedRouteId: string | null; onSelect: (id: string) => void };

function CoverageBar({ fraction }: { fraction: number }) {
  return (
    <span className="block h-1.5 w-full rounded-full bg-line" aria-hidden="true">
      <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.round(fraction * 100)}%` }} />
    </span>
  );
}

function RouteSummary({ route, index }: { route: AnalyzedRoute; index: number }) {
  return (
    <span className="grid gap-2 text-left">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold">Percorso {index + 1}</span>
        <span>
          {formatDistance(route.distanceMeters)} · {formatMinutes(route.durationSeconds)}
        </span>
      </span>
      <span className="grid gap-1 text-sm text-dim">
        <span className="flex justify-between gap-3">
          <span>Copertura delle evidenze</span>
          <span className="text-ink">{formatPercent(route.evidenceCoverage.overall)}</span>
        </span>
        <CoverageBar fraction={route.evidenceCoverage.overall} />
        <span className="flex justify-between gap-3">
          <span>Tracciato con illuminazione nota</span>
          <span className="text-ink">{formatPercent(route.evidenceCoverage.litKnownFraction)}</span>
        </span>
        <span className="flex justify-between gap-3">
          <span>Punteggio ambientale (ERS)</span>
          {route.environmentalScore === null ? (
            <span className="text-unknown">non calcolabile</span>
          ) : (
            <span className="text-ink">{route.environmentalScore}/100</span>
          )}
        </span>
      </span>
    </span>
  );
}

export function RouteComparison({ result, selectedRouteId, onSelect }: Props) {
  return (
    <section aria-labelledby="routes-title" className="grid gap-3">
      <h2 id="routes-title" className="font-bold">
        {result.routes.length === 1 ? "Un percorso disponibile" : `${result.routes.length} percorsi disponibili`}
      </h2>
      {result.routes.length === 1 && <p className="text-sm text-dim">Il servizio di routing non ha proposto alternative per questi due punti.</p>}
      {result.comparisonNotes.map((note) => (
        <p key={note} className="rounded-control border border-line bg-raised px-3 py-2 text-sm">
          {note}
        </p>
      ))}
      <ul className="grid gap-2">
        {result.routes.map((route, index) => {
          const selected = route.id === selectedRouteId;
          return (
            <li key={route.id} className={`rounded-box border ${selected ? "border-sodium bg-raised" : "border-line"}`}>
              <button type="button" aria-expanded={selected} onClick={() => onSelect(route.id)} className="w-full rounded-box p-3 hover:bg-raised">
                <RouteSummary route={route} index={index} />
              </button>
              {selected && (
                <div className="px-3 pb-3">
                  <RouteDetails route={route} evidence={result.evidence} visionMessage={result.vision.message} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-dim">
        L&apos;ERS è un indicatore comparativo sperimentale: resta «non calcolabile» finché le evidenze coprono meno del 60% di ciò che servirebbe.
        Non misura la sicurezza di un percorso.
      </p>
    </section>
  );
}
