-- Admin communications and unlimited command funds.

create or replace function public.publish_announcement(
  p_title text,
  p_message text,
  p_kind text default 'general'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_id uuid;
  safe_title text := left(trim(coalesce(p_title, '')), 120);
  safe_message text := left(trim(coalesce(p_message, '')), 1800);
begin
  if not (select private.is_admin()) then raise exception 'Administrator access required'; end if;
  if safe_title = '' or safe_message = '' then raise exception 'Title and message are required'; end if;
  if coalesce(p_kind, 'general') not in ('general', 'operativo', 'ascensos', 'entrenamiento') then raise exception 'Invalid announcement type'; end if;

  insert into public.discord_events (tipo, titulo, mensaje, user_id)
  values ('announcement_published', safe_title, safe_message, (select auth.uid()))
  returning id into event_id;

  return jsonb_build_object('event_id', event_id, 'kind', p_kind);
end;
$$;

revoke all on function public.publish_announcement(text, text, text) from public, anon;
grant execute on function public.publish_announcement(text, text, text) to authenticated;

create or replace function public.pay_my_salary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  salary integer;
  next_payment timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
  select * into current_profile from public.profiles where id = (select auth.uid()) for update;
  if not found or current_profile.estado <> 'activo' then raise exception 'Active profile required'; end if;
  if current_profile.rol in ('admin', 'super_admin') then
    return jsonb_build_object('paid', false, 'unlimited', true, 'amount', 0, 'next_at', null);
  end if;
  next_payment := coalesce(current_profile.ultimo_salario + interval '7 days', now());
  if next_payment > now() then
    return jsonb_build_object('paid', false, 'amount', 0, 'next_at', next_payment);
  end if;
  select weekly_salary into salary from public.rank_salaries where rank_name = current_profile.rango;
  salary := coalesce(salary, 0);
  update public.profiles set dinero = dinero + salary, ultimo_salario = now(), updated_at = now() where id = current_profile.id;
  insert into public.transactions (user_id, tipo, descripcion, monto_dinero)
  values (current_profile.id, 'salario', 'Salario semanal — ' || current_profile.rango, salary);
  return jsonb_build_object('paid', true, 'amount', salary, 'next_at', now() + interval '7 days');
end;
$$;

revoke all on function public.pay_my_salary() from public, anon;
grant execute on function public.pay_my_salary() to authenticated;

create or replace function private.pay_all_salaries()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare paid_count integer;
begin
  with due as (
    select p.id, p.rango, r.weekly_salary
    from public.profiles p
    join public.rank_salaries r on r.rank_name = p.rango
    where p.estado = 'activo'
      and p.rol not in ('admin', 'super_admin')
      and (p.ultimo_salario is null or p.ultimo_salario <= now() - interval '7 days')
    for update of p
  ), updated as (
    update public.profiles p set dinero = p.dinero + due.weekly_salary, ultimo_salario = now(), updated_at = now()
    from due where p.id = due.id returning p.id, p.rango, due.weekly_salary
  ), logged as (
    insert into public.transactions (user_id, tipo, descripcion, monto_dinero)
    select id, 'salario', 'Salario semanal — ' || rango, weekly_salary from updated returning 1
  ) select count(*) into paid_count from logged;
  return paid_count;
end;
$$;

revoke all on function private.pay_all_salaries() from public, anon, authenticated;
