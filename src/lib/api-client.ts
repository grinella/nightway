import type { ApiError } from "@/lib/http";

/** POST JSON verso le API dell'app; in caso di errore lancia il messaggio leggibile restituito dal server. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Connessione non riuscita: controlla la rete e riprova.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as ApiError | null;
    throw new Error(data?.error.message ?? "Il servizio non ha risposto correttamente.");
  }
  return res.json() as Promise<T>;
}
