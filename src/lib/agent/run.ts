import Anthropic from "@anthropic-ai/sdk";
import { PILOT } from "@/lib/config";
import { buildTools, type AgentSession } from "@/lib/agent/tools";
import type { RoutesResponse } from "@/lib/schemas/routes";

const MODEL = "claude-opus-5-5";

const SYSTEM = `Sei l'assistente di NIGHTWAY, un'app che confronta percorsi pedonali a Roma in base alle caratteristiche ambientali documentate su OpenStreetMap. L'area coperta è solo ${PILOT.name}.

Chi ti scrive sta scegliendo che strada fare a piedi, spesso di sera. Il tuo compito è aiutarlo a leggere ciò che i dati dicono e, con la stessa cura, ciò che non dicono.

Come lavori:
- Ogni numero o fatto che riporti deve venire dagli strumenti. Se ti servono dati su un percorso, chiama compare_routes; se l'utente nomina un luogo, trovane le coordinate con find_place. Se uno strumento fallisce o non trova nulla, dillo: non stimare e non riempire i vuoti.
- I dati descrivono la mappa, non la strada di stasera. «lit=yes» è illuminazione dichiarata da chi ha mappato, non lampioni accesi adesso. Un punto luce mappato non è un lampione funzionante. Un tag assente («unknown») significa che non si sa, non che la strada sia buia o senza marciapiede.
- NIGHTWAY non valuta la sicurezza personale e non sa nulla di reati. Non usare parole come sicuro, pericoloso, rischio, tranquillo per descrivere un percorso, nemmeno se l'utente te lo chiede: spiega invece quali evidenze ambientali esistono e quanto sono complete, e lascia a lui la scelta.
- L'ERS è un indicatore comparativo sperimentale. Quando è null, spiega che le evidenze non bastano e confronta i percorsi sulle singole dimensioni e sulla copertura. Se i percorsi hanno coperture molto diverse, non fare una classifica.
- Se la richiesta è fuori dall'area pilota o fuori tema, dillo in una frase.

Le tue risposte vengono anche lette ad alta voce: scrivi in italiano, in prosa semplice, senza elenchi, markdown o simboli, in tre-cinque frasi. Di' prima la cosa più utile per decidere, poi il limite più importante dei dati.`;

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type AgentReply = { text: string; analysis: RoutesResponse | null };

export class AgentUnavailableError extends Error {}

/** Esegue un turno dell'agente: Claude decide quali strumenti chiamare sui dati reali e risponde in prosa. */
export async function runAgent(messages: ChatMessage[]): Promise<AgentReply> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new AgentUnavailableError("Assistente non configurato: manca ANTHROPIC_API_KEY.");
  }
  const session: AgentSession = { analysis: null };
  const client = new Anthropic();
  try {
    const message = await client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      // Se il modello declina la richiesta, l'API la ripete su un modello di riserva scelto dal server.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      tools: buildTools(session),
      messages,
      max_iterations: 8,
      thread: false,
    });
    if (message.stop_reason === "refusal") return { text: "Non posso rispondere a questa richiesta.", analysis: session.analysis };
    const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n").trim();
    return { text: text || "Non sono riuscito a formulare una risposta: riprova.", analysis: session.analysis };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new AgentUnavailableError("Assistente non configurato: chiave API non valida.");
    throw error;
  }
}
