"use client";

import { ConversationProvider, useConversation, type ClientTools } from "@elevenlabs/react";
import { useEffect, useMemo, useRef } from "react";
import { AGENT_FIRST_MESSAGE } from "@/lib/agent/prompt";
import { streetRuns, summarizeAnalysis } from "@/lib/agent/summaries";
import { postJson } from "@/lib/api-client";
import { addAgentLine, adoptAnalysis, getState, registerCommands, startTour, updateAgent, useAppState, type AgentState } from "@/lib/app-state";
import type { LatLon } from "@/lib/routing/types";
import type { AgentSession } from "@/lib/schemas/agent";
import type { RoutesResponse } from "@/lib/schemas/routes";

const fmt = (p: LatLon) => `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;
const mapContext = (origin: LatLon, destination: LatLon) => `[Punti selezionati sulla mappa — A: ${fmt(origin)}; B: ${fmt(destination)}]`;
const failure = (cause: unknown, fallback: string) => JSON.stringify({ error: cause instanceof Error ? cause.message : fallback });

/** Strumenti che l'agente esegue nel browser: interrogano le API di NIGHTWAY e muovono la mappa. */
const CLIENT_TOOLS: ClientTools = {
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
      adoptAnalysis(analysis);
      return JSON.stringify(summarizeAnalysis(analysis));
    } catch (cause) {
      return failure(cause, "Analisi non riuscita.");
    }
  },
  route_streets: ({ route_id }) => {
    const route = getState().result?.routes.find((r) => r.id === route_id);
    return JSON.stringify(route ? { routeId: route.id, streets: streetRuns(route) } : { error: "Percorso non trovato: chiama prima compare_routes." });
  },
  show_route: ({ route_id, street }) =>
    JSON.stringify(
      startTour(String(route_id), typeof street === "string" && street ? street : null)
        ? { shown: true }
        : { error: "Percorso non trovato: chiama prima compare_routes." },
    ),
};

const STATUS: Record<AgentState["phase"], string> = {
  off: "Tocca per parlare con l'assistente",
  connecting: "Mi collego…",
  listening: "Ti ascolto",
  speaking: "Sto parlando",
};

function Agent({ dock }: { dock: string }) {
  const { origin, destination, agent } = useAppState();
  const firstMessage = useRef<string | null>(null);
  const starting = useRef(false);

  const conversation = useConversation({
    clientTools: CLIENT_TOOLS,
    onMessage: ({ role, message }) => {
      const { lines } = getState().agent;
      const last = lines[lines.length - 1];
      // In chat la domanda è già stata fatta: il saluto iniziale dell'agente sarebbe fuori posto.
      if (role === "agent" && message === AGENT_FIRST_MESSAGE && lines.length > 0) return;
      // I messaggi scritti sono già in elenco: evita il doppione se il servizio li rimanda indietro.
      if (last?.role !== role || last.text !== message) addAgentLine({ role, text: message });
    },
    onConnect: () => {
      starting.current = false;
      if (firstMessage.current) conversation.sendUserMessage(firstMessage.current);
      firstMessage.current = null;
    },
    onDisconnect: () => {
      starting.current = false;
    },
    onError: () => {
      starting.current = false;
      updateAgent({ error: "La conversazione con l'assistente si è interrotta: riprova." });
    },
  });

  const connected = conversation.status === "connected";
  const phase: AgentState["phase"] = connected ? (conversation.isSpeaking ? "speaking" : "listening") : conversation.status === "connecting" ? "connecting" : "off";
  useEffect(() => {
    // Durante l'avvio (permessi, token) il servizio non è ancora «in connessione»: la fase la tiene `start`.
    if (!starting.current) updateAgent({ phase });
  }, [phase]);

  // In voce i punti scelti sulla mappa arrivano all'agente come contesto, senza interrompere il dialogo.
  useEffect(() => {
    if (connected && origin && destination) conversation.sendContextualUpdate(mapContext(origin, destination));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `conversation` cambia a ogni render
  }, [connected, origin, destination]);

  const controls = useMemo(() => {
    async function start(mode: "voice" | "text") {
      starting.current = true;
      updateAgent({ error: "", mode, phase: "connecting" });
      try {
        if (mode === "voice") {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
            throw new Error("Per parlare con l'assistente serve il permesso del microfono. In alternativa scrivi la domanda.");
          });
          stream.getTracks().forEach((track) => track.stop());
        }
        const session = await postJson<AgentSession>("/api/agent/session", { mode });
        conversation.startSession(
          "conversationToken" in session
            ? { conversationToken: session.conversationToken, connectionType: "webrtc" }
            : { signedUrl: session.signedUrl, connectionType: "websocket", textOnly: true },
        );
      } catch (cause) {
        firstMessage.current = null;
        starting.current = false;
        updateAgent({ phase: "off", error: cause instanceof Error ? cause.message : "Non riesco ad avviare l'assistente." });
      }
    }

    return {
      ask(question = "") {
        const text = question.trim();
        const { agent: current, origin: from, destination: to } = getState();
        if (!text || current.phase === "connecting") return;
        addAgentLine({ role: "user", text });
        const outgoing = from && to ? `${text}\n\n${mapContext(from, to)}` : text;
        if (current.phase !== "off") return conversation.sendUserMessage(outgoing);
        firstMessage.current = outgoing;
        void start("text");
      },
      /** Avvia la conversazione a voce, oppure chiude quella in corso. */
      voice() {
        const { phase: current } = getState().agent;
        if (current === "connecting") return;
        if (current === "off") void start("voice");
        else conversation.endSession();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `conversation` cambia a ogni render, i suoi metodi no
  }, []);

  useEffect(() => registerCommands(controls), [controls]);

  const lastAgentLine = agent.lines.findLast((line) => line.role === "agent")?.text;
  const caption = agent.error || (agent.phase !== "off" ? (lastAgentLine ?? STATUS[agent.phase]) : null);

  return (
    <div className={`agent-dock ${dock}`}>
      <button type="button" onClick={controls.voice} data-phase={agent.phase} aria-label={agent.phase === "off" ? STATUS.off : "Chiudi la conversazione"} className="agent-orb">
        <span aria-hidden="true" />
      </button>
      {caption && (
        <p aria-live="polite" role={agent.error ? "alert" : undefined} className={`agent-caption glass glass-dense ${agent.error ? "text-alert" : ""}`}>
          <span>{caption}</span>
        </p>
      )}
    </div>
  );
}

/** L'assistente come presenza sulla mappa: un globo luminoso che ascolta, parla e mostra ciò che dice.
 *  `dock` posiziona il globo nel layout che lo ospita. */
export function AgentHost({ dock }: { dock: string }) {
  return (
    <ConversationProvider>
      <Agent dock={dock} />
    </ConversationProvider>
  );
}
