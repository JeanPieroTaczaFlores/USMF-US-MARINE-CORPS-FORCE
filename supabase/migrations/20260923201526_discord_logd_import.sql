create table if not exists public.discord_logd_messages (
  id text primary key check (id ~ '^[0-9]{17,20}$'),
  channel_id text not null check (channel_id ~ '^[0-9]{17,20}$'),
  author_id text,
  author_name text,
  content text not null default '',
  embeds jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  message_created_at timestamptz not null,
  synced_at timestamptz not null default now()
);

alter table public.discord_logd_messages enable row level security;

drop policy if exists "staff read logd records" on public.discord_logd_messages;
create policy "staff read logd records" on public.discord_logd_messages
  for select to authenticated using ((select private.is_staff()));

grant select on public.discord_logd_messages to authenticated;

create index if not exists discord_logd_messages_created_idx
  on public.discord_logd_messages(message_created_at desc);
