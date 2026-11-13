import { limits } from "@/lib/config";

/** Limite di frequenza in memoria, per istanza: sufficiente per una demo, non per un servizio distribuito. */
const hits = new Map<string, number[]>();

export function allowRequest(key: string, now = Date.now()): boolean {
  const { requests, windowMs } = limits.rateLimit;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= requests) {
    hits.set(key, recent);
    return false;
  }
  hits.set(key, [...recent, now]);
  return true;
}

export const clientKey = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
