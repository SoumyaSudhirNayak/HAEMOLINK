create or replace function public.create_patient_cohort_by_email(
  p_patient_id uuid,
  p_donor_emails text[],
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
  email_input text;
  donor_id uuid;
  donor_ids uuid[] := array[]::uuid[];
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
  if p_donor_emails is null or array_length(p_donor_emails, 1) <> 5 then
    raise exception 'cohort_requires_5_donors';
  end if;

  foreach email_input in array p_donor_emails loop
    email_input := nullif(trim(both from email_input), '');
    if email_input is null then
      raise exception 'invalid_donor_email';
    end if;
    select u.id
    into donor_id
    from public.users u
    where lower(u.email) = lower(email_input)
      and u.role = 'donor'
    limit 1;
    if donor_id is null then
      raise exception 'donor_not_found_for_email';
    end if;
    if donor_id = any(donor_ids) then
      raise exception 'duplicate_donor_email';
    end if;
    donor_ids := array_append(donor_ids, donor_id);
  end loop;

  return public.create_patient_cohort(
    p_patient_id,
    donor_ids,
    p_start_date,
    p_cohort_name
  );
end;
$$;

grant execute on function public.create_patient_cohort_by_email(uuid, text[], timestamptz, text) to authenticated;

