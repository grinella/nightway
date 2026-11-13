import { analyzeRoutes } from "@/lib/analyze";
import { errorResponse, readJson } from "@/lib/http";
import { RoutingError, type RoutingErrorCode } from "@/lib/routing/types";
import { routesRequestSchema } from "@/lib/schemas/routes";

const STATUS: Record<RoutingErrorCode, number> = { rate_limited: 429, timeout: 504, no_route: 404, provider_error: 502 };

export async function POST(request: Request) {
  const input = await readJson(request, routesRequestSchema);
  if (input instanceof Response) return input;
  try {
    return Response.json(await analyzeRoutes(input.origin, input.destination));
  } catch (error) {
    if (error instanceof RoutingError) return errorResponse(STATUS[error.code], error.code, error.message);
    // Niente coordinate nei log: solo il tipo di errore.
    console.error("routes: errore interno", error instanceof Error ? error.name : "unknown");
    return errorResponse(500, "internal", "Errore interno durante l'analisi dei percorsi.");
  }
}
