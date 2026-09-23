create table if not exists public.discord_roles (
  id text primary key check (id ~ '^[0-9]{17,20}$'),
  name text not null,
  position integer not null default 0,
  permissions text not null default '0',
  managed boolean not null default false,
  synced_at timestamptz not null default now()
);

create table if not exists public.discord_channels (
  id text primary key check (id ~ '^[0-9]{17,20}$'),
  name text not null,
  type integer not null,
  parent_id text,
  position integer not null default 0,
  synced_at timestamptz not null default now()
);

alter table public.discord_roles enable row level security;
alter table public.discord_channels enable row level security;

drop policy if exists "staff read discord roles" on public.discord_roles;
create policy "staff read discord roles" on public.discord_roles
  for select to authenticated using ((select private.is_staff()));

drop policy if exists "staff read discord channels" on public.discord_channels;
create policy "staff read discord channels" on public.discord_channels
  for select to authenticated using ((select private.is_staff()));

grant select on public.discord_roles, public.discord_channels to authenticated;
