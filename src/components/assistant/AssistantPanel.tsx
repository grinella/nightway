"use client";

import { ConversationProvider, useConversation, type ClientTools } from "@elevenlabs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AGENT_FIRST_MESSAGE } from "@/lib/agent/prompt";
import { streetRuns, summarizeAnalysis } from "@/lib/agent/summaries";
import { postJson } from "@/lib/api-client";
import type { LatLon } from "@/lib/routing/types";
import type { AgentSession } from "@/lib/schemas/agent";
import type { RoutesResponse } from "@/lib/schemas/routes";

type Props = {
  origin: LatLon | null;
  destination: LatLon | null;
  result: RoutesResponse | null;
  onAnalysis: (analysis: RoutesResponse) => void;
};

type Line = { role: "user" | "agent"; text: string };

const SUGGESTIONS = [
  "Vado dalla metro Piramide alla Città dell'Altra Economia: cosa dicono i dati sui percorsi?",
  "Su quali strade del percorso 1 manca il dato sull'illuminazione?",
];

const fmt = (p: LatLon) => `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;
const mapContext = (origin: LatLon, destination: LatLon) => `[Punti selezionati sulla mappa — A: ${fmt(origin)}; B: ${fmt(destination)}]`;
const failure = (cause: unknown, fallback: string) => JSON.stringify({ error: cause instanceof Error ? cause.message : fallback });

/** Strumenti che l'agente esegue nel browser: interrogano le API di NIGHTWAY e aggiornano la mappa. */
function useAgentTools(result: RoutesResponse | null, onAnalysis: Props["onAnalysis"]): ClientTools {
  const latest = useRef({ result, onAnalysis });
  useEffect(() => {
    latest.current = { result, onAnalysis };
  });

  return useMemo<ClientTools>(
    () => ({
      find_place: async ({ query }) => {
        try {
          return JSON.stringify(await postJson("/api/places", { query }));
        } catch (cause) {
          return failure(cause, "Ricerca non riuscita.");
        }
      },
      compare_routes: async (p) => {
        try {
          const analysis = await postJson<RoutesResponse>("/api/routes", {
            origin: { lat: Number(p.origin_lat), lon: Number(p.origin_lon) },
            destination: { lat: Number(p.destination_lat), lon: Number(p.destination_lon) },
          });
          latest.current.result = analysis;
          latest.current.onAnalysis(analysis);
          return JSON.stringify(summarizeAnalysis(analysis));
        } catch (cause) {
          return failure(cause, "Analisi non riuscita.");
        }
      },
      route_streets: ({ route_id }) => {
        const route = latest.current.result?.routes.find((r) => r.id === route_id);
        return JSON.stringify(route ? { routeId: route.id, streets: streetRuns(route) } : { error: "Percorso non trovato: chiama prima compare_routes." });
      },
    }),
    [],
  );
}

function Assistant({ origin, destination, result, onAnalysis }: Props) {
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [mode, setMode] = useState<"voice" | "text">("text");
  const firstMessage = useRef<string | null>(null);
  const clientTools = useAgentTools(result, onAnalysis);

  const conversation = useConversation({
    clientTools,
    onMessage: ({ role, message }) =>
      setLines((current) => {
        const last = current[current.length - 1];
        // In chat la domanda è già stata fatta: il saluto iniziale dell'agente sarebbe fuori posto.
        if (role === "agent" && message === AGENT_FIRST_MESSAGE && current.length > 0) return current;
        // I messaggi scritti sono già in elenco: evita il doppione se il servizio li rimanda indietro.
        return last?.role === role && last.text === message ? current : [...current, { role, text: message }];
      }),
    onConnect: () => {
      setStarting(false);
      if (firstMessage.current) conversation.sendUserMessage(firstMessage.current);
      firstMessage.current = null;
    },
    onDisconnect: () => setStarting(false),
    onError: () => {
      setStarting(false);
      setError("La conversazione con l'assistente si è interrotta: riprova.");
    },
  });

  const connected = conversation.status === "connected";
  const busy = starting || conversation.status === "connecting";

  // In voce i punti scelti sulla mappa arrivano all'agente come contesto, senza interrompere il dialogo.
  useEffect(() => {
    if (connected && origin && destination) conversation.sendContextualUpdate(mapContext(origin, destination));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `conversation` cambia a ogni render
  }, [connected, origin, destination]);

  async function start(requested: "voice" | "text") {
    setError("");
    setStarting(true);
    setMode(requested);
    try {
      if (requested === "voice") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
          throw new Error("Per parlare con l'assistente serve il permesso del microfono. In alternativa scrivi la domanda.");
        });
        stream.getTracks().forEach((track) => track.stop());
      }
      const session = await postJson<AgentSession>("/api/agent/session", { mode: requested });
      conversation.startSession(
        "conversationToken" in session
          ? { conversationToken: session.conversationToken, connectionType: "webrtc" }
          : { signedUrl: session.signedUrl, connectionType: "websocket", textOnly: true },
      );
    } catch (cause) {
      firstMessage.current = null;
      setStarting(false);
      setError(cause instanceof Error ? cause.message : "Non riesco ad avviare l'assistente.");
    }
  }

  function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setLines((current) => [...current, { role: "user", text }]);
    setDraft("");
    const outgoing = origin && destination ? `${text}\n\n${mapContext(origin, destination)}` : text;
    if (connected) {
      conversation.sendUserMessage(outgoing);
      return;
    }
    firstMessage.current = outgoing;
    start("text");
  }

  return (
    <section aria-labelledby="assistant-title" className="grid gap-3">
      <h3 id="assistant-title" className="sr-only">
        Chiedi all&apos;assistente
      </h3>
      <p className="text-sm text-dim">
        Nomina due luoghi di Testaccio o Ostiense, a voce o per iscritto, oppure fai domande sui percorsi già calcolati. Risponde solo con i dati dei
        percorsi e di OpenStreetMap; voce e domande sono elaborate da ElevenLabs.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {connected ? (
          <button type="button" onClick={() => conversation.endSession()} className="btn">
            Termina la conversazione
          </button>
        ) : (
          <button
            type="button"
            onClick={() => start("voice")}
            disabled={busy}
            className="btn btn-primary"
          >
            Parla con l&apos;assistente
          </button>
        )}
        <span aria-live="polite" className="text-sm text-dim">
          {busy && "Mi collego…"}
          {!busy && connected && mode === "text" && "Collegato: scrivi la tua domanda."}
          {!busy && connected && mode === "voice" && (conversation.isSpeaking ? "Sta rispondendo…" : "In ascolto: parla o scrivi.")}
        </span>
      </div>

      {lines.length === 0 && (
        <ul className="grid gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => ask(suggestion)}
                disabled={busy}
                className="btn btn-row text-sm"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ol aria-live="polite" className="grid gap-3">
        {lines.map((line, i) => (
          <li key={i} className={line.role === "user" ? "glass-card ml-8 px-4 py-2.5" : "mr-2 px-1"}>
            <span className="sr-only">{line.role === "user" ? "Tu: " : "Assistente: "}</span>
            <p className="whitespace-pre-wrap">{line.text}</p>
          </li>
        ))}
      </ol>

      {error && (
        <p role="alert" className="text-sm text-alert">
          {error}
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
      >
        <label htmlFor="assistant-input" className="sr-only">
          Domanda per l&apos;assistente
        </label>
        <input
          id="assistant-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={500}
          placeholder="Es. da Porta San Paolo al Mattatoio"
          className="field min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="btn"
        >
          Invia
        </button>
      </form>
    </section>
  );
}

export function AssistantPanel(props: Props) {
  return (
    <ConversationProvider>
      <Assistant {...props} />
    </ConversationProvider>
  );
}
