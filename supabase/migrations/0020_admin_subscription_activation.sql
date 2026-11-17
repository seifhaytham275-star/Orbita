create or replace function public.orbita_admin_set_subscription(
  p_organization_id uuid,
  p_plan_code text,
  p_months integer,
  p_admin_username text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  org_row public.organizations%rowtype;
  plan_row public.subscription_plans%rowtype;
  start_at timestamptz;
  end_at timestamptz;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_months not between 1 and 12 then
    raise exception 'Invalid subscription duration';
  end if;
  if p_admin_username is null or length(trim(p_admin_username)) not between 3 and 64 then
    raise exception 'Invalid administrator';
  end if;

  select * into org_row
  from public.organizations
  where id = p_organization_id
  for update;
  if not found then raise exception 'Organization not found'; end if;

  select * into plan_row
  from public.subscription_plans
  where code = p_plan_code and active = true;
  if not found then raise exception 'Active plan not found'; end if;

  start_at := greatest(now(), coalesce(org_row.subscription_ends_at, now()));
  end_at := start_at + make_interval(months => p_months);

  update public.organizations
  set plan_code = p_plan_code,
      subscription_status = 'active',
      features_enabled = true,
      subscription_started_at = start_at,
      subscription_ends_at = end_at
  where id = p_organization_id;

  insert into public.audit_logs(
    organization_id, actor_id, action, target_type, target_id, metadata
  ) values (
    p_organization_id, null, 'subscription.admin_activated',
    'organization', p_organization_id::text,
    jsonb_build_object(
      'plan_code', p_plan_code,
      'months', p_months,
      'starts_at', start_at,
      'ends_at', end_at,
      'admin_username', p_admin_username,
      'payment_verified', false
    )
  );

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'plan_code', p_plan_code,
    'subscription_status', 'active',
    'subscription_started_at', start_at,
    'subscription_ends_at', end_at
  );
end;
$$;

revoke all on function public.orbita_admin_set_subscription(uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.orbita_admin_set_subscription(uuid, text, integer, text) to service_role;
