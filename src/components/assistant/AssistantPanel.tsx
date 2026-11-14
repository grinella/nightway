"use client";

import { useState } from "react";
import { command, useAppState } from "@/lib/app-state";

const SUGGESTIONS = [
  "Vado dalla metro Piramide alla Città dell'Altra Economia: fammi vedere i percorsi.",
  "Su quali strade del percorso 1 manca il dato sull'illuminazione?",
];

/** Conversazione scritta con l'assistente. L'assistente vive sulla mappa (vedi `AgentHost`): qui si legge
 *  ciò che ha detto e gli si scrive. */
export function AssistantPanel() {
  const { agent } = useAppState();
  const [draft, setDraft] = useState("");
  const busy = agent.phase === "connecting";
  const live = agent.phase === "listening" || agent.phase === "speaking";

  function ask(text: string) {
    command("ask", text);
    setDraft("");
  }

  return (
    <section aria-labelledby="assistant-title" className="grid gap-3">
      <h3 id="assistant-title" className="sr-only">
        Chiedi all&apos;assistente
      </h3>
      <p className="text-sm text-dim">
        L&apos;assistente è il globo luminoso sulla mappa: nomina due luoghi di Testaccio o Ostiense e ti mostra i percorsi sorvolandoli. Risponde
        solo con i dati dei percorsi e di OpenStreetMap; voce e domande sono elaborate da ElevenLabs.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => command("voice")} disabled={busy} className={live ? "btn" : "btn btn-primary"}>
          {live ? "Termina la conversazione" : "Parla con l'assistente"}
        </button>
        <span aria-live="polite" className="text-sm text-dim">
          {busy && "Mi collego…"}
          {live && agent.mode === "text" && "Collegato: scrivi la tua domanda."}
          {live && agent.mode === "voice" && (agent.phase === "speaking" ? "Sta rispondendo…" : "In ascolto: parla o scrivi.")}
        </span>
      </div>

      {agent.lines.length === 0 && (
        <ul className="grid gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <button type="button" onClick={() => ask(suggestion)} disabled={busy} className="btn btn-row text-sm">
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ol aria-live="polite" className="grid gap-3">
        {agent.lines.map((line, i) => (
          <li key={i} className={line.role === "user" ? "glass-card ml-8 px-4 py-2.5" : "mr-2 px-1"}>
            <span className="sr-only">{line.role === "user" ? "Tu: " : "Assistente: "}</span>
            <p className="whitespace-pre-wrap">{line.text}</p>
          </li>
        ))}
      </ol>

      {agent.error && (
        <p role="alert" className="text-sm text-alert">
          {agent.error}
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
        <button type="submit" disabled={busy || !draft.trim()} className="btn">
          Invia
        </button>
      </form>
    </section>
  );
}
