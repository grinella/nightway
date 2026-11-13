import { errorResponse, readJson } from "@/lib/http";
import { sessionRequestSchema, type AgentSession } from "@/lib/schemas/agent";

const API = "https://api.elevenlabs.io/v1/convai/conversation";

/** Rilascia al browser una credenziale a tempo per parlare con l'agente ElevenAgents; la chiave resta sul server. */
export async function POST(request: Request) {
  const input = await readJson(request, sessionRequestSchema);
  if (input instanceof Response) return input;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    return errorResponse(503, "agent_unavailable", "Assistente non configurato: mancano ELEVENLABS_API_KEY o ELEVENLABS_AGENT_ID.");
  }

  const endpoint = input.mode === "voice" ? "token" : "get-signed-url";
  const res = await fetch(`${API}/${endpoint}?agent_id=${encodeURIComponent(agentId)}`, {
    headers: { "xi-api-key": apiKey },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  const body = (await res?.json().catch(() => null)) as { token?: string; signed_url?: string } | null;
  if (!res?.ok || !body) return errorResponse(502, "agent_error", "Non riesco a collegarmi all'assistente in questo momento.");

  if (body.token) return Response.json({ conversationToken: body.token } satisfies AgentSession);
  if (body.signed_url) return Response.json({ signedUrl: body.signed_url } satisfies AgentSession);
  return errorResponse(502, "agent_error", "Risposta inattesa dal servizio dell'assistente.");
}
