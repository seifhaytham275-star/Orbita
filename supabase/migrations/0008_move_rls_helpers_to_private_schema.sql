create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
alter function public.is_platform_admin() set schema private;
alter function public.is_org_member(uuid) set schema private;
revoke all on function private.is_platform_admin() from public, anon;
revoke all on function private.is_org_member(uuid) from public, anon;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
drop policy if exists "payments user submit" on public.payment_submissions;
create policy "payments user submit" on public.payment_submissions for insert to authenticated
with check(user_id=(select auth.uid()) and status='pending_review' and method='instapay'
and exists(select 1 from public.memberships m where m.organization_id=payment_submissions.organization_id and m.user_id=(select auth.uid())));
revoke all on function public.is_org_billing_member(uuid) from public,anon,authenticated;
drop function public.is_org_billing_member(uuid);
create or replace function public.create_organization(org_name text)
returns uuid language plpgsql security invoker set search_path=public
as $$
declare new_org_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if char_length(trim(org_name)) < 2 or char_length(trim(org_name)) > 120 then raise exception 'Organization name must be between 2 and 120 characters'; end if;
 insert into public.organizations(name,created_by) values(trim(org_name),auth.uid()) returning id into new_org_id;
 insert into public.memberships(organization_id,user_id,role) values(new_org_id,auth.uid(),'owner');
 insert into public.audit_logs(organization_id,actor_id,action,target_type,target_id) values(new_org_id,auth.uid(),'organization.created','organization',new_org_id::text);
 return new_org_id;
end; $$;
revoke all on function public.create_organization(text) from public,anon;
grant execute on function public.create_organization(text) to authenticated;
