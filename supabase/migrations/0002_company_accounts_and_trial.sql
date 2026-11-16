-- Orbita signup, company usernames, and one-month free-access foundation.
alter table public.organizations
  add column if not exists industry text not null default 'غير محدد',
  add column if not exists username text,
  add column if not exists subscription_status text not null default 'active'
    check (subscription_status in ('trial','active','suspended','expired')),
  add column if not exists trial_started_at timestamptz not null default now(),
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '1 month'),
  add column if not exists features_enabled boolean not null default true;

update public.organizations
set username = coalesce(nullif(username,''),
  coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[[:space:][:punct:]]+', '-', 'g')),''),'company')
  || '-' || substr(replace(id::text,'-',''),1,5))
where username is null or username='';

-- Keep previously created trial records aligned with the one-month launch policy.
update public.organizations
set trial_ends_at = trial_started_at + interval '1 month'
where trial_started_at is not null
  and (trial_ends_at is null or trial_ends_at > trial_started_at + interval '1 month');

create unique index if not exists organizations_username_unique
  on public.organizations (lower(username));
create index if not exists organizations_trial_ends_idx
  on public.organizations (trial_ends_at);

create or replace function public.protect_subscription_fields()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    if new.subscription_status is distinct from old.subscription_status
      or new.trial_started_at is distinct from old.trial_started_at
      or new.trial_ends_at is distinct from old.trial_ends_at
      or new.features_enabled is distinct from old.features_enabled then
      raise exception 'Only platform administrators can change subscription settings';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_subscription_fields() from public, anon, authenticated;
drop trigger if exists protect_subscription_fields_trigger on public.organizations;
create trigger protect_subscription_fields_trigger
before update on public.organizations
for each row execute function public.protect_subscription_fields();

-- New signups receive one month of free access. No card, payment method, or auto-renewal.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
declare
  company_name text;
  company_industry text;
  base_username text;
  company_username text;
  new_org_id uuid;
begin
  company_name := coalesce(nullif(trim(new.raw_user_meta_data->>'company_name'),''), 'شركتي');
  company_industry := coalesce(nullif(trim(new.raw_user_meta_data->>'industry'),''), 'غير محدد');
  base_username := trim(both '-' from regexp_replace(lower(company_name), '[[:space:][:punct:]]+', '-', 'g'));
  if base_username = '' then base_username := 'company'; end if;
  company_username := left(base_username, 35) || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,5);

  insert into public.profiles(id,email,display_name)
  values(new.id,new.email,company_name)
  on conflict (id) do update set email=excluded.email, display_name=excluded.display_name;

  insert into public.organizations(name,created_by,industry,username,subscription_status,trial_started_at,trial_ends_at,features_enabled)
  values(company_name,new.id,company_industry,company_username,'active',now(),now()+interval '1 month',true)
  returning id into new_org_id;

  insert into public.memberships(organization_id,user_id,role)
  values(new_org_id,new.id,'owner')
  on conflict do nothing;

  insert into public.audit_logs(organization_id,actor_id,action,target_type,target_id,metadata)
  values(new_org_id,new.id,'organization.created','organization',new_org_id::text,
    jsonb_build_object('free_access_months',1,'username',company_username));
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "org members read org" on public.organizations;
create policy "org members read org" on public.organizations
for select using (public.is_org_member(id) or public.is_platform_admin());

drop policy if exists "org owners update org" on public.organizations;
create policy "org owners update org" on public.organizations
for update using (
  public.is_platform_admin()
  or exists(select 1 from public.memberships m where m.organization_id=id and m.user_id=auth.uid() and m.role='owner')
)
with check (
  public.is_platform_admin()
  or exists(select 1 from public.memberships m where m.organization_id=id and m.user_id=auth.uid() and m.role='owner')
);
