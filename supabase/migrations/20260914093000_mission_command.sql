-- USMCF mission command workflow and Discord outbox.

alter table public.missions add column if not exists started_at timestamptz;
alter table public.missions add column if not exists finalizada_at timestamptz;
alter table public.mission_participants add column if not exists reviewed_at timestamptz;
alter table public.mission_participants add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.mission_participants add column if not exists rewarded_at timestamptz;

create table if not exists public.discord_events (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  titulo text not null,
  mensaje text not null,
  mission_id uuid references public.missions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'error')),
  sent_at timestamptz,
  error_text text,
  created_at timestamptz not null default now()
);

alter table public.discord_events enable row level security;
drop policy if exists "members manage own mission enrollment" on public.mission_participants;
drop policy if exists "members read mission participation" on public.mission_participants;
drop policy if exists "staff manage mission participation" on public.mission_participants;
create policy "members read mission participation" on public.mission_participants for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_staff()));
create policy "staff manage mission participation" on public.mission_participants for all to authenticated
using ((select private.is_staff())) with check ((select private.is_staff()));
drop policy if exists "members read own discord events" on public.discord_events;
create policy "members read own discord events" on public.discord_events for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_staff()));
grant select on public.discord_events to authenticated;

create or replace function public.join_mission(p_mission_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_profile public.profiles%rowtype; mission public.missions%rowtype; participant_id uuid; event_id uuid;
begin
  select * into current_profile from public.profiles where id = (select auth.uid()) and estado = 'activo';
  if not found then raise exception 'Active profile required'; end if;
  select * into mission from public.missions where id = p_mission_id for update;
  if not found or mission.estado not in ('programada', 'activa') then raise exception 'Mission is not open'; end if;
  if exists (select 1 from public.mission_participants where mission_id = mission.id and user_id = current_profile.id) then raise exception 'Already enrolled'; end if;
  insert into public.mission_participants (mission_id, user_id, estado)
  values (mission.id, current_profile.id, case when mission.estado = 'activa' then 'en_mision' else 'inscrito' end)
  returning id into participant_id;
  insert into public.discord_events (tipo, titulo, mensaje, mission_id, user_id)
  values ('mission_join', 'Marine en misión', current_profile.nombre || ' se unió a ' || mission.titulo || case when mission.estado = 'activa' then ' y está EN MISIÓN.' else '.' end, mission.id, current_profile.id)
  returning id into event_id;
  return jsonb_build_object('participant_id', participant_id, 'event_id', event_id);
end; $$;

create or replace function public.leave_mission(p_mission_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.missions where id = p_mission_id and estado = 'programada') then raise exception 'Mission already started'; end if;
  delete from public.mission_participants where mission_id = p_mission_id and user_id = (select auth.uid());
  return jsonb_build_object('left', true);
end; $$;

create or replace function public.start_mission(p_mission_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare mission public.missions%rowtype; participant record; member_name text; event_id uuid; event_ids jsonb := '[]'::jsonb;
begin
  if not (select private.is_staff()) then raise exception 'Staff access required'; end if;
  select * into mission from public.missions where id = p_mission_id for update;
  if not found or mission.estado <> 'programada' then raise exception 'Mission cannot be started'; end if;
  update public.missions set estado = 'activa', started_at = now() where id = mission.id;
  for participant in select * from public.mission_participants where mission_id = mission.id for update loop
    update public.mission_participants set estado = 'en_mision', reviewed_at = null, reviewed_by = null where id = participant.id;
    select nombre into member_name from public.profiles where id = participant.user_id;
    insert into public.discord_events (tipo, titulo, mensaje, mission_id, user_id)
    values ('mission_started', 'Despliegue iniciado', coalesce(member_name, 'Miembro USMCF') || ' está EN MISIÓN: ' || mission.titulo || '.', mission.id, participant.user_id)
    returning id into event_id;
    event_ids := event_ids || jsonb_build_array(event_id);
  end loop;
  return jsonb_build_object('event_ids', event_ids);
end; $$;

create or replace function public.review_mission_participant(p_participant_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.is_staff()) then raise exception 'Staff access required'; end if;
  if p_status not in ('confirmado', 'ausente') then raise exception 'Invalid attendance status'; end if;
  update public.mission_participants set estado = p_status, reviewed_at = now(), reviewed_by = (select auth.uid()) where id = p_participant_id;
  if not found then raise exception 'Participant not found'; end if;
  return jsonb_build_object('reviewed', true);
end; $$;

create or replace function public.finish_mission(p_mission_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare mission public.missions%rowtype; participant_count integer; pending_count integer;
begin
  if not (select private.is_staff()) then raise exception 'Staff access required'; end if;
  select * into mission from public.missions where id = p_mission_id for update;
  if not found or mission.estado <> 'activa' then raise exception 'Only active missions can be finished'; end if;
  select count(*), count(*) filter (where estado not in ('confirmado', 'ausente')) into participant_count, pending_count
  from public.mission_participants where mission_id = mission.id;
  if participant_count = 0 then raise exception 'Mission has no participants'; end if;
  if pending_count > 0 then raise exception 'Review every participant before finishing'; end if;

  with rewarded as (
    update public.profiles p set
      puntos = p.puntos + mission.recompensa_puntos,
      dinero = p.dinero + mission.recompensa_dinero,
      updated_at = now()
    from public.mission_participants mp
    where mp.mission_id = mission.id and mp.estado = 'confirmado' and mp.rewarded_at is null and p.id = mp.user_id
    returning p.id
  )
  insert into public.transactions (user_id, tipo, descripcion, monto_puntos, monto_dinero)
  select id, 'mision', 'Misión completada: ' || mission.titulo, mission.recompensa_puntos, mission.recompensa_dinero from rewarded;

  update public.mission_participants set rewarded_at = now() where mission_id = mission.id and estado = 'confirmado' and rewarded_at is null;
  update public.missions set estado = 'finalizada', finalizada_at = now() where id = mission.id;
  return jsonb_build_object('finished', true);
end; $$;

create or replace function public.adjust_member_balance(p_user_id uuid, p_points integer default 0, p_money integer default 0, p_reason text default 'Ajuste manual de mando')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target public.profiles%rowtype;
begin
  if not (select private.is_staff()) then raise exception 'Staff access required'; end if;
  select * into target from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Member not found'; end if;
  if target.puntos + p_points < 0 or target.dinero + p_money < 0 then raise exception 'Balance cannot be negative'; end if;
  update public.profiles set puntos = puntos + p_points, dinero = dinero + p_money, updated_at = now() where id = target.id;
  insert into public.transactions (user_id, tipo, descripcion, monto_puntos, monto_dinero)
  values (target.id, 'ajuste_mando', p_reason, p_points, p_money);
  return jsonb_build_object('points', target.puntos + p_points, 'money', target.dinero + p_money);
end; $$;

revoke all on function public.join_mission(uuid), public.leave_mission(uuid), public.start_mission(uuid), public.review_mission_participant(uuid, text), public.finish_mission(uuid), public.adjust_member_balance(uuid, integer, integer, text) from public, anon;
grant execute on function public.join_mission(uuid), public.leave_mission(uuid), public.start_mission(uuid), public.review_mission_participant(uuid, text), public.finish_mission(uuid), public.adjust_member_balance(uuid, integer, integer, text) to authenticated;
