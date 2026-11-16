create table if not exists public.subscription_plans (
  code text primary key,
  name text not null,
  monthly_price numeric(12,2) not null check(monthly_price >= 0),
  currency text not null default 'EGP',
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;
drop policy if exists "plans are publicly readable" on public.subscription_plans;
create policy "plans are publicly readable" on public.subscription_plans for select to anon, authenticated using (active = true);
grant select on public.subscription_plans to anon, authenticated;
insert into public.subscription_plans(code,name,monthly_price,limits,features)
values
 ('free','Orbita Free',0,'{"max_users":1,"max_agent_tasks_month":30,"max_invoices_month":30,"max_products":50}'::jsonb,'{"agents":["Insight","Ledger"],"exports":false}'::jsonb),
 ('pro','Orbita Pro',399,'{"max_users":3,"max_agent_tasks_month":500,"max_invoices_month":500,"max_products":1000}'::jsonb,'{"agents":["Insight","Ledger","Stock","Pulse","Reach","Echo"],"exports":true}'::jsonb),
 ('business','Orbita Business',899,'{"max_users":10,"max_agent_tasks_month":2000,"max_invoices_month":2000,"max_products":10000}'::jsonb,'{"agents":["Insight","Ledger","Stock","Pulse","Reach","Echo"],"exports":true,"priority_support":true}'::jsonb)
on conflict(code) do update set name=excluded.name,monthly_price=excluded.monthly_price,limits=excluded.limits,features=excluded.features,active=true;
alter table public.organizations add column if not exists plan_code text not null default 'free' references public.subscription_plans(code), add column if not exists subscription_started_at timestamptz, add column if not exists subscription_ends_at timestamptz;
update public.organizations set plan_code='free',subscription_started_at=coalesce(subscription_started_at,trial_started_at),subscription_ends_at=coalesce(subscription_ends_at,trial_ends_at) where subscription_started_at is null or subscription_ends_at is null;
alter table public.payment_submissions add column if not exists plan_code text references public.subscription_plans(code), add column if not exists billing_period_months integer not null default 1 check(billing_period_months between 1 and 12), add column if not exists admin_note text;
create index if not exists payment_submissions_status_created_idx on public.payment_submissions(status,created_at desc);
create index if not exists agent_tasks_org_created_idx on public.agent_tasks(organization_id,created_at desc);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);
create index if not exists agent_approvals_decided_by_idx on public.agent_approvals(decided_by);
create index if not exists agent_approvals_task_idx on public.agent_approvals(task_id);
create index if not exists agent_tasks_requested_by_idx on public.agent_tasks(requested_by);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_org_idx on public.audit_logs(organization_id);
create index if not exists bookings_customer_idx on public.bookings(customer_id);
create index if not exists bookings_created_by_idx on public.bookings(created_by);
create index if not exists invoices_created_by_idx on public.invoices(created_by);
create index if not exists organizations_created_by_idx on public.organizations(created_by);
create index if not exists payment_submissions_user_idx on public.payment_submissions(user_id);
create index if not exists stock_movements_created_by_idx on public.stock_movements(created_by);
create index if not exists stock_movements_product_idx on public.stock_movements(product_id);
create or replace function public.is_org_billing_member(target_org uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.memberships where organization_id=target_org and user_id=(select auth.uid())); $$;
revoke all on function public.is_org_billing_member(uuid) from public, anon;
grant execute on function public.is_org_billing_member(uuid) to authenticated;
create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.memberships m join public.organizations o on o.id=m.organization_id
    where m.organization_id=target_org and m.user_id=(select auth.uid()) and o.features_enabled=true
      and o.subscription_status in ('active','trial') and coalesce(o.subscription_ends_at,o.trial_ends_at)>now());
$$;
revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
drop policy if exists "payments user submit" on public.payment_submissions;
create policy "payments user submit" on public.payment_submissions for insert to authenticated
with check(user_id=(select auth.uid()) and public.is_org_billing_member(organization_id) and status='pending_review' and method='instapay');
create or replace function public.orbita_review_payment(p_payment_id uuid,p_decision text,p_admin_username text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare payment_row public.payment_submissions%rowtype; plan_row public.subscription_plans%rowtype;
period_start timestamptz:=now(); period_end timestamptz;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Forbidden'; end if;
 if p_decision not in ('paid','rejected') then raise exception 'Invalid decision'; end if;
 if p_admin_username is null or length(trim(p_admin_username)) not between 3 and 64 then raise exception 'Invalid administrator'; end if;
 select * into payment_row from public.payment_submissions where id=p_payment_id and status in ('pending_review','pending_provider') for update;
 if not found then raise exception 'Payment not found or already reviewed'; end if;
 if p_decision='paid' then
   if payment_row.plan_code is null then raise exception 'Payment has no selected plan'; end if;
   select * into plan_row from public.subscription_plans where code=payment_row.plan_code and active=true;
   if not found or plan_row.monthly_price*payment_row.billing_period_months<>payment_row.amount then raise exception 'Payment amount does not match plan'; end if;
   period_start:=greatest(now(),coalesce((select subscription_ends_at from public.organizations where id=payment_row.organization_id),now()));
   period_end:=period_start+make_interval(months=>payment_row.billing_period_months);
 end if;
 update public.payment_submissions set status=p_decision,reviewed_by=null,reviewed_at=now(),admin_note=left(coalesce(p_admin_username,'')||' reviewed',160)
 where id=p_payment_id returning * into payment_row;
 if p_decision='paid' then update public.organizations set plan_code=payment_row.plan_code,subscription_status='active',features_enabled=true,subscription_started_at=period_start,subscription_ends_at=period_end where id=payment_row.organization_id; end if;
 insert into public.audit_logs(organization_id,actor_id,action,target_type,target_id,metadata)
 values(payment_row.organization_id,null,case when p_decision='paid' then 'payment.approved' else 'payment.rejected' end,'payment_submission',payment_row.id::text,
 jsonb_build_object('amount',payment_row.amount,'currency',payment_row.currency,'plan_code',payment_row.plan_code,'admin_username',p_admin_username));
 return jsonb_build_object('id',payment_row.id,'status',payment_row.status,'organization_id',payment_row.organization_id,'plan_code',payment_row.plan_code,'subscription_ends_at',period_end);
end; $$;
revoke all on function public.orbita_review_payment(uuid,text,text) from public,anon,authenticated;
grant execute on function public.orbita_review_payment(uuid,text,text) to service_role;
revoke all on function public.orbita_admin_setup_available() from public,anon,authenticated;
revoke all on function public.orbita_create_first_admin(text,text,text) from public,anon,authenticated;
revoke all on function public.orbita_verify_admin_login(text,text) from public,anon,authenticated;
grant execute on function public.orbita_admin_setup_available() to service_role;
grant execute on function public.orbita_create_first_admin(text,text,text) to service_role;
grant execute on function public.orbita_verify_admin_login(text,text) to service_role;
