-- Reliable Discord outbox retries and actionable specialty-training errors.

alter table public.discord_events
  add column if not exists retry_count integer not null default 0,
  add column if not exists next_attempt_at timestamptz;

alter table public.discord_events
  drop constraint if exists discord_events_retry_count_check;

alter table public.discord_events
  add constraint discord_events_retry_count_check
  check (retry_count between 0 and 25);

create index if not exists discord_events_delivery_queue_idx
  on public.discord_events (estado, next_attempt_at, created_at);

-- Historical failures remain terminal. Only failures produced by the new bot
-- receive an explicit next_attempt_at value and enter the retry queue.

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
  if member.rol <> 'usuario' then
    raise exception 'Solo los miembros pueden solicitar cursos. Staff y Administración los gestionan desde Integrantes.';
  end if;

  requirement := case p_specialty_key
    when 'raider' then 100
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
    where user_id = member.id and specialty_key = p_specialty_key and estado in ('pendiente', 'en_curso')
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
