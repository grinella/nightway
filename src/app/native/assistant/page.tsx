"use client";

import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { adoptAnalysis, useAppState } from "@/lib/app-state";

export default function NativeAssistantPage() {
  const { origin, destination, result } = useAppState();
  return (
    <main className="px-4 pb-8 pt-2">
      <h1 className="sr-only">Assistente</h1>
      <AssistantPanel origin={origin} destination={destination} result={result} onAnalysis={adoptAnalysis} />
    </main>
  );
}
