create or replace function private.enforce_plan_limits()
returns trigger language plpgsql security definer set search_path=public
as $$
declare org_id uuid; selected_plan text; plan_limits jsonb; plan_features jsonb; current_count bigint; limit_value integer;
begin
 if auth.uid() is null then return new; end if;
 org_id:=new.organization_id;
 select o.plan_code,sp.limits,sp.features into selected_plan,plan_limits,plan_features
 from public.organizations o join public.subscription_plans sp on sp.code=o.plan_code
 where o.id=org_id and sp.active=true and o.features_enabled=true and o.subscription_status in ('active','trial')
 and coalesce(o.subscription_ends_at,o.trial_ends_at)>now();
 if selected_plan is null then raise exception 'Subscription inactive or expired'; end if;
 if tg_table_name='agent_tasks' then
   if not coalesce(plan_features->'agents' ? new.agent_name,false) then raise exception 'Agent is not included in this subscription plan'; end if;
   select count(*) into current_count from public.agent_tasks where organization_id=org_id and created_at>=date_trunc('month',now());
   limit_value:=coalesce((plan_limits->>'max_agent_tasks_month')::integer,0);
 elsif tg_table_name='invoices' then
   select count(*) into current_count from public.invoices where organization_id=org_id and created_at>=date_trunc('month',now());
   limit_value:=coalesce((plan_limits->>'max_invoices_month')::integer,0);
 elsif tg_table_name='products' then
   select count(*) into current_count from public.products where organization_id=org_id;
   limit_value:=coalesce((plan_limits->>'max_products')::integer,0);
 elsif tg_table_name='memberships' then
   select count(*) into current_count from public.memberships where organization_id=org_id;
   limit_value:=coalesce((plan_limits->>'max_users')::integer,0);
 else return new;
 end if;
 if limit_value>0 and current_count>=limit_value then raise exception 'Subscription plan usage limit reached'; end if;
 return new;
end; $$;
revoke all on function private.enforce_plan_limits() from public,anon,authenticated;
drop trigger if exists enforce_agent_task_plan_limit on public.agent_tasks;
create trigger enforce_agent_task_plan_limit before insert on public.agent_tasks for each row execute function private.enforce_plan_limits();
drop trigger if exists enforce_invoice_plan_limit on public.invoices;
create trigger enforce_invoice_plan_limit before insert on public.invoices for each row execute function private.enforce_plan_limits();
drop trigger if exists enforce_product_plan_limit on public.products;
create trigger enforce_product_plan_limit before insert on public.products for each row execute function private.enforce_plan_limits();
drop trigger if exists enforce_membership_plan_limit on public.memberships;
create trigger enforce_membership_plan_limit before insert on public.memberships for each row execute function private.enforce_plan_limits();
