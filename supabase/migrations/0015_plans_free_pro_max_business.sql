-- Orbita 0015: four plans (Free, Pro, Max, Business). All six agents are available in every plan;
-- plans differ by seats and monthly usage caps. Pro is roughly a quarter of Business capacity,
-- Max about 90%. Only plan configuration rows are changed; no organization or payment data is touched.
-- Run this only after the application version that accepts the "max" plan code is deployed.

insert into public.subscription_plans (code, name, monthly_price, currency, limits, features, active)
values
 ('free', 'Orbita Free', 0, 'EGP',
  '{"max_users":1,"max_agent_tasks_month":30,"max_invoices_month":30,"max_products":50}'::jsonb,
  '{"agents":["Insight","Ledger","Stock","Pulse","Reach","Echo"],"exports":false}'::jsonb, true),
 ('pro', 'Orbita Pro', 399, 'EGP',
  '{"max_users":2,"max_agent_tasks_month":500,"max_invoices_month":500,"max_products":1000}'::jsonb,
  '{"agents":["Insight","Ledger","Stock","Pulse","Reach","Echo"],"exports":true}'::jsonb, true),
 ('max', 'Orbita Max', 899, 'EGP',
  '{"max_users":10,"max_agent_tasks_month":1800,"max_invoices_month":1800,"max_products":9000}'::jsonb,
  '{"agents":["Insight","Ledger","Stock","Pulse","Reach","Echo"],"exports":true}'::jsonb, true),
 ('business', 'Orbita Business', 1699, 'EGP',
  '{"max_users":20,"max_agent_tasks_month":2000,"max_invoices_month":2000,"max_products":10000}'::jsonb,
  '{"agents":["Insight","Ledger","Stock","Pulse","Reach","Echo"],"exports":true,"priority_support":true}'::jsonb, true)
on conflict (code) do update
  set name = excluded.name,
      monthly_price = excluded.monthly_price,
      currency = excluded.currency,
      limits = excluded.limits,
      features = excluded.features,
      active = excluded.active;
