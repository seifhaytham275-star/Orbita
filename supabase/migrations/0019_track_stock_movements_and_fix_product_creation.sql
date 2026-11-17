-- Keep every product quantity change and opening balance in the stock movement ledger.
-- The trigger is the single source of truth for movement records; client roles cannot forge them.

create or replace function private.record_product_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  quantity_delta numeric(14,2);
  movement_note text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated actor required';
  end if;

  if not private.is_org_member(new.organization_id) then
    raise exception 'Organization access denied';
  end if;

  if new.quantity is null or new.quantity < 0 then
    raise exception 'Invalid product quantity';
  end if;

  if tg_op = 'INSERT' then
    if new.quantity > 0 then
      insert into public.stock_movements(
        organization_id, product_id, movement_type, quantity, note, created_by
      ) values (
        new.organization_id, new.id, 'in', new.quantity, 'رصيد افتتاحي', auth.uid()
      );
    end if;
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id then
    raise exception 'Products cannot be moved between organizations';
  end if;

  quantity_delta := new.quantity - old.quantity;
  if quantity_delta = 0 then
    return new;
  end if;

  movement_note := nullif(current_setting('orbita.stock_movement_note', true), '');
  if movement_note is null then
    movement_note := 'تعديل رصيد المخزون';
  end if;

  insert into public.stock_movements(
    organization_id, product_id, movement_type, quantity, note, created_by
  ) values (
    new.organization_id,
    new.id,
    case when quantity_delta > 0 then 'in' else 'out' end,
    abs(quantity_delta),
    left(movement_note, 500),
    auth.uid()
  );

  return new;
end;
$$;

revoke all on function private.record_product_stock_movement() from public, anon, authenticated;

drop trigger if exists products_stock_movement_log on public.products;
create trigger products_stock_movement_log
after insert or update on public.products
for each row execute function private.record_product_stock_movement();

create or replace function public.orbita_adjust_stock(
  p_organization_id uuid,
  p_product_id uuid,
  p_delta numeric,
  p_note text default null
) returns numeric
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  current_quantity numeric(14,2);
  next_quantity numeric(14,2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_delta is null or p_delta = 0 or abs(p_delta) > 1000000 then
    raise exception 'Invalid stock adjustment';
  end if;
  if not private.is_org_member(p_organization_id) then
    raise exception 'Organization access denied';
  end if;

  select quantity into current_quantity
  from public.products
  where id = p_product_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  next_quantity := current_quantity + p_delta;
  if next_quantity < 0 then
    raise exception 'Insufficient stock';
  end if;

  perform set_config(
    'orbita.stock_movement_note',
    left(coalesce(p_note, 'تعديل رصيد المخزون'), 500),
    true
  );

  update public.products
  set quantity = next_quantity
  where id = p_product_id and organization_id = p_organization_id;

  return next_quantity;
end;
$$;

create or replace function public.orbita_create_product(
  p_organization_id uuid,
  p_name text,
  p_quantity numeric default 0,
  p_unit text default 'قطعة',
  p_reorder_level numeric default 0,
  p_unit_cost numeric default 0,
  p_sale_price numeric default 0
) returns uuid
language plpgsql
security invoker
set search_path = public, private
as $$
declare
  new_product_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not private.is_org_member(p_organization_id) then
    raise exception 'Organization access denied';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 180 then
    raise exception 'Invalid product name';
  end if;
  if coalesce(p_quantity, -1) < 0
    or coalesce(p_reorder_level, -1) < 0
    or coalesce(p_unit_cost, -1) < 0
    or coalesce(p_sale_price, -1) < 0 then
    raise exception 'Invalid product values';
  end if;

  insert into public.products(
    organization_id, name, quantity, unit, reorder_level, unit_cost, sale_price
  )
  values (
    p_organization_id,
    trim(p_name),
    p_quantity,
    left(coalesce(nullif(trim(p_unit), ''), 'قطعة'), 30),
    p_reorder_level,
    p_unit_cost,
    p_sale_price
  )
  returning id into new_product_id;

  return new_product_id;
end;
$$;

revoke all on function public.orbita_adjust_stock(uuid, uuid, numeric, text) from public, anon;
grant execute on function public.orbita_adjust_stock(uuid, uuid, numeric, text) to authenticated, service_role;

revoke all on function public.orbita_create_product(uuid, text, numeric, text, numeric, numeric, numeric) from public, anon;
grant execute on function public.orbita_create_product(uuid, text, numeric, text, numeric, numeric, numeric) to authenticated, service_role;

-- Stock movements are append-only for customers; only the trigger records them.
revoke all on table public.stock_movements from anon, authenticated;
grant select on table public.stock_movements to authenticated;
