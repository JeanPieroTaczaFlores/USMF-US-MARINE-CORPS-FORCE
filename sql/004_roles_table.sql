-- =============================================
-- TABLA: roles (personalizados por el admin)
-- =============================================
create table if not exists roles (
  id uuid primary key default uuid_generate_v4(),
  nombre text unique not null,
  descripcion text default '',
  color text not null default 'default',
  created_at timestamptz not null default now()
);

-- RLS
alter table roles enable row level security;

-- Admin puede gestionar roles
create policy "roles_select_auth" on roles for select using (auth.uid() is not null);
create policy "roles_insert_admin" on roles for insert with check (get_user_role() in ('admin', 'super_admin'));
create policy "roles_update_admin" on roles for update using (get_user_role() in ('admin', 'super_admin'));
create policy "roles_delete_admin" on roles for delete using (get_user_role() in ('admin', 'super_admin'));

-- Roles por defecto
insert into roles (nombre, descripcion, color) values
  ('USUARIO', 'Rol estándar para todos los miembros', 'default'),
  ('STAFF', 'Personal de apoyo y moderación', 'warning'),
  ('ADMIN', 'Administradores del sistema', 'danger'),
  ('SUPER ADMIN', 'Super administrador con control total', 'danger')
on conflict (nombre) do nothing;
