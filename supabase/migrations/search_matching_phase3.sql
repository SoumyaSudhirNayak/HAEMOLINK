create extension if not exists "cube";
create extension if not exists "earthdistance";

create or replace function public.search_donors_for_patient(
  p_blood_group text,
  p_patient_lat double precision,
  p_patient_lng double precision,
  p_radius_km numeric,
  p_only_ready boolean default false
)
returns table (
  user_id uuid,
  full_name text,
  phone text,
  blood_group text,
  location text,
  eligibility_status text,
  latitude double precision,
  longitude double precision,
  distance_km numeric,
  donation_count integer
)
language sql
security definer
set search_path = public
as $$
  with donation_counts as (
    select donor_id, count(*)::int as donation_count
    from public.donor_donations
    group by donor_id
  )
  select
    dp.user_id,
    dp.full_name,
    dp.phone,
    dp.blood_group,
    dp.location,
    dp.eligibility_status,
    dp.latitude,
    dp.longitude,
    case
      when p_patient_lat is null or p_patient_lng is null then null
      when dp.latitude is null or dp.longitude is null then null
      else (earth_distance(
        ll_to_earth(p_patient_lat, p_patient_lng),
        ll_to_earth(dp.latitude, dp.longitude)
      ) / 1000.0)
    end as distance_km,
    coalesce(dc.donation_count, 0) as donation_count
  from public.donor_profiles dp
  left join donation_counts dc on dc.donor_id = dp.user_id
  where exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'patient'
  )
    and (p_blood_group is null or p_blood_group = '' or dp.blood_group = p_blood_group)
    and coalesce(dp.is_available, true) = true
    and (
      p_only_ready is not true
      or (dp.eligibility_status is not null and lower(dp.eligibility_status) like '%eligible%')
    )
    and (
      p_patient_lat is null
      or p_patient_lng is null
      or p_radius_km is null
      or dp.latitude is null
      or dp.longitude is null
      or earth_distance(
        ll_to_earth(p_patient_lat, p_patient_lng),
        ll_to_earth(dp.latitude, dp.longitude)
      ) <= (p_radius_km * 1000.0)
    )
  order by distance_km nulls last, donation_count desc;
$$;

grant execute on function public.search_donors_for_patient(text, double precision, double precision, numeric, boolean) to authenticated;


create or replace function public.find_matching_hospitals(
  p_blood_group text,
  p_component text,
  p_location text,
  p_urgency text,
  p_patient_lat double precision,
  p_patient_lng double precision,
  p_radius_km numeric,
  p_min_units integer default 1
)
returns table (
  hospital_id uuid,
  name text,
  address text,
  contact text,
  units integer,
  freshness_days integer,
  distance_km numeric,
  verified boolean,
  components text[]
)
language sql
security definer
set search_path = public
as $$
  with unit_rows as (
    select
      u.hospital_id,
      u.component_type,
      u.collection_date
    from public.hospital_inventory_units u
    where u.status = 'available'
      and u.expiry_date >= current_date
      and (p_blood_group is null or p_blood_group = '' or u.blood_group = p_blood_group)
      and (p_component is null or p_component = '' or u.component_type = p_component)
  ),
  agg as (
    select
      hospital_id,
      count(*)::int as units,
      array_remove(array_agg(distinct component_type), null) as components,
      min(greatest(0, (current_date - collection_date)))::int as freshness_days
    from unit_rows
    group by hospital_id
  )
  select
    hp.user_id as hospital_id,
    coalesce(hp.organization_name, 'Hospital') as name,
    coalesce(hp.address, '') as address,
    coalesce(hp.admin_contact, '') as contact,
    coalesce(a.units, 0) as units,
    a.freshness_days,
    case
      when p_patient_lat is null or p_patient_lng is null then null
      when hp.latitude is null or hp.longitude is null then null
      else (earth_distance(
        ll_to_earth(p_patient_lat, p_patient_lng),
        ll_to_earth(hp.latitude, hp.longitude)
      ) / 1000.0)
    end as distance_km,
    (hp.verification_status = 'approved') as verified, 
  from agg a
  join public.hospital_profiles hp on hp.user_id = a.hospital_id
  where exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'patient'
  )
    and coalesce(hp.is_active, true) = true
    and coalesce(a.units, 0) >= coalesce(p_min_units, 1)
    and (
      p_location is null
      or p_location = ''
      or hp.address ilike ('%' || p_location || '%')
      or hp.organization_name ilike ('%' || p_location || '%')
    )
    and (
      p_patient_lat is null
      or p_patient_lng is null
      or p_radius_km is null
      or hp.latitude is null
      or hp.longitude is null
      or earth_distance(
        ll_to_earth(p_patient_lat, p_patient_lng),
        ll_to_earth(hp.latitude, hp.longitude)
      ) <= (p_radius_km * 1000.0)
    );
$$;

grant execute on function public.find_matching_hospitals(text, text, text, text, double precision, double precision, numeric, integer) to authenticated;

