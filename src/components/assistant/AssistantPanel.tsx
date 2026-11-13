"use client";

import { useRef, useState } from "react";
import { postJson } from "@/lib/api-client";
import type { AgentReply, ChatMessage } from "@/lib/agent/run";
import type { LatLon } from "@/lib/routing/types";
import type { RoutesResponse } from "@/lib/schemas/routes";

type Props = { origin: LatLon | null; destination: LatLon | null; onAnalysis: (analysis: RoutesResponse) => void };

const SUGGESTIONS = [
  "Vado dalla metro Piramide alla Città dell'Altra Economia: cosa dicono i dati sui percorsi?",
  "Su quali strade del percorso 1 manca il dato sull'illuminazione?",
];

const fmt = (p: LatLon) => `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`;

/** I punti scelti sulla mappa accompagnano la domanda, così l'assistente non deve chiederli. */
function withMapContext(question: string, origin: LatLon | null, destination: LatLon | null) {
  if (!origin || !destination) return question;
  return `${question}\n\n[Punti selezionati sulla mappa — A: ${fmt(origin)}; B: ${fmt(destination)}]`;
}

function SpeakButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);

  async function toggle() {
    if (state === "playing") {
      audio.current?.pause();
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message ?? "Sintesi vocale non riuscita.");
      const player = new Audio(URL.createObjectURL(await res.blob()));
      player.onended = () => setState("idle");
      audio.current = player;
      await player.play();
      setState("playing");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sintesi vocale non riuscita.");
      setState("error");
    }
  }

  return (
    <span className="mt-2 flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={toggle}
        disabled={state === "loading"}
        className="rounded-control border border-line px-2.5 py-1 hover:bg-raised disabled:opacity-60"
      >
        {state === "loading" ? "Preparo l'audio…" : state === "playing" ? "Ferma" : "Ascolta"}
      </button>
      {state === "error" && (
        <span role="alert" className="text-alert">
          {error}
        </span>
      )}
    </span>
  );
}

export function AssistantPanel({ origin, destination, onAnalysis }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function ask(question: string) {
    const text = question.trim();
    if (!text || pending) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setDraft("");
    setError("");
    setPending(true);
    try {
      const outgoing = [...messages.slice(-10), { role: "user" as const, content: withMapContext(text, origin, destination) }];
      const reply = await postJson<AgentReply>("/api/agent", { messages: outgoing });
      setMessages([...history, { role: "assistant", content: reply.text }]);
      if (reply.analysis) onAnalysis(reply.analysis);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "L'assistente non è riuscito a rispondere.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="assistant-title" className="grid gap-3">
      <h2 id="assistant-title" className="font-bold">
        Chiedi all&apos;assistente
      </h2>
      <p className="text-sm text-dim">
        Nomina due luoghi di Testaccio o Ostiense, oppure fai domande sui percorsi già calcolati. Risponde solo con i dati dei percorsi e di
        OpenStreetMap; la domanda viene inviata a Claude (Anthropic) per essere elaborata.
      </p>

      {messages.length === 0 && (
        <ul className="grid gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => ask(suggestion)}
                disabled={pending}
                className="w-full rounded-control border border-line px-3 py-2 text-left text-sm hover:bg-raised disabled:opacity-60"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ol aria-live="polite" className="grid gap-3">
        {messages.map((message, i) => (
          <li key={i} className={message.role === "user" ? "ml-6 rounded-box bg-raised px-3 py-2" : "mr-2"}>
            <span className="sr-only">{message.role === "user" ? "Tu: " : "Assistente: "}</span>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.role === "assistant" && <SpeakButton text={message.content} />}
          </li>
        ))}
        {pending && <li className="text-dim">Sto consultando percorsi e dati della mappa…</li>}
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
          className="min-w-0 flex-1 rounded-control border border-line bg-raised px-3 py-2 placeholder:text-dim"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="rounded-control bg-sodium px-4 py-2 font-bold text-night hover:bg-ink disabled:opacity-50"
        >
          Chiedi
        </button>
      </form>
    </section>
  );
}
