-- Orbita 0025: finalize plan-specific agent entitlements and AI feature flags.
-- Prices and existing monthly quotas remain unchanged. This migration is safe to re-run.
update public.subscription_plans
set features = coalesce(features, '{}'::jsonb) || '{"agents":["Insight","Ledger"],"exports":false,"studio":false,"ai_provider":"local"}'::jsonb
where code = 'free';
update public.subscription_plans
set features = coalesce(features, '{}'::jsonb) || '{"agents":["Insight","Ledger","Stock"],"exports":true,"studio":false,"ai_provider":"local"}'::jsonb
where code = 'pro';
update public.subscription_plans
set features = coalesce(features, '{}'::jsonb) || '{"agents":["Insight","Ledger","Stock","Pulse","Reach","Echo","Studio"],"exports":true,"studio":true,"ai_provider":"openrouter","model_tier":"standard"}'::jsonb
where code = 'max';
update public.subscription_plans
set features = coalesce(features, '{}'::jsonb) || '{"agents":["Insight","Ledger","Stock","Pulse","Reach","Echo","Studio","Chatbot"],"exports":true,"studio":true,"ai_provider":"openrouter","model_tier":"premium","chatbot_assistant":true,"astro_voice":true,"priority_support":true}'::jsonb
where code = 'business';
