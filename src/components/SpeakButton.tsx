"use client";

import { useRef, useState } from "react";

/** Legge un testo ad alta voce con ElevenLabs (tramite /api/speak). */
export function SpeakButton({ text, label = "Ascolta" }: { text: string; label?: string }) {
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
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={toggle}
        disabled={state === "loading"}
        className="rounded-control border border-line px-2.5 py-1 hover:bg-raised disabled:opacity-60"
      >
        {state === "loading" ? "Preparo l'audio…" : state === "playing" ? "Ferma" : label}
      </button>
      {state === "error" && (
        <span role="alert" className="text-alert">
          {error}
        </span>
      )}
    </span>
  );
}
