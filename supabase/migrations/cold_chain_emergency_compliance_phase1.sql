create extension if not exists "pgcrypto";

alter table public.blood_requests
  add column if not exists is_emergency boolean not null default false;

alter table public.blood_requests
  add column if not exists emergency_activated_at timestamptz;

alter table public.blood_requests
  add column if not exists emergency_activated_by uuid references public.users(id);

create table if not exists public.cold_chain_boxes (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.users(id) on delete cascade,
  box_code text not null,
  temperature_c numeric,
  humidity_percent numeric,
  status text not null default 'stable' check (status in ('stable','warning','critical')),
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'cold_chain_boxes_rider_code_unique'
  ) then
    execute 'create unique index cold_chain_boxes_rider_code_unique on public.cold_chain_boxes (rider_id, box_code)';
  end if;
end $$;

alter table public.cold_chain_boxes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cold_chain_boxes' and policyname = 'cold_chain_boxes_rider_select'
  ) then
    execute 'create policy cold_chain_boxes_rider_select on public.cold_chain_boxes for select using (rider_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cold_chain_boxes' and policyname = 'cold_chain_boxes_rider_insert'
  ) then
    execute 'create policy cold_chain_boxes_rider_insert on public.cold_chain_boxes for insert with check (rider_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cold_chain_boxes' and policyname = 'cold_chain_boxes_rider_update'
  ) then
    execute 'create policy cold_chain_boxes_rider_update on public.cold_chain_boxes for update using (rider_id = auth.uid()) with check (rider_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'cold_chain_boxes' and policyname = 'cold_chain_boxes_rider_delete'
  ) then
    execute 'create policy cold_chain_boxes_rider_delete on public.cold_chain_boxes for delete using (rider_id = auth.uid())';
  end if;
end $$;

create table if not exists public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  owner_role text not null check (owner_role in ('rider','hospital')),
  doc_type text not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  status text not null default 'pending_review',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'compliance_documents_owner_idx'
  ) then
    execute 'create index compliance_documents_owner_idx on public.compliance_documents (owner_id, owner_role, created_at desc)';
  end if;
end $$;

alter table public.compliance_documents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'compliance_documents' and policyname = 'compliance_documents_owner_select'
  ) then
    execute 'create policy compliance_documents_owner_select on public.compliance_documents for select using (owner_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'compliance_documents' and policyname = 'compliance_documents_owner_insert'
  ) then
    execute 'create policy compliance_documents_owner_insert on public.compliance_documents for insert with check (owner_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'compliance_documents' and policyname = 'compliance_documents_owner_update'
  ) then
    execute 'create policy compliance_documents_owner_update on public.compliance_documents for update using (owner_id = auth.uid()) with check (owner_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'compliance_documents' and policyname = 'compliance_documents_owner_delete'
  ) then
    execute 'create policy compliance_documents_owner_delete on public.compliance_documents for delete using (owner_id = auth.uid())';
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    begin
      insert into storage.buckets (id, name, public)
      values ('compliance', 'compliance', false)
      on conflict (id) do nothing;
    exception when undefined_table then
      null;
    end;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    if not exists (
      select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'compliance_objects_select'
    ) then
      execute $p$
        create policy compliance_objects_select
        on storage.objects
        for select
        using (
          bucket_id = 'compliance'
          and split_part(name, '/', 2) = auth.uid()::text
        )
      $p$;
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'compliance_objects_insert'
    ) then
      execute $p$
        create policy compliance_objects_insert
        on storage.objects
        for insert
        with check (
          bucket_id = 'compliance'
          and split_part(name, '/', 2) = auth.uid()::text
        )
      $p$;
    end if;
    if not exists (
      select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'compliance_objects_delete'
    ) then
      execute $p$
        create policy compliance_objects_delete
        on storage.objects
        for delete
        using (
          bucket_id = 'compliance'
          and split_part(name, '/', 2) = auth.uid()::text
        )
      $p$;
    end if;
  end if;
end $$;

create or replace function public.set_request_emergency(p_request_id uuid, p_is_emergency boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  actor_role text;
  allowed boolean := false;
  br record;
begin
  if uid is null then
    return json_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select u.role into actor_role from public.users u where u.id = uid;
  if actor_role is null then
    return json_build_object('ok', false, 'reason', 'unknown_role');
  end if;

  select * into br from public.blood_requests where id = p_request_id;
  if not found then
    return json_build_object('ok', false, 'reason', 'not_found');
  end if;

  if actor_role = 'hospital' then
    allowed := exists (
      select 1
      from public.hospital_request_inbox hri
      where hri.request_id = p_request_id
        and hri.hospital_id = uid
        and hri.status = 'accepted'
    ) or (br.hospital_id = uid);
  elsif actor_role = 'rider' then
    allowed := exists (
      select 1
      from public.deliveries d
      where d.request_id = p_request_id
        and d.rider_id = uid
        and d.status in ('assigned','dispatched','in_transit')
    );
  elsif actor_role = 'patient' then
    allowed := (br.patient_id = uid);
  else
    allowed := false;
  end if;

  if not allowed then
    return json_build_object('ok', false, 'reason', 'not_allowed');
  end if;

  update public.blood_requests
    set is_emergency = coalesce(p_is_emergency, false),
        emergency_activated_at = case when coalesce(p_is_emergency, false) then now() else null end,
        emergency_activated_by = case when coalesce(p_is_emergency, false) then uid else null end
  where id = p_request_id;

  return json_build_object('ok', true, 'request_id', p_request_id, 'is_emergency', coalesce(p_is_emergency, false));
end;
$$;

grant execute on function public.set_request_emergency(uuid, boolean) to authenticated;

