-- Specialty training requests, support tickets, callsigns and rotating Discord invites.

alter table public.profiles add column if not exists callsign text;
update public.profiles set callsign = coalesce(nullif(usuario_roblox, ''), split_part(email, '@', 1)) where callsign is null;
alter table public.profiles alter column callsign set not null;
alter table public.profiles alter column callsign set default 'Marine';

create table if not exists public.specialty_training_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  specialty_key text not null check (specialty_key in ('raider','radio','medico','tirador_ligero','tirador_pesado','machine_gunner','combat_engineer','conductor','artillero')),
  notes text not null default '',
  estado text not null default 'pendiente' check (estado in ('pendiente','en_curso','finalizado','rechazada')),
  trainer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  reviewed_at timestamptz,
  reminded_at timestamptz
);

create unique index if not exists specialty_training_one_open
on public.specialty_training_requests (user_id, specialty_key)
where estado in ('pendiente','en_curso');

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('soporte','reporte','apelacion','otro')),
  asunto text not null,
  detalle text not null,
  estado text not null default 'abierto' check (estado in ('abierto','en_revision','resuelto','cerrado')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  reminded_at timestamptz
);

create table if not exists public.support_ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default 'USMCF',
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.discord_invites (
  id uuid primary key default gen_random_uuid(),
  invite_url text not null,
  invite_code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.specialty_training_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_comments enable row level security;
alter table public.discord_invites enable row level security;

create policy "members read own specialty training" on public.specialty_training_requests for select to authenticated using ((select auth.uid()) = user_id or (select private.is_staff()));
create policy "staff manage specialty training" on public.specialty_training_requests for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "members read own tickets" on public.support_tickets for select to authenticated using ((select auth.uid()) = user_id or (select private.is_staff()));
create policy "members read ticket comments" on public.support_ticket_comments for select to authenticated using (exists (select 1 from public.support_tickets t where t.id = ticket_id and (t.user_id = (select auth.uid()) or (select private.is_staff()))));
create policy "authenticated read current invite" on public.discord_invites for select to authenticated using (expires_at > now());
create policy "public read current invite" on public.discord_invites for select to anon using (expires_at > now());

grant select on public.specialty_training_requests, public.support_tickets, public.support_ticket_comments, public.discord_invites to authenticated;
grant select on public.discord_invites to anon;

create or replace function public.request_specialty_training(p_specialty_key text, p_notes text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  member public.profiles%rowtype;
  requirement integer;
  request_id uuid;
  event_id uuid;
begin
  select * into member from public.profiles where id = (select auth.uid());
  if member.id is null or member.rol <> 'usuario' or member.estado <> 'activo' then raise exception 'Debes ser un miembro activo para solicitar cursos.'; end if;
  requirement := case p_specialty_key when 'raider' then 100 when 'radio' then 250 when 'medico' then 250 when 'tirador_ligero' then 300 when 'tirador_pesado' then 400 when 'machine_gunner' then 300 when 'combat_engineer' then 300 when 'conductor' then 120 when 'artillero' then 120 else null end;
  if requirement is null or member.puntos < requirement then raise exception 'No cumples los puntos requeridos para este curso.'; end if;
  insert into public.specialty_training_requests (user_id, specialty_key, notes) values (member.id, p_specialty_key, left(coalesce(p_notes,''),500)) returning id into request_id;
  insert into public.discord_events (tipo,titulo,mensaje,user_id) values ('specialty_training_requested','Nuevo entrenamiento solicitado','@' || member.callsign || ' solicitó el curso ' || p_specialty_key || ' con ' || member.puntos || ' puntos.',member.id) returning id into event_id;
  return jsonb_build_object('request_id',request_id,'event_id',event_id);
end; $$;

create or replace function public.review_specialty_training(p_request_id uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles%rowtype;
  request public.specialty_training_requests%rowtype;
  event_id uuid;
begin
  select * into actor from public.profiles where id = (select auth.uid());
  if actor.rol not in ('staff','admin','super_admin') or actor.estado <> 'activo' then raise exception 'Acceso exclusivo de Staff y Administración.'; end if;
  select * into request from public.specialty_training_requests where id = p_request_id for update;
  if request.id is null then raise exception 'Solicitud no encontrada.'; end if;
  if p_action = 'tomar' and request.estado = 'pendiente' then
    update public.specialty_training_requests set estado='en_curso',trainer_id=actor.id,started_at=now() where id=request.id;
  elsif p_action = 'finalizar' and request.estado = 'en_curso' then
    if request.trainer_id <> actor.id and actor.rol not in ('admin','super_admin') then raise exception 'Solo el instructor responsable o un administrador puede finalizarlo.'; end if;
    update public.specialty_training_requests set estado='finalizado',completed_at=now(),reviewed_at=now() where id=request.id;
    insert into public.specialty_applications (user_id,role_key,estado,reviewed_at,reviewed_by) values (request.user_id,request.specialty_key,'aprobada',now(),actor.id)
      on conflict (user_id,role_key) do update set estado='aprobada',reviewed_at=now(),reviewed_by=actor.id;
  elsif p_action = 'rechazar' and request.estado in ('pendiente','en_curso') then
    update public.specialty_training_requests set estado='rechazada',reviewed_at=now() where id=request.id;
  else raise exception 'La solicitud no permite esa acción.';
  end if;
  insert into public.discord_events (tipo,titulo,mensaje,user_id) values (case when p_action='finalizar' then 'specialty_approved' else 'specialty_training_'||p_action end,case when p_action='finalizar' then 'Especialidad concedida' else 'Actualización de entrenamiento' end,actor.nombre || ' actualizó el curso ' || request.specialty_key || '.',request.user_id) returning id into event_id;
  return jsonb_build_object('event_id',event_id,'user_id',request.user_id);
end; $$;

create or replace function public.admin_set_specialty(p_user_id uuid, p_specialty_key text, p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor public.profiles%rowtype; member public.profiles%rowtype; event_id uuid;
begin
  select * into actor from public.profiles where id=(select auth.uid());
  if actor.rol not in ('admin','super_admin') or actor.estado<>'activo' then raise exception 'Acceso exclusivo de Administración.'; end if;
  select * into member from public.profiles where id=p_user_id;
  if member.id is null then raise exception 'Miembro no encontrado.'; end if;
  if p_enabled then
    insert into public.specialty_applications(user_id,role_key,estado,reviewed_at,reviewed_by) values(member.id,p_specialty_key,'aprobada',now(),actor.id)
      on conflict(user_id,role_key) do update set estado='aprobada',reviewed_at=now(),reviewed_by=actor.id;
  else
    delete from public.specialty_applications where user_id=member.id and role_key=p_specialty_key;
  end if;
  insert into public.discord_events(tipo,titulo,mensaje,user_id) values(case when p_enabled then 'specialty_approved' else 'specialty_revoked' end,case when p_enabled then 'Especialidad otorgada' else 'Especialidad retirada' end,actor.nombre || case when p_enabled then ' otorgó ' else ' retiró ' end || p_specialty_key || ' a ' || member.nombre || '.',member.id) returning id into event_id;
  return jsonb_build_object('event_id',event_id);
end; $$;

create or replace function public.create_support_ticket(p_type text, p_subject text, p_body text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare member public.profiles%rowtype; ticket_id uuid; event_id uuid;
begin
  select * into member from public.profiles where id=(select auth.uid());
  if member.id is null then raise exception 'Authentication required'; end if;
  if trim(p_subject)='' or trim(p_body)='' then raise exception 'Asunto y detalle son obligatorios.'; end if;
  insert into public.support_tickets(user_id,tipo,asunto,detalle) values(member.id,p_type,left(trim(p_subject),120),left(trim(p_body),1800)) returning id into ticket_id;
  insert into public.discord_events(tipo,titulo,mensaje,user_id) values('ticket_created','Nuevo ticket: '||left(trim(p_subject),120),'@'||member.callsign||' abrió un ticket de '||p_type||'.'||chr(10)||left(trim(p_body),1800),member.id) returning id into event_id;
  return jsonb_build_object('ticket_id',ticket_id,'event_id',event_id);
end; $$;

create or replace function public.comment_support_ticket(p_ticket_id uuid, p_message text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor public.profiles%rowtype; ticket public.support_tickets%rowtype; event_id uuid;
begin
  select * into actor from public.profiles where id=(select auth.uid());
  select * into ticket from public.support_tickets where id=p_ticket_id for update;
  if ticket.id is null or (ticket.user_id<>actor.id and actor.rol not in ('staff','admin','super_admin')) then raise exception 'No puedes comentar en este ticket.'; end if;
  if trim(p_message)='' then raise exception 'El comentario está vacío.'; end if;
  insert into public.support_ticket_comments(ticket_id,author_id,author_name,message) values(ticket.id,actor.id,actor.callsign,left(trim(p_message),1000));
  update public.support_tickets set updated_at=now(),estado=case when actor.rol in ('staff','admin','super_admin') and estado='abierto' then 'en_revision' else estado end where id=ticket.id;
  insert into public.discord_events(tipo,titulo,mensaje,user_id) values('ticket_commented','Respuesta en ticket: '||ticket.asunto,'@'||actor.callsign||': '||left(trim(p_message),900),ticket.user_id) returning id into event_id;
  return jsonb_build_object('event_id',event_id);
end; $$;

create or replace function public.update_support_ticket_status(p_ticket_id uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor public.profiles%rowtype; ticket public.support_tickets%rowtype; event_id uuid;
begin
  select * into actor from public.profiles where id=(select auth.uid());
  if actor.rol not in ('staff','admin','super_admin') then raise exception 'Acceso exclusivo de Staff y Administración.'; end if;
  if p_status not in ('abierto','en_revision','resuelto','cerrado') then raise exception 'Estado inválido.'; end if;
  select * into ticket from public.support_tickets where id=p_ticket_id for update;
  if ticket.id is null then raise exception 'Ticket no encontrado.'; end if;
  update public.support_tickets set estado=p_status,assigned_to=actor.id,updated_at=now(),closed_at=case when p_status in ('resuelto','cerrado') then now() else null end where id=ticket.id;
  insert into public.discord_events(tipo,titulo,mensaje,user_id) values('ticket_status_changed','Ticket '||p_status,actor.nombre||' cambió el estado de “'||ticket.asunto||'” a '||p_status||'.',ticket.user_id) returning id into event_id;
  return jsonb_build_object('event_id',event_id);
end; $$;

grant execute on function public.request_specialty_training(text,text), public.review_specialty_training(uuid,text), public.admin_set_specialty(uuid,text,boolean), public.create_support_ticket(text,text,text), public.comment_support_ticket(uuid,text), public.update_support_ticket_status(uuid,text) to authenticated;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
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
    official_callsign := coalesce(nullif(new.raw_user_meta_data ->> 'callsign',''), new.raw_user_meta_data ->> 'usuario_roblox', split_part(official_email,'@',1));
  end if;
  insert into public.profiles (id,email,nombre,callsign,usuario_roblox,discord_id,avatar_url)
  values (new.id,official_email,official_name,official_callsign,coalesce(new.raw_user_meta_data ->> 'usuario_roblox','Pendiente'),discord_identifier,official_avatar)
  on conflict (id) do nothing;
  if discord_identifier is not null then update public.faction_members set profile_id=new.id,synced_at=now() where discord_id=discord_identifier; end if;
  return new;
end; $$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
