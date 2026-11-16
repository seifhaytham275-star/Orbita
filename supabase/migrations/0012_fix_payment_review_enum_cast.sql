create or replace function public.orbita_review_payment(p_payment_id uuid,p_decision text,p_admin_username text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare payment_row public.payment_submissions%rowtype; plan_row public.subscription_plans%rowtype; period_start timestamptz:=now(); period_end timestamptz;
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
 update public.payment_submissions set status=p_decision::public.payment_status,reviewed_by=null,reviewed_at=now(),admin_note=left(coalesce(p_admin_username,'')||' reviewed',160)
 where id=p_payment_id returning * into payment_row;
 if p_decision='paid' then update public.organizations set plan_code=payment_row.plan_code,subscription_status='active',features_enabled=true,subscription_started_at=period_start,subscription_ends_at=period_end where id=payment_row.organization_id; end if;
 insert into public.audit_logs(organization_id,actor_id,action,target_type,target_id,metadata)
 values(payment_row.organization_id,null,case when p_decision='paid' then 'payment.approved' else 'payment.rejected' end,'payment_submission',payment_row.id::text,jsonb_build_object('amount',payment_row.amount,'currency',payment_row.currency,'plan_code',payment_row.plan_code,'admin_username',p_admin_username));
 return jsonb_build_object('id',payment_row.id,'status',payment_row.status,'organization_id',payment_row.organization_id,'plan_code',payment_row.plan_code,'subscription_ends_at',period_end);
end; $$;
revoke all on function public.orbita_review_payment(uuid,text,text) from public,anon,authenticated;
grant execute on function public.orbita_review_payment(uuid,text,text) to service_role;
