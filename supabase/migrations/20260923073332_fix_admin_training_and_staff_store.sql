-- Staff and administrators are command personnel: they do not receive recruit
-- training. The role is supplied through trusted app_metadata by admin-users.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  requested_role text := case
    when new.raw_app_meta_data ->> 'usmcf_role' in ('staff', 'admin', 'super_admin')
      then new.raw_app_meta_data ->> 'usmcf_role'
    else 'usuario'
  end;
  discord_identifier text;
  roster public.faction_members%rowtype;
  official_email text;
  official_name text;
  official_avatar text;
  official_callsign text;
begin
  if provider = 'discord' then
    discord_identifier := coalesce(new.raw_user_meta_data ->> 'provider_id', new.raw_user_meta_data ->> 'sub', new.raw_user_meta_data ->> 'id');
    select * into roster from public.faction_members where discord_id = discord_identifier and is_active;
    if not found then raise exception 'Tu Discord no aparece en la facción USMCF activa.' using errcode = '42501'; end if;
    official_email := roster.institutional_email;
    official_name := roster.display_name;
    official_avatar := coalesce(roster.avatar_url, new.raw_user_meta_data ->> 'avatar_url');
    official_callsign := coalesce(new.raw_user_meta_data ->> 'callsign', roster.username, roster.display_name);
  else
    official_email := lower(coalesce(new.email, ''));
    if official_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@usmcf\.com$' then raise exception 'Solo se aceptan correos institucionales @usmcf.com.' using errcode = '23514'; end if;
    official_name := coalesce(new.raw_user_meta_data ->> 'nombre', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(official_email, '@', 1));
    official_avatar := new.raw_user_meta_data ->> 'avatar_url';
    official_callsign := coalesce(nullif(new.raw_user_meta_data ->> 'callsign', ''), new.raw_user_meta_data ->> 'usuario_roblox', split_part(official_email, '@', 1));
  end if;

  insert into public.profiles (id, email, nombre, callsign, usuario_roblox, discord_id, avatar_url, rol, estado, rango)
  values (
    new.id, official_email, official_name, official_callsign,
    coalesce(new.raw_user_meta_data ->> 'usuario_roblox', 'Pendiente'), discord_identifier, official_avatar,
    requested_role,
    case when requested_role = 'usuario' then 'pendiente' else 'activo' end,
    case when requested_role = 'usuario' then 'Recluta' when requested_role = 'staff' then 'Soldado' else 'General' end
  ) on conflict (id) do nothing;

  if discord_identifier is not null then
    update public.faction_members set profile_id = new.id, synced_at = now() where discord_id = discord_identifier;
  end if;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function private.assign_recruit_training()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.rol <> 'usuario' or new.estado <> 'pendiente' then return new; end if;
  insert into public.training_assignments (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.discord_events (tipo, titulo, mensaje, user_id)
  values ('training_assigned', 'Nuevo recluta', new.nombre || ' recibió el Entrenamiento Básico TRS.', new.id);
  return new;
end;
$$;

revoke all on function private.assign_recruit_training() from public, anon, authenticated;

-- Repair command accounts created before this rule existed without deleting
-- their audit history.
update public.training_assignments ta
set estado = 'finalizado', completed_at = coalesce(completed_at, now())
from public.profiles p
where p.id = ta.user_id
  and p.rol in ('staff', 'admin', 'super_admin')
  and ta.estado <> 'finalizado';

update public.discord_events e
set estado = 'enviado', sent_at = coalesce(sent_at, now()), error_text = null
from public.profiles p
where p.id = e.user_id
  and p.rol in ('staff', 'admin', 'super_admin')
  and e.tipo = 'training_assigned'
  and e.estado in ('pendiente', 'error');
