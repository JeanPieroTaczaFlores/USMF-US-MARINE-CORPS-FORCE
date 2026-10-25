-- Preserve purchase audit data when Administration permanently deletes an account.
alter table public.orders
  add column if not exists buyer_name text,
  add column if not exists buyer_callsign text,
  add column if not exists buyer_email text;

update public.orders as orders
set
  buyer_name = coalesce(orders.buyer_name, profiles.nombre),
  buyer_callsign = coalesce(orders.buyer_callsign, profiles.callsign, profiles.usuario_roblox),
  buyer_email = coalesce(orders.buyer_email, profiles.email)
from public.profiles as profiles
where profiles.id = orders.user_id
  and (orders.buyer_name is null or orders.buyer_callsign is null or orders.buyer_email is null);

alter table public.orders
  alter column user_id drop not null;

alter table public.orders
  drop constraint if exists orders_user_id_fkey;

alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete set null;

create or replace function private.snapshot_order_buyer()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id is not null then
    select
      coalesce(new.buyer_name, profile.nombre),
      coalesce(new.buyer_callsign, profile.callsign, profile.usuario_roblox),
      coalesce(new.buyer_email, profile.email)
    into new.buyer_name, new.buyer_callsign, new.buyer_email
    from public.profiles as profile
    where profile.id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists snapshot_order_buyer on public.orders;
create trigger snapshot_order_buyer
before insert or update of user_id on public.orders
for each row execute function private.snapshot_order_buyer();

revoke all on function private.snapshot_order_buyer() from public, anon, authenticated;
