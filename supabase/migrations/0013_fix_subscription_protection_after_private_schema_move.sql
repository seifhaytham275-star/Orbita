create or replace function public.protect_subscription_fields()
returns trigger language plpgsql security definer set search_path=public,private
as $$
begin
 if auth.uid() is not null and not private.is_platform_admin() then
  if new.subscription_status is distinct from old.subscription_status
   or new.trial_started_at is distinct from old.trial_started_at
   or new.trial_ends_at is distinct from old.trial_ends_at
   or new.features_enabled is distinct from old.features_enabled
   or new.plan_code is distinct from old.plan_code
   or new.subscription_started_at is distinct from old.subscription_started_at
   or new.subscription_ends_at is distinct from old.subscription_ends_at then
   raise exception 'Only platform administrators can change subscription settings';
  end if;
 end if;
 return new;
end; $$;
revoke all on function public.protect_subscription_fields() from public,anon,authenticated;
