create index if not exists organizations_plan_code_idx on public.organizations(plan_code);
create index if not exists payment_submissions_plan_code_idx on public.payment_submissions(plan_code);
create index if not exists payment_submissions_reviewed_by_idx on public.payment_submissions(reviewed_by);
drop policy if exists "profile read self or admin" on public.profiles;
create policy "profile read self or admin" on public.profiles for select to authenticated using(id=(select auth.uid()) or private.is_platform_admin());
drop policy if exists "profile update self" on public.profiles;
create policy "profile update self" on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()) and platform_role='customer');
drop policy if exists "org members read org" on public.organizations;
create policy "org members read org" on public.organizations for select to authenticated using(private.is_org_member(id) or private.is_platform_admin() or created_by=(select auth.uid()));
drop policy if exists "authenticated create org" on public.organizations;
create policy "authenticated create org" on public.organizations for insert to authenticated with check(created_by=(select auth.uid()));
drop policy if exists "org owners update org" on public.organizations;
create policy "org owners update org" on public.organizations for update to authenticated
using(private.is_platform_admin() or exists(select 1 from public.memberships m where m.organization_id=organizations.id and m.user_id=(select auth.uid()) and m.role='owner'))
with check(private.is_platform_admin() or exists(select 1 from public.memberships m where m.organization_id=organizations.id and m.user_id=(select auth.uid()) and m.role='owner'));
drop policy if exists "members read own org membership" on public.memberships;
create policy "members read own org membership" on public.memberships for select to authenticated using(user_id=(select auth.uid()) or private.is_platform_admin());
drop policy if exists "creator creates owner membership" on public.memberships;
create policy "creator creates owner membership" on public.memberships for insert to authenticated
with check(user_id=(select auth.uid()) and role='owner' and exists(select 1 from public.organizations o where o.id=memberships.organization_id and o.created_by=(select auth.uid())));
drop policy if exists "invoices org insert" on public.invoices;
create policy "invoices org insert" on public.invoices for insert to authenticated with check(private.is_org_member(organization_id) and created_by=(select auth.uid()));
drop policy if exists "payments org read" on public.payment_submissions;
create policy "payments org read" on public.payment_submissions for select to authenticated using(user_id=(select auth.uid()) or private.is_platform_admin());
drop policy if exists "audit member insert" on public.audit_logs;
create policy "audit member insert" on public.audit_logs for insert to authenticated with check(actor_id=(select auth.uid()) and (organization_id is null or private.is_org_member(organization_id)));
drop policy if exists "org members create agent tasks" on public.agent_tasks;
create policy "org members create agent tasks" on public.agent_tasks for insert to authenticated with check(requested_by=(select auth.uid()) and private.is_org_member(organization_id));
drop policy if exists "admin or owner update agent tasks" on public.agent_tasks;
drop policy if exists "agent_tasks_creator_update" on public.agent_tasks;
create policy "agent tasks controlled update" on public.agent_tasks for update to authenticated
using((requested_by=(select auth.uid()) and private.is_org_member(organization_id)) or private.is_platform_admin() or exists(select 1 from public.memberships m where m.organization_id=agent_tasks.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')))
with check((requested_by=(select auth.uid()) and private.is_org_member(organization_id)) or private.is_platform_admin() or exists(select 1 from public.memberships m where m.organization_id=agent_tasks.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
drop policy if exists "bookings_org_insert" on public.bookings;
create policy "bookings_org_insert" on public.bookings for insert to authenticated with check(created_by=(select auth.uid()) and private.is_org_member(organization_id));
drop policy if exists "stock_movements_org_insert" on public.stock_movements;
create policy "stock_movements_org_insert" on public.stock_movements for insert to authenticated with check(created_by=(select auth.uid()) and private.is_org_member(organization_id));
drop policy if exists "agent_approvals_org_update" on public.agent_approvals;
create policy "agent_approvals_org_update" on public.agent_approvals for update to authenticated
using(exists(select 1 from public.memberships m where m.organization_id=agent_approvals.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')))
with check(exists(select 1 from public.memberships m where m.organization_id=agent_approvals.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','manager')));
