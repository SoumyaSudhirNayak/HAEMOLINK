-- ============================================
-- HAEMOLINK Broadcast Phase 2: Geo + Acceptance
-- ============================================
create extension if not exists "pgcrypto";
create extension if not exists "cube";
create extension if not exists "earthdistance";

-- Columns for acceptance on blood_requests
alter table public.blood_requests
  add column if not exists accepted_by_type text,
  add column if not exists accepted_by_id uuid references public.users(id),
  add column if not exists accepted_at timestamptz;

-- Ensure units column exists for UI mapping
alter table public.blood_requests
  add column if not exists quantity_units integer;

alter table public.blood_requests
  add column if not exists patient_latitude double precision,
  add column if not exists patient_longitude double precision;

-- Add latitude/longitude to donor and hospital profiles if missing
alter table public.donor_profiles
  add column if not exists is_available boolean default true,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'donor_profiles_latlng_not_null'
  ) then
    execute 'alter table public.donor_profiles add constraint donor_profiles_latlng_not_null check (latitude is not null and longitude is not null) not valid';
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'donor_profiles_blood_group_not_null'
  ) then
    execute 'alter table public.donor_profiles add constraint donor_profiles_blood_group_not_null check (blood_group is not null) not valid';
  end if;
end $$;

-- Request waypoints for high-accuracy device locations
create table if not exists public.request_waypoints (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  actor_type text not null check (actor_type in ('patient','hospital','donor')),
  actor_id uuid not null references public.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  created_at timestamptz not null default now()
);

alter table public.request_waypoints enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'request_waypoints' and policyname = 'waypoints_patient_self'
  ) then
    execute 'create policy waypoints_patient_self on public.request_waypoints for all using (actor_type = ''patient'' and actor_id = auth.uid()) with check (actor_type = ''patient'' and actor_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'request_waypoints' and policyname = 'waypoints_hospital_self'
  ) then
    execute 'create policy waypoints_hospital_self on public.request_waypoints for all using (actor_type = ''hospital'' and actor_id = auth.uid()) with check (actor_type = ''hospital'' and actor_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'request_waypoints' and policyname = 'waypoints_donor_self'
  ) then
    execute 'create policy waypoints_donor_self on public.request_waypoints for all using (actor_type = ''donor'' and actor_id = auth.uid()) with check (actor_type = ''donor'' and actor_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'request_waypoints' and policyname = 'waypoints_rider_select'
  ) then
    execute $p$
      create policy waypoints_rider_select on public.request_waypoints for select using (
        exists (
          select 1 from public.deliveries d where d.request_id = request_waypoints.request_id and d.rider_id = auth.uid()
        )
      )
    $p$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'request_waypoints' and policyname = 'waypoints_hospital_select'
  ) then
    execute $p$
      create policy waypoints_hospital_select on public.request_waypoints for select using (
        exists (
          select 1 from public.hospital_request_inbox hri where hri.request_id = request_waypoints.request_id and hri.hospital_id = auth.uid() and hri.status in ('pending','accepted')
        )
      )
    $p$;
  end if;
end $$;

alter table public.hospital_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists is_active boolean default true;

alter table public.patient_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.rider_profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Rider profile enriched fields for delivery coordination
alter table public.rider_profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists vehicle_number text,
  add column if not exists vehicle_type text,
  add column if not exists license_number text,
  add column if not exists verification_status text,
  add column if not exists availability_status text;

-- Donor inbox (ensure exists)
create table if not exists public.donor_request_inbox (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  donor_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.donor_request_inbox enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'idx_donor_inbox_unique_pair'
  ) then
    execute 'create unique index idx_donor_inbox_unique_pair on public.donor_request_inbox(donor_id, request_id)';
  end if;
end $$;

-- Hospital inbox for broadcasts
create table if not exists public.hospital_request_inbox (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  hospital_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.hospital_request_inbox enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hospital_request_inbox' and policyname = 'hospital_inbox_select'
  ) then
    execute $sql$
      create policy hospital_inbox_select
      on public.hospital_request_inbox
      for select
      using (hospital_id = auth.uid());
    $sql$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'hospital_request_inbox' and policyname = 'hospital_inbox_update'
  ) then
    execute $sql$
      create policy hospital_inbox_update
      on public.hospital_request_inbox
      for update
      using (hospital_id = auth.uid());
    $sql$;
  end if;
end $$;

-- Ensure donor_request_inbox RLS exists
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'donor_request_inbox' and policyname = 'donor_inbox_select'
  ) then
    execute $sql$
      create policy donor_inbox_select
      on public.donor_request_inbox
      for select
      using (donor_id = auth.uid());
    $sql$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'donor_request_inbox' and policyname = 'donor_inbox_update'
  ) then
    execute $sql$
      create policy donor_inbox_update
      on public.donor_request_inbox
      for update
      using (donor_id = auth.uid());
    $sql$;
  end if;
end $$;

-- Allow hospitals to view blood_requests when the request appears in their inbox
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blood_requests' and policyname = 'hospital_can_view_incoming_requests'
  ) then
    execute $sql$
      create policy hospital_can_view_incoming_requests
      on public.blood_requests
      for select
      using (
        exists (
          select 1
          from public.hospital_request_inbox hri
          where hri.request_id = blood_requests.id
            and hri.hospital_id = auth.uid()
            and hri.status = 'pending'
        )
      );
    $sql$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blood_requests' and policyname = 'donor_can_view_incoming_requests'
  ) then
    execute $sql$
      create policy donor_can_view_incoming_requests
      on public.blood_requests
      for select
      using (
        exists (
          select 1
          from public.donor_request_inbox dri
          where dri.request_id = blood_requests.id
            and dri.donor_id = auth.uid()
            and dri.status = 'pending'
        )
      );
    $sql$;
  end if;
end $$;

-- Haversine distance function (km)
create or replace function public.haversine_km(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
returns numeric
language plpgsql
as $$
declare
  dlat numeric := radians(lat2 - lat1);
  dlon numeric := radians(lon2 - lon1);
  a numeric := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)^2;
  c numeric := 2 * atan2(sqrt(a), sqrt(1-a));
  r numeric := 6371; -- Earth radius km
begin
  return r * c;
end;
$$;

-- Broadcast RPC (corrected signature and logic)
create or replace function public.broadcast_blood_request(
  p_request_id uuid,
  p_patient_lat double precision,
  p_patient_lng double precision,
  p_blood_group text,
  p_radius_km numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.hospital_request_inbox (hospital_id, request_id, status)
  select hp.user_id, p_request_id, 'pending'
  from public.hospital_profiles hp
  where coalesce(hp.is_active, true) = true
    and exists (
      select 1
      from public.blood_requests br
      where br.id = p_request_id
        and br.blood_group is not null
        and br.component is not null
        and br.urgency is not null
    )
    and (
      p_patient_lat is null or p_patient_lng is null
      or hp.latitude is null or hp.longitude is null
      or earth_distance(
        ll_to_earth(p_patient_lat, p_patient_lng),
        ll_to_earth(hp.latitude, hp.longitude)
      ) <= (p_radius_km * 1000)
    );

  if p_patient_lat is not null and p_patient_lng is not null then
    insert into public.donor_request_inbox (donor_id, request_id, status)
    select dp.user_id, p_request_id, 'pending'
    from public.donor_profiles dp
    where dp.blood_group = p_blood_group
      and coalesce(dp.is_available, true) = true
      and dp.latitude is not null
      and dp.longitude is not null
      and exists (
        select 1
        from public.blood_requests br
        where br.id = p_request_id
          and br.blood_group is not null
          and br.component is not null
          and br.urgency is not null
      )
      and earth_distance(
        ll_to_earth(p_patient_lat, p_patient_lng),
        ll_to_earth(dp.latitude, dp.longitude)
      ) <= (p_radius_km * 1000)
    on conflict (donor_id, request_id) do nothing;
  else
    insert into public.donor_request_inbox (donor_id, request_id, status)
    select dp.user_id, p_request_id, 'pending'
    from public.donor_profiles dp
    where dp.blood_group = p_blood_group
      and coalesce(dp.is_available, true) = true
      and exists (
        select 1
        from public.blood_requests br
        where br.id = p_request_id
          and br.blood_group is not null
          and br.component is not null
          and br.urgency is not null
      )
    on conflict (donor_id, request_id) do nothing;
  end if;
end;
$$;

grant execute on function public.broadcast_blood_request(uuid, double precision, double precision, text, numeric) to anon, authenticated;

-- Acceptance RPC
create or replace function public.accept_blood_request(p_request_id uuid, p_actor_type text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  req record;
  updated integer;
begin
  if p_actor_type not in ('donor','hospital') then
    raise exception 'INVALID_ACTOR_TYPE';
  end if;
  perform pg_advisory_lock(hashtext(p_request_id::text));
  begin
    select * into req from public.blood_requests where id = p_request_id for update;
    if not found then
      perform pg_advisory_unlock(hashtext(p_request_id::text));
      return json_build_object('accepted', false, 'reason', 'not_found');
    end if;
    if req.status not in ('open','pending') then
      perform pg_advisory_unlock(hashtext(p_request_id::text));
      return json_build_object('accepted', false, 'reason', 'already_accepted');
    end if;
    update public.blood_requests
      set status = 'accepted',
          accepted_by_type = p_actor_type,
          accepted_by_id = actor,
          accepted_at = now()
      where id = p_request_id;
    get diagnostics updated = row_count;
    if updated = 0 then
      perform pg_advisory_unlock(hashtext(p_request_id::text));
      return json_build_object('accepted', false, 'reason', 'race_lost');
    end if;
    if p_actor_type = 'donor' then
      update public.donor_request_inbox
        set status = 'accepted'
        where request_id = p_request_id and donor_id = actor;
      update public.donor_request_inbox
        set status = 'expired'
        where request_id = p_request_id and donor_id <> actor and status = 'pending';
      update public.hospital_request_inbox
        set status = 'expired'
        where request_id = p_request_id and status = 'pending';
    else
      update public.hospital_request_inbox
        set status = 'accepted'
        where request_id = p_request_id and hospital_id = actor;
      update public.hospital_request_inbox
        set status = 'expired'
        where request_id = p_request_id and hospital_id <> actor and status = 'pending';
      update public.donor_request_inbox
        set status = 'expired'
        where request_id = p_request_id and status = 'pending';
      perform public.broadcast_delivery_for_request(p_request_id, 15);
    end if;
    perform pg_advisory_unlock(hashtext(p_request_id::text));
    return json_build_object('accepted', true);
  exception when others then
    perform pg_advisory_unlock(hashtext(p_request_id::text));
    raise;
  end;
end;
$$;

grant execute on function public.accept_blood_request(uuid, text) to anon, authenticated;

-- Reject inbox entries (donor)
create or replace function public.reject_donor_inbox_entry(p_inbox_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  update public.donor_request_inbox
    set status = 'rejected'
    where id = p_inbox_id and donor_id = auth.uid();
  select json_build_object('rejected', true);
$$;

grant execute on function public.reject_donor_inbox_entry(uuid) to anon, authenticated;

-- Reject inbox entries (hospital)
create or replace function public.reject_hospital_inbox_entry(p_inbox_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  update public.hospital_request_inbox
    set status = 'rejected'
    where id = p_inbox_id and hospital_id = auth.uid();
  select json_build_object('rejected', true);
$$;

grant execute on function public.reject_hospital_inbox_entry(uuid) to anon, authenticated;

create or replace function public.get_patient_contact_for_request(p_request_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  contact text;
begin
  if uid is null then
    return null;
  end if;
  if not exists (
    select 1 from public.donor_request_inbox
    where request_id = p_request_id and donor_id = uid and status in ('pending','accepted')
  ) then
    return null;
  end if;
  select pp.emergency_contact into contact
  from public.blood_requests br
  join public.patient_profiles pp on pp.user_id = br.patient_id
  where br.id = p_request_id;
  return contact;
end;
$$;

grant execute on function public.get_patient_contact_for_request(uuid) to authenticated;

create table if not exists public.rider_request_inbox (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  rider_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.rider_request_inbox enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'idx_rider_inbox_unique_pair'
  ) then
    execute 'create unique index idx_rider_inbox_unique_pair on public.rider_request_inbox(rider_id, request_id)';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'rider_request_inbox' and policyname = 'rider_inbox_select'
  ) then
    execute 'create policy rider_inbox_select on public.rider_request_inbox for select using (rider_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'rider_request_inbox' and policyname = 'rider_inbox_hospital_select'
  ) then
    execute $p$
      create policy rider_inbox_hospital_select
      on public.rider_request_inbox
      for select
      using (
        exists (
          select 1
          from public.hospital_request_inbox hri
          where hri.request_id = rider_request_inbox.request_id
            and hri.hospital_id = auth.uid()
            and hri.status = 'accepted'
        )
      )
    $p$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'rider_request_inbox' and policyname = 'rider_inbox_update'
  ) then
    execute 'create policy rider_inbox_update on public.rider_request_inbox for update using (rider_id = auth.uid())';
  end if;
end $$;

-- Allow hospitals to view rider profiles for requests they accepted
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'rider_profiles' and policyname = 'rider_profiles_hospital_select'
  ) then
    execute $p$
      create policy rider_profiles_hospital_select
      on public.rider_profiles
      for select
      using (
        exists (
          select 1
          from public.rider_request_inbox rri
          join public.hospital_request_inbox hri on hri.request_id = rri.request_id and hri.status = 'accepted'
          where rri.rider_id = rider_profiles.user_id
            and hri.hospital_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.blood_requests(id) on delete cascade,
  hospital_id uuid not null references public.users(id) on delete cascade,
  rider_id uuid references public.users(id) on delete set null,
  status text not null default 'assigned',
  created_at timestamptz not null default now()
);

alter table public.deliveries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'deliveries' and policyname = 'deliveries_hospital_select'
  ) then
    execute 'create policy deliveries_hospital_select on public.deliveries for select using (hospital_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'deliveries' and policyname = 'deliveries_rider_select'
  ) then
    execute 'create policy deliveries_rider_select on public.deliveries for select using (rider_id = auth.uid())';
  end if;
end $$;

create table if not exists public.rider_positions (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  rider_id uuid not null references public.users(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamptz not null default now()
);

alter table public.rider_positions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'rider_positions' and policyname = 'rider_positions_insert'
  ) then
    execute 'create policy rider_positions_insert on public.rider_positions for insert with check (rider_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'rider_positions' and policyname = 'rider_positions_select_hospital'
  ) then
    execute $p$
      create policy rider_positions_select_hospital on public.rider_positions for select using (
        exists (
          select 1 from public.deliveries d
          where d.id = rider_positions.delivery_id and d.hospital_id = auth.uid()
        )
      )
    $p$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'rider_positions' and policyname = 'rider_positions_select_rider'
  ) then
    execute 'create policy rider_positions_select_rider on public.rider_positions for select using (rider_id = auth.uid())';
  end if;
end $$;

create or replace function public.broadcast_delivery_for_request(p_request_id uuid, p_radius_km numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.rider_request_inbox (rider_id, request_id, status)
  select rp.user_id, p_request_id, 'pending'
  from public.rider_profiles rp
  left join public.hospital_request_inbox hri on hri.request_id = p_request_id and hri.status = 'accepted'
  left join public.hospital_profiles hp on hp.user_id = hri.hospital_id
  where rp.latitude is not null and rp.longitude is not null
    and (
      hp.latitude is null or hp.longitude is null or
      earth_distance(
        ll_to_earth(hp.latitude, hp.longitude),
        ll_to_earth(rp.latitude, rp.longitude)
      ) <= (p_radius_km * 1000)
    )
  on conflict (rider_id, request_id) do nothing;
end;
$$;

grant execute on function public.broadcast_delivery_for_request(uuid, numeric) to anon, authenticated;

create or replace function public.accept_delivery_request(p_request_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  did uuid;
begin
  perform pg_advisory_lock(hashtext(p_request_id::text));
  begin
    insert into public.deliveries (request_id, hospital_id, rider_id, status)
    select br.id, hri.hospital_id, actor, 'in_transit'
    from public.blood_requests br
    join public.hospital_request_inbox hri on hri.request_id = br.id and hri.status = 'accepted'
    where br.id = p_request_id
    returning id into did;
    if did is null then
      perform pg_advisory_unlock(hashtext(p_request_id::text));
      return json_build_object('accepted', false);
    end if;
    update public.rider_request_inbox set status = 'accepted'
      where request_id = p_request_id and rider_id = actor;
    update public.rider_request_inbox set status = 'expired'
      where request_id = p_request_id and rider_id <> actor and status = 'pending';
    perform pg_advisory_unlock(hashtext(p_request_id::text));
    return json_build_object('accepted', true, 'delivery_id', did);
  exception when others then
    perform pg_advisory_unlock(hashtext(p_request_id::text));
    raise;
  end;
end;
$$;

grant execute on function public.accept_delivery_request(uuid) to authenticated;

-- Rider navigation data for a delivery
create or replace function public.get_delivery_navigation(p_delivery_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  d record;
  pickup_lat double precision;
  pickup_lng double precision;
  drop_lat double precision;
  drop_lng double precision;
  otp text;
begin
  -- Delivery must belong to the rider
  select * into d
  from public.deliveries
  where id = p_delivery_id and rider_id = uid;

  if not found then
    return null;
  end if;

  -- Pickup = latest hospital waypoint if exists, else hospital profile
  select rw.latitude, rw.longitude
    into pickup_lat, pickup_lng
  from public.request_waypoints rw
  where rw.request_id = d.request_id and rw.actor_type = 'hospital'
  order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
  limit 1;
  if pickup_lat is null or pickup_lng is null then
    select hp.latitude, hp.longitude
      into pickup_lat, pickup_lng
    from public.hospital_profiles hp
    where hp.user_id = d.hospital_id;
  end if;

  -- Drop = latest patient waypoint if exists, else blood_requests lat/lng
  select rw.latitude, rw.longitude
    into drop_lat, drop_lng
  from public.request_waypoints rw
  where rw.request_id = d.request_id and rw.actor_type = 'patient'
  order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
  limit 1;
  if drop_lat is null or drop_lng is null then
    select br.patient_latitude, br.patient_longitude
      into drop_lat, drop_lng
    from public.blood_requests br
    where br.id = d.request_id;
  end if;

  -- Ephemeral OTP for display (6 digits)
  otp := lpad((floor(random()*900000)+100000)::text, 6, '0');

  return json_build_object(
    'delivery_id', d.id,
    'pickup', json_build_object('lat', pickup_lat, 'lng', pickup_lng),
    'drop', json_build_object('lat', drop_lat, 'lng', drop_lng),
    'otp', otp
  );
end;
$$;

grant execute on function public.get_delivery_navigation(uuid) to authenticated;

alter table public.rider_positions add column if not exists accuracy double precision;
