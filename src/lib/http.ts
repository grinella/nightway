import type { z } from "zod";
import { limits } from "@/lib/config";
import { allowRequest, clientKey } from "@/lib/rate-limit";

export type ApiError = { error: { code: string; message: string } };

export const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } } satisfies ApiError, { status });

/** Applica rate limit, limite di dimensione e schema Zod; restituisce i dati validati o la risposta d'errore. */
export async function readJson<T>(request: Request, schema: z.ZodType<T>, maxBytes = limits.maxBodyBytes): Promise<T | Response> {
  if (!allowRequest(clientKey(request))) {
    return errorResponse(429, "rate_limited", "Troppe richieste: riprova tra un minuto.");
  }
  const text = await request.text();
  if (text.length > maxBytes) return errorResponse(413, "too_large", "Richiesta troppo grande.");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return errorResponse(400, "invalid_json", "Richiesta non valida.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return errorResponse(422, "invalid_input", parsed.error.issues[0]?.message ?? "Richiesta non valida.");
  return parsed.data;
}
