create extension if not exists "pgcrypto";

alter table public.donor_profiles
  add column if not exists full_name text;

alter table public.donor_profiles
  add column if not exists phone text;

alter table public.donor_profiles
  add column if not exists created_at timestamptz default now();

create table if not exists public.donor_availability (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.users(id) on delete cascade,
  available boolean,
  radius_km numeric,
  updated_at timestamptz default now()
);

create table if not exists public.donor_donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.users(id) on delete cascade,
  blood_request_id uuid references public.blood_requests(id) on delete set null,
  hospital_id uuid references public.users(id) on delete set null,
  donation_date timestamptz,
  component text,
  created_at timestamptz default now()
);

create table if not exists public.donor_rewards (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.users(id) on delete cascade,
  reward_type text,
  points integer,
  issued_at timestamptz default now()
);

create table if not exists public.donor_activity_log (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.users(id) on delete cascade,
  activity_type text,
  description text,
  created_at timestamptz default now()
);

alter table public.donor_availability enable row level security;
alter table public.donor_donations enable row level security;
alter table public.donor_rewards enable row level security;
alter table public.donor_activity_log enable row level security;

create policy donor_availability_self
on public.donor_availability
for all
using (donor_id = auth.uid())
with check (donor_id = auth.uid());

create policy donor_donations_self
on public.donor_donations
for all
using (donor_id = auth.uid())
with check (donor_id = auth.uid());

create policy donor_rewards_self
on public.donor_rewards
for all
using (donor_id = auth.uid())
with check (donor_id = auth.uid());

create policy donor_activity_log_self
on public.donor_activity_log
for all
using (donor_id = auth.uid())
with check (donor_id = auth.uid());

