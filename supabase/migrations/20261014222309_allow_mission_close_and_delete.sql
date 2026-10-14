create or replace function public.finish_mission(p_mission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_now timestamptz := now();
  v_auto_absent_count integer := 0;
begin
  if not private.is_staff() then
    raise exception 'Acceso exclusivo de Staff.';
  end if;

  if not exists (
    select 1
    from public.missions
    where id = p_mission_id
      and estado = 'activa'
  ) then
    raise exception 'Solo se puede terminar una misión activa.';
  end if;

  update public.mission_participants
  set estado = 'ausente',
      reviewed_at = v_now,
      reviewed_by = auth.uid()
  where mission_id = p_mission_id
    and estado not in ('confirmado', 'ausente');

  get diagnostics v_auto_absent_count = row_count;

  update public.profiles p
  set puntos = p.puntos + m.recompensa_puntos,
      dinero = p.dinero + m.recompensa_dinero,
      updated_at = v_now
  from public.mission_participants mp
  join public.missions m on m.id = mp.mission_id
  where mp.mission_id = p_mission_id
    and mp.user_id = p.id
    and mp.estado = 'confirmado'
    and mp.rewarded_at is null;

  update public.mission_participants
  set rewarded_at = v_now
  where mission_id = p_mission_id
    and estado = 'confirmado'
    and rewarded_at is null;

  update public.missions
  set estado = 'finalizada',
      finalizada_at = v_now,
      updated_at = v_now
  where id = p_mission_id;

  return jsonb_build_object(
    'finished', true,
    'auto_absent_count', v_auto_absent_count
  );
end;
$$;

create or replace function public.delete_mission(p_mission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.is_admin() then
    raise exception 'Acceso exclusivo de Administración.';
  end if;

  if not exists (
    select 1
    from public.missions
    where id = p_mission_id
      and estado = 'finalizada'
  ) then
    raise exception 'Solo se pueden eliminar misiones finalizadas.';
  end if;

  delete from public.missions where id = p_mission_id;

  return jsonb_build_object('deleted', true);
end;
$$;

revoke all on function public.finish_mission(uuid) from public, anon;
grant execute on function public.finish_mission(uuid) to authenticated;

revoke all on function public.delete_mission(uuid) from public, anon;
grant execute on function public.delete_mission(uuid) to authenticated;
