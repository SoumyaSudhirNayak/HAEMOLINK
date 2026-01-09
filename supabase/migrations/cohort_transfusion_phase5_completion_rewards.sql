do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'donor_donations_unique_schedule_id'
  ) then
    execute $sql$
      create unique index donor_donations_unique_schedule_id
      on public.donor_donations(schedule_id)
      where schedule_id is not null
    $sql$;
  end if;
end $$;

alter table public.cohort_transfusion_schedule
  add column if not exists completed_at timestamptz;

alter table public.patient_transfusions
  add column if not exists schedule_id uuid references public.cohort_transfusion_schedule(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'patient_transfusions_unique_schedule_id'
  ) then
    execute $sql$
      create unique index patient_transfusions_unique_schedule_id
      on public.patient_transfusions(schedule_id)
      where schedule_id is not null
    $sql$;
  end if;
end $$;

create or replace function public.rotate_cohort_transfusion(
  p_cohort_id uuid,
  p_next_scheduled_for timestamptz,
  p_component text default 'Whole Blood',
  p_units integer default 1
)
returns table (
  schedule_id uuid,
  scheduled_for timestamptz,
  assigned_donor_id uuid,
  used_emergency boolean,
  emergency_donor_id uuid,
  slot_number integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  role text;
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
  fallback record;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select u.role into role
  from public.users u
  where u.id = uid;

  if role is null then
    raise exception 'not_authorized';
  end if;

  select pc.id, pc.patient_id
  into c
  from public.patient_cohorts pc
  where pc.id = p_cohort_id
    and pc.active is distinct from false
  limit 1;

  if not found then
    raise exception 'no_cohort';
  end if;

  if role = 'patient' and c.patient_id <> uid then
    raise exception 'not_authorized';
  end if;

  if role = 'hospital' then
    if not exists (
      select 1
      from public.cohort_transfusion_schedule s
      where s.cohort_id = p_cohort_id
        and s.assigned_hospital_id = uid
    ) then
      raise exception 'not_authorized';
    end if;
  end if;

  select coalesce(max(s.slot_number), 0) + 1
  into next_slot
  from public.cohort_transfusion_schedule s
  where s.cohort_id = p_cohort_id;

  sched_at := coalesce(p_next_scheduled_for, now() + interval '21 days');

  target_order := ((next_slot - 1) % 5) + 1;

  select m.donor_id, m.sequence_order
  into primary_member
  from public.patient_cohort_members m
  where m.cohort_id = p_cohort_id
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
      where m.cohort_id = p_cohort_id
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
          where cohort_id = p_cohort_id
            and donor_id in (primary_donor, candidate.donor_id);
          exit;
        end if;
      end if;
    end loop;
  end if;

  select array_agg(m.donor_id) into cohort_donor_ids
  from public.patient_cohort_members m
  where m.cohort_id = p_cohort_id;

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

    if emergency_donor is not null then
      chosen_is_emergency := true;
    else
      select
        c2.donor_id,
        c2.sequence_order,
        greatest(
          sched_at,
          coalesce(ld.last_donation_date + interval '90 days', sched_at)
        ) as eligible_at
      into fallback
      from public.patient_cohort_members c2
      left join (
        select dd.donor_id, max(dd.donation_date) as last_donation_date
        from public.donor_donations dd
        group by dd.donor_id
      ) ld on ld.donor_id = c2.donor_id
      where c2.cohort_id = p_cohort_id
      order by eligible_at asc, c2.sequence_order asc
      limit 1;

      if not found then
        raise exception 'no_eligible_donor_available';
      end if;

      sched_at := fallback.eligible_at;
      chosen_donor := fallback.donor_id;

      if chosen_donor is distinct from primary_donor then
        update public.patient_cohort_members
        set sequence_order = case
          when donor_id = primary_donor then fallback.sequence_order
          when donor_id = chosen_donor then primary_order
          else sequence_order
        end
        where cohort_id = p_cohort_id
          and donor_id in (primary_donor, chosen_donor);
      end if;
    end if;
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
    p_cohort_id,
    c.patient_id,
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

  scheduled_for := sched_at;
  assigned_donor_id := chosen_donor;
  used_emergency := chosen_is_emergency;
  emergency_donor_id := emergency_donor;
  slot_number := next_slot;
  return next;
end;
$$;

grant execute on function public.rotate_cohort_transfusion(uuid, timestamptz, text, integer) to authenticated;

create or replace function public.patient_list_transfusion_history(
  p_patient_id uuid default auth.uid(),
  p_limit integer default 200
)
returns table (
  id uuid,
  occurred_at timestamptz,
  status text,
  component text,
  units integer,
  hospital_id uuid,
  hospital_name text,
  donor_label text,
  cycle_number integer,
  schedule_id uuid
)
language sql
security definer
set search_path = public
as $$
  select
    pt.id,
    coalesce(s.completed_at, pt.created_at, pt.transfusion_date::timestamptz) as occurred_at,
    'completed'::text as status,
    coalesce(s.component, br.component, 'Blood') as component,
    coalesce(s.units, br.quantity_units, 1) as units,
    coalesce(s.assigned_hospital_id, pt.hospital_id) as hospital_id,
    coalesce(hp.organization_name, 'Hospital') as hospital_name,
    case
      when dp.full_name is null then 'Donor'
      else left(dp.full_name, 1) || '***'
    end as donor_label,
    s.slot_number as cycle_number,
    pt.schedule_id
  from public.patient_transfusions pt
  left join public.cohort_transfusion_schedule s on s.id = pt.schedule_id
  left join public.blood_requests br on br.id = pt.blood_request_id
  left join public.hospital_profiles hp on hp.user_id = coalesce(s.assigned_hospital_id, pt.hospital_id)
  left join public.donor_profiles dp on dp.user_id = coalesce(s.assigned_donor_id, s.emergency_donor_id)
  where exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'patient'
  )
    and p_patient_id = auth.uid()
    and pt.patient_id = p_patient_id
  order by occurred_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

grant execute on function public.patient_list_transfusion_history(uuid, integer) to authenticated;

create or replace function public.donor_list_donation_history(p_limit integer default 200)
returns table (
  donation_id uuid,
  donation_date timestamptz,
  component text,
  hospital_id uuid,
  hospital_name text,
  patient_label text,
  reward_points integer,
  eligibility_reset_at timestamptz,
  cycle_number integer,
  schedule_id uuid
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select auth.uid()::uuid as donor_id
  ),
  reward_points as (
    select
      dr.donor_id,
      (dr.metadata->>'schedule_id')::uuid as schedule_id,
      sum(coalesce(dr.points, 0))::int as points
    from public.donor_rewards dr
    where dr.donor_id = (select donor_id from me)
      and dr.metadata ? 'schedule_id'
    group by dr.donor_id, (dr.metadata->>'schedule_id')::uuid
  )
  select
    dd.id as donation_id,
    dd.donation_date,
    coalesce(dd.component, s.component) as component,
    coalesce(dd.hospital_id, s.assigned_hospital_id) as hospital_id,
    coalesce(hp.organization_name, 'Hospital') as hospital_name,
    case
      when pp.full_name is null then 'Patient'
      else left(pp.full_name, 1) || '***'
    end as patient_label,
    coalesce(rp.points, 0) as reward_points,
    (dd.donation_date + interval '90 days') as eligibility_reset_at,
    s.slot_number as cycle_number,
    dd.schedule_id
  from me
  join public.donor_donations dd on dd.donor_id = me.donor_id
  left join public.cohort_transfusion_schedule s on s.id = dd.schedule_id
  left join public.hospital_profiles hp on hp.user_id = coalesce(dd.hospital_id, s.assigned_hospital_id)
  left join public.patient_profiles pp on pp.user_id = s.patient_id
  left join reward_points rp on rp.schedule_id = dd.schedule_id and rp.donor_id = me.donor_id
  where exists (
    select 1 from public.users u where u.id = (select donor_id from me) and u.role = 'donor'
  )
  order by dd.donation_date desc nulls last, dd.created_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

grant execute on function public.donor_list_donation_history(integer) to authenticated;

create or replace function public.hospital_mark_donation_completed(p_schedule_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  s record;
  v_reaction_notes text;
  effective_donor uuid;
  donor_name text;
  patient_name text;
  hospital_name text;
  completion_ts timestamptz;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (select 1 from public.users u where u.id = uid and u.role = 'hospital') then
    raise exception 'not_hospital';
  end if;

  select *
  into s
  from public.cohort_transfusion_schedule
  where id = p_schedule_id
  for update;

  if not found then
    raise exception 'schedule_not_found';
  end if;
  if s.assigned_hospital_id is distinct from uid then
    raise exception 'not_authorized';
  end if;

  completion_ts := coalesce(s.completed_at, now());

  if s.status is distinct from 'completed' then
    completion_ts := now();
    update public.cohort_transfusion_schedule
    set status = 'completed',
        completed_at = coalesce(completed_at, completion_ts)
    where id = p_schedule_id;
  end if;

  execute 'select public.queue_transfusion_notifications($1, $2)'
  using p_schedule_id, 'transfusion_completed';

  insert into public.transfusion_vitals (schedule_id, transfusion_status, reaction_notes, updated_at)
  values (p_schedule_id, 'completed', null, now())
  on conflict (schedule_id) do update
    set transfusion_status = 'completed',
        updated_at = now();

  select tv.reaction_notes
  into v_reaction_notes
  from public.transfusion_vitals tv
  where tv.schedule_id = p_schedule_id;

  effective_donor := coalesce(s.assigned_donor_id, s.emergency_donor_id);

  if effective_donor is not null then
    insert into public.donor_donations (
      donor_id,
      blood_request_id,
      hospital_id,
      donation_date,
      component,
      schedule_id
    )
    values (
      effective_donor,
      null,
      uid,
      coalesce(s.completed_at, s.scheduled_for, completion_ts, now()),
      s.component,
      s.id
    )
    on conflict (schedule_id) where schedule_id is not null do nothing;
  end if;

  if effective_donor is not null then
    begin
      update public.donor_profiles
      set last_donation_date = greatest(coalesce(last_donation_date, 'epoch'::timestamptz), coalesce(s.completed_at, s.scheduled_for, completion_ts, now())),
          eligibility_status = 'not_eligible'
      where user_id = effective_donor;
    exception when others then
      null;
    end;
  end if;

  insert into public.patient_transfusions (
    patient_id,
    blood_request_id,
    hospital_id,
    transfusion_date,
    reaction_notes,
    created_at,
    schedule_id
  )
  values (
    s.patient_id,
    null,
    uid,
    coalesce(s.completed_at, s.scheduled_for, completion_ts, now())::date,
    v_reaction_notes,
    now(),
    s.id
  )
  on conflict (schedule_id) where schedule_id is not null do nothing;

  select dp.full_name into donor_name from public.donor_profiles dp where dp.user_id = effective_donor;
  select pp.full_name into patient_name from public.patient_profiles pp where pp.user_id = s.patient_id;
  select hp.organization_name into hospital_name from public.hospital_profiles hp where hp.user_id = uid;

  if effective_donor is not null then
    if not exists (
      select 1
      from public.donor_rewards dr
      where dr.donor_id = effective_donor
        and dr.reward_type = 'cohort_donation'
        and dr.metadata->>'schedule_id' = s.id::text
    ) then
      insert into public.donor_rewards (donor_id, reward_type, points, issued_at, metadata, issued_by)
      values (
        effective_donor,
        'cohort_donation',
        100,
        now(),
        jsonb_build_object(
          'schedule_id', s.id,
          'donation_date', coalesce(s.completed_at, s.scheduled_for, completion_ts, now()),
          'donor_name', coalesce(donor_name, 'Donor'),
          'patient_name', coalesce(patient_name, 'Patient'),
          'hospital_name', coalesce(hospital_name, 'Hospital'),
          'hospital_id', uid
        ),
        uid
      );
      perform public.emit_notification(
        effective_donor,
        'donor',
        '🎉 Reward Credited',
        'Reward points have been credited to your account.',
        'reward_credited',
        s.id
      );
    end if;

    if not exists (
      select 1
      from public.donor_rewards dr
      where dr.donor_id = effective_donor
        and dr.reward_type = 'certificate_transfusion'
        and dr.metadata->>'schedule_id' = s.id::text
    ) then
      insert into public.donor_rewards (donor_id, reward_type, points, issued_at, metadata, issued_by)
      values (
        effective_donor,
        'certificate_transfusion',
        0,
        now(),
        jsonb_build_object(
          'schedule_id', s.id,
          'donation_date', coalesce(s.completed_at, s.scheduled_for, completion_ts, now()),
          'donor_name', coalesce(donor_name, 'Donor'),
          'patient_name', coalesce(patient_name, 'Patient'),
          'hospital_name', coalesce(hospital_name, 'Hospital'),
          'hospital_id', uid
        ),
        uid
      );
    end if;

    insert into public.donor_activity_log (donor_id, activity_type, description, created_at)
    values (
      effective_donor,
      'donation_completed',
      'Donation marked as completed by hospital.',
      now()
    );
  end if;

  if not exists (
    select 1
    from public.cohort_transfusion_schedule s2
    where s2.cohort_id = s.cohort_id
      and s2.slot_number = (s.slot_number + 1)
  ) then
    begin
      perform public.rotate_cohort_transfusion(
        s.cohort_id,
        coalesce(s.completed_at, s.scheduled_for, completion_ts, now()) + interval '21 days',
        coalesce(s.component, 'Whole Blood'),
        coalesce(s.units, 1)
      );
    exception when others then
      null;
    end;
  end if;
end;
$$;

grant execute on function public.hospital_mark_donation_completed(uuid) to authenticated;

create table if not exists public.user_notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  sms_enabled boolean not null default true,
  whatsapp_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_notification_preferences enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_notification_preferences' and policyname = 'notif_prefs_self_select'
  ) then
    execute $p$
      create policy notif_prefs_self_select
      on public.user_notification_preferences
      for select
      using (user_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_notification_preferences' and policyname = 'notif_prefs_self_insert'
  ) then
    execute $p$
      create policy notif_prefs_self_insert
      on public.user_notification_preferences
      for insert
      with check (user_id = auth.uid())
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_notification_preferences' and policyname = 'notif_prefs_self_update'
  ) then
    execute $p$
      create policy notif_prefs_self_update
      on public.user_notification_preferences
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid())
    $p$;
  end if;
end $$;

create table if not exists public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  to_phone text not null,
  body text not null,
  recipient_user_id uuid references public.users(id) on delete set null,
  related_type text,
  related_id uuid,
  dedupe_key text not null,
  status text not null default 'queued',
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'outbound_messages_channel_check') then
    execute $sql$
      alter table public.outbound_messages
      add constraint outbound_messages_channel_check
      check (channel in ('sms','whatsapp'))
    $sql$;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'outbound_messages_status_check') then
    execute $sql$
      alter table public.outbound_messages
      add constraint outbound_messages_status_check
      check (status in ('queued','sent','failed','skipped'))
    $sql$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'outbound_messages_dedupe_key_unique'
  ) then
    execute $sql$
      create unique index outbound_messages_dedupe_key_unique on public.outbound_messages(dedupe_key)
    $sql$;
  end if;
end $$;

alter table public.outbound_messages enable row level security;

create or replace function public.queue_outbound_message(
  p_channel text,
  p_to_phone text,
  p_body text,
  p_recipient_user_id uuid,
  p_related_type text,
  p_related_id uuid,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(both from coalesce(p_channel, '')), '') is null then
    return;
  end if;
  if nullif(trim(both from coalesce(p_to_phone, '')), '') is null then
    return;
  end if;
  if nullif(trim(both from coalesce(p_body, '')), '') is null then
    return;
  end if;
  if nullif(trim(both from coalesce(p_dedupe_key, '')), '') is null then
    return;
  end if;

  insert into public.outbound_messages (
    channel,
    to_phone,
    body,
    recipient_user_id,
    related_type,
    related_id,
    dedupe_key,
    metadata
  )
  values (
    lower(p_channel),
    trim(both from p_to_phone),
    p_body,
    p_recipient_user_id,
    p_related_type,
    p_related_id,
    p_dedupe_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.queue_transfusion_notifications(
  p_schedule_id uuid,
  p_event text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s record;
  patient_phone text;
  donor_phone text;
  patient_sms_enabled boolean := true;
  patient_whatsapp_enabled boolean := false;
  donor_sms_enabled boolean := true;
  donor_whatsapp_enabled boolean := false;
  dt_text text;
  hospital_name text;
  donor_name text;
  patient_name text;
  patient_sms_body text;
  donor_sms_body text;
begin
  select
    cs.id as schedule_id,
    cs.scheduled_for,
    cs.status,
    cs.patient_id,
    coalesce(cs.assigned_donor_id, cs.emergency_donor_id) as donor_id,
    cs.assigned_hospital_id as hospital_id,
    coalesce(pp.full_name, 'Patient') as patient_name,
    coalesce(dp.full_name, 'Donor') as donor_name,
    coalesce(hp.organization_name, 'Hospital') as hospital_name,
    pp.phone as patient_phone,
    pp.emergency_contact as patient_emergency_contact,
    dp.phone as donor_phone
  into s
  from public.cohort_transfusion_schedule cs
  left join public.patient_profiles pp on pp.user_id = cs.patient_id
  left join public.donor_profiles dp on dp.user_id = coalesce(cs.assigned_donor_id, cs.emergency_donor_id)
  left join public.hospital_profiles hp on hp.user_id = cs.assigned_hospital_id
  where cs.id = p_schedule_id
  limit 1;

  if not found then
    return;
  end if;

  if p_event = 'transfusion_completed' then
    if s.status is distinct from 'completed' then
      return;
    end if;
  elsif s.status is distinct from 'booked' and (p_event is null or p_event not like 'reminder_%') then
    return;
  end if;

  patient_phone := nullif(trim(both from coalesce(s.patient_phone, s.patient_emergency_contact, '')), '');
  donor_phone := nullif(trim(both from coalesce(s.donor_phone, '')), '');

  select unp.sms_enabled, unp.whatsapp_enabled
  into patient_sms_enabled, patient_whatsapp_enabled
  from public.user_notification_preferences unp
  where unp.user_id = s.patient_id;
  if not found then
    patient_sms_enabled := true;
    patient_whatsapp_enabled := false;
  else
    patient_sms_enabled := coalesce(patient_sms_enabled, true);
    patient_whatsapp_enabled := coalesce(patient_whatsapp_enabled, false);
  end if;

  if s.donor_id is not null then
    select unp.sms_enabled, unp.whatsapp_enabled
    into donor_sms_enabled, donor_whatsapp_enabled
    from public.user_notification_preferences unp
    where unp.user_id = s.donor_id;
    if not found then
      donor_sms_enabled := true;
      donor_whatsapp_enabled := false;
    else
      donor_sms_enabled := coalesce(donor_sms_enabled, true);
      donor_whatsapp_enabled := coalesce(donor_whatsapp_enabled, false);
    end if;
  end if;

  dt_text := case
    when s.scheduled_for is null then 'an upcoming slot'
    else to_char(s.scheduled_for, 'Mon DD, YYYY HH24:MI')
  end;

  hospital_name := coalesce(s.hospital_name, 'Hospital');
  donor_name := coalesce(s.donor_name, 'Donor');
  patient_name := coalesce(s.patient_name, 'Patient');

  if p_event = 'booking_confirmation' then
    patient_sms_body := 'HAEMOLINK: Transfusion booked at ' || hospital_name || ' on ' || dt_text || '. Donor: ' || donor_name || '.';
    donor_sms_body := 'HAEMOLINK: Donation scheduled for ' || patient_name || ' at ' || hospital_name || ' on ' || dt_text || '.';
  elsif p_event = 'transfusion_completed' then
    patient_sms_body := 'HAEMOLINK: Transfusion completed at ' || hospital_name || ' on ' || dt_text || '. Donor: ' || donor_name || '.';
    donor_sms_body := 'HAEMOLINK: Donation completed for ' || patient_name || ' at ' || hospital_name || ' on ' || dt_text || '.';
  else
    patient_sms_body := 'HAEMOLINK Reminder: Transfusion at ' || hospital_name || ' on ' || dt_text || '.';
    donor_sms_body := 'HAEMOLINK Reminder: Donation for ' || patient_name || ' at ' || hospital_name || ' on ' || dt_text || '.';
  end if;

  if patient_sms_enabled then
    perform public.queue_outbound_message(
      'sms',
      patient_phone,
      patient_sms_body,
      s.patient_id,
      'cohort_transfusion_schedule',
      s.schedule_id,
      coalesce(p_event, 'event') || ':sms:' || s.schedule_id::text || ':' || s.patient_id::text,
      jsonb_build_object('event', coalesce(p_event, 'event'), 'schedule_id', s.schedule_id, 'recipient', 'patient')
    );
  end if;
  if patient_whatsapp_enabled then
    perform public.queue_outbound_message(
      'whatsapp',
      patient_phone,
      patient_sms_body,
      s.patient_id,
      'cohort_transfusion_schedule',
      s.schedule_id,
      coalesce(p_event, 'event') || ':whatsapp:' || s.schedule_id::text || ':' || s.patient_id::text,
      jsonb_build_object('event', coalesce(p_event, 'event'), 'schedule_id', s.schedule_id, 'recipient', 'patient')
    );
  end if;

  if s.donor_id is not null and donor_sms_enabled then
    perform public.queue_outbound_message(
      'sms',
      donor_phone,
      donor_sms_body,
      s.donor_id,
      'cohort_transfusion_schedule',
      s.schedule_id,
      coalesce(p_event, 'event') || ':sms:' || s.schedule_id::text || ':' || coalesce(s.donor_id::text, 'none'),
      jsonb_build_object('event', coalesce(p_event, 'event'), 'schedule_id', s.schedule_id, 'recipient', 'donor')
    );
  end if;
  if s.donor_id is not null and donor_whatsapp_enabled then
    perform public.queue_outbound_message(
      'whatsapp',
      donor_phone,
      donor_sms_body,
      s.donor_id,
      'cohort_transfusion_schedule',
      s.schedule_id,
      coalesce(p_event, 'event') || ':whatsapp:' || s.schedule_id::text || ':' || coalesce(s.donor_id::text, 'none'),
      jsonb_build_object('event', coalesce(p_event, 'event'), 'schedule_id', s.schedule_id, 'recipient', 'donor')
    );
  end if;
end;
$$;

create or replace function public.tg_cohort_transfusion_schedule_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.status = 'booked' and (old.status is distinct from 'booked') then
      perform public.queue_transfusion_notifications(new.id, 'booking_confirmation');
    end if;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_cohort_transfusion_schedule_notify') then
    execute $sql$
      create trigger trg_cohort_transfusion_schedule_notify
      after update on public.cohort_transfusion_schedule
      for each row
      execute function public.tg_cohort_transfusion_schedule_notify()
    $sql$;
  end if;
end $$;

create or replace function public.queue_upcoming_transfusion_reminders(
  p_hours integer default 24,
  p_window_minutes integer default 30
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  start_at timestamptz;
  end_at timestamptz;
  r record;
  cnt integer := 0;
  ev text;
begin
  p_hours := greatest(1, coalesce(p_hours, 24));
  p_window_minutes := greatest(1, coalesce(p_window_minutes, 30));
  start_at := now() + make_interval(hours => p_hours) - make_interval(mins => p_window_minutes);
  end_at := now() + make_interval(hours => p_hours) + make_interval(mins => p_window_minutes);
  ev := 'reminder_' || p_hours::text || 'h';

  for r in
    select s.id
    from public.cohort_transfusion_schedule s
    where s.status = 'booked'
      and s.scheduled_for >= start_at
      and s.scheduled_for < end_at
  loop
    perform public.queue_transfusion_notifications(r.id, ev);
    cnt := cnt + 1;
  end loop;

  return cnt;
end;
$$;

grant execute on function public.queue_upcoming_transfusion_reminders(integer, integer) to authenticated;
