/** Crea (o aggiorna) l'agente NIGHTWAY e i suoi strumenti su ElevenAgents: `npm run agent:setup`.
 *  Legge ELEVENLABS_API_KEY ed eventualmente ELEVENLABS_AGENT_ID da .env.local. */
import { AGENT_FIRST_MESSAGE, AGENT_PROMPT } from "@/lib/agent/prompt";

const API = "https://api.elevenlabs.io/v1/convai";
const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("ELEVENLABS_API_KEY mancante in .env.local");

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "xi-api-key": apiKey as string, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

const number = (description: string) => ({ type: "number", description });
const string = (description: string) => ({ type: "string", description });
const clientTool = (name: string, description: string, properties: Record<string, unknown>) => ({
  tool_config: {
    type: "client",
    name,
    description,
    expects_response: true,
    response_timeout_secs: 45,
    parameters: { type: "object", properties, required: Object.keys(properties) },
  },
});

/** I nomi devono coincidere con gli handler registrati nel browser (src/components/assistant). */
const TOOLS = [
  clientTool(
    "find_place",
    "Cerca un luogo o una strada per nome tra gli elementi OpenStreetMap dell'area pilota (Testaccio/Ostiense, Roma) e ne restituisce le coordinate. Usalo quando l'utente nomina un posto. Non è un geocoder generale: se non trova nulla, il luogo è fuori area o non è mappato con quel nome.",
    { query: string("Nome o parte del nome del luogo, ad esempio Piramide oppure Via Galvani") },
  ),
  clientTool(
    "compare_routes",
    "Calcola i percorsi pedonali reali tra due punti e li analizza sulle evidenze OpenStreetMap: illuminazione dichiarata, punti luce mappati, infrastruttura pedonale, servizi mappati, copertura delle evidenze ed eventuale ERS. Disegna anche i percorsi sulla mappa dell'utente. Chiamalo ogni volta che servono dati sui percorsi.",
    {
      origin_lat: number("Latitudine del punto di partenza"),
      origin_lon: number("Longitudine del punto di partenza"),
      destination_lat: number("Latitudine del punto di arrivo"),
      destination_lon: number("Longitudine del punto di arrivo"),
    },
  ),
  clientTool(
    "route_streets",
    "Dettaglio strada per strada di un percorso già calcolato con compare_routes: nome della strada, valore di lit dichiarato (unknown significa tag assente, non buio), tipo di infrastruttura pedonale e metri. Usalo per dire dove mancano i dati.",
    { route_id: string("Id del percorso restituito da compare_routes, ad esempio route-1") },
  ),
];

type Tool = { id: string; tool_config: { name: string } };
const existing = (await call<{ tools: Tool[] }>("GET", "/tools")).tools;
const toolIds: string[] = [];
for (const tool of TOOLS) {
  const found = existing.find((t) => t.tool_config.name === tool.tool_config.name);
  const saved = found ? await call<Tool>("PATCH", `/tools/${found.id}`, tool) : await call<Tool>("POST", "/tools", tool);
  toolIds.push(saved.id);
}

const agent = {
  name: "NIGHTWAY",
  conversation_config: {
    agent: {
      first_message: AGENT_FIRST_MESSAGE,
      language: "it",
      prompt: { prompt: AGENT_PROMPT, llm: process.env.ELEVENLABS_AGENT_LLM || "claude-sonnet-5-5", tool_ids: toolIds },
    },
    // Alice: voce predefinita verificata per l'italiano.
    tts: { voice_id: process.env.ELEVENLABS_VOICE_ID || "Xb7hH8MSUJpSbSDYk0k2" },
    // Tetto ai consumi: una conversazione dura al massimo 4 minuti e si chiude dopo 30 secondi di silenzio.
    conversation: { max_duration_seconds: 240 },
    turn: { silence_end_call_timeout: 30 },
  },
  // Agente privato: il browser riceve un token a tempo dal nostro server, la chiave non esce mai.
  platform_settings: { auth: { enable_auth: true } },
};

const agentId = process.env.ELEVENLABS_AGENT_ID;
const saved = agentId
  ? await call<{ agent_id: string }>("PATCH", `/agents/${agentId}`, agent)
  : await call<{ agent_id: string }>("POST", "/agents/create", agent);
console.log(`Agente pronto. ELEVENLABS_AGENT_ID=${saved.agent_id}`);
