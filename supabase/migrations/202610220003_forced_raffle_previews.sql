drop function if exists public.preview_wiwu_prize(boolean);

create or replace function public.preview_wiwu_prize(
  p_allow_again boolean,
  p_forced_kind text default null
)
returns table (
  prize_index integer,
  prize_kind text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_streak integer;
  v_prize_index integer;
  v_prize_kind text;
begin
  if p_allow_again is null then
    raise exception 'p_allow_again must not be null';
  end if;

  if p_forced_kind is not null and p_forced_kind not in (
    'scare',
    'charge',
    'trick',
    'again_spin'
  ) then
    raise exception 'p_forced_kind is invalid';
  end if;

  if p_forced_kind = 'again_spin' and not p_allow_again then
    raise exception 'again_spin requires p_allow_again';
  end if;

  select coalesce(
    (select state.consecutive_scares
       from public.wiwu_raffle_state as state
       where state.id = 1),
    0
  )
  into v_streak;

  if p_forced_kind is null then
    return query
      select result.prize_index, result.prize_kind
      from public.calculate_wiwu_prize(p_allow_again, v_streak) as result;
    return;
  end if;

  case p_forced_kind
    when 'scare' then
      v_prize_index := 0;
    when 'charge' then
      v_prize_index := case when random() < 0.5 then 1 else 3 end;
    when 'trick' then
      v_prize_index := case when random() < 0.5 then 2 else 4 end;
    when 'again_spin' then
      v_prize_index := 5;
  end case;

  v_prize_kind := p_forced_kind;
  return query select v_prize_index, v_prize_kind;
end;
$$;

revoke all on function public.preview_wiwu_prize(boolean, text) from public, anon, authenticated;
grant execute on function public.preview_wiwu_prize(boolean, text) to service_role;
