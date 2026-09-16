-- Mission voice attendance and routed Discord announcements.

alter table public.missions add column if not exists voice_channel_id text;
alter table public.missions add column if not exists voice_channel_name text;

alter table public.missions drop constraint if exists missions_voice_channel_id_check;
alter table public.missions add constraint missions_voice_channel_id_check
  check (voice_channel_id is null or voice_channel_id ~ '^[0-9]{17,20}$');
alter table public.missions drop constraint if exists missions_voice_channel_name_check;
alter table public.missions add constraint missions_voice_channel_name_check
  check (voice_channel_name is null or length(voice_channel_name) between 1 and 100);

alter table public.discord_events add column if not exists target_channel_key text;
alter table public.discord_events add column if not exists embed_color integer;
alter table public.discord_events drop constraint if exists discord_events_target_channel_key_check;
alter table public.discord_events add constraint discord_events_target_channel_key_check
  check (target_channel_key is null or target_channel_key in ('announcements','missions','training','points','support','access'));
alter table public.discord_events drop constraint if exists discord_events_embed_color_check;
alter table public.discord_events add constraint discord_events_embed_color_check
  check (embed_color is null or embed_color between 0 and 16777215);

create table if not exists public.voice_sessions (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  mission_id uuid references public.missions(id) on delete set null,
  channel_id text not null check (channel_id ~ '^[0-9]{17,20}$'),
  channel_name text,
  joined_at timestamptz not null,
  left_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  check (left_at is null or left_at >= joined_at)
);

create index if not exists voice_sessions_mission_joined_idx on public.voice_sessions(mission_id, joined_at desc);
create index if not exists voice_sessions_discord_open_idx on public.voice_sessions(discord_id, left_at);
alter table public.voice_sessions enable row level security;

drop policy if exists "staff read voice sessions" on public.voice_sessions;
create policy "staff read voice sessions" on public.voice_sessions
  for select to authenticated using ((select private.is_staff()));
grant select on public.voice_sessions to authenticated;

drop function if exists public.save_mission(uuid, text, text, timestamptz, integer, integer, text, text, text[]);
create function public.save_mission(
  p_mission_id uuid,
  p_title text,
  p_description text,
  p_date timestamptz,
  p_reward_points integer,
  p_reward_money integer,
  p_status text,
  p_private_server_url text,
  p_required_equipment text[],
  p_voice_channel_id text,
  p_voice_channel_name text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  mission_id uuid;
  event_id uuid;
  clean_equipment text[];
  event_message text;
begin
  if not (select private.is_staff()) then raise exception 'Staff access required'; end if;
  if trim(coalesce(p_title,'')) = '' or p_date is null then raise exception 'Mission title and date are required'; end if;
  if p_reward_points < 0 or p_reward_money < 0 then raise exception 'Rewards cannot be negative'; end if;
  if p_status not in ('programada','activa') then raise exception 'Invalid mission status'; end if;
  if trim(coalesce(p_voice_channel_id,'')) !~ '^[0-9]{17,20}$' or trim(coalesce(p_voice_channel_name,'')) = '' then raise exception 'A valid Discord voice channel is required'; end if;
  if p_private_server_url !~ '^https://([a-z0-9-]+\.)*roblox\.com/' then raise exception 'Invalid Roblox private server URL'; end if;
  select coalesce(array_agg(left(trim(item),120)), array[]::text[]) into clean_equipment
    from unnest(coalesce(p_required_equipment,array[]::text[])) item where trim(item) <> '';
  if cardinality(clean_equipment) = 0 then raise exception 'At least one equipment item is required'; end if;

  if p_mission_id is null then
    insert into public.missions (titulo,descripcion,fecha,recompensa_puntos,recompensa_dinero,estado,private_server_url,required_equipment,voice_channel_id,voice_channel_name,created_by)
    values (left(trim(p_title),100),left(trim(coalesce(p_description,'')),1800),p_date,p_reward_points,p_reward_money,p_status,p_private_server_url,clean_equipment,trim(p_voice_channel_id),left(trim(p_voice_channel_name),100),(select auth.uid()))
    returning id into mission_id;
  else
    update public.missions set titulo=left(trim(p_title),100),descripcion=left(trim(coalesce(p_description,'')),1800),fecha=p_date,recompensa_puntos=p_reward_points,recompensa_dinero=p_reward_money,estado=p_status,private_server_url=p_private_server_url,required_equipment=clean_equipment,voice_channel_id=trim(p_voice_channel_id),voice_channel_name=left(trim(p_voice_channel_name),100)
      where id=p_mission_id returning id into mission_id;
    if mission_id is null then raise exception 'Mission not found'; end if;
  end if;

  event_message := left(trim(coalesce(p_description,'')),1200)
    || E'\nFecha: ' || to_char(p_date at time zone 'America/Bogota','DD/MM/YYYY HH24:MI')
    || E'\nRecompensa: ' || p_reward_points || ' pts · USD ' || p_reward_money
    || E'\nEquipamiento obligatorio: ' || array_to_string(clean_equipment,', ')
    || E'\nCanal de voz: <#' || trim(p_voice_channel_id) || '> (' || left(trim(p_voice_channel_name),100) || ')'
    || E'\nServidor privado Roblox: ' || p_private_server_url;
  insert into public.discord_events (tipo,titulo,mensaje,mission_id,user_id,target_channel_key,embed_color)
  values (case when p_mission_id is null then 'mission_published' else 'mission_updated' end,
    case when p_mission_id is null then 'Nueva misión: ' else 'Misión actualizada: ' end || left(trim(p_title),100),
    left(event_message,1800),mission_id,(select auth.uid()),'missions',2577707)
  returning id into event_id;
  return jsonb_build_object('mission_id',mission_id,'event_id',event_id);
end; $$;
revoke all on function public.save_mission(uuid,text,text,timestamptz,integer,integer,text,text,text[],text,text) from public, anon;
grant execute on function public.save_mission(uuid,text,text,timestamptz,integer,integer,text,text,text[],text,text) to authenticated;

drop function if exists public.publish_announcement(text,text,text);
create function public.publish_announcement(p_title text,p_message text,p_kind text default 'general',p_channel_key text default 'announcements',p_embed_color integer default 14071886)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare event_id uuid;
begin
  if not (select private.is_admin()) then raise exception 'Administrator access required'; end if;
  if trim(coalesce(p_title,''))='' or trim(coalesce(p_message,''))='' then raise exception 'Title and message are required'; end if;
  if p_kind not in ('general','operativo','ascensos','entrenamiento') then raise exception 'Invalid announcement type'; end if;
  if p_channel_key not in ('announcements','missions','training','points','support','access') then raise exception 'Invalid Discord channel'; end if;
  if p_embed_color not between 0 and 16777215 then raise exception 'Invalid announcement color'; end if;
  insert into public.discord_events(tipo,titulo,mensaje,user_id,target_channel_key,embed_color)
  values('announcement_published',left(trim(p_title),120),left(trim(p_message),1800),(select auth.uid()),p_channel_key,p_embed_color)
  returning id into event_id;
  return jsonb_build_object('event_id',event_id,'kind',p_kind,'channel',p_channel_key);
end; $$;
revoke all on function public.publish_announcement(text,text,text,text,integer) from public, anon;
grant execute on function public.publish_announcement(text,text,text,text,integer) to authenticated;
