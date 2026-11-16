-- Atomically update inventory quantity and append its movement ledger.
create or replace function public.orbita_adjust_stock(
  p_organization_id uuid,
  p_product_id uuid,
  p_delta numeric,
  p_note text default null
) returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_quantity numeric(14,2);
  next_quantity numeric(14,2);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 1000000 then
    raise exception 'Invalid stock adjustment';
  end if;
  if not public.is_org_member(p_organization_id) then
    raise exception 'Organization access denied';
  end if;
  select quantity into current_quantity
    from public.products
    where id = p_product_id and organization_id = p_organization_id
    for update;
  if not found then raise exception 'Product not found'; end if;
  next_quantity := current_quantity + p_delta;
  if next_quantity < 0 then raise exception 'Insufficient stock'; end if;
  update public.products set quantity = next_quantity
    where id = p_product_id and organization_id = p_organization_id;
  insert into public.stock_movements(
    organization_id, product_id, movement_type, quantity, note, created_by
  ) values (
    p_organization_id, p_product_id,
    case when p_delta > 0 then 'in' else 'out' end,
    abs(p_delta), left(coalesce(p_note,''),500), auth.uid()
  );
  return next_quantity;
end;
$$;
revoke all on function public.orbita_adjust_stock(uuid,uuid,numeric,text) from public, anon;
grant execute on function public.orbita_adjust_stock(uuid,uuid,numeric,text) to authenticated;
