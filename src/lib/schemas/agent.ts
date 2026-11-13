import { z } from "zod";

export const sessionRequestSchema = z.object({ mode: z.enum(["voice", "text"]) }).strict();
export const placesRequestSchema = z.object({ query: z.string().trim().min(1).max(120) }).strict();
export const speakRequestSchema = z.object({ text: z.string().trim().min(1).max(1500) }).strict();

/** Voce: token WebRTC. Testo: URL firmato WebSocket. */
export type AgentSession = { conversationToken: string } | { signedUrl: string };
