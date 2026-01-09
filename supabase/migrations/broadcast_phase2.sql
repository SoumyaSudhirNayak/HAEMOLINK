-- ============================================
-- HAEMOLINK Broadcast Phase 2: Geo + Acceptance
-- ============================================
create extension if not exists "pgcrypto";
create extension if not exists "cube";
create extension if not exists "earthdistance";

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  role text not null,
  title text not null,
  message text not null,
  event_type text not null,
  entity_id uuid,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_select_self'
  ) then
    execute 'create policy notifications_select_self on public.notifications for select using (user_id = auth.uid())';
  end if;
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_insert_system'
  ) then
    execute 'create policy notifications_insert_system on public.notifications for insert with check (true)';
  end if;
end $$;

create or replace function public.emit_notification(
  p_user_id uuid,
  p_role text,
  p_title text,
  p_message text,
  p_event_type text,
  p_entity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, role, title, message, event_type, entity_id)
  values (p_user_id, p_role, p_title, p_message, p_event_type, p_entity_id);
end;
$$;

grant execute on function public.emit_notification(uuid, text, text, text, text, uuid) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end $$;

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
  add column if not exists full_name text,
  add column if not exists phone text,
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
  add column if not exists longitude double precision,
  add column if not exists phone text;

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

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blood_requests' and policyname = 'rider_can_view_incoming_requests'
  ) then
    execute $sql$
      create policy rider_can_view_incoming_requests
      on public.blood_requests
      for select
      using (
        exists (
          select 1
          from public.rider_request_inbox rri
          where rri.request_id = blood_requests.id
            and rri.rider_id = auth.uid()
        )
      );
    $sql$;
  end if;
end $$;

-- Allow riders to view pickup + patient profile details for assigned deliveries
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'hospital_profiles' and policyname = 'hospital_profiles_rider_select'
  ) then
    execute $p$
      create policy hospital_profiles_rider_select
      on public.hospital_profiles
      for select
      using (
        exists (
          select 1
          from public.deliveries d
          where d.hospital_id = hospital_profiles.user_id
            and d.rider_id = auth.uid()
        )
      )
    $p$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'patient_profiles' and policyname = 'patient_profiles_rider_select'
  ) then
    execute $p$
      create policy patient_profiles_rider_select
      on public.patient_profiles
      for select
      using (
        exists (
          select 1
          from public.deliveries d
          join public.blood_requests br on br.id = d.request_id
          where d.rider_id = auth.uid()
            and br.patient_id = patient_profiles.user_id
        )
      )
    $p$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'donor_profiles' and policyname = 'donor_profiles_rider_select'
  ) then
    execute $p$
      create policy donor_profiles_rider_select
      on public.donor_profiles
      for select
      using (
        exists (
          select 1
          from public.deliveries d
          join public.blood_requests br on br.id = d.request_id
          where d.rider_id = auth.uid()
            and br.accepted_by_type = 'donor'
            and br.accepted_by_id = donor_profiles.user_id
        )
      )
    $p$;
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
declare
  r record;
begin
  for r in (
    with inserted as (
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
        )
      returning hospital_id
    )
    select hospital_id as user_id from inserted
  ) loop
    perform public.emit_notification(
      r.user_id,
      'hospital',
      '🩸 Blood Needed Nearby',
      'A patient nearby needs blood urgently.',
      'blood_request_assigned_hospital',
      p_request_id
    );
  end loop;

  if p_patient_lat is not null and p_patient_lng is not null then
    for r in (
      with inserted as (
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
        on conflict (donor_id, request_id) do nothing
        returning donor_id
      )
      select donor_id as user_id from inserted
    ) loop
      perform public.emit_notification(
        r.user_id,
        'donor',
        '🩸 Blood Needed Nearby',
        'A patient nearby needs blood urgently.',
        'blood_request_assigned_donor',
        p_request_id
      );
    end loop;
  else
    for r in (
      with inserted as (
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
        on conflict (donor_id, request_id) do nothing
        returning donor_id
      )
      select donor_id as user_id from inserted
    ) loop
      perform public.emit_notification(
        r.user_id,
        'donor',
        '🩸 Blood Needed Nearby',
        'A patient nearby needs blood urgently.',
        'blood_request_assigned_donor',
        p_request_id
      );
    end loop;
  end if;
end;
$$;

grant execute on function public.broadcast_blood_request(uuid, double precision, double precision, text, numeric) to anon, authenticated;

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
  otp_verified_at timestamptz,
  delivered_at timestamptz,
  payment_status text default 'locked',
  distance_km numeric,
  duration_min numeric,
  fare_amount numeric,
  currency text default 'INR',
  created_at timestamptz not null default now()
);

alter table public.deliveries add column if not exists otp_verified_at timestamptz;
alter table public.deliveries add column if not exists delivered_at timestamptz;
alter table public.deliveries add column if not exists payment_status text default 'locked';
alter table public.deliveries add column if not exists distance_km numeric;
alter table public.deliveries add column if not exists duration_min numeric;
alter table public.deliveries add column if not exists fare_amount numeric;
alter table public.deliveries add column if not exists currency text default 'INR';

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
declare
  r record;
begin
  for r in (
    with inserted as (
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
      on conflict (rider_id, request_id) do nothing
      returning rider_id
    )
    select rider_id as user_id from inserted
  ) loop
    perform public.emit_notification(
      r.user_id,
      'rider',
      '🚴 New Assignment',
      'A new pickup request is available.',
      'rider_assignment_new',
      p_request_id
    );
  end loop;
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
  v_hospital_id uuid;
  v_patient_id uuid;
begin
  perform pg_advisory_lock(hashtext(p_request_id::text));
  begin
    if exists (select 1 from public.deliveries d where d.request_id = p_request_id limit 1) then
      perform pg_advisory_unlock(hashtext(p_request_id::text));
      return json_build_object('accepted', false, 'reason', 'already_assigned');
    end if;
    insert into public.deliveries (request_id, hospital_id, rider_id, status)
    select br.id, hri.hospital_id, actor, 'in_transit'
    from public.blood_requests br
    join public.hospital_request_inbox hri on hri.request_id = br.id and hri.status = 'accepted'
    where br.id = p_request_id
    returning id, hospital_id into did, v_hospital_id;
    if did is null then
      perform pg_advisory_unlock(hashtext(p_request_id::text));
      return json_build_object('accepted', false);
    end if;
    select br.patient_id into v_patient_id from public.blood_requests br where br.id = p_request_id;
    if v_patient_id is not null then
      perform public.emit_notification(
        v_patient_id,
        'patient',
        '🚴 Rider Assigned',
        'A rider has been assigned to deliver your blood.',
        'rider_assigned',
        p_request_id
      );
    end if;
    if v_hospital_id is not null then
      perform public.emit_notification(
        v_hospital_id,
        'hospital',
        '🚴 Rider Assigned',
        'A rider has accepted the delivery request.',
        'rider_assigned',
        p_request_id
      );
    end if;
    update public.rider_request_inbox set status = 'accepted'
      where request_id = p_request_id and rider_id = actor and status = 'pending';
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

-- Donor-based rider broadcast
create or replace function public.broadcast_delivery_for_donor_request(p_request_id uuid, p_radius_km numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d_id uuid;
  d_lat double precision;
  d_lng double precision;
  r record;
begin
  select br.accepted_by_id into d_id
  from public.blood_requests br
  where br.id = p_request_id and br.accepted_by_type = 'donor';
  if d_id is null then
    return;
  end if;
  select dp.latitude, dp.longitude into d_lat, d_lng
  from public.donor_profiles dp
  where dp.user_id = d_id;
  if d_lat is null or d_lng is null then
    return;
  end if;
  for r in (
    with inserted as (
      insert into public.rider_request_inbox (rider_id, request_id, status)
      select rp.user_id, p_request_id, 'pending'
      from public.rider_profiles rp
      where rp.latitude is not null and rp.longitude is not null
        and earth_distance(
          ll_to_earth(d_lat, d_lng),
          ll_to_earth(rp.latitude, rp.longitude)
        ) <= (p_radius_km * 1000)
      on conflict (rider_id, request_id) do nothing
      returning rider_id
    )
    select rider_id as user_id from inserted
  ) loop
    perform public.emit_notification(
      r.user_id,
      'rider',
      '🚴 New Assignment',
      'A new pickup request is available.',
      'rider_assignment_new',
      p_request_id
    );
  end loop;
end;
$$;

grant execute on function public.broadcast_delivery_for_donor_request(uuid, numeric) to anon, authenticated;

-- Rider accept for donor-accepted requests
create or replace function public.accept_delivery_request_by_donor(p_request_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  did uuid;
  donor_id uuid;
  v_patient_id uuid;
begin
  perform pg_advisory_lock(hashtext(p_request_id::text));
  begin
    if exists (select 1 from public.deliveries d where d.request_id = p_request_id limit 1) then
      perform pg_advisory_unlock(hashtext(p_request_id::text));
      return json_build_object('accepted', false, 'reason', 'already_assigned');
    end if;
    select accepted_by_id into donor_id from public.blood_requests where id = p_request_id and accepted_by_type = 'donor' for update;
    if donor_id is null then
      perform pg_advisory_unlock(hashtext(p_request_id::text));
      return json_build_object('accepted', false);
    end if;
    insert into public.deliveries (request_id, hospital_id, rider_id, status)
    values (p_request_id, donor_id, actor, 'in_transit')
    returning id into did;
    if did is null then
      perform pg_advisory_unlock(hashtext(p_request_id::text));
      return json_build_object('accepted', false);
    end if;
    select br.patient_id into v_patient_id from public.blood_requests br where br.id = p_request_id;
    if v_patient_id is not null then
      perform public.emit_notification(
        v_patient_id,
        'patient',
        '🚴 Rider Assigned',
        'A rider has been assigned to deliver your blood.',
        'rider_assigned',
        p_request_id
      );
    end if;
    if donor_id is not null then
      perform public.emit_notification(
        donor_id,
        'donor',
        '🚴 Rider Assigned',
        'A rider has accepted the pickup request.',
        'rider_assigned',
        p_request_id
      );
    end if;
    update public.rider_request_inbox set status = 'accepted'
      where request_id = p_request_id and rider_id = actor and status = 'pending';
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

grant execute on function public.accept_delivery_request_by_donor(uuid) to authenticated;

-- Update rider navigation RPC to support donor pickup
create or replace function public.get_delivery_navigation(p_delivery_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  d record;
  br record;
  pickup_lat double precision;
  pickup_lng double precision;
  drop_lat double precision;
  drop_lng double precision;
  otp text;
  distance_km numeric;
  fare_amount numeric;
  otp_verified boolean;
  payment_status text;
begin
  select * into d from public.deliveries where id = p_delivery_id and (rider_id = uid or hospital_id = uid);
  if not found then
    return null;
  end if;
  select * into br from public.blood_requests where id = d.request_id;

  if br.accepted_by_type = 'donor' then
    select rw.latitude, rw.longitude into pickup_lat, pickup_lng
    from public.request_waypoints rw
    where rw.request_id = d.request_id and rw.actor_type = 'donor'
    order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
    limit 1;
    if pickup_lat is null or pickup_lng is null then
      select dp.latitude, dp.longitude into pickup_lat, pickup_lng
      from public.donor_profiles dp
      where dp.user_id = br.accepted_by_id;
    end if;
  else
    select rw.latitude, rw.longitude into pickup_lat, pickup_lng
    from public.request_waypoints rw
    where rw.request_id = d.request_id and rw.actor_type = 'hospital'
    order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
    limit 1;
    if pickup_lat is null or pickup_lng is null then
      select hp.latitude, hp.longitude into pickup_lat, pickup_lng
      from public.hospital_profiles hp
      where hp.user_id = d.hospital_id;
    end if;
  end if;

  select rw.latitude, rw.longitude into drop_lat, drop_lng
  from public.request_waypoints rw
  where rw.request_id = d.request_id and rw.actor_type = 'patient'
  order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
  limit 1;
  if drop_lat is null or drop_lng is null then
    select br.patient_latitude, br.patient_longitude into drop_lat, drop_lng
    from public.blood_requests br
    where br.id = d.request_id;
  end if;

  otp := lpad((abs(hashtext(d.id::text)) % 900000 + 100000)::text, 6, '0');
  otp_verified := d.otp_verified_at is not null;
  payment_status := coalesce(d.payment_status, case when otp_verified then 'unpaid' else 'locked' end);
  if pickup_lat is not null and pickup_lng is not null and drop_lat is not null and drop_lng is not null then
    distance_km := earth_distance(ll_to_earth(pickup_lat, pickup_lng), ll_to_earth(drop_lat, drop_lng)) / 1000.0;
    if distance_km < 0.01 then
      fare_amount := 0;
    else
      fare_amount := round(greatest(90, 60 + (distance_km * 18))::numeric, 0);
    end if;
  else
    distance_km := null;
    fare_amount := null;
  end if;

  return json_build_object(
    'delivery_id', d.id,
    'pickup', json_build_object('lat', pickup_lat, 'lng', pickup_lng),
    'drop', json_build_object('lat', drop_lat, 'lng', drop_lng),
    'otp', otp,
    'distance_km', distance_km,
    'fare_amount', fare_amount,
    'currency', coalesce(d.currency, 'INR'),
    'otp_verified', otp_verified,
    'payment_status', payment_status
  );
end;
$$;

grant execute on function public.get_delivery_navigation(uuid) to authenticated;

create or replace function public.verify_delivery_otp(p_delivery_id uuid, p_otp text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  d record;
  br record;
  expected text;
begin
  select * into d from public.deliveries where id = p_delivery_id and rider_id = uid;
  if not found then
    return json_build_object('ok', false);
  end if;
  expected := lpad((abs(hashtext(d.id::text)) % 900000 + 100000)::text, 6, '0');
  if trim(coalesce(p_otp, '')) <> expected then
    return json_build_object('ok', false);
  end if;
  update public.deliveries
    set status = 'delivered'
    where id = p_delivery_id;

  begin
    execute 'update public.deliveries set otp_verified_at = coalesce(otp_verified_at, now()) where id = $1' using p_delivery_id;
  exception
    when undefined_column then
      null;
  end;

  begin
    execute 'update public.deliveries set delivered_at = coalesce(delivered_at, now()) where id = $1' using p_delivery_id;
  exception
    when undefined_column then
      null;
  end;

  begin
    execute 'update public.deliveries set payment_status = ''unpaid'' where id = $1' using p_delivery_id;
  exception
    when undefined_column then
      null;
  end;
  select * into br from public.blood_requests where id = d.request_id;
  if found then
    if br.patient_id is not null then
      perform public.emit_notification(
        br.patient_id,
        'patient',
        '✅ Blood Delivered',
        'Your blood delivery has been completed.',
        'delivery_completed',
        d.request_id
      );
    end if;
    if br.accepted_by_type = 'donor' then
      if br.accepted_by_id is not null then
        perform public.emit_notification(
          br.accepted_by_id,
          'donor',
          '✅ Delivery Completed',
          'The delivery has been completed successfully.',
          'delivery_completed',
          d.request_id
        );
      end if;
    else
      if d.hospital_id is not null then
        perform public.emit_notification(
          d.hospital_id,
          'hospital',
          '✅ Delivery Completed',
          'The delivery has been completed successfully.',
          'delivery_completed',
          d.request_id
        );
      end if;
    end if;
  end if;
  return json_build_object('ok', true, 'delivery_id', p_delivery_id, 'payment_status', 'unpaid');
end;
$$;

grant execute on function public.verify_delivery_otp(uuid, text) to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'patient_payments'
  ) then
    begin
      execute 'alter table public.patient_payments add column if not exists delivery_id uuid';
    exception when others then
      null;
    end;
    begin
      execute 'alter table public.patient_payments add column if not exists distance_km numeric';
      execute 'alter table public.patient_payments add column if not exists payment_method text';
      execute 'alter table public.patient_payments add column if not exists currency text';
    exception when others then
      null;
    end;
    begin
      execute 'create unique index if not exists patient_payments_delivery_unique on public.patient_payments (delivery_id) where delivery_id is not null';
    exception when others then
      null;
    end;
  end if;
end $$;

create or replace function public.create_delivery_payment(p_delivery_id uuid, p_payment_method text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  d record;
  br record;
  pickup_lat double precision;
  pickup_lng double precision;
  drop_lat double precision;
  drop_lng double precision;
  v_distance_km numeric;
  v_fare_amount numeric;
  pay_id uuid;
  v_otp_verified_at timestamptz;
  v_has_otp_verified_at boolean := true;
  otp_verified boolean;
begin
  select * into d from public.deliveries where id = p_delivery_id;
  if not found then
    return json_build_object('ok', false);
  end if;
  select * into br from public.blood_requests where id = d.request_id;
  if not found or br.patient_id <> uid then
    return json_build_object('ok', false);
  end if;
  begin
    execute 'select otp_verified_at from public.deliveries where id = $1' into v_otp_verified_at using p_delivery_id;
  exception
    when undefined_column then
      v_otp_verified_at := null;
      v_has_otp_verified_at := false;
  end;
  otp_verified := (v_has_otp_verified_at and v_otp_verified_at is not null) or ((not v_has_otp_verified_at) and d.status in ('delivered', 'completed'));
  if not otp_verified then
    return json_build_object('ok', false);
  end if;

  begin
    execute 'select distance_km from public.deliveries where id = $1' into v_distance_km using p_delivery_id;
  exception
    when undefined_column then
      v_distance_km := null;
  end;

  begin
    execute 'select fare_amount from public.deliveries where id = $1' into v_fare_amount using p_delivery_id;
  exception
    when undefined_column then
      v_fare_amount := null;
  end;

  if v_distance_km is null or v_fare_amount is null then
    if br.accepted_by_type = 'donor' then
      select rw.latitude, rw.longitude into pickup_lat, pickup_lng
      from public.request_waypoints rw
      where rw.request_id = d.request_id and rw.actor_type = 'donor'
      order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
      limit 1;
      if pickup_lat is null or pickup_lng is null then
        select dp.latitude, dp.longitude into pickup_lat, pickup_lng
        from public.donor_profiles dp
        where dp.user_id = br.accepted_by_id;
      end if;
    else
      select rw.latitude, rw.longitude into pickup_lat, pickup_lng
      from public.request_waypoints rw
      where rw.request_id = d.request_id and rw.actor_type = 'hospital'
      order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
      limit 1;
      if pickup_lat is null or pickup_lng is null then
        select hp.latitude, hp.longitude into pickup_lat, pickup_lng
        from public.hospital_profiles hp
        where hp.user_id = d.hospital_id;
      end if;
    end if;

    select rw.latitude, rw.longitude into drop_lat, drop_lng
    from public.request_waypoints rw
    where rw.request_id = d.request_id and rw.actor_type = 'patient'
    order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
    limit 1;
    if drop_lat is null or drop_lng is null then
      drop_lat := br.patient_latitude;
      drop_lng := br.patient_longitude;
      if drop_lat is null or drop_lng is null then
        select pp.latitude, pp.longitude into drop_lat, drop_lng
        from public.patient_profiles pp
        where pp.user_id = br.patient_id;
      end if;
    end if;

    if v_distance_km is null and pickup_lat is not null and pickup_lng is not null and drop_lat is not null and drop_lng is not null then
      begin
        v_distance_km := earth_distance(ll_to_earth(pickup_lat, pickup_lng), ll_to_earth(drop_lat, drop_lng)) / 1000.0;
      exception
        when undefined_function then
          v_distance_km := null;
      end;
    end if;

    if v_fare_amount is null and v_distance_km is not null then
      if v_distance_km < 0.01 then
        v_fare_amount := 0;
      else
        v_fare_amount := round(greatest(90, 60 + (v_distance_km * 18))::numeric, 0);
      end if;
    end if;
  end if;

  if v_fare_amount is null then
    return json_build_object('ok', false, 'reason', 'fare_unavailable');
  end if;

  begin
    insert into public.patient_payments (patient_id, delivery_id, distance_km, amount, payment_type, payment_method, currency, status)
    values (uid, p_delivery_id, v_distance_km, v_fare_amount, 'delivery_fare', coalesce(p_payment_method, 'upi'), 'INR', 'paid')
    on conflict (delivery_id) where delivery_id is not null do nothing
    returning id into pay_id;
  exception
    when others then
      begin
        insert into public.patient_payments (patient_id, delivery_id, distance_km, amount, payment_type, payment_method, currency, status)
        values (uid, p_delivery_id, v_distance_km, v_fare_amount, 'delivery_fare', coalesce(p_payment_method, 'upi'), 'INR', 'paid')
        returning id into pay_id;
      exception
        when undefined_column then
          begin
            insert into public.patient_payments (patient_id, distance_km, amount, payment_type, payment_method, currency, status)
            values (uid, v_distance_km, v_fare_amount, 'delivery_fare', coalesce(p_payment_method, 'upi'), 'INR', 'paid')
            returning id into pay_id;
          exception
            when undefined_column then
              begin
                insert into public.patient_payments (patient_id, amount, payment_type, status)
                values (uid, v_fare_amount, 'delivery_fare', 'paid')
                returning id into pay_id;
              exception
                when undefined_column then
                  insert into public.patient_payments (patient_id, amount, status)
                  values (uid, v_fare_amount, 'paid')
                  returning id into pay_id;
              end;
          end;
      end;
  end;

  if pay_id is null then
    begin
      execute 'select id from public.patient_payments where patient_id = $1 and delivery_id = $2 order by created_at desc limit 1' into pay_id using uid, p_delivery_id;
    exception
      when undefined_column then
        null;
    end;
  end if;

  if d.rider_id is not null then
    begin
      insert into public.rider_earnings (rider_id, delivery_id, distance_km, amount, incentive_type)
      values (d.rider_id, p_delivery_id, v_distance_km, v_fare_amount, 'delivery_fare')
      on conflict (delivery_id) where delivery_id is not null do nothing;
    exception
      when others then
        begin
          insert into public.rider_earnings (rider_id, delivery_id, distance_km, amount, incentive_type)
          values (d.rider_id, p_delivery_id, v_distance_km, v_fare_amount, 'delivery_fare');
        exception
          when undefined_column then
            begin
              insert into public.rider_earnings (rider_id, distance_km, amount, incentive_type)
              values (d.rider_id, v_distance_km, v_fare_amount, 'delivery_fare');
            exception
              when undefined_column then
                insert into public.rider_earnings (rider_id, amount, incentive_type)
                values (d.rider_id, v_fare_amount, 'delivery_fare');
            end;
        end;
    end;
  end if;

  begin
    execute 'update public.deliveries set distance_km = $2, fare_amount = $3, payment_status = ''paid'', currency = ''INR'' where id = $1'
    using p_delivery_id, v_distance_km, v_fare_amount;
  exception
    when undefined_column then
      begin
        execute 'update public.deliveries set payment_status = ''paid'', currency = ''INR'' where id = $1' using p_delivery_id;
      exception
        when undefined_column then
          execute 'update public.deliveries set payment_status = ''paid'' where id = $1' using p_delivery_id;
      end;
  end;

  return json_build_object('ok', true, 'payment_id', pay_id, 'amount', v_fare_amount, 'distance_km', v_distance_km, 'currency', 'INR');
end;
$$;

grant execute on function public.create_delivery_payment(uuid, text) to authenticated;

-- Extend acceptance to broadcast for donor
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
    if req.patient_id is not null then
      perform public.emit_notification(
        req.patient_id,
        'patient',
        case when p_actor_type = 'hospital' then '🏥 Hospital Accepted the Request' else '❤️ Donor Accepted Your Request' end,
        case when p_actor_type = 'hospital' then 'A hospital has accepted your blood request.' else 'A donor has accepted your blood request.' end,
        case when p_actor_type = 'hospital' then 'hospital_accepted' else 'donor_accepted' end,
        p_request_id
      );
    end if;
    if p_actor_type = 'donor' then
      update public.donor_request_inbox set status = 'accepted'
        where request_id = p_request_id and donor_id = actor;
      update public.donor_request_inbox set status = 'expired'
        where request_id = p_request_id and donor_id <> actor and status = 'pending';
      update public.hospital_request_inbox set status = 'expired'
        where request_id = p_request_id and status = 'pending';
      perform public.broadcast_delivery_for_donor_request(p_request_id, 15);
    else
      update public.hospital_request_inbox set status = 'accepted'
        where request_id = p_request_id and hospital_id = actor;
      update public.hospital_request_inbox set status = 'expired'
        where request_id = p_request_id and hospital_id <> actor and status = 'pending';
      update public.donor_request_inbox set status = 'expired'
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

create or replace function public.get_landing_impact_stats()
returns json
language sql
security definer
set search_path = public
as $$
  with
    donors as (select count(*)::int as c from public.donor_profiles),
    hospitals as (select count(*)::int as c from public.hospital_profiles),
    total_requests as (select count(*)::int as c from public.blood_requests),
    fulfilled as (
      select count(*)::int as c
      from public.blood_requests
      where status in ('delivered', 'completed')
    )
  select json_build_object(
    'activeDonors', (select c from donors),
    'hospitals', (select c from hospitals),
    'totalRequests', (select c from total_requests),
    'livesSaved', (select c from fulfilled)
  );
$$;

grant execute on function public.get_landing_impact_stats() to anon, authenticated;
