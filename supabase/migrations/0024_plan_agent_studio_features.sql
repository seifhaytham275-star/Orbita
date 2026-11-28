-- Orbita 0024: plan-specific agent access, OpenRouter tier metadata, and Studio access.
-- Existing subscription prices and usage quotas are intentionally unchanged.
update public.subscription_plans set features = jsonb_set(features, '{agents}', '["Insight","Ledger"]'::jsonb, true) where code = 'free';
update public.subscription_plans set features = jsonb_set(features, '{agents}', '["Insight","Ledger","Stock"]'::jsonb, true) where code = 'pro';
update public.subscription_plans set features = jsonb_set(jsonb_set(jsonb_set(features, '{agents}', '["Insight","Ledger","Stock","Pulse","Reach","Echo","Studio"]'::jsonb, true), '{studio}', 'true'::jsonb, true), '{ai_provider}', '"openrouter"'::jsonb, true) where code = 'max';
update public.subscription_plans set features = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(features, '{agents}', '["Insight","Ledger","Stock","Pulse","Reach","Echo","Studio"]'::jsonb, true), '{studio}', 'true'::jsonb, true), '{ai_provider}', '"openrouter"'::jsonb, true), '{model_tier}', '"premium"'::jsonb, true), '{chatbot_assistant}', 'true'::jsonb, true) where code = 'business';
update public.subscription_plans set features = jsonb_set(features, '{astro_voice}', 'true'::jsonb, true) where code = 'business';
