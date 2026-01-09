-- Roles enum
create type role_enum as enum ('patient','donor','rider','hospital');

-- Verification enum
create type verification_status_enum as enum ('pending','approved');

-- Users table referencing auth.users
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role role_enum not null,
  created_at timestamptz default now()
);

-- Patient profile
create table if not exists public.patient_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  full_name text,
  age integer,
  gender text,
  blood_group text,
  chronic_conditions text,
  thalassemia_flag boolean default false,
  emergency_contact text,
  location text
);

-- Donor profile
create table if not exists public.donor_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  blood_group text,
  last_donation_date date,
  eligibility_status text,
  health_flags text,
  location text
);

-- Rider profile
create table if not exists public.rider_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  vehicle_type text,
  license_number text,
  verification_status verification_status_enum default 'pending',
  availability_status text
);

-- Hospital profile
create table if not exists public.hospital_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  organization_name text,
  license_number text,
  verification_status verification_status_enum default 'pending',
  address text,
  admin_contact text
);

-- Enable RLS
alter table public.users enable row level security;
alter table public.patient_profiles enable row level security;
alter table public.donor_profiles enable row level security;
alter table public.rider_profiles enable row level security;
alter table public.hospital_profiles enable row level security;

-- Users policies
create policy users_select_self on public.users for select using (id = auth.uid());
create policy users_insert_self on public.users for insert with check (id = auth.uid());
create policy users_update_self on public.users for update using (id = auth.uid()) with check (id = auth.uid());
create policy users_delete_self on public.users for delete using (id = auth.uid());

-- Patient policies
create policy patient_select_self on public.patient_profiles for select using (user_id = auth.uid());
create policy patient_insert_self on public.patient_profiles for insert with check (user_id = auth.uid());
create policy patient_update_self on public.patient_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy patient_delete_self on public.patient_profiles for delete using (user_id = auth.uid());

-- Donor policies
create policy donor_select_self on public.donor_profiles for select using (user_id = auth.uid());
create policy donor_insert_self on public.donor_profiles for insert with check (user_id = auth.uid());
create policy donor_update_self on public.donor_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy donor_delete_self on public.donor_profiles for delete using (user_id = auth.uid());

-- Rider policies
create policy rider_select_self on public.rider_profiles for select using (user_id = auth.uid());
create policy rider_insert_self on public.rider_profiles for insert with check (user_id = auth.uid());
create policy rider_update_self on public.rider_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy rider_delete_self on public.rider_profiles for delete using (user_id = auth.uid());

-- Hospital policies
create policy hospital_select_self on public.hospital_profiles for select using (user_id = auth.uid());
create policy hospital_insert_self on public.hospital_profiles for insert with check (user_id = auth.uid());
create policy hospital_update_self on public.hospital_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy hospital_delete_self on public.hospital_profiles for delete using (user_id = auth.uid());

create table if not exists public.blood_requests (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  blood_group text,
  component text,
  quantity_units integer not null,
  urgency text,
  hospital_id uuid references public.users(id),
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.patient_transfusions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  blood_request_id uuid references public.blood_requests(id) on delete set null,
  hospital_id uuid references public.users(id),
  transfusion_date date not null,
  reaction_notes text,
  created_at timestamptz default now()
);

create table if not exists public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  file_url text not null,
  document_type text,
  extracted_data jsonb,
  uploaded_at timestamptz default now()
);

create table if not exists public.patient_notifications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.blood_requests enable row level security;
alter table public.patient_transfusions enable row level security;
alter table public.patient_documents enable row level security;
alter table public.patient_notifications enable row level security;

create policy blood_requests_patient_select_self on public.blood_requests for select using (patient_id = auth.uid());
create policy blood_requests_patient_insert_self on public.blood_requests for insert with check (patient_id = auth.uid());
create policy blood_requests_patient_update_self on public.blood_requests for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy blood_requests_patient_delete_self on public.blood_requests for delete using (patient_id = auth.uid());

create policy patient_transfusions_select_self on public.patient_transfusions for select using (patient_id = auth.uid());
create policy patient_transfusions_insert_self on public.patient_transfusions for insert with check (patient_id = auth.uid());
create policy patient_transfusions_update_self on public.patient_transfusions for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy patient_transfusions_delete_self on public.patient_transfusions for delete using (patient_id = auth.uid());

create policy patient_documents_select_self on public.patient_documents for select using (patient_id = auth.uid());
create policy patient_documents_insert_self on public.patient_documents for insert with check (patient_id = auth.uid());
create policy patient_documents_update_self on public.patient_documents for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy patient_documents_delete_self on public.patient_documents for delete using (patient_id = auth.uid());

create policy patient_notifications_select_self on public.patient_notifications for select using (patient_id = auth.uid());
create policy patient_notifications_insert_self on public.patient_notifications for insert with check (patient_id = auth.uid());
create policy patient_notifications_update_self on public.patient_notifications for update using (patient_id = auth.uid()) with check (patient_id = auth.uid());
create policy patient_notifications_delete_self on public.patient_notifications for delete using (patient_id = auth.uid());

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  role text not null,
  title text not null,
  message text not null,
  event_type text not null,
  entity_id uuid,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_select_self'
  ) then
    execute 'create policy notifications_select_self on public.notifications for select using (user_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_insert_system'
  ) then
    execute 'create policy notifications_insert_system on public.notifications for insert with check (true)';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'notifications_unique_user_event_entity'
  ) then
    execute 'create unique index notifications_unique_user_event_entity on public.notifications (user_id, event_type, entity_id) where entity_id is not null';
  end if;
end $$;

create or replace function public.emit_notification(
  p_user_id uuid,
  p_role text,
  p_title text,
  p_message text,
  p_event_type text,
  p_entity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_entity_id is null then
    insert into public.notifications (user_id, role, title, message, event_type, entity_id)
    values (p_user_id, p_role, p_title, p_message, p_event_type, p_entity_id);
  else
    insert into public.notifications (user_id, role, title, message, event_type, entity_id)
    values (p_user_id, p_role, p_title, p_message, p_event_type, p_entity_id)
    on conflict (user_id, event_type, entity_id) do nothing;
  end if;
end;
$$;

grant execute on function public.emit_notification(uuid, text, text, text, text, uuid) to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end $$;
