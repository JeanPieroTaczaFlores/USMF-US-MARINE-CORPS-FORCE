-- USMCF unified member platform
-- Auth, weekly salaries, atomic checkout, invoices, inventory and RLS.

create extension if not exists pg_cron;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.rank_salaries (
  rank_name text primary key,
  weekly_salary integer not null default 0 check (weekly_salary >= 0),
  category text not null check (category in ('enlistado', 'suboficial', 'oficial')),
  sort_order integer not null unique
);

insert into public.rank_salaries (rank_name, weekly_salary, category, sort_order) values
  ('Soldado', 80, 'enlistado', 1),
  ('Soldado de Primera', 120, 'enlistado', 2),
  ('Cabo de Lanza', 160, 'enlistado', 3),
  ('Cabo', 200, 'enlistado', 4),
  ('Cabo de Lanza (Avanzado)', 250, 'enlistado', 5),
  ('Sargento', 300, 'suboficial', 6),
  ('Sargento del Estado Mayor', 360, 'suboficial', 7),
  ('Sargento de Artillería', 420, 'suboficial', 8),
  ('Sargento Mayor de 2da Clase', 480, 'suboficial', 9),
  ('Sargento Primero', 550, 'suboficial', 10),
  ('Sargento Mayor de Artillería', 620, 'suboficial', 11),
  ('Sargento Mayor de 1ra Clase', 700, 'suboficial', 12),
  ('Sargento Mayor de la Infantería', 800, 'suboficial', 13),
  ('Teniente Segundo', 900, 'oficial', 14),
  ('Teniente Primero', 1000, 'oficial', 15),
  ('Capitán', 1200, 'oficial', 16),
  ('Mayor', 1400, 'oficial', 17),
  ('Teniente Coronel', 1600, 'oficial', 18),
  ('Coronel', 1800, 'oficial', 19),
  ('General de Brigada', 2000, 'oficial', 20),
  ('General Mayor', 2200, 'oficial', 21),
  ('General', 2400, 'oficial', 22),
  ('General de la Infantería', 2600, 'oficial', 23)
on conflict (rank_name) do update set
  weekly_salary = excluded.weekly_salary,
  category = excluded.category,
  sort_order = excluded.sort_order;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null default 'Sin nombre',
  usuario_roblox text not null default 'SinUsuario',
  discord_id text unique,
  avatar_url text,
  rango text not null default 'Soldado' references public.rank_salaries(rank_name),
  rol text not null default 'usuario' check (rol in ('usuario', 'staff', 'admin', 'super_admin')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'activo', 'suspendido')),
  puntos integer not null default 0 check (puntos >= 0),
  dinero integer not null default 0 check (dinero >= 0),
  ultimo_salario timestamptz,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text not null default '',
  tipo text not null default 'general',
  precio_dinero integer not null default 0 check (precio_dinero >= 0),
  precio_puntos integer not null default 0 check (precio_puntos >= 0),
  stock integer not null default -1 check (stock >= -1),
  imagen_url text not null default '',
  disponible boolean not null default true,
  created_at timestamptz not null default now(),
  check (precio_dinero > 0 or precio_puntos > 0)
);

insert into public.shop_items (nombre, descripcion, tipo, precio_dinero, precio_puntos, stock) values
  ('Parche de unidad USMCF', 'Parche cosmético oficial para el uniforme autorizado.', 'uniforme', 120, 0, -1),
  ('Insignia de especialidad', 'Insignia cosmética para miembros con especialidad aprobada.', 'insignia', 180, 0, -1),
  ('Kit visual de operador', 'Conjunto cosmético sujeto a las normas de equipamiento de la unidad.', 'equipo', 300, 0, 20),
  ('Placa conmemorativa', 'Reconocimiento digital para el perfil del miembro.', 'reconocimiento', 0, 250, -1)
on conflict (nombre) do nothing;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  invoice_number text not null unique,
  total_dinero integer not null default 0 check (total_dinero >= 0),
  total_puntos integer not null default 0 check (total_puntos >= 0),
  estado text not null default 'pagada' check (estado in ('pagada', 'anulada')),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid references public.shop_items(id) on delete set null,
  nombre text not null,
  quantity integer not null check (quantity > 0),
  precio_dinero integer not null default 0 check (precio_dinero >= 0),
  precio_puntos integer not null default 0 check (precio_puntos >= 0)
);

create table public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete restrict,
  cantidad integer not null default 1 check (cantidad > 0),
  comprado_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null,
  descripcion text not null,
  monto_dinero integer not null default 0,
  monto_puntos integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text not null default '',
  fecha timestamptz not null,
  recompensa_puntos integer not null default 0,
  recompensa_dinero integer not null default 0,
  estado text not null default 'programada',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.mission_participants (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  estado text not null default 'inscrito',
  joined_at timestamptz not null default now(),
  unique (mission_id, user_id)
);

create table public.opinions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  titulo text,
  contenido text not null,
  calificacion integer not null default 5 check (calificacion between 1 and 5),
  created_at timestamptz not null default now()
);

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and rol in ('staff', 'admin', 'super_admin')
      and estado = 'activo'
  );
$$;

revoke all on function private.is_staff() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_staff() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, nombre, usuario_roblox, discord_id, avatar_url)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@discord.local'),
    coalesce(new.raw_user_meta_data ->> 'nombre', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'Marine'), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'usuario_roblox', 'Pendiente'),
    case when new.raw_app_meta_data ->> 'provider' = 'discord' then coalesce(new.raw_user_meta_data ->> 'provider_id', new.raw_user_meta_data ->> 'sub') else null end,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function public.pay_my_salary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  salary integer;
  next_payment timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select * into current_profile from public.profiles where id = (select auth.uid()) for update;
  if not found or current_profile.estado <> 'activo' then raise exception 'Active profile required'; end if;
  next_payment := coalesce(current_profile.ultimo_salario + interval '7 days', now());
  if next_payment > now() then
    return jsonb_build_object('paid', false, 'amount', 0, 'next_at', next_payment);
  end if;
  select weekly_salary into salary from public.rank_salaries where rank_name = current_profile.rango;
  salary := coalesce(salary, 0);
  update public.profiles set dinero = dinero + salary, ultimo_salario = now(), updated_at = now() where id = current_profile.id;
  insert into public.transactions (user_id, tipo, descripcion, monto_dinero)
  values (current_profile.id, 'salario', 'Salario semanal — ' || current_profile.rango, salary);
  return jsonb_build_object('paid', true, 'amount', salary, 'next_at', now() + interval '7 days');
end;
$$;

revoke all on function public.pay_my_salary() from public, anon;
grant execute on function public.pay_my_salary() to authenticated;

create or replace function public.checkout_cart(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  requested jsonb;
  product public.shop_items%rowtype;
  quantity integer;
  money_total integer := 0;
  points_total integer := 0;
  order_id uuid := gen_random_uuid();
  invoice text := 'USMCF-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(order_id::text, '-', ''), 1, 8));
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;
  select * into current_profile from public.profiles where id = (select auth.uid()) for update;
  if not found or current_profile.estado <> 'activo' then raise exception 'Active profile required'; end if;

  for requested in select value from jsonb_array_elements(p_items)
  loop
    quantity := greatest(1, coalesce((requested ->> 'quantity')::integer, 1));
    select * into product from public.shop_items where id = (requested ->> 'item_id')::uuid and disponible for update;
    if not found then raise exception 'Item unavailable'; end if;
    if product.stock >= 0 and product.stock < quantity then raise exception 'Insufficient stock for %', product.nombre; end if;
    money_total := money_total + product.precio_dinero * quantity;
    points_total := points_total + product.precio_puntos * quantity;
  end loop;

  if current_profile.dinero < money_total or current_profile.puntos < points_total then raise exception 'Insufficient balance'; end if;
  update public.profiles set dinero = dinero - money_total, puntos = puntos - points_total, updated_at = now() where id = current_profile.id;
  insert into public.orders (id, user_id, invoice_number, total_dinero, total_puntos) values (order_id, current_profile.id, invoice, money_total, points_total);

  for requested in select value from jsonb_array_elements(p_items)
  loop
    quantity := greatest(1, coalesce((requested ->> 'quantity')::integer, 1));
    select * into product from public.shop_items where id = (requested ->> 'item_id')::uuid for update;
    insert into public.order_items (order_id, item_id, nombre, quantity, precio_dinero, precio_puntos)
    values (order_id, product.id, product.nombre, quantity, product.precio_dinero, product.precio_puntos);
    insert into public.user_inventory (user_id, item_id, cantidad)
    values (current_profile.id, product.id, quantity)
    on conflict (user_id, item_id) do update set cantidad = public.user_inventory.cantidad + excluded.cantidad, comprado_at = now();
    if product.stock > 0 then update public.shop_items set stock = stock - quantity where id = product.id; end if;
  end loop;

  insert into public.transactions (user_id, tipo, descripcion, monto_dinero, monto_puntos)
  values (current_profile.id, 'compra', 'Factura ' || invoice, -money_total, -points_total);
  return jsonb_build_object('order_id', order_id, 'invoice_number', invoice, 'total_dinero', money_total, 'total_puntos', points_total);
end;
$$;

revoke all on function public.checkout_cart(jsonb) from public, anon;
grant execute on function public.checkout_cart(jsonb) to authenticated;

create or replace function private.pay_all_salaries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare paid_count integer;
begin
  with due as (
    select p.id, p.rango, r.weekly_salary
    from public.profiles p
    join public.rank_salaries r on r.rank_name = p.rango
    where p.estado = 'activo' and (p.ultimo_salario is null or p.ultimo_salario <= now() - interval '7 days')
    for update of p
  ), updated as (
    update public.profiles p set dinero = p.dinero + due.weekly_salary, ultimo_salario = now(), updated_at = now()
    from due where p.id = due.id returning p.id, p.rango, due.weekly_salary
  ), logged as (
    insert into public.transactions (user_id, tipo, descripcion, monto_dinero)
    select id, 'salario', 'Salario semanal — ' || rango, weekly_salary from updated returning 1
  ) select count(*) into paid_count from logged;
  return paid_count;
end;
$$;

revoke all on function private.pay_all_salaries() from public, anon, authenticated;

alter table public.rank_salaries enable row level security;
alter table public.profiles enable row level security;
alter table public.shop_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.user_inventory enable row level security;
alter table public.transactions enable row level security;
alter table public.missions enable row level security;
alter table public.mission_participants enable row level security;
alter table public.opinions enable row level security;

create policy "rank salaries are readable" on public.rank_salaries for select to authenticated using (true);
create policy "members read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id or (select private.is_staff()));
create policy "staff manage profiles" on public.profiles for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "catalog is readable" on public.shop_items for select to authenticated using (disponible or (select private.is_staff()));
create policy "staff manage catalog" on public.shop_items for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "members read own orders" on public.orders for select to authenticated using ((select auth.uid()) = user_id or (select private.is_staff()));
create policy "members read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = (select auth.uid()) or (select private.is_staff()))));
create policy "members read own inventory" on public.user_inventory for select to authenticated using ((select auth.uid()) = user_id or (select private.is_staff()));
create policy "members read own transactions" on public.transactions for select to authenticated using ((select auth.uid()) = user_id or (select private.is_staff()));
create policy "members read missions" on public.missions for select to authenticated using (true);
create policy "staff manage missions" on public.missions for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "members manage own mission enrollment" on public.mission_participants for all to authenticated using ((select auth.uid()) = user_id or (select private.is_staff())) with check ((select auth.uid()) = user_id or (select private.is_staff()));
create policy "members create opinions" on public.opinions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "members read own opinions" on public.opinions for select to authenticated using ((select auth.uid()) = user_id or (select private.is_staff()));
create policy "staff manage opinions" on public.opinions for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));

grant usage on schema public to anon, authenticated;
grant select on public.rank_salaries, public.shop_items to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.orders, public.order_items, public.user_inventory, public.transactions to authenticated;
grant select, insert, update, delete on public.missions, public.mission_participants, public.opinions to authenticated;
grant insert, update, delete on public.shop_items to authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'usmcf-weekly-salary';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('usmcf-weekly-salary', '0 5 * * 1', 'select private.pay_all_salaries();');
end;
$$;
