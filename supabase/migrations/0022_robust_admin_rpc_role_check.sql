-- Keep admin RPC authorization compatible with both legacy and current Supabase JWT claim settings.
-- The functions remain executable only by service_role (grants are preserved by CREATE OR REPLACE).

do $$
declare
  old_check text := $old$if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then$old$;
  new_check text := $new$if coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '') <> 'service_role' then$new$;
  fn regprocedure;
  definition text;
begin
  foreach fn in array array[
    'public.orbita_admin_set_subscription(uuid,text,integer,text)'::regprocedure,
    'public.orbita_review_payment(uuid,text,text)'::regprocedure
  ] loop
    definition := pg_get_functiondef(fn);
    if position(old_check in definition) = 0 then
      raise exception 'Expected service-role guard not found in %', fn;
    end if;
    execute replace(definition, old_check, new_check);
  end loop;
end
$$;
