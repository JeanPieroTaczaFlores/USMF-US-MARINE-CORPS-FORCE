-- Staff and regular members can request personal specialty training.
-- Command accounts retain management access and assign specialties from Integrantes.
-- Raider remains valid only for historical records and is no longer requestable.

alter table public.specialty_training_requests
drop constraint if exists specialty_training_requests_specialty_key_check;

alter table public.specialty_training_requests
add constraint specialty_training_requests_specialty_key_check
check (specialty_key in (
  'raider','combat_grenadier','radio','medico','tirador_ligero','tirador_pesado',
  'machine_gunner','combat_engineer','artillero_vehiculo_aereo',
  'artillero_vehiculo_terrestre','licencia_vehiculo_pesado','licencia_vehiculo_ligero'
));

alter table public.specialty_applications
drop constraint if exists specialty_applications_role_key_check;

alter table public.specialty_applications
add constraint specialty_applications_role_key_check
check (role_key in (
  'raider','combat_grenadier','radio','medico','tirador_ligero','tirador_pesado',
  'machine_gunner','combat_engineer','artillero_vehiculo_aereo',
  'artillero_vehiculo_terrestre','licencia_vehiculo_pesado','licencia_vehiculo_ligero'
));

create or replace function public.request_specialty_training(p_specialty_key text, p_notes text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles%rowtype;
  requirement integer;
  request_id uuid;
  event_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Debes iniciar sesión para solicitar un curso.';
  end if;

  select * into member
  from public.profiles
  where id = (select auth.uid());

  if member.id is null then
    raise exception 'Tu cuenta no tiene un perfil vinculado. Comunícate con Administración.';
  end if;
  if member.estado = 'pendiente' then
    raise exception 'Tu cuenta está pendiente. Administración debe confirmar tu TRS.';
  end if;
  if member.estado = 'suspendido' then
    raise exception 'Tu cuenta está suspendida. Administración debe revisar tu estado.';
  end if;
  if member.estado <> 'activo' then
    raise exception 'Debes tener una cuenta activa para solicitar un curso.';
  end if;
  if member.rol not in ('usuario', 'staff') then
    raise exception 'Administración no solicita cursos personales aquí; asigna especialidades desde Integrantes.';
  end if;

  requirement := case p_specialty_key
    when 'combat_grenadier' then 100
    when 'radio' then 250
    when 'medico' then 250
    when 'tirador_ligero' then 300
    when 'tirador_pesado' then 400
    when 'machine_gunner' then 300
    when 'combat_engineer' then 300
    when 'artillero_vehiculo_aereo' then 300
    when 'artillero_vehiculo_terrestre' then 250
    when 'licencia_vehiculo_pesado' then 300
    when 'licencia_vehiculo_ligero' then 250
    else null
  end;

  if requirement is null then
    raise exception 'El curso seleccionado no existe o ya no está disponible.';
  end if;
  if member.puntos < requirement then
    raise exception 'No cumples los puntos requeridos para este curso. Tienes % y necesitas %.', member.puntos, requirement;
  end if;

  if exists (
    select 1 from public.specialty_applications
    where user_id = member.id and role_key = p_specialty_key and estado = 'aprobada'
  ) then
    raise exception 'Ya tienes esta especialidad aprobada.';
  end if;

  if exists (
    select 1 from public.specialty_training_requests
    where user_id = member.id and specialty_key = p_specialty_key and estado in ('pendiente', 'asignado', 'en_curso')
  ) then
    raise exception 'Ya tienes una solicitud activa para este curso.';
  end if;

  insert into public.specialty_training_requests (user_id, specialty_key, notes)
  values (member.id, p_specialty_key, left(coalesce(p_notes, ''), 500))
  returning id into request_id;

  insert into public.discord_events (tipo, titulo, mensaje, user_id)
  values (
    'specialty_training_requested',
    'Nuevo entrenamiento solicitado',
    '@' || member.callsign || ' solicitó el curso ' || p_specialty_key || ' con ' || member.puntos || ' puntos.',
    member.id
  )
  returning id into event_id;

  return jsonb_build_object('request_id', request_id, 'event_id', event_id);
end;
$$;

revoke all on function public.request_specialty_training(text, text) from public, anon;
grant execute on function public.request_specialty_training(text, text) to authenticated;
