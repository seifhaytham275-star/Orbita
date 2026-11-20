import { generateGeminiText, GEMINI_MODEL } from "@/lib/ai/gemini";
export type AIMessage = { role: "system" | "user" | "assistant"; content: string };
export type AIResult = { text: string; provider: string };
export type AstroAgent = "Ledger" | "Echo" | "Pulse" | "Stock" | "Reach" | "Insight";
const allowedAgents: AstroAgent[] = ["Ledger", "Echo", "Pulse", "Stock", "Reach", "Insight"];

function getGatewayConfig() {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  const baseUrl = (process.env.AI_BASE_URL || "https://ai-gateway.vercel.sh/v1").replace(/\/$/, "");
  return { apiKey, model, baseUrl };
}
export function getAIProviderName(): string {
  const { apiKey, model } = getGatewayConfig();
  return apiKey && model ? "vercel-ai-gateway" : "not-configured";
}
export async function generateWithAI(messages: AIMessage[]): Promise<AIResult | null> {
  const { apiKey, model, baseUrl } = getGatewayConfig();
  if (!apiKey || !model) return null;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 180 }),
    signal: AbortSignal.timeout(12000), cache: "no-store"
  });
  if (!response.ok) throw new Error(`AI provider request failed (${response.status}).`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }>; model?: string };
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI provider returned an empty response.");
  return { text, provider: payload.model || model! };
}
export async function classifyAstroAgent(message: string, geminiApiKey?: string | null): Promise<{ agent: AstroAgent; provider: string } | null> {
  const instructions = [
    "You are Astro, the routing intelligence for an Egyptian business operations platform.",
    "Classify the user's request into exactly one specialist agent.",
    "Return only JSON: {\"agent\":\"Ledger|Echo|Pulse|Stock|Reach|Insight\"}.",
    "Ledger handles invoices, accounting, payments and expenses.",
    "Echo handles customers, customer service, orders and communications.",
    "Pulse handles appointments, bookings, reminders and scheduling.",
    "Stock handles products, inventory, quantities and stock movements.",
    "Reach handles marketing, advertising, campaigns and content.",
    "Insight handles analytics, reports, summaries and general business questions.",
    "Do not claim an action was performed. This is routing only."
  ].join(" ");
  let text = "";
  let provider = "";
  if (geminiApiKey) {
    text = await generateGeminiText(geminiApiKey, instructions + "\n\nUser request: " + message.slice(0, 1200), 80);
    provider = GEMINI_MODEL;
  } else {
    const result = await generateWithAI([{ role: "system", content: instructions }, { role: "user", content: message.slice(0, 1200) }]);
    if (!result) return null;
    text = result.text; provider = result.provider;
  }
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("Astro could not read the AI routing response.");
  const parsed = JSON.parse(json) as { agent?: unknown };
  if (typeof parsed.agent !== "string" || !allowedAgents.includes(parsed.agent as AstroAgent)) throw new Error("Astro received an unsupported agent route.");
  return { agent: parsed.agent as AstroAgent, provider };
}
