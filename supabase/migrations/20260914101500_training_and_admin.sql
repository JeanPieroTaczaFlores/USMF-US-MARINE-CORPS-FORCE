-- USMCF automatic recruit training and stricter administration controls.

insert into public.rank_salaries (rank_name, weekly_salary, category, sort_order)
values ('Recluta', 0, 'enlistado', 0)
on conflict (rank_name) do update set weekly_salary = 0, category = 'enlistado', sort_order = 0;

alter table public.profiles alter column rango set default 'Recluta';

create table if not exists public.training_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  trainer_id uuid references public.profiles(id) on delete set null,
  estado text not null default 'asignado' check (estado in ('asignado', 'en_curso', 'finalizado')),
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.training_assignments enable row level security;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and rol in ('admin', 'super_admin') and estado = 'activo');
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "staff manage profiles" on public.profiles;
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "members read own training" on public.training_assignments for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_staff()));
create policy "staff manage training" on public.training_assignments for all to authenticated
using ((select private.is_staff())) with check ((select private.is_staff()));
grant select on public.training_assignments to authenticated;

create or replace function private.assign_recruit_training()
returns trigger language plpgsql security definer set search_path = '' as $$
declare event_id uuid;
begin
  insert into public.training_assignments (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.discord_events (tipo, titulo, mensaje, user_id)
  values ('training_assigned', 'Nuevo recluta', new.nombre || ' recibió el Entrenamiento Básico TRS.', new.id)
  returning id into event_id;
  return new;
end; $$;
revoke all on function private.assign_recruit_training() from public, anon, authenticated;
drop trigger if exists on_profile_assign_training on public.profiles;
create trigger on_profile_assign_training after insert on public.profiles for each row execute function private.assign_recruit_training();

insert into public.training_assignments (user_id)
select id from public.profiles where estado = 'pendiente'
on conflict (user_id) do nothing;

create or replace function public.take_training(p_assignment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare assignment public.training_assignments%rowtype; actor_name text; recruit_name text; event_id uuid;
begin
  if not (select private.is_staff()) then raise exception 'Staff access required'; end if;
  select * into assignment from public.training_assignments where id = p_assignment_id for update;
  if not found or assignment.estado <> 'asignado' then raise exception 'Training is no longer available'; end if;
  update public.training_assignments set trainer_id = (select auth.uid()), estado = 'en_curso', started_at = now() where id = assignment.id;
  select nombre into actor_name from public.profiles where id = (select auth.uid());
  select nombre into recruit_name from public.profiles where id = assignment.user_id;
  insert into public.discord_events (tipo, titulo, mensaje, user_id)
  values ('training_started', 'Entrenamiento iniciado', actor_name || ' inició el Entrenamiento Básico TRS de ' || recruit_name || '.', assignment.user_id)
  returning id into event_id;
  return jsonb_build_object('event_id', event_id);
end; $$;

create or replace function public.finish_training(p_assignment_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare assignment public.training_assignments%rowtype; recruit_name text; event_id uuid;
begin
  if not (select private.is_staff()) then raise exception 'Staff access required'; end if;
  select * into assignment from public.training_assignments where id = p_assignment_id for update;
  if not found or assignment.estado <> 'en_curso' then raise exception 'Training is not in progress'; end if;
  if assignment.trainer_id <> (select auth.uid()) and not (select private.is_admin()) then raise exception 'Only the assigned trainer or an administrator can finish this training'; end if;
  update public.profiles set rango = 'Soldado', estado = 'activo', updated_at = now() where id = assignment.user_id returning nombre into recruit_name;
  update public.training_assignments set estado = 'finalizado', completed_at = now() where id = assignment.id;
  insert into public.discord_events (tipo, titulo, mensaje, user_id)
  values ('training_completed', 'Entrenamiento finalizado', recruit_name || ' completó el TRS y recibió el rango SOLDADO.', assignment.user_id)
  returning id into event_id;
  return jsonb_build_object('event_id', event_id, 'rank', 'Soldado');
end; $$;

create or replace function public.adjust_member_balance(p_user_id uuid, p_points integer default 0, p_money integer default 0, p_reason text default 'Ajuste manual de mando')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target public.profiles%rowtype; actor_name text; event_id uuid;
begin
  if not (select private.is_staff()) then raise exception 'Staff access required'; end if;
  select * into target from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Member not found'; end if;
  if target.puntos + p_points < 0 or target.dinero + p_money < 0 then raise exception 'Balance cannot be negative'; end if;
  update public.profiles set puntos = puntos + p_points, dinero = dinero + p_money, updated_at = now() where id = target.id;
  insert into public.transactions (user_id, tipo, descripcion, monto_puntos, monto_dinero)
  values (target.id, 'ajuste_mando', p_reason, p_points, p_money);
  select nombre into actor_name from public.profiles where id = (select auth.uid());
  insert into public.discord_events (tipo, titulo, mensaje, user_id)
  values ('points_adjusted', 'Actualización de puntos', actor_name || ' ajustó a ' || target.nombre || ': ' || case when p_points >= 0 then '+' else '' end || p_points || ' puntos y ' || case when p_money >= 0 then '+' else '' end || p_money || ' de saldo.', target.id)
  returning id into event_id;
  return jsonb_build_object('points', target.puntos + p_points, 'money', target.dinero + p_money, 'event_id', event_id);
end; $$;

revoke all on function public.take_training(uuid), public.finish_training(uuid) from public, anon;
grant execute on function public.take_training(uuid), public.finish_training(uuid) to authenticated;
