-- Separate platform permissions from Pentagon appointments and pay every
-- active member a weekly rank salary plus an optional appointment bonus.

create table public.command_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  discord_role_id text unique,
  weekly_bonus integer not null default 0 check (weekly_bonus >= 0),
  active boolean not null default true,
  sort_order integer not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.command_roles (name, discord_role_id, weekly_bonus, sort_order) values
  ('Alto Mando', '1346337407628345434', 0, 1),
  ('Staff en Jefe', '1510498357838086184', 0, 2),
  ('Staff', '1079948911382372432', 0, 3),
  ('Staff en Prueba', '1165781171507044402', 0, 4),
  ('Gestor de Misiones', '1346333945679056958', 0, 5),
  ('Consultor', '1346336089127780385', 0, 6)
on conflict (name) do update set
  discord_role_id = excluded.discord_role_id,
  sort_order = excluded.sort_order,
  updated_at = now();

alter table public.profiles
  add column command_role_id uuid references public.command_roles(id) on delete set null;

-- Correct the OP-1 amount from the supplied official pay table.
update public.rank_salaries set weekly_salary = 100 where rank_name = 'Soldado';

alter table public.command_roles enable row level security;

create policy "command roles are readable"
on public.command_roles for select to authenticated using (true);

create policy "administration manages command roles"
on public.command_roles for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

grant select on public.command_roles to authenticated;
grant insert, update, delete on public.command_roles to authenticated;

create or replace function private.notify_command_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_name text;
  next_name text;
begin
  if old.command_role_id is not distinct from new.command_role_id then return new; end if;
  select name into previous_name from public.command_roles where id = old.command_role_id;
  select name into next_name from public.command_roles where id = new.command_role_id;
  insert into public.discord_events (tipo, titulo, mensaje, user_id)
  values (
    'command_role_updated',
    'Cargo del Pentágono actualizado',
    coalesce(new.nombre, new.callsign, 'Miembro') || ' cambió de ' ||
      coalesce(previous_name, 'Sin cargo') || ' a ' || coalesce(next_name, 'Sin cargo') || '.',
    new.id
  );
  return new;
end;
$$;

revoke all on function private.notify_command_role_change() from public, anon, authenticated;
drop trigger if exists notify_command_role_change on public.profiles;
create trigger notify_command_role_change
after update of command_role_id on public.profiles
for each row execute function private.notify_command_role_change();

create or replace function private.notify_command_role_bonus_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.weekly_bonus is not distinct from new.weekly_bonus then return new; end if;
  insert into public.discord_events (tipo, titulo, mensaje, user_id)
  values (
    'command_role_bonus_updated',
    'Bono del Pentágono actualizado',
    new.name || ': USD ' || old.weekly_bonus || ' → USD ' || new.weekly_bonus || ' por semana.',
    (select auth.uid())
  );
  return new;
end;
$$;

revoke all on function private.notify_command_role_bonus_change() from public, anon, authenticated;
drop trigger if exists notify_command_role_bonus_change on public.command_roles;
create trigger notify_command_role_bonus_change
after update of weekly_bonus on public.command_roles
for each row execute function private.notify_command_role_bonus_change();

create or replace function public.pay_my_salary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  base_salary integer := 0;
  role_bonus integer := 0;
  total_salary integer := 0;
  role_name text;
  next_payment timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select * into current_profile from public.profiles where id = (select auth.uid()) for update;
  if not found or current_profile.estado <> 'activo' then raise exception 'Active profile required'; end if;
  next_payment := coalesce(current_profile.ultimo_salario + interval '7 days', now());
  if next_payment > now() then
    return jsonb_build_object('paid', false, 'amount', 0, 'next_at', next_payment);
  end if;
  select weekly_salary into base_salary from public.rank_salaries where rank_name = current_profile.rango;
  select name, weekly_bonus into role_name, role_bonus
    from public.command_roles where id = current_profile.command_role_id and active;
  base_salary := coalesce(base_salary, 0);
  role_bonus := coalesce(role_bonus, 0);
  total_salary := base_salary + role_bonus;
  update public.profiles
    set dinero = dinero + total_salary, ultimo_salario = now(), updated_at = now()
    where id = current_profile.id;
  insert into public.transactions (user_id, tipo, descripcion, monto_dinero)
  values (
    current_profile.id,
    'salario',
    'Salario semanal — ' || current_profile.rango ||
      case when role_name is not null then ' + ' || role_name else '' end,
    total_salary
  );
  return jsonb_build_object(
    'paid', true,
    'amount', total_salary,
    'base_salary', base_salary,
    'role_bonus', role_bonus,
    'next_at', now() + interval '7 days'
  );
end;
$$;

revoke all on function public.pay_my_salary() from public, anon;
grant execute on function public.pay_my_salary() to authenticated;

create or replace function private.pay_all_salaries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare paid_count integer;
begin
  with due as (
    select
      p.id,
      p.rango,
      cr.name as command_role_name,
      coalesce(rs.weekly_salary, 0) as base_salary,
      coalesce(cr.weekly_bonus, 0) as role_bonus
    from public.profiles p
    left join public.rank_salaries rs on rs.rank_name = p.rango
    left join public.command_roles cr on cr.id = p.command_role_id and cr.active
    where p.estado = 'activo'
      and (p.ultimo_salario is null or p.ultimo_salario <= now() - interval '7 days')
    for update of p
  ), updated as (
    update public.profiles p
      set dinero = p.dinero + due.base_salary + due.role_bonus,
          ultimo_salario = now(),
          updated_at = now()
    from due where p.id = due.id
    returning p.id, p.rango, due.command_role_name, due.base_salary, due.role_bonus
  ), logged as (
    insert into public.transactions (user_id, tipo, descripcion, monto_dinero)
    select
      id,
      'salario',
      'Salario semanal — ' || rango ||
        case when command_role_name is not null then ' + ' || command_role_name else '' end,
      base_salary + role_bonus
    from updated returning 1
  )
  select count(*) into paid_count from logged;
  return paid_count;
end;
$$;

revoke all on function private.pay_all_salaries() from public, anon, authenticated;
