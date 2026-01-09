create extension if not exists "pgcrypto";
create extension if not exists "cube";
create extension if not exists "earthdistance";

alter table public.donor_profiles
  add column if not exists last_donation_date timestamptz,
  add column if not exists eligibility_status text;

alter table public.donor_rewards
  add column if not exists metadata jsonb,
  add column if not exists issued_by uuid references public.users(id) on delete set null;

alter table public.hospital_profiles
  add column if not exists organization_name text,
  add column if not exists is_active boolean default true;

create table if not exists public.camps (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  address text,
  parking_details text,
  latitude double precision not null,
  longitude double precision not null,
  start_date date not null,
  end_date date not null,
  start_time time not null,
  end_time time not null,
  slot_minutes integer not null default 30,
  capacity_per_slot integer not null default 10,
  carpool_enabled boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.camp_slots (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null,
  booked_count integer not null default 0,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'camp_slots_unique_time'
  ) then
    execute 'create unique index camp_slots_unique_time on public.camp_slots (camp_id, starts_at)';
  end if;
end $$;

create table if not exists public.camp_bookings (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps(id) on delete cascade,
  slot_id uuid not null references public.camp_slots(id) on delete cascade,
  donor_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'booked' check (status in ('booked','cancelled','attended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'camp_booking_unique_donor_slot'
  ) then
    execute 'create unique index camp_booking_unique_donor_slot on public.camp_bookings (donor_id, slot_id)';
  end if;
end $$;

create table if not exists public.camp_live_locations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.camp_bookings(id) on delete cascade,
  donor_id uuid not null references public.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'camp_live_locations_booking_unique'
  ) then
    execute 'create unique index camp_live_locations_booking_unique on public.camp_live_locations (booking_id)';
  end if;
end $$;

create table if not exists public.camp_carpool_offers (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps(id) on delete cascade,
  donor_id uuid not null references public.users(id) on delete cascade,
  seats integer not null default 1,
  note text,
  start_latitude double precision,
  start_longitude double precision,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

alter table public.camps enable row level security;
alter table public.camp_slots enable row level security;
alter table public.camp_bookings enable row level security;
alter table public.camp_live_locations enable row level security;
alter table public.camp_carpool_offers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camps' and policyname = 'camps_select_published'
  ) then
    execute $p$
      create policy camps_select_published
      on public.camps
      for select
      using (is_published = true)
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camps' and policyname = 'camps_owner_all'
  ) then
    execute $p$
      create policy camps_owner_all
      on public.camps
      for all
      using (organizer_id = auth.uid())
      with check (organizer_id = auth.uid())
    $p$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_slots' and policyname = 'camp_slots_select_published'
  ) then
    execute $p$
      create policy camp_slots_select_published
      on public.camp_slots
      for select
      using (
        exists (
          select 1
          from public.camps c
          where c.id = camp_slots.camp_id
            and c.is_published = true
        )
      )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_slots' and policyname = 'camp_slots_owner_all'
  ) then
    execute $p$
      create policy camp_slots_owner_all
      on public.camp_slots
      for all
      using (
        exists (
          select 1
          from public.camps c
          where c.id = camp_slots.camp_id
            and c.organizer_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.camps c
          where c.id = camp_slots.camp_id
            and c.organizer_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_bookings' and policyname = 'camp_bookings_donor_self'
  ) then
    execute $p$
      create policy camp_bookings_donor_self
      on public.camp_bookings
      for select
      using (donor_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_bookings' and policyname = 'camp_bookings_donor_update'
  ) then
    execute $p$
      create policy camp_bookings_donor_update
      on public.camp_bookings
      for update
      using (donor_id = auth.uid())
      with check (donor_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_bookings' and policyname = 'camp_bookings_hospital_select'
  ) then
    execute $p$
      create policy camp_bookings_hospital_select
      on public.camp_bookings
      for select
      using (
        exists (
          select 1
          from public.camps c
          where c.id = camp_bookings.camp_id
            and c.organizer_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_live_locations' and policyname = 'camp_live_locations_donor_insert'
  ) then
    execute $p$
      create policy camp_live_locations_donor_insert
      on public.camp_live_locations
      for insert
      with check (donor_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_live_locations' and policyname = 'camp_live_locations_donor_update'
  ) then
    execute $p$
      create policy camp_live_locations_donor_update
      on public.camp_live_locations
      for update
      using (donor_id = auth.uid())
      with check (donor_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_live_locations' and policyname = 'camp_live_locations_donor_select'
  ) then
    execute $p$
      create policy camp_live_locations_donor_select
      on public.camp_live_locations
      for select
      using (donor_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_live_locations' and policyname = 'camp_live_locations_hospital_select'
  ) then
    execute $p$
      create policy camp_live_locations_hospital_select
      on public.camp_live_locations
      for select
      using (
        exists (
          select 1
          from public.camp_bookings b
          join public.camps c on c.id = b.camp_id
          where b.id = camp_live_locations.booking_id
            and c.organizer_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_carpool_offers' and policyname = 'camp_carpool_offers_select_published'
  ) then
    execute $p$
      create policy camp_carpool_offers_select_published
      on public.camp_carpool_offers
      for select
      using (
        exists (
          select 1
          from public.camps c
          where c.id = camp_carpool_offers.camp_id
            and c.is_published = true
        )
      )
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'camp_carpool_offers' and policyname = 'camp_carpool_offers_donor_all'
  ) then
    execute $p$
      create policy camp_carpool_offers_donor_all
      on public.camp_carpool_offers
      for all
      using (donor_id = auth.uid())
      with check (donor_id = auth.uid())
    $p$;
  end if;
end $$;

create or replace function public.create_camp_with_slots(
  p_title text,
  p_description text,
  p_address text,
  p_lat double precision,
  p_lng double precision,
  p_start_date date,
  p_end_date date,
  p_start_time time,
  p_end_time time,
  p_slot_minutes integer,
  p_capacity integer,
  p_is_published boolean default false,
  p_carpool_enabled boolean default true
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_camp_id uuid;
  day date;
  t time;
  slot_mins integer := greatest(10, least(coalesce(p_slot_minutes, 30), 240));
  cap integer := greatest(1, least(coalesce(p_capacity, 10), 500));
  start_d date := p_start_date;
  end_d date := p_end_date;
  start_t time := p_start_time;
  end_t time := p_end_time;
  slot_start timestamptz;
  slot_end timestamptz;
begin
  if uid is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  if not exists (select 1 from public.hospital_profiles hp where hp.user_id = uid) then
    return json_build_object('ok', false, 'reason', 'not_hospital');
  end if;

  if p_title is null or length(trim(p_title)) = 0 then
    return json_build_object('ok', false, 'reason', 'missing_title');
  end if;

  if p_lat is null or p_lng is null then
    return json_build_object('ok', false, 'reason', 'missing_location');
  end if;

  if start_d is null or end_d is null or start_d > end_d then
    return json_build_object('ok', false, 'reason', 'invalid_dates');
  end if;

  if start_t is null or end_t is null or start_t >= end_t then
    return json_build_object('ok', false, 'reason', 'invalid_times');
  end if;

  insert into public.camps (
    organizer_id,
    title,
    description,
    address,
    latitude,
    longitude,
    start_date,
    end_date,
    start_time,
    end_time,
    slot_minutes,
    capacity_per_slot,
    carpool_enabled,
    is_published
  )
  values (
    uid,
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    p_lat,
    p_lng,
    start_d,
    end_d,
    start_t,
    end_t,
    slot_mins,
    cap,
    coalesce(p_carpool_enabled, true),
    coalesce(p_is_published, false)
  )
  returning id into v_camp_id;

  day := start_d;
  while day <= end_d loop
    t := start_t;
    while t < end_t loop
      slot_start := (day + t)::timestamptz;
      slot_end := (day + t + make_interval(mins => slot_mins))::timestamptz;
      if slot_end > (day + end_t)::timestamptz then
        exit;
      end if;
      insert into public.camp_slots (camp_id, starts_at, ends_at, capacity)
      values (v_camp_id, slot_start, slot_end, cap)
      on conflict (camp_id, starts_at) do nothing;
      t := (t + make_interval(mins => slot_mins))::time;
    end loop;
    day := day + 1;
  end loop;

  return json_build_object('ok', true, 'camp_id', v_camp_id);
end;
$$;

grant execute on function public.create_camp_with_slots(text, text, text, double precision, double precision, date, date, time, time, integer, integer, boolean, boolean) to authenticated;

create or replace function public.set_camp_publish_status(p_camp_id uuid, p_is_published boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  updated integer;
begin
  if uid is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;
  update public.camps
    set is_published = coalesce(p_is_published, false),
        updated_at = now()
    where id = p_camp_id and organizer_id = uid;
  get diagnostics updated = row_count;
  return json_build_object('ok', updated > 0);
end;
$$;

grant execute on function public.set_camp_publish_status(uuid, boolean) to authenticated;

create or replace function public.list_published_camps(
  p_lat double precision,
  p_lng double precision,
  p_radius_km numeric,
  p_from date,
  p_to date
)
returns table (
  id uuid,
  title text,
  description text,
  address text,
  parking_details text,
  latitude double precision,
  longitude double precision,
  start_date date,
  end_date date,
  start_time time,
  end_time time,
  carpool_enabled boolean,
  organizer_id uuid,
  organizer_name text,
  organizer_phone text,
  is_verified boolean,
  distance_km numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  from_d date := coalesce(p_from, current_date);
  to_d date := coalesce(p_to, current_date + 30);
  radius_m numeric := coalesce(p_radius_km, 10) * 1000;
begin
  return query
  select
    c.id,
    c.title,
    c.description,
    c.address,
    c.parking_details,
    c.latitude,
    c.longitude,
    c.start_date,
    c.end_date,
    c.start_time,
    c.end_time,
    c.carpool_enabled,
    c.organizer_id,
    coalesce(hp.organization_name, 'Blood Bank'),
    coalesce(hp.admin_contact, ''),
    (coalesce(hp.is_active, true) = true and coalesce(hp.verification_status::text, 'pending') = 'approved'),
    case
      when p_lat is null or p_lng is null then null
      when c.latitude is null or c.longitude is null then null
      else (earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(c.latitude, c.longitude)) / 1000.0)::numeric
    end as distance_km
  from public.camps c
  left join public.hospital_profiles hp on hp.user_id = c.organizer_id
  where c.is_published = true
    and c.start_date <= to_d
    and c.end_date >= from_d
    and (
      p_lat is null or p_lng is null
      or earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(c.latitude, c.longitude)) <= radius_m
    )
  order by
    c.start_date asc,
    c.start_time asc;
end;
$$;

grant execute on function public.list_published_camps(double precision, double precision, numeric, date, date) to authenticated;

create or replace function public.get_camp_public_details(p_camp_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  camp record;
  slots json;
  my_booking json;
begin
  select
    c.*,
    coalesce(hp.organization_name, 'Blood Bank') as organizer_name,
    coalesce(hp.admin_contact, '') as organizer_phone,
    (coalesce(hp.is_active, true) = true and coalesce(hp.verification_status::text, 'pending') = 'approved') as organizer_verified
  into camp
  from public.camps c
  left join public.hospital_profiles hp on hp.user_id = c.organizer_id
  where c.id = p_camp_id and c.is_published = true;

  if not found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;

  select coalesce(
    json_agg(
      json_build_object(
        'id', s.id,
        'starts_at', s.starts_at,
        'ends_at', s.ends_at,
        'capacity', s.capacity,
        'booked_count', s.booked_count,
        'available', greatest(s.capacity - s.booked_count, 0)
      )
      order by s.starts_at asc
    ),
    '[]'::json
  )
  into slots
  from public.camp_slots s
  where s.camp_id = camp.id and s.starts_at >= now() - interval '6 hours';

  if uid is not null then
    select to_jsonb(b) into my_booking
    from (
      select b.id, b.camp_id, b.slot_id, b.status, b.created_at
      from public.camp_bookings b
      where b.camp_id = camp.id and b.donor_id = uid and b.status = 'booked'
      order by b.created_at desc
      limit 1
    ) b;
  end if;

  return json_build_object(
    'ok', true,
    'camp', json_build_object(
      'id', camp.id,
      'title', camp.title,
      'description', camp.description,
      'address', camp.address,
      'latitude', camp.latitude,
      'longitude', camp.longitude,
      'start_date', camp.start_date,
      'end_date', camp.end_date,
      'start_time', camp.start_time,
      'end_time', camp.end_time,
      'carpool_enabled', camp.carpool_enabled,
      'organizer_id', camp.organizer_id,
      'organizer_name', camp.organizer_name,
      'organizer_phone', camp.organizer_phone,
      'organizer_verified', camp.organizer_verified
    ),
    'slots', slots,
    'my_booking', coalesce(my_booking, 'null'::jsonb)
  );
end;
$$;

grant execute on function public.get_camp_public_details(uuid) to authenticated;

create or replace function public.book_camp_slot(p_slot_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  slot_row record;
  camp_row record;
  booking_id uuid;
  last_donation timestamptz;
  eligible boolean;
begin
  if uid is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select dp.last_donation_date into last_donation
  from public.donor_profiles dp
  where dp.user_id = uid;

  eligible := (last_donation is null) or (now() - last_donation >= interval '60 days');
  if not eligible then
    return json_build_object('ok', false, 'reason', 'not_eligible');
  end if;

  select * into slot_row
  from public.camp_slots
  where id = p_slot_id
  for update;

  if not found then
    return json_build_object('ok', false, 'reason', 'slot_not_found');
  end if;

  select * into camp_row
  from public.camps
  where id = slot_row.camp_id;

  if not found or camp_row.is_published <> true then
    return json_build_object('ok', false, 'reason', 'camp_not_available');
  end if;

  if slot_row.starts_at < now() then
    return json_build_object('ok', false, 'reason', 'slot_in_past');
  end if;

  if exists (
    select 1
    from public.camp_bookings b
    where b.camp_id = camp_row.id and b.donor_id = uid and b.status = 'booked'
  ) then
    return json_build_object('ok', false, 'reason', 'already_booked');
  end if;

  if slot_row.booked_count >= slot_row.capacity then
    return json_build_object('ok', false, 'reason', 'slot_full');
  end if;

  insert into public.camp_bookings (camp_id, slot_id, donor_id, status)
  values (camp_row.id, slot_row.id, uid, 'booked')
  returning id into booking_id;

  update public.camp_slots
    set booked_count = booked_count + 1
    where id = slot_row.id;

  insert into public.donor_activity_log (donor_id, activity_type, description)
  values (uid, 'camp_booking', 'Booked a donation camp slot');

  return json_build_object('ok', true, 'booking_id', booking_id, 'camp_id', camp_row.id);
end;
$$;

grant execute on function public.book_camp_slot(uuid) to authenticated;

create or replace function public.cancel_camp_booking(p_booking_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b record;
begin
  if uid is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select * into b
  from public.camp_bookings
  where id = p_booking_id and donor_id = uid
  for update;

  if not found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;

  if b.status <> 'booked' then
    return json_build_object('ok', false, 'reason', 'not_active');
  end if;

  update public.camp_bookings
    set status = 'cancelled',
        updated_at = now()
    where id = b.id;

  update public.camp_slots
    set booked_count = greatest(booked_count - 1, 0)
    where id = b.slot_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.cancel_camp_booking(uuid) to authenticated;

create or replace function public.get_my_upcoming_camp_booking()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row jsonb;
begin
  if uid is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select to_jsonb(x) into row
  from (
    select
      b.id as booking_id,
      b.status,
      s.starts_at,
      s.ends_at,
      c.id as camp_id,
      c.title,
      c.address,
      c.parking_details,
      c.latitude,
      c.longitude,
      c.carpool_enabled,
      c.organizer_id,
      coalesce(hp.organization_name, 'Blood Bank') as organizer_name,
      coalesce(hp.admin_contact, '') as organizer_phone,
      (coalesce(hp.is_active, true) = true and coalesce(hp.verification_status::text, 'pending') = 'approved') as organizer_verified
    from public.camp_bookings b
    join public.camp_slots s on s.id = b.slot_id
    join public.camps c on c.id = b.camp_id
    left join public.hospital_profiles hp on hp.user_id = c.organizer_id
    where b.donor_id = uid
      and b.status = 'booked'
      and s.starts_at >= now() - interval '1 hours'
    order by s.starts_at asc
    limit 1
  ) x;

  return json_build_object('ok', true, 'booking', coalesce(row, 'null'::jsonb));
end;
$$;

grant execute on function public.get_my_upcoming_camp_booking() to authenticated;

create or replace function public.hospital_list_camp_bookings(p_camp_id uuid)
returns table (
  booking_id uuid,
  donor_id uuid,
  donor_name text,
  donor_phone text,
  slot_starts_at timestamptz,
  slot_ends_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;

  if not exists (select 1 from public.camps c where c.id = p_camp_id and c.organizer_id = uid) then
    return;
  end if;

  return query
  select
    b.id as booking_id,
    b.donor_id,
    dp.full_name,
    dp.phone,
    s.starts_at,
    s.ends_at,
    b.status
  from public.camp_bookings b
  join public.camp_slots s on s.id = b.slot_id
  left join public.donor_profiles dp on dp.user_id = b.donor_id
  where b.camp_id = p_camp_id
  order by s.starts_at asc, b.created_at asc;
end;
$$;

grant execute on function public.hospital_list_camp_bookings(uuid) to authenticated;

create or replace function public.hospital_mark_camp_attendance(p_booking_id uuid, p_attended boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b record;
  c record;
begin
  if uid is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select * into b
  from public.camp_bookings
  where id = p_booking_id
  for update;

  if not found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into c from public.camps where id = b.camp_id;
  if not found or c.organizer_id <> uid then
    return json_build_object('ok', false, 'reason', 'not_allowed');
  end if;

  if coalesce(p_attended, false) then
    update public.camp_bookings
      set status = 'attended',
          updated_at = now()
      where id = b.id;

    insert into public.donor_donations (donor_id, hospital_id, donation_date, component)
    values (b.donor_id, uid, now(), 'camp')
    on conflict do nothing;

    begin
      update public.donor_profiles
        set last_donation_date = now(),
            eligibility_status = 'not_eligible'
        where user_id = b.donor_id;
    exception when others then
      null;
    end;
  else
    update public.camp_bookings
      set status = 'booked',
          updated_at = now()
      where id = b.id and status = 'attended';
  end if;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.hospital_mark_camp_attendance(uuid, boolean) to authenticated;

create or replace function public.hospital_issue_camp_certificate(p_booking_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b record;
  c record;
  hp record;
  dp record;
  already integer;
begin
  if uid is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select * into b from public.camp_bookings where id = p_booking_id;
  if not found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into c from public.camps where id = b.camp_id;
  if not found or c.organizer_id <> uid then
    return json_build_object('ok', false, 'reason', 'not_allowed');
  end if;

  if b.status <> 'attended' then
    return json_build_object('ok', false, 'reason', 'not_attended');
  end if;

  select * into hp from public.hospital_profiles where user_id = uid;
  select * into dp from public.donor_profiles where user_id = b.donor_id;

  select count(1) into already
  from public.donor_rewards r
  where r.donor_id = b.donor_id
    and r.reward_type = 'certificate_camp'
    and coalesce((r.metadata->>'booking_id')::text, '') = b.id::text;

  if already > 0 then
    return json_build_object('ok', true, 'already', true);
  end if;

  insert into public.donor_rewards (donor_id, reward_type, points, issued_at, metadata, issued_by)
  values (
    b.donor_id,
    'certificate_camp',
    50,
    now(),
    jsonb_build_object(
      'booking_id', b.id::text,
      'camp_id', c.id::text,
      'camp_title', c.title,
      'camp_date', c.start_date::text,
      'organizer_id', uid::text,
      'organizer_name', coalesce(hp.organization_name, 'Blood Bank'),
      'donor_id', b.donor_id::text,
      'donor_name', coalesce(dp.full_name, 'Donor')
    ),
    uid
  );

  insert into public.donor_activity_log (donor_id, activity_type, description)
  values (b.donor_id, 'certificate_issued', 'Certificate issued for camp donation');

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.hospital_issue_camp_certificate(uuid) to authenticated;

create or replace function public.upsert_camp_live_location(
  p_booking_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  b record;
begin
  if uid is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select * into b
  from public.camp_bookings
  where id = p_booking_id and donor_id = uid and status = 'booked';

  if not found then
    return json_build_object('ok', false, 'reason', 'not_allowed');
  end if;

  insert into public.camp_live_locations (booking_id, donor_id, latitude, longitude, accuracy, updated_at)
  values (b.id, uid, p_lat, p_lng, p_accuracy, now())
  on conflict (booking_id)
  do update set
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy = excluded.accuracy,
    updated_at = now();

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.upsert_camp_live_location(uuid, double precision, double precision, double precision) to authenticated;
