create extension if not exists pgcrypto;
create type public.platform_role as enum ('customer','admin');
create type public.membership_role as enum ('owner','manager','staff');
create type public.payment_method as enum ('instapay','fawry');
create type public.payment_status as enum ('pending_review','pending_provider','paid','rejected','expired');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text, display_name text,
 platform_role public.platform_role not null default 'customer',
 created_at timestamptz not null default now()
);
create table public.organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(name) between 2 and 120),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.memberships (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role public.membership_role not null default 'staff',
 created_at timestamptz not null default now(),
 primary key(organization_id,user_id)
);
create table public.invoices (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 invoice_number text not null, customer_name text not null,
 amount numeric(12,2) not null check(amount>=0),
 currency text not null default 'EGP',
 status text not null default 'draft' check(status in ('draft','issued','paid','cancelled')),
 due_date date, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(organization_id,invoice_number)
);
create table public.payment_submissions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 method public.payment_method not null,
 amount numeric(12,2) not null check(amount>0),
 currency text not null default 'EGP',
 customer_reference text,
 status public.payment_status not null default 'pending_review',
 provider_reference text unique,
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.audit_logs (
 id bigint generated always as identity primary key,
 organization_id uuid references public.organizations(id) on delete cascade,
 actor_id uuid references auth.users(id),
 action text not null, target_type text, target_id text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index memberships_user_idx on public.memberships(user_id);
create index invoices_org_created_idx on public.invoices(organization_id,created_at desc);
create index payments_org_created_idx on public.payment_submissions(organization_id,created_at desc);

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.profiles where id=auth.uid() and platform_role='admin'); $$;
create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.memberships where organization_id=target_org and user_id=auth.uid()); $$;
revoke all on function public.is_platform_admin() from public, anon;
revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invoices enable row level security;
alter table public.payment_submissions enable row level security;
alter table public.audit_logs enable row level security;

create policy "profile read self or admin" on public.profiles for select using(id=auth.uid() or public.is_platform_admin());
create policy "profile update self" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid() and platform_role='customer');
create policy "org members read org" on public.organizations for select using(public.is_org_member(id) or public.is_platform_admin());
create policy "authenticated create org" on public.organizations for insert to authenticated with check(created_by=auth.uid());
create policy "org owners update org" on public.organizations for update using(exists(select 1 from public.memberships m where m.organization_id=id and m.user_id=auth.uid() and m.role='owner'));
create policy "members read own org membership" on public.memberships for select using(user_id=auth.uid() or public.is_platform_admin());
create policy "creator creates owner membership" on public.memberships for insert to authenticated with check(user_id=auth.uid() and role='owner' and exists(select 1 from public.organizations o where o.id=organization_id and o.created_by=auth.uid()));
create policy "invoices org read" on public.invoices for select using(public.is_org_member(organization_id) or public.is_platform_admin());
create policy "invoices org insert" on public.invoices for insert to authenticated with check(public.is_org_member(organization_id) and created_by=auth.uid());
create policy "invoices org update" on public.invoices for update using(public.is_org_member(organization_id) or public.is_platform_admin()) with check(public.is_org_member(organization_id) or public.is_platform_admin());
create policy "payments org read" on public.payment_submissions for select using(user_id=auth.uid() or public.is_platform_admin());
create policy "payments user submit" on public.payment_submissions for insert to authenticated with check(user_id=auth.uid() and public.is_org_member(organization_id) and status='pending_review');
create policy "admin reviews payments" on public.payment_submissions for update using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy "audit org read" on public.audit_logs for select using(public.is_platform_admin() or (organization_id is not null and public.is_org_member(organization_id)));
create policy "audit member insert" on public.audit_logs for insert to authenticated with check(actor_id=auth.uid() and (organization_id is null or public.is_org_member(organization_id)));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 insert into public.profiles(id,email,display_name)
 values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name',''));
 return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- After owner signup, run manually in Supabase SQL Editor:
-- update public.profiles set platform_role='admin' where email='OWNER_EMAIL_HERE';

-- Atomic organization creation: customers can create an organization and become its owner.
create or replace function public.create_organization(org_name text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare new_org_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if char_length(trim(org_name)) < 2 or char_length(trim(org_name)) > 120 then
   raise exception 'Organization name must be between 2 and 120 characters';
 end if;
 insert into public.organizations(name,created_by) values(trim(org_name),auth.uid()) returning id into new_org_id;
 insert into public.memberships(organization_id,user_id,role) values(new_org_id,auth.uid(),'owner');
 insert into public.audit_logs(organization_id,actor_id,action,target_type,target_id)
 values(new_org_id,auth.uid(),'organization.created','organization',new_org_id::text);
 return new_org_id;
end;
$$;
revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
