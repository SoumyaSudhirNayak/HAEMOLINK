create extension if not exists "pgcrypto";

alter table public.rider_profiles
  add column if not exists full_name text;

alter table public.rider_profiles
  add column if not exists phone text;

alter table public.rider_profiles
  add column if not exists created_at timestamptz default now();

create table if not exists public.rider_assignments (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.users(id) on delete cascade,
  blood_request_id uuid references public.blood_requests(id) on delete set null,
  pickup_location text,
  drop_location text,
  status text,
  assigned_at timestamptz default now()
);

create table if not exists public.rider_cold_chain_logs (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.users(id) on delete cascade,
  assignment_id uuid references public.rider_assignments(id) on delete cascade,
  temperature numeric,
  recorded_at timestamptz default now()
);

create table if not exists public.rider_earnings (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.users(id) on delete cascade,
  delivery_id uuid references public.deliveries(id) on delete set null,
  distance_km numeric,
  amount numeric,
  incentive_type text,
  created_at timestamptz default now()
);

create unique index if not exists rider_earnings_delivery_unique
on public.rider_earnings (delivery_id)
where delivery_id is not null;

create table if not exists public.rider_activity_log (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.users(id) on delete cascade,
  activity_type text,
  description text,
  created_at timestamptz default now()
);

alter table public.rider_assignments enable row level security;
alter table public.rider_cold_chain_logs enable row level security;
alter table public.rider_earnings enable row level security;
alter table public.rider_activity_log enable row level security;

create policy rider_assignments_self
on public.rider_assignments
for all
using (rider_id = auth.uid())
with check (rider_id = auth.uid());

create policy rider_cold_chain_logs_self
on public.rider_cold_chain_logs
for all
using (rider_id = auth.uid())
with check (rider_id = auth.uid());

create policy rider_earnings_self
on public.rider_earnings
for all
using (rider_id = auth.uid())
with check (rider_id = auth.uid());

create policy rider_activity_log_self
on public.rider_activity_log
for all
using (rider_id = auth.uid())
with check (rider_id = auth.uid());
