create extension if not exists "pgcrypto";

alter table public.hospital_profiles
  add column if not exists location text;

alter table public.hospital_profiles
  add column if not exists created_at timestamptz default now();

create table if not exists public.hospital_inventory (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.users(id) on delete cascade,
  blood_group text,
  component text,
  quantity integer,
  expiry_date date,
  created_at timestamptz default now()
);

create table if not exists public.hospital_requests (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.users(id) on delete cascade,
  patient_id uuid references public.users(id) on delete set null,
  blood_request_id uuid references public.blood_requests(id) on delete set null,
  status text,
  created_at timestamptz default now()
);

create table if not exists public.hospital_transfusions (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.users(id) on delete cascade,
  patient_id uuid references public.users(id) on delete set null,
  transfusion_date timestamptz,
  reaction_notes text,
  created_at timestamptz default now()
);

create table if not exists public.hospital_activity_log (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.users(id) on delete cascade,
  activity_type text,
  description text,
  created_at timestamptz default now()
);

alter table public.hospital_inventory enable row level security;
alter table public.hospital_requests enable row level security;
alter table public.hospital_transfusions enable row level security;
alter table public.hospital_activity_log enable row level security;

create policy hospital_inventory_self
on public.hospital_inventory
for all
using (hospital_id = auth.uid())
with check (hospital_id = auth.uid());

create policy hospital_requests_self
on public.hospital_requests
for all
using (hospital_id = auth.uid())
with check (hospital_id = auth.uid());

create policy hospital_transfusions_self
on public.hospital_transfusions
for all
using (hospital_id = auth.uid())
with check (hospital_id = auth.uid());

create policy hospital_activity_log_self
on public.hospital_activity_log
for all
using (hospital_id = auth.uid())
with check (hospital_id = auth.uid());

