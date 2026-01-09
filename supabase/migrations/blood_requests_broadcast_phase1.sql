-- Ensure columns exist for broadcast flow (safe, additive)
alter table public.blood_requests
  add column if not exists patient_id uuid references public.users(id);

alter table public.blood_requests
  add column if not exists blood_group text;

alter table public.blood_requests
  add column if not exists component text;

alter table public.blood_requests
  add column if not exists urgency text;

alter table public.blood_requests
  add column if not exists request_type text;

alter table public.blood_requests
  add column if not exists notes text;

alter table public.blood_requests
  add column if not exists status text;

alter table public.blood_requests
  add column if not exists created_at timestamptz default now();

-- Enable RLS
alter table public.blood_requests enable row level security;

-- Donor can view pending requests that match donor blood group
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'blood_requests'
      and policyname = 'donor_can_view_matching_requests'
  ) then
    execute $sql$
      create policy donor_can_view_matching_requests
      on public.blood_requests
      for select
      using (
        status = 'pending'
        and blood_group = (
          select blood_group
          from public.donor_profiles
          where user_id = auth.uid()
        )
      )
    $sql$;
  end if;
end $$;
