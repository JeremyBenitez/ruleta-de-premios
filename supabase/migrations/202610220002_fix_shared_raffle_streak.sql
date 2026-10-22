create or replace function public.draw_wiwu_prize(
  p_allow_again boolean,
  p_request_id uuid
)
returns table (
  prize_index integer,
  prize_kind text,
  consecutive_scares integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_streak integer;
  v_existing_streak integer;
  v_prize_index integer;
  v_prize_kind text;
begin
  if p_allow_again is null or p_request_id is null then
    raise exception 'raffle request parameters must not be null';
  end if;

  insert into public.wiwu_raffle_state (id, consecutive_scares)
  values (1, 0)
  on conflict (id) do nothing;

  select state.consecutive_scares
    into v_streak
    from public.wiwu_raffle_state as state
    where state.id = 1
    for update;

  select draw.prize_index, draw.prize_kind, draw.consecutive_scares
    into v_prize_index, v_prize_kind, v_existing_streak
    from public.wiwu_raffle_draws as draw
    where draw.request_id = p_request_id;

  if found then
    return query select v_prize_index, v_prize_kind, v_existing_streak;
    return;
  end if;

  select result.prize_index, result.prize_kind
    into v_prize_index, v_prize_kind
    from public.calculate_wiwu_prize(p_allow_again, v_streak) as result;

  if v_prize_kind = 'scare' then
    v_streak := v_streak + 1;
  else
    v_streak := 0;
  end if;

  update public.wiwu_raffle_state as state
    set consecutive_scares = v_streak
    where state.id = 1;

  insert into public.wiwu_raffle_draws (
    request_id,
    prize_index,
    prize_kind,
    allow_again,
    consecutive_scares
  )
  values (p_request_id, v_prize_index, v_prize_kind, p_allow_again, v_streak);

  return query select v_prize_index, v_prize_kind, v_streak;
end;
$$;
