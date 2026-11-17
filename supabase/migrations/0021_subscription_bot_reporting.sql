create table if not exists public.platform_expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EGP' check (currency ~ '^[A-Z]{3}$'),
  category text not null check (char_length(category) between 2 and 80),
  description text not null default '',
  incurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  recorded_by text not null default 'platform-owner'
);

create index if not exists platform_expenses_incurred_at_idx
  on public.platform_expenses (incurred_at desc);

alter table public.platform_expenses enable row level security;

create table if not exists public.platform_daily_reports (
  report_date date primary key,
  payload jsonb not null,
  generated_at timestamptz not null default now(),
  email_sent_at timestamptz,
  email_error text
);

alter table public.platform_daily_reports enable row level security;

create or replace function public.orbita_expire_due_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_count integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  with expired as (
    update public.organizations
       set subscription_status = 'expired',
           features_enabled = false
     where features_enabled = true
       and subscription_status in ('active', 'trial')
       and coalesce(subscription_ends_at, trial_ends_at) <= now()
    returning id, name, plan_code, subscription_ends_at, trial_ends_at
  ), logged as (
    insert into public.audit_logs(
      organization_id, actor_id, action, target_type, target_id, metadata
    )
    select id, null, 'subscription.auto_expired', 'organization', id::text,
      jsonb_build_object(
        'name', name,
        'plan_code', plan_code,
        'subscription_ends_at', subscription_ends_at,
        'trial_ends_at', trial_ends_at,
        'automated', true
      )
    from expired
    returning id
  )
  select count(*) into expired_count from logged;

  return expired_count;
end;
$$;

revoke all on function public.orbita_expire_due_subscriptions() from public, anon, authenticated;
grant execute on function public.orbita_expire_due_subscriptions() to service_role;
