-- Orbita business data schema and execution-safe agent permissions.
-- Idempotent so it can be applied to projects where these tables already exist.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 180),
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text,
  name text not null check (char_length(name) between 1 and 180),
  description text,
  unit text not null default 'قطعة',
  quantity numeric(14,2) not null default 0 check (quantity >= 0),
  reorder_level numeric(14,2) not null default 0 check (reorder_level >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in','out','adjustment')),
  quantity numeric(14,2) not null check (quantity > 0),
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  title text not null check (char_length(title) between 1 and 180),
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'booked' check (status in ('booked','confirmed','completed','cancelled','no_show')),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create table if not exists public.agent_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.agent_tasks(id) on delete cascade,
  requested_action text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customers_org_created_idx on public.customers(organization_id,created_at desc);
create index if not exists products_org_name_idx on public.products(organization_id,name);
create index if not exists stock_movements_org_created_idx on public.stock_movements(organization_id,created_at desc);
create index if not exists bookings_org_start_idx on public.bookings(organization_id,starts_at);
create index if not exists agent_approvals_org_created_idx on public.agent_approvals(organization_id,created_at desc);

alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.bookings enable row level security;
alter table public.agent_approvals enable row level security;

drop policy if exists customers_org_read on public.customers;
create policy customers_org_read on public.customers for select to authenticated
using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists customers_org_insert on public.customers;
create policy customers_org_insert on public.customers for insert to authenticated
with check (public.is_org_member(organization_id));
drop policy if exists customers_org_update on public.customers;
create policy customers_org_update on public.customers for update to authenticated
using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists products_org_read on public.products;
create policy products_org_read on public.products for select to authenticated
using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists products_org_insert on public.products;
create policy products_org_insert on public.products for insert to authenticated
with check (public.is_org_member(organization_id));
drop policy if exists products_org_update on public.products;
create policy products_org_update on public.products for update to authenticated
using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists stock_movements_org_read on public.stock_movements;
create policy stock_movements_org_read on public.stock_movements for select to authenticated
using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists stock_movements_org_insert on public.stock_movements;
create policy stock_movements_org_insert on public.stock_movements for insert to authenticated
with check (created_by = auth.uid() and public.is_org_member(organization_id));

drop policy if exists bookings_org_read on public.bookings;
create policy bookings_org_read on public.bookings for select to authenticated
using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists bookings_org_insert on public.bookings;
create policy bookings_org_insert on public.bookings for insert to authenticated
with check (created_by = auth.uid() and public.is_org_member(organization_id));
drop policy if exists bookings_org_update on public.bookings;
create policy bookings_org_update on public.bookings for update to authenticated
using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

-- The creator may finalize only their own task; org data access remains tenant-scoped.
drop policy if exists agent_tasks_creator_update on public.agent_tasks;
create policy agent_tasks_creator_update on public.agent_tasks for update to authenticated
using (requested_by = auth.uid() and public.is_org_member(organization_id))
with check (requested_by = auth.uid() and public.is_org_member(organization_id));

drop policy if exists agent_approvals_org_read on public.agent_approvals;
create policy agent_approvals_org_read on public.agent_approvals for select to authenticated
using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists agent_approvals_org_insert on public.agent_approvals;
create policy agent_approvals_org_insert on public.agent_approvals for insert to authenticated
with check (public.is_org_member(organization_id));
drop policy if exists agent_approvals_org_update on public.agent_approvals;
create policy agent_approvals_org_update on public.agent_approvals for update to authenticated
using (exists(select 1 from public.memberships m where m.organization_id=agent_approvals.organization_id and m.user_id=auth.uid() and m.role in ('owner','manager')))
with check (exists(select 1 from public.memberships m where m.organization_id=agent_approvals.organization_id and m.user_id=auth.uid() and m.role in ('owner','manager')));

grant select,insert,update on public.customers,public.products,public.bookings to authenticated;
grant select,insert on public.stock_movements to authenticated;
grant select,insert,update on public.agent_approvals to authenticated;
