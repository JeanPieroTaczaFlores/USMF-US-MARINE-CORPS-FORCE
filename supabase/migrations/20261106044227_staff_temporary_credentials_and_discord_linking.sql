create table if not exists public.private_account_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  password_ciphertext text not null,
  password_iv text not null,
  source text not null check (source in ('bot', 'admin_create', 'admin_reset')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.private_account_credentials enable row level security;
revoke all on public.private_account_credentials from anon, authenticated;

comment on table public.private_account_credentials is
  'Contraseñas temporales cifradas creadas desde la plataforma. Solo la Edge Function admin-users con service_role puede leerlas.';
