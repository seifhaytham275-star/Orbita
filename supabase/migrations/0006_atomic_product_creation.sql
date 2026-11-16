-- Create a product and its opening stock movement in one transaction.
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
set search_path = public
as $$
declare
  new_product_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.is_org_member(p_organization_id) then raise exception 'Organization access denied'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 180 then raise exception 'Invalid product name'; end if;
  if coalesce(p_quantity,-1) < 0 or coalesce(p_reorder_level,-1) < 0
    or coalesce(p_unit_cost,-1) < 0 or coalesce(p_sale_price,-1) < 0 then
    raise exception 'Invalid product values';
  end if;
  insert into public.products(organization_id,name,quantity,unit,reorder_level,unit_cost,sale_price)
  values(p_organization_id,trim(p_name),p_quantity,left(coalesce(nullif(trim(p_unit),''),'قطعة'),30),p_reorder_level,p_unit_cost,p_sale_price)
  returning id into new_product_id;
  if p_quantity > 0 then
    insert into public.stock_movements(organization_id,product_id,movement_type,quantity,note,created_by)
    values(p_organization_id,new_product_id,'in',p_quantity,'رصيد افتتاحي',auth.uid());
  end if;
  return new_product_id;
end;
$$;
revoke all on function public.orbita_create_product(uuid,text,numeric,text,numeric,numeric,numeric) from public, anon;
grant execute on function public.orbita_create_product(uuid,text,numeric,text,numeric,numeric,numeric) to authenticated;
