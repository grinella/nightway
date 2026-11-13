import { SpeakButton } from "@/components/SpeakButton";
import { RouteDetails } from "@/components/routes/RouteDetails";
import { formatDistance, formatMinutes, formatPercent } from "@/lib/format";
import type { AnalyzedRoute, RoutesResponse } from "@/lib/schemas/routes";
import { spokenSummary } from "@/lib/summary";

type Props = { result: RoutesResponse; selectedRouteId: string | null; onSelect: (id: string) => void };

function CoverageBar({ fraction }: { fraction: number }) {
  return (
    <span className="block h-1.5 w-full rounded-full bg-white/12" aria-hidden="true">
      <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.round(fraction * 100)}%` }} />
    </span>
  );
}

/** Scheda del percorso: il tempo in grande come nelle app di navigazione, poi ciò che si sa dei dati. */
function RouteSummary({ route, index }: { route: AnalyzedRoute; index: number }) {
  return (
    <span className="grid gap-2.5 text-left">
      <span className="flex items-end justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className="text-[1.75rem] font-bold leading-none">{formatMinutes(route.durationSeconds)}</span>
          <span className="text-dim">{formatDistance(route.distanceMeters)}</span>
        </span>
        <span className="text-sm text-dim">Percorso {index + 1}</span>
      </span>
      <span className="flex flex-wrap gap-1.5">
        <span className="chip">Luce nota {formatPercent(route.evidenceCoverage.litKnownFraction)}</span>
        <span className="chip">{route.counts.lampsAttributed} punti luce</span>
        <span className="chip">{route.environmentalScore === null ? "ERS non calcolabile" : `ERS ${route.environmentalScore}/100`}</span>
      </span>
      <span className="grid gap-1 text-sm text-dim">
        <span className="flex justify-between gap-3">
          <span>Copertura delle evidenze</span>
          <span className="text-ink">{formatPercent(route.evidenceCoverage.overall)}</span>
        </span>
        <CoverageBar fraction={route.evidenceCoverage.overall} />
      </span>
    </span>
  );
}

export function RouteComparison({ result, selectedRouteId, onSelect }: Props) {
  return (
    <section aria-labelledby="routes-title" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <h3 id="routes-title" className="sr-only">
          {result.routes.length === 1 ? "Un percorso disponibile" : `${result.routes.length} percorsi disponibili`}
        </h3>
        <SpeakButton text={spokenSummary(result)} label="Ascolta il confronto" />
      </div>
      {result.routes.length === 1 && <p className="text-sm text-dim">Il servizio di routing non ha proposto alternative per questi due punti.</p>}
      {result.comparisonNotes.map((note) => (
        <p key={note} className="glass-card px-4 py-3 text-sm">
          {note}
        </p>
      ))}
      <ul className="grid gap-2.5">
        {result.routes.map((route, index) => {
          const selected = route.id === selectedRouteId;
          return (
            <li key={route.id} className="glass-card" data-selected={selected}>
              <button type="button" aria-expanded={selected} onClick={() => onSelect(route.id)} className="w-full rounded-[20px] p-4">
                <RouteSummary route={route} index={index} />
              </button>
              {selected && (
                <div className="px-4 pb-4">
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
