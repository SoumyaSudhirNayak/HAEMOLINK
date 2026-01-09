-- =========================================================
-- HAEMOLINK – PATIENT POV DATABASE FOUNDATION + FEATURES
-- =========================================================

-- =========================
-- EXTENSIONS
-- =========================
create extension if not exists "pgcrypto";

-- =========================
-- FOUNDATION TABLES
-- (Must exist before dependent tables)
-- =========================

create table if not exists public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  blood_group text not null,
  component text not null,
  quantity_units integer default 1,
  urgency text check (urgency in ('routine','urgent','emergency')) not null,
  hospital_id uuid,
  status text default 'created',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.patient_transfusions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  blood_request_id uuid references public.blood_requests(id) on delete set null,
  hospital_id uuid,
  transfusion_date timestamptz,
  reaction_notes text,
  created_at timestamptz default now()
);

create table if not exists public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  file_url text not null,
  document_type text,
  uploaded_at timestamptz default now()
);

create table if not exists public.patient_notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  title text,
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- =========================
-- PATIENT FEATURE TABLES
-- =========================

create table if not exists public.donor_search_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  blood_group text,
  component text,
  radius_km numeric,
  created_at timestamptz default now()
);

create table if not exists public.order_tracking (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  blood_request_id uuid references public.blood_requests(id) on delete set null,
  status text,
  last_updated timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.patient_cohorts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  cohort_name text not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.patient_cohort_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.patient_cohorts(id) on delete cascade,
  donor_id uuid references public.users(id),
  sequence_order integer,
  created_at timestamptz default now()
);

create table if not exists public.patient_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  report_type text,
  file_url text,
  extracted_data jsonb,
  uploaded_at timestamptz default now()
);

create table if not exists public.patient_payments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  delivery_id uuid references public.deliveries(id) on delete set null,
  distance_km numeric,
  amount numeric,
  payment_type text,
  payment_method text,
  payment_ref text,
  currency text default 'INR',
  status text,
  created_at timestamptz default now()
);

create unique index if not exists patient_payments_delivery_unique
on public.patient_payments (delivery_id)
where delivery_id is not null;

create table if not exists public.patient_activity_log (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  activity_type text,
  description text,
  created_at timestamptz default now()
);

-- =========================
-- ENABLE ROW LEVEL SECURITY
-- =========================

alter table public.blood_requests enable row level security;
alter table public.patient_transfusions enable row level security;
alter table public.patient_documents enable row level security;
alter table public.patient_notifications enable row level security;

alter table public.donor_search_requests enable row level security;
alter table public.order_tracking enable row level security;
alter table public.patient_cohorts enable row level security;
alter table public.patient_cohort_members enable row level security;
alter table public.patient_reports enable row level security;
alter table public.patient_payments enable row level security;
alter table public.patient_activity_log enable row level security;

-- =========================
-- RLS POLICIES (PATIENT-ONLY)
-- =========================

-- blood_requests
create policy blood_requests_self
on public.blood_requests
for all
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

-- patient_transfusions
create policy patient_transfusions_self
on public.patient_transfusions
for all
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

-- patient_documents
create policy patient_documents_self
on public.patient_documents
for all
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

-- patient_notifications
create policy patient_notifications_self
on public.patient_notifications
for all
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

-- donor_search_requests
create policy donor_search_requests_self
on public.donor_search_requests
for all
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

-- order_tracking
create policy order_tracking_self
on public.order_tracking
for all
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

-- patient_cohorts
create policy patient_cohorts_self
on public.patient_cohorts
for all
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

-- patient_cohort_members
create policy patient_cohort_members_self
on public.patient_cohort_members
for all
using (
  exists (
    select 1 from public.patient_cohorts c
    where c.id = cohort_id
    and c.patient_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.patient_cohorts c
    where c.id = cohort_id
    and c.patient_id = auth.uid()
  )
);

-- patient_reports
create policy patient_reports_self
on public.patient_reports
for all
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

-- patient_payments
create policy patient_payments_self
on public.patient_payments
for all
using (patient_id = auth.uid())
with check (patient_id = auth.uid());

-- patient_activity_log
create policy patient_activity_log_self
on public.patient_activity_log
for all
using (patient_id = auth.uid())
with check (patient_id = auth.uid());
