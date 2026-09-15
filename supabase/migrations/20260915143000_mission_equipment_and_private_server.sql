-- Mission equipment, private Roblox server and Discord mission announcements.

alter table public.missions add column if not exists required_equipment text[] not null default '{}';
alter table public.missions add column if not exists private_server_url text;

alter table public.missions drop constraint if exists missions_private_server_url_check;
alter table public.missions add constraint missions_private_server_url_check check (
  private_server_url is null or (
    private_server_url ~ '^https://([a-z0-9-]+\.)*roblox\.com/' and length(private_server_url) <= 600
  )
);

create or replace function public.save_mission(
  p_mission_id uuid,
  p_title text,
  p_description text,
  p_date timestamptz,
  p_reward_points integer,
  p_reward_money integer,
  p_status text,
  p_private_server_url text,
  p_required_equipment text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  mission_id uuid;
  event_id uuid;
  clean_equipment text[];
  event_message text;
begin
  if not (select private.is_staff()) then raise exception 'Staff access required'; end if;
  if trim(coalesce(p_title, '')) = '' or trim(coalesce(p_description, '')) = '' or p_date is null then raise exception 'Mission data is incomplete'; end if;
  if p_status not in ('programada', 'activa') then raise exception 'Invalid mission status'; end if;
  if p_reward_points < 0 or p_reward_money < 0 then raise exception 'Rewards cannot be negative'; end if;
  if coalesce(p_private_server_url, '') !~ '^https://([a-z0-9-]+\.)*roblox\.com/' then raise exception 'Official Roblox HTTPS URL required'; end if;

  select coalesce(array_agg(left(trim(item), 120)), '{}') into clean_equipment
  from unnest(coalesce(p_required_equipment, '{}')) item
  where trim(item) <> '';
  if cardinality(clean_equipment) = 0 then raise exception 'Required equipment is missing'; end if;

  if p_mission_id is null then
    insert into public.missions (titulo, descripcion, fecha, recompensa_puntos, recompensa_dinero, estado, private_server_url, required_equipment, created_by)
    values (left(trim(p_title), 120), left(trim(p_description), 2000), p_date, p_reward_points, p_reward_money, p_status, left(p_private_server_url, 600), clean_equipment, (select auth.uid()))
    returning id into mission_id;
  else
    update public.missions set titulo = left(trim(p_title), 120), descripcion = left(trim(p_description), 2000), fecha = p_date,
      recompensa_puntos = p_reward_points, recompensa_dinero = p_reward_money, estado = p_status,
      private_server_url = left(p_private_server_url, 600), required_equipment = clean_equipment
    where id = p_mission_id returning id into mission_id;
    if mission_id is null then raise exception 'Mission not found'; end if;
  end if;

  event_message := left(trim(p_description), 1200)
    || E'\nFecha: ' || to_char(p_date at time zone 'America/Bogota', 'DD/MM/YYYY HH24:MI')
    || E'\nRecompensa: ' || p_reward_points || ' pts · USD ' || p_reward_money
    || E'\nEquipamiento obligatorio: ' || array_to_string(clean_equipment, ', ')
    || E'\nServidor privado Roblox: ' || p_private_server_url;

  insert into public.discord_events (tipo, titulo, mensaje, mission_id, user_id)
  values (case when p_mission_id is null then 'mission_published' else 'mission_updated' end,
    case when p_mission_id is null then 'Nueva misión: ' else 'Misión actualizada: ' end || left(trim(p_title), 100),
    left(event_message, 1800), mission_id, (select auth.uid()))
  returning id into event_id;

  return jsonb_build_object('mission_id', mission_id, 'event_id', event_id);
end;
$$;

revoke all on function public.save_mission(uuid, text, text, timestamptz, integer, integer, text, text, text[]) from public, anon;
grant execute on function public.save_mission(uuid, text, text, timestamptz, integer, integer, text, text, text[]) to authenticated;
