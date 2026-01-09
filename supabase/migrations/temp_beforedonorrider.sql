-- Restore get_delivery_navigation to known-good state with high-accuracy logic
-- AND add Patient Tracking capabilities

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

  -- Pickup (Hospital)
  select rw.latitude, rw.longitude
    into pickup_lat, pickup_lng
  from public.request_waypoints rw
  where rw.request_id = p_request_id and rw.actor_type = 'hospital'
  order by coalesce(rw.accuracy, 1e9) asc, rw.created_at desc
  limit 1;
  
  if (pickup_lat is null or pickup_lng is null) and v_hospital_id is not null then
    select hp.latitude, hp.longitude
      into pickup_lat, pickup_lng
    from public.hospital_profiles hp
    where hp.user_id = v_hospital_id;
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
  else
      otp := null;
  end if;

  return json_build_object(
    'delivery_id', v_delivery_id,
    'status', v_delivery_status,
    'rider', case when v_rider_id is not null and r_prof is not null then json_build_object(
        'name', r_prof.full_name,
        'phone', r_prof.phone,
        'vehicle_number', r_prof.vehicle_number,
        'vehicle_type', r_prof.vehicle_type,
        'lat', coalesce(r_pos.latitude, 0),
        'lng', coalesce(r_pos.longitude, 0)
    ) else null end,
    'pickup', json_build_object('lat', pickup_lat, 'lng', pickup_lng),
    'drop', json_build_object('lat', drop_lat, 'lng', drop_lng),
    'otp', otp
  );
end;
$$;

grant execute on function public.get_patient_tracking(uuid) to authenticated;