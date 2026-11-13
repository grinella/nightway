import Anthropic from "@anthropic-ai/sdk";
import { AgentUnavailableError, runAgent } from "@/lib/agent/run";
import { errorResponse, readJson } from "@/lib/http";
import { agentRequestSchema } from "@/lib/schemas/agent";

export const maxDuration = 60;

export async function POST(request: Request) {
  const input = await readJson(request, agentRequestSchema, 20_000);
  if (input instanceof Response) return input;
  try {
    return Response.json(await runAgent(input.messages));
  } catch (error) {
    if (error instanceof AgentUnavailableError) return errorResponse(503, "agent_unavailable", error.message);
    if (error instanceof Anthropic.RateLimitError) return errorResponse(429, "rate_limited", "L'assistente ha raggiunto il limite di richieste: riprova tra poco.");
    console.error("agent: errore", error instanceof Error ? error.name : "unknown");
    return errorResponse(502, "agent_error", "L'assistente non è riuscito a rispondere.");
  }
}
