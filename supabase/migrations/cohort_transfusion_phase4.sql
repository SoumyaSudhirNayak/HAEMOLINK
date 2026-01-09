create extension if not exists "pgcrypto";

alter table public.patient_cohorts
  add column if not exists start_date timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'patient_cohort_members_unique_order'
  ) then
    execute 'create unique index patient_cohort_members_unique_order on public.patient_cohort_members(cohort_id, sequence_order)';
  end if;
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'patient_cohort_members_unique_donor'
  ) then
    execute 'create unique index patient_cohort_members_unique_donor on public.patient_cohort_members(cohort_id, donor_id)';
  end if;
end $$;

create table if not exists public.cohort_transfusion_schedule (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.patient_cohorts(id) on delete cascade,
  patient_id uuid not null references public.users(id) on delete cascade,
  slot_number integer not null,
  scheduled_for timestamptz not null,
  assigned_donor_id uuid references public.users(id),
  assigned_hospital_id uuid references public.users(id),
  component text,
  units integer not null default 1,
  status text not null default 'planned',
  used_emergency boolean not null default false,
  emergency_donor_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cohort_transfusion_schedule_status_check'
  ) then
    execute $sql$
      alter table public.cohort_transfusion_schedule
      add constraint cohort_transfusion_schedule_status_check
      check (status in ('planned','booked','pre_transfusion','in_progress','completed','skipped'))
    $sql$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'cohort_transfusion_schedule_unique_slot'
  ) then
    execute 'create unique index cohort_transfusion_schedule_unique_slot on public.cohort_transfusion_schedule(cohort_id, slot_number)';
  end if;
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'cohort_transfusion_schedule_patient_idx'
  ) then
    execute 'create index cohort_transfusion_schedule_patient_idx on public.cohort_transfusion_schedule(patient_id, scheduled_for)';
  end if;
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'cohort_transfusion_schedule_donor_idx'
  ) then
    execute 'create index cohort_transfusion_schedule_donor_idx on public.cohort_transfusion_schedule(assigned_donor_id, scheduled_for)';
  end if;
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'cohort_transfusion_schedule_hospital_idx'
  ) then
    execute 'create index cohort_transfusion_schedule_hospital_idx on public.cohort_transfusion_schedule(assigned_hospital_id, scheduled_for)';
  end if;
end $$;

alter table public.cohort_transfusion_schedule enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cohort_transfusion_schedule' and policyname = 'cohort_schedule_patient_select'
  ) then
    execute $p$
      create policy cohort_schedule_patient_select
      on public.cohort_transfusion_schedule
      for select
      using (patient_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cohort_transfusion_schedule' and policyname = 'cohort_schedule_patient_update'
  ) then
    execute $p$
      create policy cohort_schedule_patient_update
      on public.cohort_transfusion_schedule
      for update
      using (patient_id = auth.uid())
      with check (patient_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cohort_transfusion_schedule' and policyname = 'cohort_schedule_donor_select'
  ) then
    execute $p$
      create policy cohort_schedule_donor_select
      on public.cohort_transfusion_schedule
      for select
      using (assigned_donor_id = auth.uid() or emergency_donor_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cohort_transfusion_schedule' and policyname = 'cohort_schedule_donor_update'
  ) then
    execute $p$
      create policy cohort_schedule_donor_update
      on public.cohort_transfusion_schedule
      for update
      using (assigned_donor_id = auth.uid() or emergency_donor_id = auth.uid())
      with check (assigned_donor_id = auth.uid() or emergency_donor_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cohort_transfusion_schedule' and policyname = 'cohort_schedule_hospital_select'
  ) then
    execute $p$
      create policy cohort_schedule_hospital_select
      on public.cohort_transfusion_schedule
      for select
      using (assigned_hospital_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cohort_transfusion_schedule' and policyname = 'cohort_schedule_hospital_update'
  ) then
    execute $p$
      create policy cohort_schedule_hospital_update
      on public.cohort_transfusion_schedule
      for update
      using (assigned_hospital_id = auth.uid())
      with check (assigned_hospital_id = auth.uid())
    $p$;
  end if;
end $$;

create table if not exists public.transfusion_vitals (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null unique references public.cohort_transfusion_schedule(id) on delete cascade,
  bp_systolic integer,
  bp_diastolic integer,
  heart_rate integer,
  spo2 integer,
  transfusion_status text not null default 'pre_transfusion',
  reaction_notes text,
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transfusion_vitals_status_check'
  ) then
    execute $sql$
      alter table public.transfusion_vitals
      add constraint transfusion_vitals_status_check
      check (transfusion_status in ('pre_transfusion','in_progress','completed'))
    $sql$;
  end if;
end $$;

alter table public.transfusion_vitals enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'transfusion_vitals' and policyname = 'transfusion_vitals_hospital_select'
  ) then
    execute $p$
      create policy transfusion_vitals_hospital_select
      on public.transfusion_vitals
      for select
      using (
        exists (
          select 1
          from public.cohort_transfusion_schedule s
          where s.id = transfusion_vitals.schedule_id
            and s.assigned_hospital_id = auth.uid()
        )
      )
    $p$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'transfusion_vitals' and policyname = 'transfusion_vitals_hospital_update'
  ) then
    execute $p$
      create policy transfusion_vitals_hospital_update
      on public.transfusion_vitals
      for update
      using (
        exists (
          select 1
          from public.cohort_transfusion_schedule s
          where s.id = transfusion_vitals.schedule_id
            and s.assigned_hospital_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.cohort_transfusion_schedule s
          where s.id = transfusion_vitals.schedule_id
            and s.assigned_hospital_id = auth.uid()
        )
      )
    $p$;
  end if;
end $$;

alter table public.donor_donations
  add column if not exists schedule_id uuid references public.cohort_transfusion_schedule(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'donor_donations_schedule_id_idx'
  ) then
    execute 'create index donor_donations_schedule_id_idx on public.donor_donations(schedule_id)';
  end if;
end $$;

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_cohort_transfusion_schedule_updated_at') then
    execute $sql$
      create trigger trg_cohort_transfusion_schedule_updated_at
      before update on public.cohort_transfusion_schedule
      for each row
      execute function public.tg_set_updated_at()
    $sql$;
  end if;
end $$;

create or replace function public.create_patient_cohort(
  p_patient_id uuid,
  p_donor_ids uuid[],
  p_start_date timestamptz default now(),
  p_cohort_name text default 'Primary Cohort'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cohort_id uuid;
  donor_id uuid;
  i integer := 1;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if uid <> p_patient_id then
    raise exception 'not_authorized';
  end if;
  if not exists (select 1 from public.users u where u.id = uid and u.role = 'patient') then
    raise exception 'not_patient';
  end if;
  if p_donor_ids is null or array_length(p_donor_ids, 1) <> 5 then
    raise exception 'cohort_requires_5_donors';
  end if;

  insert into public.patient_cohorts (patient_id, cohort_name, active, start_date)
  values (p_patient_id, p_cohort_name, true, coalesce(p_start_date, now()))
  returning id into cohort_id;

  foreach donor_id in array p_donor_ids loop
    if donor_id is null then
      raise exception 'invalid_donor_id';
    end if;
    if not exists (select 1 from public.users u where u.id = donor_id and u.role = 'donor') then
      raise exception 'donor_not_found';
    end if;
    insert into public.patient_cohort_members (cohort_id, donor_id, sequence_order)
    values (cohort_id, donor_id, i);
    i := i + 1;
  end loop;

  return cohort_id;
end;
$$;

grant execute on function public.create_patient_cohort(uuid, uuid[], timestamptz, text) to authenticated;

create or replace function public.donor_set_availability(p_available boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.users u where u.id = uid and u.role = 'donor') then
    raise exception 'not_donor';
  end if;
  update public.donor_profiles
  set is_available = coalesce(p_available, true)
  where user_id = uid;
end;
$$;

grant execute on function public.donor_set_availability(boolean) to authenticated;

create or replace function public.plan_next_transfusion(
  p_patient_id uuid default auth.uid(),
  p_component text default 'Whole Blood',
  p_units integer default 1
)
returns table (
  schedule_id uuid,
  cohort_id uuid,
  slot_number integer,
  scheduled_for timestamptz,
  assigned_donor_id uuid,
  used_emergency boolean,
  emergency_donor_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  c record;
  next_slot integer;
  sched_at timestamptz;
  target_order integer;
  chosen_donor uuid;
  chosen_is_emergency boolean := false;
  emergency_donor uuid := null;
  primary_member record;
  candidate record;
  offset_i integer;
  primary_order integer;
  primary_donor uuid;
  primary_ok boolean;
  donor_ok boolean;
  cohort_donor_ids uuid[];
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if uid <> p_patient_id then
    raise exception 'not_authorized';
  end if;
  if not exists (select 1 from public.users u where u.id = uid and u.role = 'patient') then
    raise exception 'not_patient';
  end if;

  select pc.id, pc.patient_id, pc.start_date
  into c
  from public.patient_cohorts pc
  where pc.patient_id = p_patient_id
    and pc.active is distinct from false
  order by pc.created_at nulls last, pc.id
  limit 1;

  if not found then
    raise exception 'no_cohort';
  end if;

  select coalesce(max(s.slot_number), 0) + 1
  into next_slot
  from public.cohort_transfusion_schedule s
  where s.cohort_id = c.id;

  sched_at := c.start_date + ((next_slot - 1) * interval '21 days');

  target_order := ((next_slot - 1) % 5) + 1;

  select m.donor_id, m.sequence_order
  into primary_member
  from public.patient_cohort_members m
  where m.cohort_id = c.id
    and m.sequence_order = target_order
  limit 1;

  if not found then
    raise exception 'invalid_cohort_membership';
  end if;

  primary_donor := primary_member.donor_id;
  primary_order := primary_member.sequence_order;

  donor_ok := (
    coalesce((select dp.is_available from public.donor_profiles dp where dp.user_id = primary_donor), true)
    and (
      (select max(dd.donation_date) from public.donor_donations dd where dd.donor_id = primary_donor) is null
      or (select max(dd.donation_date) from public.donor_donations dd where dd.donor_id = primary_donor) <= (sched_at - interval '90 days')
    )
  );
  primary_ok := donor_ok;

  if primary_ok then
    chosen_donor := primary_donor;
  else
    for offset_i in 1..4 loop
      select m.donor_id, m.sequence_order
      into candidate
      from public.patient_cohort_members m
      where m.cohort_id = c.id
        and m.sequence_order = (((target_order - 1 + offset_i) % 5) + 1)
      limit 1;

      if found then
        donor_ok := (
          coalesce((select dp.is_available from public.donor_profiles dp where dp.user_id = candidate.donor_id), true)
          and (
            (select max(dd.donation_date) from public.donor_donations dd where dd.donor_id = candidate.donor_id) is null
            or (select max(dd.donation_date) from public.donor_donations dd where dd.donor_id = candidate.donor_id) <= (sched_at - interval '90 days')
          )
        );
        if donor_ok then
          chosen_donor := candidate.donor_id;
          update public.patient_cohort_members
          set sequence_order = case
            when donor_id = primary_donor then candidate.sequence_order
            when donor_id = candidate.donor_id then primary_order
            else sequence_order
          end
          where cohort_id = c.id
            and donor_id in (primary_donor, candidate.donor_id);
          exit;
        end if;
      end if;
    end loop;
  end if;

  select array_agg(m.donor_id) into cohort_donor_ids
  from public.patient_cohort_members m
  where m.cohort_id = c.id;

  if chosen_donor is null then
    select dp.user_id
    into emergency_donor
    from public.donor_profiles dp
    where coalesce(dp.is_available, true) = true
      and dp.user_id <> all(cohort_donor_ids)
      and (
        (select max(dd.donation_date) from public.donor_donations dd where dd.donor_id = dp.user_id) is null
        or (select max(dd.donation_date) from public.donor_donations dd where dd.donor_id = dp.user_id) <= (sched_at - interval '90 days')
      )
    order by dp.user_id
    limit 1;

    if emergency_donor is null then
      raise exception 'no_eligible_donor_available';
    end if;
    chosen_is_emergency := true;
  end if;

  insert into public.cohort_transfusion_schedule (
    cohort_id,
    patient_id,
    slot_number,
    scheduled_for,
    assigned_donor_id,
    component,
    units,
    status,
    used_emergency,
    emergency_donor_id
  )
  values (
    c.id,
    p_patient_id,
    next_slot,
    sched_at,
    case when chosen_is_emergency then null else chosen_donor end,
    nullif(trim(both from p_component), ''),
    greatest(1, coalesce(p_units, 1)),
    'planned',
    chosen_is_emergency,
    case when chosen_is_emergency then emergency_donor else null end
  )
  returning id into schedule_id;

  cohort_id := c.id;
  slot_number := next_slot;
  scheduled_for := sched_at;
  assigned_donor_id := chosen_donor;
  used_emergency := chosen_is_emergency;
  emergency_donor_id := emergency_donor;
  return next;
end;
$$;

grant execute on function public.plan_next_transfusion(uuid, text, integer) to authenticated;

create or replace function public.patient_list_hospitals(p_query text default null)
returns table (
  hospital_id uuid,
  name text,
  address text,
  contact text,
  verified boolean
)
language sql
security definer
set search_path = public
as $$
  select
    hp.user_id as hospital_id,
    coalesce(hp.organization_name, 'Hospital') as name,
    coalesce(hp.address, '') as address,
    coalesce(hp.admin_contact, '') as contact,
    (hp.verification_status = 'approved') as verified
  from public.hospital_profiles hp
  where exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'patient'
  )
    and coalesce(hp.is_active, true) = true
    and (
      p_query is null
      or p_query = ''
      or hp.organization_name ilike ('%' || p_query || '%')
      or hp.address ilike ('%' || p_query || '%')
    )
  order by verified desc, name asc
  limit 100;
$$;

grant execute on function public.patient_list_hospitals(text) to authenticated;

create or replace function public.patient_book_transfusion(
  p_schedule_id uuid,
  p_hospital_id uuid,
  p_scheduled_for timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s record;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.users u where u.id = uid and u.role = 'patient') then
    raise exception 'not_patient';
  end if;

  select * into s
  from public.cohort_transfusion_schedule
  where id = p_schedule_id
  for update;

  if not found then
    raise exception 'schedule_not_found';
  end if;
  if s.patient_id <> uid then
    raise exception 'not_authorized';
  end if;

  update public.cohort_transfusion_schedule
  set assigned_hospital_id = p_hospital_id,
      scheduled_for = coalesce(p_scheduled_for, scheduled_for),
      status = case when status = 'completed' then status else 'booked' end
  where id = p_schedule_id;
end;
$$;

grant execute on function public.patient_book_transfusion(uuid, uuid, timestamptz) to authenticated;

create or replace function public.patient_list_transfusion_schedule(
  p_patient_id uuid default auth.uid()
)
returns table (
  schedule_id uuid,
  scheduled_for timestamptz,
  status text,
  component text,
  units integer,
  used_emergency boolean,
  donor_id uuid,
  donor_name text,
  hospital_id uuid,
  hospital_name text
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as schedule_id,
    s.scheduled_for,
    s.status,
    s.component,
    s.units,
    s.used_emergency,
    coalesce(s.assigned_donor_id, s.emergency_donor_id) as donor_id,
    coalesce(dp.full_name, 'Donor') as donor_name,
    s.assigned_hospital_id as hospital_id,
    coalesce(hp.organization_name, 'Hospital') as hospital_name
  from public.cohort_transfusion_schedule s
  left join public.donor_profiles dp on dp.user_id = coalesce(s.assigned_donor_id, s.emergency_donor_id)
  left join public.hospital_profiles hp on hp.user_id = s.assigned_hospital_id
  where exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'patient'
  )
    and s.patient_id = p_patient_id
  order by s.scheduled_for desc;
$$;

grant execute on function public.patient_list_transfusion_schedule(uuid) to authenticated;

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
  donor_available boolean
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
      where dd.donation_date is not null
      union all
      select
        coalesce(s.assigned_donor_id, s.emergency_donor_id) as donor_id,
        s.scheduled_for as last_donation_date
      from public.cohort_transfusion_schedule s
      where s.status = 'completed'
        and s.scheduled_for is not null
        and coalesce(s.assigned_donor_id, s.emergency_donor_id) is not null
    ) x
    group by x.donor_id
  ),
  next_s as (
    select
      coalesce(s.assigned_donor_id, s.emergency_donor_id) as donor_id,
      min(s.scheduled_for) as next_scheduled_for
    from public.cohort_transfusion_schedule s
    where s.scheduled_for >= now()
      and s.status in ('planned','booked','pre_transfusion','in_progress')
    group by coalesce(s.assigned_donor_id, s.emergency_donor_id)
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
    coalesce(dp.is_available, true) as donor_available
  from me
  join public.patient_cohort_members m on m.donor_id = me.donor_id
  join public.patient_cohorts pc on pc.id = m.cohort_id
  left join public.patient_profiles pp on pp.user_id = pc.patient_id
  left join public.donor_profiles dp on dp.user_id = me.donor_id
  left join last_d ld on ld.donor_id = me.donor_id
  left join next_s ns on ns.donor_id = me.donor_id
  where exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'donor'
  )
  order by pc.created_at nulls last, pc.id, m.sequence_order;
$$;

grant execute on function public.donor_list_cohort_assignments() to authenticated;

create or replace function public.donor_list_scheduled_donations(p_only_upcoming boolean default true)
returns table (
  schedule_id uuid,
  scheduled_for timestamptz,
  status text,
  component text,
  units integer,
  patient_id uuid,
  patient_name text,
  hospital_id uuid,
  hospital_name text,
  used_emergency boolean
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as schedule_id,
    s.scheduled_for,
    s.status,
    s.component,
    s.units,
    s.patient_id,
    coalesce(pp.full_name, 'Patient') as patient_name,
    s.assigned_hospital_id as hospital_id,
    coalesce(hp.organization_name, 'Hospital') as hospital_name,
    s.used_emergency
  from public.cohort_transfusion_schedule s
  left join public.patient_profiles pp on pp.user_id = s.patient_id
  left join public.hospital_profiles hp on hp.user_id = s.assigned_hospital_id
  where exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'donor'
  )
    and (coalesce(s.assigned_donor_id, s.emergency_donor_id) = auth.uid())
    and (p_only_upcoming is not true or s.scheduled_for >= now())
  order by s.scheduled_for asc;
$$;

grant execute on function public.donor_list_scheduled_donations(boolean) to authenticated;

create or replace function public.donor_mark_donation_completed(
  p_schedule_id uuid,
  p_donation_date timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s record;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.users u where u.id = uid and u.role = 'donor') then
    raise exception 'not_donor';
  end if;

  select * into s
  from public.cohort_transfusion_schedule
  where id = p_schedule_id
  for update;

  if not found then
    raise exception 'schedule_not_found';
  end if;
  if coalesce(s.assigned_donor_id, s.emergency_donor_id) <> uid then
    raise exception 'not_assigned_to_donor';
  end if;

  insert into public.donor_donations (donor_id, hospital_id, donation_date, component, schedule_id)
  values (uid, s.assigned_hospital_id, coalesce(p_donation_date, now()), s.component, s.id);

  update public.cohort_transfusion_schedule
  set status = 'completed'
  where id = s.id;

  update public.donor_profiles
  set last_donation_date = date(coalesce(p_donation_date, now()))
  where user_id = uid;
end;
$$;

grant execute on function public.donor_mark_donation_completed(uuid, timestamptz) to authenticated;

create or replace function public.hospital_list_transfusions(p_only_upcoming boolean default true)
returns table (
  schedule_id uuid,
  scheduled_for timestamptz,
  status text,
  component text,
  units integer,
  patient_id uuid,
  patient_name text,
  donor_id uuid,
  donor_name text,
  bp_systolic integer,
  bp_diastolic integer,
  heart_rate integer,
  spo2 integer,
  transfusion_status text,
  reaction_notes text,
  vitals_updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id as schedule_id,
    s.scheduled_for,
    s.status,
    s.component,
    s.units,
    s.patient_id,
    coalesce(pp.full_name, 'Patient') as patient_name,
    coalesce(s.assigned_donor_id, s.emergency_donor_id) as donor_id,
    coalesce(dp.full_name, 'Donor') as donor_name,
    tv.bp_systolic,
    tv.bp_diastolic,
    tv.heart_rate,
    tv.spo2,
    tv.transfusion_status,
    tv.reaction_notes,
    tv.updated_at as vitals_updated_at
  from public.cohort_transfusion_schedule s
  left join public.patient_profiles pp on pp.user_id = s.patient_id
  left join public.donor_profiles dp on dp.user_id = coalesce(s.assigned_donor_id, s.emergency_donor_id)
  left join public.transfusion_vitals tv on tv.schedule_id = s.id
  where exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'hospital'
  )
    and s.assigned_hospital_id = auth.uid()
    and (p_only_upcoming is not true or s.scheduled_for >= now())
  order by s.scheduled_for asc;
$$;

grant execute on function public.hospital_list_transfusions(boolean) to authenticated;

create or replace function public.hospital_update_transfusion_vitals(
  p_schedule_id uuid,
  p_bp_systolic integer,
  p_bp_diastolic integer,
  p_heart_rate integer,
  p_spo2 integer,
  p_transfusion_status text,
  p_reaction_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s record;
  next_status text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.users u where u.id = uid and u.role = 'hospital') then
    raise exception 'not_hospital';
  end if;

  select * into s
  from public.cohort_transfusion_schedule
  where id = p_schedule_id
  for update;

  if not found then
    raise exception 'schedule_not_found';
  end if;
  if s.assigned_hospital_id <> uid then
    raise exception 'not_assigned_to_hospital';
  end if;

  insert into public.transfusion_vitals (
    schedule_id,
    bp_systolic,
    bp_diastolic,
    heart_rate,
    spo2,
    transfusion_status,
    reaction_notes,
    updated_at
  )
  values (
    p_schedule_id,
    p_bp_systolic,
    p_bp_diastolic,
    p_heart_rate,
    p_spo2,
    coalesce(nullif(trim(both from p_transfusion_status), ''), 'pre_transfusion'),
    nullif(trim(both from p_reaction_notes), ''),
    now()
  )
  on conflict (schedule_id) do update
  set bp_systolic = excluded.bp_systolic,
      bp_diastolic = excluded.bp_diastolic,
      heart_rate = excluded.heart_rate,
      spo2 = excluded.spo2,
      transfusion_status = excluded.transfusion_status,
      reaction_notes = excluded.reaction_notes,
      updated_at = now();

  next_status := case
    when coalesce(s.status, '') = 'completed' then 'completed'
    when coalesce(nullif(trim(both from p_transfusion_status), ''), 'pre_transfusion') in ('in_progress', 'completed') then 'in_progress'
    else 'pre_transfusion'
  end;

  update public.cohort_transfusion_schedule
  set status = next_status
  where id = p_schedule_id
    and status is distinct from 'completed';
end;
$$;

grant execute on function public.hospital_update_transfusion_vitals(uuid, integer, integer, integer, integer, text, text) to authenticated;

create or replace function public.patient_get_cohort_details(
  p_patient_id uuid default auth.uid()
)
returns table (
  cohort_id uuid,
  cohort_name text,
  start_date timestamptz,
  sequence_order integer,
  donor_id uuid,
  donor_name text,
  donor_phone text,
  donor_blood_group text,
  donor_location text,
  donor_available boolean,
  last_donation_date timestamptz,
  next_scheduled_for timestamptz,
  next_transfusion_for timestamptz
)
language sql
security definer
set search_path = public
as $$
  with c as (
    select pc.id, pc.cohort_name, pc.start_date
    from public.patient_cohorts pc
    where pc.patient_id = p_patient_id
      and pc.active is distinct from false
    order by pc.created_at nulls last, pc.id
    limit 1
  ),
  last_d as (
    select dd.donor_id, max(dd.donation_date) as last_donation_date
    from public.donor_donations dd
    group by dd.donor_id
  ),
  next_d as (
    select
      coalesce(s.assigned_donor_id, s.emergency_donor_id) as donor_id,
      min(s.scheduled_for) as next_scheduled_for
    from public.cohort_transfusion_schedule s
    where s.scheduled_for >= now()
      and s.status in ('planned','booked','pre_transfusion','in_progress')
    group by coalesce(s.assigned_donor_id, s.emergency_donor_id)
  ),
  next_t as (
    select min(s.scheduled_for) as next_transfusion_for
    from public.cohort_transfusion_schedule s
    join c on c.id = s.cohort_id
    where s.scheduled_for >= now()
      and s.status in ('planned','booked','pre_transfusion','in_progress')
  )
  select
    c.id as cohort_id,
    c.cohort_name,
    c.start_date,
    m.sequence_order,
    m.donor_id,
    coalesce(dp.full_name, 'Donor') as donor_name,
    dp.phone as donor_phone,
    dp.blood_group as donor_blood_group,
    dp.location as donor_location,
    coalesce(dp.is_available, true) as donor_available,
    ld.last_donation_date,
    nd.next_scheduled_for,
    nt.next_transfusion_for
  from c
  join public.patient_cohort_members m on m.cohort_id = c.id
  left join public.donor_profiles dp on dp.user_id = m.donor_id
  left join last_d ld on ld.donor_id = m.donor_id
  left join next_d nd on nd.donor_id = m.donor_id
  cross join next_t nt
  where exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'patient'
  )
    and p_patient_id = auth.uid()
  order by m.sequence_order asc;
$$;

grant execute on function public.patient_get_cohort_details(uuid) to authenticated;
