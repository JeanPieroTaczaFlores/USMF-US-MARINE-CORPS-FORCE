-- =============================================
-- USMCF — SCHEMA COMPLETO (PostgreSQL / Supabase)
-- =============================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- =============================================
-- TABLA: usuarios
-- =============================================
create table if not exists usuarios (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique references auth.users(id) on delete cascade,
  email text unique not null,
  nombre text not null default 'Sin nombre',
  usuario_roblox text not null default 'SinUsuario',
  rango text not null default 'Soldado',
  rol text not null default 'usuario' check (rol in ('super_admin', 'admin', 'staff', 'usuario')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'activo', 'inactivo')),
  puntos integer not null default 0,
  dinero integer not null default 0,
  last_login timestamptz,
  ultimo_cobro_salario timestamptz,
  created_at timestamptz not null default now()
);

-- =============================================
-- TABLA: rangos
-- =============================================
create table if not exists rangos (
  id serial primary key,
  nombre text unique not null,
  salario_semanal integer not null default 80,
  orden_jerarquico integer not null
);

-- =============================================
-- TABLA: misiones
-- =============================================
create table if not exists misiones (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  descripcion text default '',
  recompensa_puntos integer not null default 0,
  recompensa_dinero integer not null default 0,
  estado text not null default 'programada' check (estado in ('programada', 'activa', 'terminada')),
  fecha timestamptz,
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now()
);

-- =============================================
-- TABLA: misiones_participantes
-- =============================================
create table if not exists misiones_participantes (
  id uuid primary key default uuid_generate_v4(),
  mision_id uuid not null references misiones(id) on delete cascade,
  usuario_id uuid not null references usuarios(id) on delete cascade,
  recompensa_pagada boolean not null default false,
  fecha_inscripcion timestamptz not null default now(),
  unique(mision_id, usuario_id)
);

-- =============================================
-- TABLA: tienda_items
-- =============================================
create table if not exists tienda_items (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  descripcion text default '',
  tipo text not null default 'general',
  imagen_url text default '',
  precio_coins integer not null default 0,
  precio_puntos integer not null default 0,
  stock integer not null default -1,
  disponible boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================
-- TABLA: compras (inventario de usuarios)
-- =============================================
create table if not exists compras (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  item_id uuid not null references tienda_items(id) on delete cascade,
  precio_pagado integer not null default 0,
  tipo_moneda text not null default 'coins' check (tipo_moneda in ('coins', 'puntos')),
  fecha timestamptz not null default now()
);

-- =============================================
-- TABLA: opiniones
-- =============================================
create table if not exists opiniones (
  id uuid primary key default uuid_generate_v4(),
  contenido text not null,
  usuario_id uuid references usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =============================================
-- TABLA: movimientos
-- =============================================
create table if not exists movimientos (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  tipo text not null check (tipo in ('ingreso', 'gasto', 'recompensa', 'salario')),
  monto integer not null default 0,
  moneda text not null default 'coins' check (moneda in ('coins', 'puntos')),
  descripcion text default '',
  fecha timestamptz not null default now()
);

-- =============================================
-- RANGOS SEED
-- =============================================
insert into rangos (nombre, salario_semanal, orden_jerarquico) values
  ('Soldado', 80, 1),
  ('Soldado 1ra Clase', 120, 2),
  ('Cabo', 160, 3),
  ('Cabo de Escuadra', 200, 4),
  ('Sargento de Escuadra', 280, 5),
  ('Sargento de Pelotón', 360, 6),
  ('Sargento de Compañía', 440, 7),
  ('Sargento Mayor de 3ra Clase', 520, 8),
  ('Sargento Mayor de 2da Clase', 600, 9),
  ('Sargento Mayor de 1ra Clase', 700, 10),
  ('Sargento Mayor', 800, 11),
  ('Sargento Mayor Command', 900, 12),
  ('Teniente 2do', 1000, 13),
  ('Teniente 1ro', 1100, 14),
  ('Capitán', 1250, 15),
  ('Mayor', 1400, 16),
  ('Teniente Coronel', 1600, 17),
  ('Coronel', 1800, 18),
  ('General de Brigada', 2000, 19),
  ('General de División', 2200, 20),
  ('Teniente General', 2400, 21),
  ('General', 2600, 22)
on conflict (nombre) do nothing;

-- =============================================
-- FUNCIÓN: auto-crear perfil al registrarse
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (auth_id, email, nombre, usuario_roblox)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', 'Sin nombre'),
    coalesce(new.raw_user_meta_data->>'roblox', 'SinUsuario')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- FUNCIÓN: actualizar last_login al hacer login
-- =============================================
create or replace function public.update_last_login()
returns trigger as $$
begin
  update public.usuarios
  set last_login = now()
  where auth_id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

alter table usuarios enable row level security;
alter table misiones enable row level security;
alter table misiones_participantes enable row level security;
alter table tienda_items enable row level security;
alter table compras enable row level security;
alter table opiniones enable row level security;
alter table movimientos enable row level security;

-- Helper: obtener rol del usuario actual
create or replace function public.get_user_role()
returns text as $$
  select rol from public.usuarios where auth_id = auth.uid();
$$ language sql security definer stable;

create or replace function public.get_user_id()
returns uuid as $$
  select id from public.usuarios where auth_id = auth.uid();
$$ language sql security definer stable;

-- === USUARIOS ===
create policy "usuarios_select_own" on usuarios for select using (auth_id = auth.uid());
create policy "usuarios_select_staff" on usuarios for select using (get_user_role() in ('staff', 'admin', 'super_admin'));
create policy "usuarios_update_own" on usuarios for update using (auth_id = auth.uid());
create policy "usuarios_update_staff" on usuarios for update using (get_user_role() in ('staff', 'admin', 'super_admin'));
create policy "usuarios_delete_admin" on usuarios for delete using (get_user_role() in ('admin', 'super_admin'));

-- === MISIONES ===
create policy "misiones_select_auth" on misiones for select using (auth.uid() is not null);
create policy "misiones_insert_admin" on misiones for insert with check (get_user_role() in ('admin', 'super_admin'));
create policy "misiones_update_admin" on misiones for update using (get_user_role() in ('admin', 'super_admin'));
create policy "misiones_delete_admin" on misiones for delete using (get_user_role() in ('admin', 'super_admin'));

-- === MISIONES PARTICIPANTES ===
create policy "mp_select_own" on misiones_participantes for select using (usuario_id = get_user_id());
create policy "mp_select_staff" on misiones_participantes for select using (get_user_role() in ('staff', 'admin', 'super_admin'));
create policy "mp_insert_auth" on misiones_participantes for insert with check (usuario_id = get_user_id());
create policy "mp_update_admin" on misiones_participantes for update using (get_user_role() in ('admin', 'super_admin'));

-- === TIENDA ITEMS ===
create policy "tienda_select_auth" on tienda_items for select using (auth.uid() is not null);
create policy "tienda_insert_admin" on tienda_items for insert with check (get_user_role() in ('admin', 'super_admin'));
create policy "tienda_update_admin" on tienda_items for update using (get_user_role() in ('admin', 'super_admin'));
create policy "tienda_delete_admin" on tienda_items for delete using (get_user_role() in ('admin', 'super_admin'));

-- === COMPRAS ===
create policy "compras_select_own" on compras for select using (usuario_id = get_user_id());
create policy "compras_select_staff" on compras for select using (get_user_role() in ('staff', 'admin', 'super_admin'));
create policy "compras_insert_own" on compras for insert with check (usuario_id = get_user_id());

-- === OPINIONES ===
create policy "opiniones_select_auth" on opiniones for select using (auth.uid() is not null);
create policy "opiniones_insert_own" on opiniones for insert with check (usuario_id = get_user_id());
create policy "opiniones_delete_admin" on opiniones for delete using (get_user_role() in ('admin', 'super_admin'));

-- === MOVIMIENTOS ===
create policy "movimientos_select_own" on movimientos for select using (usuario_id = get_user_id());
create policy "movimientos_select_staff" on movimientos for select using (get_user_role() in ('staff', 'admin', 'super_admin'));
create policy "movimientos_insert_admin" on movimientos for insert with check (get_user_role() in ('admin', 'super_admin'));
create policy "movimientos_insert_system" on movimientos for insert with check (true);
