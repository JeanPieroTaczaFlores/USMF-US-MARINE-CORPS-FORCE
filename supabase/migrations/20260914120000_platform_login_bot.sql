-- Notify Discord every time an authenticated member enters the web platform.
create or replace function public.record_platform_login()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  member public.profiles%rowtype;
  event_id uuid;
begin
  select * into member from public.profiles where id = (select auth.uid()) for update;
  if not found then raise exception 'Profile not found'; end if;

  update public.profiles set last_login = now(), updated_at = now() where id = member.id;
  insert into public.discord_events (tipo, titulo, mensaje, user_id)
  values (
    'platform_login',
    'Ingreso a la plataforma',
    coalesce(member.nombre, 'Miembro USMCF') || ' (' || coalesce(member.usuario_roblox, 'Sin Roblox') || ') ingresó a la Plataforma USMCF.',
    member.id
  ) returning id into event_id;

  return jsonb_build_object('event_id', event_id);
end;
$$;

revoke all on function public.record_platform_login() from public, anon;
grant execute on function public.record_platform_login() to authenticated;
