# Astro Enterprise — Phase 1

## What this phase changes

- Adds a server-side OpenAI-compatible chat-completions adapter for Vercel AI Gateway.
- Uses the model only to classify a request into one of the six existing specialist agents.
- Keeps all execution inside the existing deterministic server-side handlers.
- Preserves keyword routing as a fallback when AI is not configured or unavailable.
- Stores routing mode/provider metadata in the existing task input and audit metadata.
- Displays whether Astro is using AI routing or fallback routing in the workspace.

## Vercel environment variables

Configure these on the Orbita Vercel project:

- `AI_GATEWAY_API_KEY`: Vercel AI Gateway key. Keep server-only; never prefix with `NEXT_PUBLIC_`.
- `AI_MODEL`: a model identifier enabled in the Vercel AI Gateway account, e.g. `openai/gpt-4o-mini`.
- `AI_BASE_URL`: optional; defaults to `https://ai-gateway.vercel.sh/v1`.

After adding or changing variables, redeploy the preview/production environment.

## Current safety boundary

The model is not allowed to invoke tools, write to the database, or approve an action. It only chooses a specialist agent. Existing deterministic handlers continue to validate and execute supported operations. Sensitive actions continue to require the existing owner/manager approval flow.

## Not included yet

- Durable conversation memory and summaries.
- Asynchronous queue and worker execution.
- Multi-agent task plans and dependency graphs.
- Completing the approval-to-execution pipeline.
- Expanded agent capabilities and integration adapters.
- End-to-end automated tests for every agent action.

These are subsequent implementation phases; this PR must not be described as a complete Enterprise Astro release.
