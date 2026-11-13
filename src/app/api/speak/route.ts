import { errorResponse, readJson } from "@/lib/http";
import { speakRequestSchema } from "@/lib/schemas/agent";

/** Voce di default dagli esempi della documentazione ElevenLabs; sostituibile con ELEVENLABS_VOICE_ID. */
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

/** Sintesi vocale della risposta dell'assistente con ElevenLabs; la chiave resta sul server. */
export async function POST(request: Request) {
  const input = await readJson(request, speakRequestSchema, 4_000);
  if (input instanceof Response) return input;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return errorResponse(503, "voice_unavailable", "Voce non configurata: manca ELEVENLABS_API_KEY.");

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.text, model_id: "eleven_multilingual_v2" }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);
  if (!res?.ok) return errorResponse(502, "voice_error", "Sintesi vocale non riuscita.");
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
