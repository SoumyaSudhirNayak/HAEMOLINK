drop function if exists public.donor_list_cohort_assignments();

create or replace function public.donor_list_cohort_assignments()
returns table (
  cohort_id uuid,
  cohort_name text,
  patient_id uuid,
  patient_name text,
  sequence_order integer,
  next_scheduled_for timestamptz,
  last_donation_date timestamptz,
  days_until_eligible integer,
  donor_available boolean,
  hospital_id uuid,
  hospital_name text,
  hospital_address text
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select auth.uid()::uuid as donor_id
  ),
  last_d as (
    select x.donor_id, max(x.last_donation_date) as last_donation_date
    from (
      select dd.donor_id, dd.donation_date as last_donation_date
      from public.donor_donations dd
      where dd.donor_id = (select donor_id from me)
        and dd.donation_date is not null
      union all
      select
        coalesce(s.assigned_donor_id, s.emergency_donor_id) as donor_id,
        s.scheduled_for as last_donation_date
      from public.cohort_transfusion_schedule s
      where coalesce(s.assigned_donor_id, s.emergency_donor_id) = (select donor_id from me)
        and s.status = 'completed'
        and s.scheduled_for is not null
    ) x
    group by x.donor_id
  )
  select
    pc.id as cohort_id,
    pc.cohort_name,
    pc.patient_id,
    coalesce(pp.full_name, 'Patient') as patient_name,
    m.sequence_order,
    ns.next_scheduled_for,
    ld.last_donation_date,
    greatest(
      0,
      90 - coalesce(date_part('day', now() - ld.last_donation_date)::int, 999999)
    ) as days_until_eligible,
    coalesce(dp.is_available, true) as donor_available,
    ns.hospital_id,
    coalesce(hp.organization_name, 'Hospital') as hospital_name,
    coalesce(hp.address, '') as hospital_address
  from me
  join public.patient_cohort_members m on m.donor_id = me.donor_id
  join public.patient_cohorts pc on pc.id = m.cohort_id
  left join public.patient_profiles pp on pp.user_id = pc.patient_id
  left join public.donor_profiles dp on dp.user_id = me.donor_id
  left join last_d ld on ld.donor_id = me.donor_id
  left join lateral (
    select
      s.scheduled_for as next_scheduled_for,
      s.assigned_hospital_id as hospital_id
    from public.cohort_transfusion_schedule s
    where s.cohort_id = pc.id
      and coalesce(s.assigned_donor_id, s.emergency_donor_id) = me.donor_id
      and s.scheduled_for >= now()
      and s.status in ('planned','booked','pre_transfusion','in_progress')
    order by s.scheduled_for asc
    limit 1
  ) ns on true
  left join public.hospital_profiles hp on hp.user_id = ns.hospital_id
  where exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'donor'
  )
  order by pc.created_at nulls last, pc.id, m.sequence_order;
$$;

grant execute on function public.donor_list_cohort_assignments() to authenticated;
