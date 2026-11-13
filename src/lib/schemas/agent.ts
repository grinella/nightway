import { z } from "zod";

export const agentRequestSchema = z
  .object({
    messages: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(1500) }))
      .min(1)
      .max(12)
      .refine((m) => m.at(-1)?.role === "user", "L'ultimo messaggio deve essere dell'utente."),
  })
  .strict();

export const speakRequestSchema = z.object({ text: z.string().trim().min(1).max(1500) }).strict();
