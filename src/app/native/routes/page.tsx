"use client";

import { RouteComparison } from "@/components/routes/RouteComparison";
import { RouteExamples } from "@/components/routes/RouteExamples";
import { analyze, selectRoute, useAppState } from "@/lib/app-state";

export default function NativeRoutesPage() {
  const { result, selectedRouteId, status } = useAppState();
  return (
    <main className="grid gap-5 px-4 pb-8 pt-2">
      <h1 className="sr-only">Percorsi</h1>
      {status.kind === "loading" && <p aria-live="polite">Calcolo i percorsi…</p>}
      {status.kind === "error" && (
        <p role="alert" className="text-alert">
          {status.message}
        </p>
      )}
      {result && <RouteComparison result={result} selectedRouteId={selectedRouteId} onSelect={selectRoute} />}
      <RouteExamples hasResult={result !== null} disabled={status.kind === "loading"} onChoose={analyze} />
    </main>
  );
}
