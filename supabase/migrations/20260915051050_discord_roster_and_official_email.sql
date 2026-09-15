-- USMCF official identity and Discord faction roster.
-- The bot owns roster synchronization; authenticated users only read the rows
-- allowed by RLS. Website balances remain in profiles/transactions.

create table public.faction_members (
  discord_id text primary key,
  username text not null,
  display_name text not null,
  institutional_email text not null,
  avatar_url text,
  role_ids text[] not null default '{}',
  joined_at timestamptz,
  is_active boolean not null default true,
  profile_id uuid unique references public.profiles(id) on delete set null,
  synced_at timestamptz not null default now()
);

create unique index faction_members_institutional_email_idx
  on public.faction_members (lower(institutional_email));
create index faction_members_display_name_idx
  on public.faction_members (lower(display_name));
create index faction_members_active_synced_idx
  on public.faction_members (synced_at) where is_active;

alter table public.faction_members enable row level security;

create policy "members read own faction identity"
  on public.faction_members for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_staff()));

revoke all on public.faction_members from public, anon, authenticated;
grant select on public.faction_members to authenticated;
grant insert, update, delete on public.faction_members to service_role;

alter table public.profiles
  add constraint profiles_email_must_be_official
  check (lower(email) ~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@usmcf\.com$') not valid;

create or replace function private.hook_usmcf_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  provider text := coalesce(event -> 'user' -> 'app_metadata' ->> 'provider', 'email');
  requested_email text := lower(coalesce(event -> 'user' ->> 'email', ''));
begin
  -- Discord users are checked against the synchronized roster by the profile
  -- trigger. Their private Discord email is never stored in public.profiles.
  if provider = 'discord' then return '{}'::jsonb; end if;

  if requested_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@usmcf\.com$' then
    return jsonb_build_object('error', jsonb_build_object(
      'message', 'Solo se aceptan correos institucionales @usmcf.com.',
      'http_code', 403
    ));
  end if;
  return '{}'::jsonb;
end;
$$;

grant usage on schema private to supabase_auth_admin;
grant execute on function private.hook_usmcf_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function private.hook_usmcf_before_user_created(jsonb) from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  discord_identifier text;
  roster public.faction_members%rowtype;
  official_email text;
  official_name text;
  official_avatar text;
begin
  if provider = 'discord' then
    discord_identifier := coalesce(new.raw_user_meta_data ->> 'provider_id', new.raw_user_meta_data ->> 'sub', new.raw_user_meta_data ->> 'id');
    select * into roster
      from public.faction_members
      where discord_id = discord_identifier and is_active;
    if not found then
      raise exception 'Tu Discord no aparece en la facción USMCF activa.' using errcode = '42501';
    end if;
    official_email := roster.institutional_email;
    official_name := roster.display_name;
    official_avatar := coalesce(roster.avatar_url, new.raw_user_meta_data ->> 'avatar_url');
  else
    official_email := lower(coalesce(new.email, ''));
    if official_email !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@usmcf\.com$' then
      raise exception 'Solo se aceptan correos institucionales @usmcf.com.' using errcode = '23514';
    end if;
    official_name := coalesce(new.raw_user_meta_data ->> 'nombre', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(official_email, '@', 1));
    official_avatar := new.raw_user_meta_data ->> 'avatar_url';
  end if;

  insert into public.profiles (id, email, nombre, usuario_roblox, discord_id, avatar_url)
  values (
    new.id,
    official_email,
    official_name,
    coalesce(new.raw_user_meta_data ->> 'usuario_roblox', 'Pendiente'),
    discord_identifier,
    official_avatar
  ) on conflict (id) do nothing;

  if discord_identifier is not null then
    update public.faction_members set profile_id = new.id, synced_at = now()
      where discord_id = discord_identifier;
  end if;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create or replace function public.sync_my_discord_identity()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  discord_identifier text;
  roster public.faction_members%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select provider_id into discord_identifier
    from auth.identities
    where user_id = current_user_id and provider = 'discord'
    order by updated_at desc limit 1;

  if discord_identifier is null then
    return jsonb_build_object('linked', false);
  end if;

  select * into roster from public.faction_members
    where discord_id = discord_identifier and is_active;
  if not found then raise exception 'Discord account is not in the active USMCF roster'; end if;

  if exists (select 1 from public.profiles where discord_id = discord_identifier and id <> current_user_id) then
    raise exception 'Discord account is already linked to another profile';
  end if;

  update public.profiles
    set discord_id = discord_identifier,
        avatar_url = coalesce(roster.avatar_url, avatar_url),
        updated_at = now()
    where id = current_user_id;
  update public.faction_members set profile_id = current_user_id, synced_at = now()
    where discord_id = discord_identifier;

  return jsonb_build_object('linked', true, 'discord_id', discord_identifier);
end;
$$;

revoke all on function public.sync_my_discord_identity() from public, anon;
grant execute on function public.sync_my_discord_identity() to authenticated;

-- Normalize any previously linked Discord profiles without exposing the
-- private email returned by the OAuth provider.
update public.profiles p
set email = f.institutional_email,
    avatar_url = coalesce(f.avatar_url, p.avatar_url),
    updated_at = now()
from public.faction_members f
where p.discord_id = f.discord_id;
