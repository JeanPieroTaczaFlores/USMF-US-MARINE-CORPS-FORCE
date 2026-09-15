-- Automatic enlisted/NCO progression and Staff-reviewed specialty applications.

alter table public.rank_salaries add column if not exists points_required integer;
alter table public.rank_salaries add column if not exists auto_promote boolean not null default false;

update public.rank_salaries as ranks
set points_required = thresholds.points_required,
    auto_promote = true
from (values
  ('Soldado', 100),
  ('Soldado de Primera', 150),
  ('Cabo de Lanza', 250),
  ('Cabo', 350),
  ('Cabo de Lanza (Avanzado)', 500),
  ('Sargento', 700),
  ('Sargento del Estado Mayor', 900),
  ('Sargento de Artillería', 1200),
  ('Sargento Mayor de 2da Clase', 1250),
  ('Sargento Primero', 1300),
  ('Sargento Mayor de Artillería', 1400),
  ('Sargento Mayor de 1ra Clase', 1450),
  ('Sargento Mayor de la Infantería', 1500)
) as thresholds(rank_name, points_required)
where ranks.rank_name = thresholds.rank_name;

create or replace function private.apply_automatic_rank()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_rank public.rank_salaries%rowtype;
  current_order integer;
begin
  if new.rol <> 'usuario' or new.estado <> 'activo' then return new; end if;
  select * into target_rank
  from public.rank_salaries
  where auto_promote = true and points_required <= new.puntos
  order by points_required desc
  limit 1;
  if target_rank.rank_name is null then return new; end if;
  select sort_order into current_order from public.rank_salaries where rank_name = new.rango;
  if target_rank.sort_order > coalesce(current_order, -1) then new.rango := target_rank.rank_name; end if;
  return new;
end;
$$;

create or replace function private.record_automatic_rank_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.rango is distinct from new.rango and old.puntos is distinct from new.puntos then
    insert into public.discord_events (tipo, titulo, mensaje, user_id)
    values ('rank_promoted', 'Ascenso automático', new.nombre || ' ascendió de ' || old.rango || ' a ' || new.rango || ' al alcanzar ' || new.puntos || ' puntos.', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_apply_automatic_rank on public.profiles;
create trigger profiles_apply_automatic_rank before update of puntos on public.profiles for each row execute function private.apply_automatic_rank();
drop trigger if exists profiles_record_automatic_rank_event on public.profiles;
create trigger profiles_record_automatic_rank_event after update of puntos on public.profiles for each row execute function private.record_automatic_rank_event();

create table if not exists public.specialty_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null check (role_key in ('raider','radio','medico','tirador_ligero','tirador_pesado','machine_gunner','combat_engineer','conductor','artillero')),
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  unique (user_id, role_key)
);

alter table public.specialty_applications enable row level security;
drop policy if exists "members read own specialty applications" on public.specialty_applications;
create policy "members read own specialty applications" on public.specialty_applications for select to authenticated using ((select auth.uid()) = user_id or (select private.is_staff()));
drop policy if exists "active members apply for specialties" on public.specialty_applications;
create policy "active members apply for specialties" on public.specialty_applications for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles where id = (select auth.uid()) and estado = 'activo'));
drop policy if exists "staff review specialty applications" on public.specialty_applications;
create policy "staff review specialty applications" on public.specialty_applications for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));

create or replace function private.record_specialty_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare member_name text;
begin
  if old.estado = 'pendiente' and new.estado = 'aprobada' then
    select nombre into member_name from public.profiles where id = new.user_id;
    insert into public.discord_events (tipo, titulo, mensaje, user_id)
    values ('specialty_approved', 'Especialidad aprobada', member_name || ' fue aprobado para la especialidad ' || new.role_key || '.', new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists specialty_decision_event on public.specialty_applications;
create trigger specialty_decision_event after update of estado on public.specialty_applications for each row execute function private.record_specialty_decision();
