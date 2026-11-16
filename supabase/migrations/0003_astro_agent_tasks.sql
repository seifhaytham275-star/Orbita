-- Astro orchestration and specialist-agent task queue for the Orbita MVP.
create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  agent_name text not null check (agent_name in ('Ledger','Echo','Pulse','Stock','Reach','Insight')),
  title text not null check (char_length(title) between 1 and 180),
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  status text not null default 'queued' check (status in ('queued','running','needs_approval','completed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agent_tasks_org_created_idx on public.agent_tasks(organization_id, created_at desc);
alter table public.agent_tasks enable row level security;
drop policy if exists "org members read agent tasks" on public.agent_tasks;
create policy "org members read agent tasks" on public.agent_tasks
for select to authenticated using (public.is_org_member(organization_id) or public.is_platform_admin());
drop policy if exists "org members create agent tasks" on public.agent_tasks;
create policy "org members create agent tasks" on public.agent_tasks
for insert to authenticated with check (requested_by = auth.uid() and public.is_org_member(organization_id));
drop policy if exists "admin or owner update agent tasks" on public.agent_tasks;
create policy "admin or owner update agent tasks" on public.agent_tasks
for update to authenticated using (
  public.is_platform_admin() or exists (
    select 1 from public.memberships m where m.organization_id = agent_tasks.organization_id
    and m.user_id = auth.uid() and m.role in ('owner','manager')
  )
) with check (
  public.is_platform_admin() or exists (
    select 1 from public.memberships m where m.organization_id = agent_tasks.organization_id
    and m.user_id = auth.uid() and m.role in ('owner','manager')
  )
);
