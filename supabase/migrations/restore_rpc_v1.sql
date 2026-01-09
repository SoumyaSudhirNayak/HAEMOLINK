-- Restore get_delivery_navigation to known-good state with high-accuracy logic
-- AND add Patient Tracking capabilities

create extension if not exists "cube";
create extension if not exists "earthdistance";

alter table if exists public.deliveries add column if not exists otp_verified_at timestamptz;
alter table if exists public.deliveries add column if not exists delivered_at timestamptz;
alter table if exists public.deliveries add column if not exists payment_status text;
alter table if exists public.deliveries add column if not exists distance_km numeric;
alter table if exists public.deliveries add column if not exists duration_min numeric;
alter table if exists public.deliveries add column if not exists fare_amount numeric;
alter table if exists public.deliveries add column if not exists currency text;

-- Ensure request_waypoints table exists
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

-- Ensure rider_positions has accuracy column
alter table public.rider_positions add column if not exists accuracy double precision;

-- Restore RPC for Rider/Hospital
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
  -- Delivery must belong to the rider OR the hospital
  select * into d
  from public.deliveries
  where id = p_delivery_id 
  and (rider_id = uid or hospital_id = uid);

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

  -- Deterministic OTP (same for Rider, Hospital, and Patient)
  -- Uses hashtext of delivery ID to generate 6-digit code
  otp := lpad((abs(hashtext(d.id::text)) % 900000 + 100000)::text, 6, '0');

  return json_build_object(
    'delivery_id', d.id,
    'pickup', json_build_object('lat', pickup_lat, 'lng', pickup_lng),
    'drop', json_build_object('lat', drop_lat, 'lng', drop_lng),
    'otp', otp
  );
end;
$$;

grant execute on function public.get_delivery_navigation(uuid) to authenticated;

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
          select 1 from public.deliveries d
          where d.request_id = request_waypoints.request_id and d.rider_id = auth.uid()
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
          select 1
          from public.hospital_request_inbox hri
          where hri.request_id = request_waypoints.request_id
            and hri.hospital_id = auth.uid()
            and hri.status in ('pending','accepted')
        )
      )
    $p$;
  end if;
end $$;

grant select, insert, update, delete on table public.request_waypoints to authenticated;

create or replace function public.get_donor_delivery_tracking(p_delivery_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  d record;
  br record;
  rider record;
  patient record;
begin
  select * into d
  from public.deliveries
  where id = p_delivery_id and hospital_id = uid;

  if not found then
    return null;
  end if;

  select * into br
  from public.blood_requests
  where id = d.request_id;

  if d.rider_id is not null then
    select rp.user_id, rp.full_name, rp.phone
      into rider
    from public.rider_profiles rp
    where rp.user_id = d.rider_id;
  end if;

  if br.patient_id is not null then
    select pp.user_id, pp.full_name, pp.emergency_contact
      into patient
    from public.patient_profiles pp
    where pp.user_id = br.patient_id;
  end if;

  return json_build_object(
    'delivery_id', d.id,
    'request_id', d.request_id,
    'status', d.status,
    'blood_group', br.blood_group,
    'quantity_units', br.quantity_units,
    'component', br.component,
    'urgency', br.urgency,
    'rider', case when d.rider_id is not null then json_build_object(
      'id', d.rider_id,
      'name', rider.full_name,
      'phone', rider.phone
    ) else null end,
    'patient', case when br.patient_id is not null then json_build_object(
      'id', br.patient_id,
      'name', patient.full_name,
      'phone', patient.emergency_contact
    ) else null end
  );
end;
$$;

grant execute on function public.get_donor_delivery_tracking(uuid) to authenticated;


-- NEW RPC for Patient Tracking
create or replace function public.get_patient_tracking(p_request_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  d record;
  br record;
  r_prof record;
  r_pos record;
  pickup_lat double precision;
  pickup_lng double precision;
  drop_lat double precision;
  drop_lng double precision;
  otp text;
  distance_km numeric;
  fare_amount numeric;
  otp_verified boolean;
  payment_status text;
  currency text;
  v_otp_verified_at timestamptz;
  v_has_otp_verified_at boolean := true;
  v_payment_status text;
  v_currency text;
  v_delivery_id uuid;
  v_hospital_id uuid;
  v_rider_id uuid;
  v_delivery_status text;
begin
  -- Verify patient owns request
  select * into br from public.blood_requests where id = p_request_id and patient_id = uid;
  if not found then
    return null;
  end if;

  -- Get delivery associated with request
  select * into d from public.deliveries where request_id = p_request_id limit 1;
  
  if found then
     v_delivery_id := d.id;
     v_hospital_id := d.hospital_id;
     v_rider_id := d.rider_id;
     v_delivery_status := d.status;

     -- Get Rider Profile (if assigned)
     if v_rider_id is not null then
       select * into r_prof from public.rider_profiles where user_id = v_rider_id;
       select * into r_pos from public.rider_positions 
       where delivery_id = v_delivery_id 
       order by created_at desc limit 1;
     end if;
  else
     -- No delivery yet, try to find hospital from acceptance
     if br.accepted_by_type = 'hospital' and br.accepted_by_id is not null then
         v_hospital_id := br.accepted_by_id;
     else
         v_hospital_id := br.hospital_id;
     end if;
     v_delivery_status := br.status;
  end if;

  if br.accepted_by_type = 'donor' then
    select rw.latitude, rw.longitude into pickup_lat, pickup_lng
    from public.request_waypoints rw
    where rw.request_id = p_request_id and rw.actor_type = 'donor'
    order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
    limit 1;
    if (pickup_lat is null or pickup_lng is null) and br.accepted_by_id is not null then
      select dp.latitude, dp.longitude into pickup_lat, pickup_lng
      from public.donor_profiles dp
      where dp.user_id = br.accepted_by_id;
    end if;
  else
    select rw.latitude, rw.longitude into pickup_lat, pickup_lng
    from public.request_waypoints rw
    where rw.request_id = p_request_id and rw.actor_type = 'hospital'
    order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
    limit 1;
    if (pickup_lat is null or pickup_lng is null) and v_hospital_id is not null then
      select hp.latitude, hp.longitude into pickup_lat, pickup_lng
      from public.hospital_profiles hp
      where hp.user_id = v_hospital_id;
    end if;
  end if;

  -- Drop (Patient)
  select rw.latitude, rw.longitude
    into drop_lat, drop_lng
  from public.request_waypoints rw
  where rw.request_id = p_request_id and rw.actor_type = 'patient'
  order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
  limit 1;
  
  if drop_lat is null or drop_lng is null then
    drop_lat := br.patient_latitude;
    drop_lng := br.patient_longitude;
  end if;

  -- OTP
  if v_delivery_id is not null then
      otp := lpad((abs(hashtext(v_delivery_id::text)) % 900000 + 100000)::text, 6, '0');
      begin
        execute 'select otp_verified_at from public.deliveries where id = $1' into v_otp_verified_at using v_delivery_id;
      exception
        when undefined_column then
          v_otp_verified_at := null;
          v_has_otp_verified_at := false;
      end;
      otp_verified := (v_has_otp_verified_at and v_otp_verified_at is not null) or ((not v_has_otp_verified_at) and v_delivery_status in ('delivered', 'completed'));

      begin
        execute 'select payment_status from public.deliveries where id = $1' into v_payment_status using v_delivery_id;
      exception
        when undefined_column then
          v_payment_status := null;
      end;
      payment_status := coalesce(v_payment_status, case when otp_verified then 'unpaid' else 'locked' end);

      begin
        execute 'select currency from public.deliveries where id = $1' into v_currency using v_delivery_id;
      exception
        when undefined_column then
          v_currency := null;
      end;
      currency := coalesce(v_currency, 'INR');
  else
      otp := null;
      otp_verified := false;
      payment_status := 'locked';
      currency := 'INR';
  end if;

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
    'delivery_id', v_delivery_id,
    'status', v_delivery_status,
    'rider', case when v_rider_id is not null and r_prof is not null then json_build_object(
        'name', r_prof.full_name,
        'phone', r_prof.phone,
        'vehicle_number', r_prof.vehicle_number,
        'vehicle_type', r_prof.vehicle_type,
        'lat', r_pos.latitude,
        'lng', r_pos.longitude
    ) else null end,
    'pickup', json_build_object('lat', pickup_lat, 'lng', pickup_lng),
    'drop', json_build_object('lat', drop_lat, 'lng', drop_lng),
    'otp', otp,
    'distance_km', distance_km,
    'fare_amount', fare_amount,
    'currency', currency,
    'otp_verified', otp_verified,
    'payment_status', payment_status
  );
end;
$$;

grant execute on function public.get_patient_tracking(uuid) to authenticated;

-- Donor-based rider broadcast (duplicate-safe)
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
  insert into public.rider_request_inbox (rider_id, request_id, status)
  select rp.user_id, p_request_id, 'pending'
  from public.rider_profiles rp
  where rp.latitude is not null and rp.longitude is not null
    and earth_distance(
      ll_to_earth(d_lat, d_lng),
      ll_to_earth(rp.latitude, rp.longitude)
    ) <= (p_radius_km * 1000)
  on conflict (rider_id, request_id) do nothing;
end;
$$;

grant execute on function public.broadcast_delivery_for_donor_request(uuid, numeric) to anon, authenticated;

-- Rider accept for donor-accepted requests (duplicate-safe)
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

-- Update rider navigation RPC to support donor pickup (duplicate-safe)
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

  return json_build_object(
    'delivery_id', d.id,
    'pickup', json_build_object('lat', pickup_lat, 'lng', pickup_lng),
    'drop', json_build_object('lat', drop_lat, 'lng', drop_lng),
    'otp', otp
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
  return json_build_object('ok', true, 'delivery_id', p_delivery_id, 'payment_status', 'unpaid');
end;
$$;

grant execute on function public.verify_delivery_otp(uuid, text) to authenticated;
