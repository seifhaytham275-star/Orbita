export type AIMessage = { role: "system" | "user" | "assistant"; content: string };
export type AIResult = { text: string; provider: string };

export interface AIProvider {
  generate(messages: AIMessage[]): Promise<AIResult>;
}

// Provider adapters will implement this interface. Keep provider keys server-side.
// No external AI provider is called by this scaffold yet.
export function getAIProviderName(): string {
  return process.env.AI_PROVIDER || "not-configured";
}
