-- Officer promotions are never granted by points. Officers request the next
-- rank and Staff/Admin must explicitly approve or reject the application.

update public.rank_salaries
set auto_promote = false,
    points_required = null
where category = 'oficial';

create table if not exists public.officer_promotion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_rank text not null references public.rank_salaries(rank_name),
  target_rank text not null references public.rank_salaries(rank_name),
  notes text not null default '' check (char_length(notes) <= 500),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists officer_promotion_one_pending_per_user
  on public.officer_promotion_requests (user_id)
  where estado = 'pendiente';

create index if not exists officer_promotion_status_created_idx
  on public.officer_promotion_requests (estado, created_at desc);

create index if not exists officer_promotion_user_idx
  on public.officer_promotion_requests (user_id);

create index if not exists officer_promotion_reviewer_idx
  on public.officer_promotion_requests (reviewed_by);

alter table public.officer_promotion_requests enable row level security;

drop policy if exists "members read own officer promotion requests" on public.officer_promotion_requests;
create policy "members read own officer promotion requests"
  on public.officer_promotion_requests
  for select
  to authenticated
  using ((select auth.uid()) = user_id or (select private.is_staff()));

grant select on public.officer_promotion_requests to authenticated;

create or replace function public.request_officer_promotion(p_notes text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.profiles%rowtype;
  current_rank public.rank_salaries%rowtype;
  next_rank public.rank_salaries%rowtype;
  request_id uuid;
  event_id uuid;
begin
  select * into member
  from public.profiles
  where id = (select auth.uid());

  if not found then
    raise exception 'Tu cuenta no tiene un perfil vinculado.';
  end if;
  if member.estado <> 'activo' then
    raise exception 'Debes ser un miembro activo para postular a un ascenso.';
  end if;

  select * into current_rank
  from public.rank_salaries
  where rank_name = member.rango;

  if current_rank.category <> 'oficial' then
    raise exception 'Las postulaciones manuales están disponibles al ingresar a la carrera de oficial.';
  end if;

  select * into next_rank
  from public.rank_salaries
  where category = 'oficial'
    and sort_order > current_rank.sort_order
  order by sort_order
  limit 1;

  if next_rank.rank_name is null then
    raise exception 'Ya tienes el rango más alto disponible.';
  end if;

  if exists (
    select 1 from public.officer_promotion_requests
    where user_id = member.id and estado = 'pendiente'
  ) then
    raise exception 'Ya tienes una postulación de ascenso pendiente.';
  end if;

  insert into public.officer_promotion_requests (user_id, from_rank, target_rank, notes)
  values (member.id, member.rango, next_rank.rank_name, left(trim(coalesce(p_notes, '')), 500))
  returning id into request_id;

  insert into public.discord_events (tipo, titulo, mensaje, user_id, target_channel_key, embed_color)
  values (
    'rank_promotion_requested',
    'Postulación de ascenso de oficial',
    '@' || member.callsign || ' postuló de ' || member.rango || ' a ' || next_rank.rank_name || '.',
    member.id,
    'logd',
    14071886
  )
  returning id into event_id;

  return jsonb_build_object(
    'request_id', request_id,
    'event_id', event_id,
    'from_rank', member.rango,
    'target_rank', next_rank.rank_name
  );
end;
$$;

create or replace function public.review_officer_promotion(p_request_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles%rowtype;
  member public.profiles%rowtype;
  application public.officer_promotion_requests%rowtype;
  event_id uuid;
  final_status text;
begin
  if not (select private.is_staff()) then
    raise exception 'Se requiere acceso de Staff o Administración.';
  end if;
  if p_action not in ('aprobar', 'rechazar') then
    raise exception 'Acción de revisión inválida.';
  end if;

  select * into actor from public.profiles where id = (select auth.uid());
  select * into application
  from public.officer_promotion_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'La postulación no existe.';
  end if;
  if application.estado <> 'pendiente' then
    raise exception 'La postulación ya fue revisada.';
  end if;

  select * into member
  from public.profiles
  where id = application.user_id
  for update;

  if p_action = 'aprobar' then
    if member.rango <> application.from_rank then
      raise exception 'El rango del miembro cambió después de la postulación. Revísalo antes de aprobar.';
    end if;
    update public.profiles
    set rango = application.target_rank,
        updated_at = now()
    where id = member.id;
    final_status := 'aprobada';
  else
    final_status := 'rechazada';
  end if;

  update public.officer_promotion_requests
  set estado = final_status,
      reviewed_by = actor.id,
      reviewed_at = now(),
      updated_at = now()
  where id = application.id;

  insert into public.discord_events (tipo, titulo, mensaje, user_id, target_channel_key, embed_color)
  values (
    case when final_status = 'aprobada' then 'rank_promoted' else 'rank_promotion_rejected' end,
    case when final_status = 'aprobada' then 'Ascenso de oficial confirmado' else 'Postulación de ascenso rechazada' end,
    actor.nombre || case when final_status = 'aprobada' then ' aprobó el ascenso de ' else ' rechazó la postulación de ' end ||
      member.nombre || ' de ' || application.from_rank || ' a ' || application.target_rank || '.',
    member.id,
    'logd',
    case when final_status = 'aprobada' then 14071886 else 12083004 end
  )
  returning id into event_id;

  return jsonb_build_object(
    'request_id', application.id,
    'user_id', member.id,
    'event_id', event_id,
    'status', final_status,
    'rank', case when final_status = 'aprobada' then application.target_rank else member.rango end
  );
end;
$$;

revoke all on function public.request_officer_promotion(text) from public, anon;
revoke all on function public.review_officer_promotion(uuid, text) from public, anon;
grant execute on function public.request_officer_promotion(text) to authenticated;
grant execute on function public.review_officer_promotion(uuid, text) to authenticated;
