create or replace function public.calculate_wiwu_prize(
  p_allow_again boolean,
  p_consecutive_scares integer
)
returns table (
  prize_index integer,
  prize_kind text
)
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_roll double precision;
  v_prize_index integer;
  v_prize_kind text;
begin
  if p_allow_again is null or p_consecutive_scares is null or p_consecutive_scares < 0 then
    raise exception 'raffle preview parameters are invalid';
  end if;

  v_roll := random();

  if p_consecutive_scares >= 2 then
    if p_allow_again and v_roll < 0.25 then
      v_prize_index := 5;
      v_prize_kind := 'again_spin';
    else
      if random() < 0.5 then
        v_prize_index := case when random() < 0.5 then 1 else 3 end;
        v_prize_kind := 'charge';
      else
        v_prize_index := case when random() < 0.5 then 2 else 4 end;
        v_prize_kind := 'trick';
      end if;
    end if;
  elsif p_allow_again then
    if v_roll < 0.30 then
      if random() < 0.5 then
        v_prize_index := case when random() < 0.5 then 1 else 3 end;
        v_prize_kind := 'charge';
      else
        v_prize_index := case when random() < 0.5 then 2 else 4 end;
        v_prize_kind := 'trick';
      end if;
    elsif v_roll < 0.40 then
      v_prize_index := 5;
      v_prize_kind := 'again_spin';
    else
      v_prize_index := 0;
      v_prize_kind := 'scare';
    end if;
  elsif v_roll < 0.10 then
    if random() < 0.5 then
      v_prize_index := case when random() < 0.5 then 1 else 3 end;
      v_prize_kind := 'charge';
    else
      v_prize_index := case when random() < 0.5 then 2 else 4 end;
      v_prize_kind := 'trick';
    end if;
  else
    v_prize_index := 0;
    v_prize_kind := 'scare';
  end if;

  return query select v_prize_index, v_prize_kind;
end;
$$;

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
    into v_prize_index, v_prize_kind, v_streak
    from public.wiwu_raffle_draws as draw
    where draw.request_id = p_request_id;

  if found then
    return query select v_prize_index, v_prize_kind, v_streak;
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

create or replace function public.preview_wiwu_prize(p_allow_again boolean)
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
begin
  if p_allow_again is null then
    raise exception 'p_allow_again must not be null';
  end if;

  select coalesce(
    (select state.consecutive_scares
       from public.wiwu_raffle_state as state
       where state.id = 1),
    0
  )
  into v_streak;

  return query
    select result.prize_index, result.prize_kind
    from public.calculate_wiwu_prize(p_allow_again, v_streak) as result;
end;
$$;

revoke all on function public.calculate_wiwu_prize(boolean, integer) from public, anon, authenticated;
revoke all on function public.preview_wiwu_prize(boolean) from public, anon, authenticated;
revoke all on function public.draw_wiwu_prize(boolean, uuid) from public, anon, authenticated;
grant execute on function public.preview_wiwu_prize(boolean) to service_role;
grant execute on function public.draw_wiwu_prize(boolean, uuid) to service_role;
