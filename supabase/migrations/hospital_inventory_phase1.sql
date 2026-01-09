create table if not exists public.hospital_inventory_batches (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references public.users(id) on delete cascade,
  batch_name text,
  total_units integer,
  uploaded_at timestamptz default now()
);

create table if not exists public.hospital_inventory_units (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references public.users(id) on delete cascade,
  blood_group text not null,
  component_type text not null,
  collection_date date not null,
  expiry_date date not null,
  storage_condition text,
  donor_name text,
  patient_name text,
  batch_id uuid null references public.hospital_inventory_batches(id) on delete set null,
  status text check (status in ('available','reserved','picked_up','expired')) default 'available',
  qr_hash text unique not null,
  qr_payload jsonb not null,
  created_at timestamptz default now()
);

create index if not exists hospital_inventory_units_hospital_id_idx on public.hospital_inventory_units (hospital_id);
create index if not exists hospital_inventory_units_status_idx on public.hospital_inventory_units (status);
create index if not exists hospital_inventory_units_expiry_date_idx on public.hospital_inventory_units (expiry_date);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_unit_id uuid references public.hospital_inventory_units(id) on delete cascade,
  action text check (action in ('added','picked_up','expired')),
  performed_by uuid,
  performed_role text,
  created_at timestamptz default now()
);

create index if not exists inventory_movements_inventory_unit_id_idx on public.inventory_movements (inventory_unit_id);

alter table public.hospital_inventory_batches enable row level security;
alter table public.hospital_inventory_units enable row level security;
alter table public.inventory_movements enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'hospital_inventory_batches' and policyname = 'hib_hospital_select'
  ) then
    execute 'create policy hib_hospital_select on public.hospital_inventory_batches for select using (hospital_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'hospital_inventory_batches' and policyname = 'hib_hospital_insert'
  ) then
    execute 'create policy hib_hospital_insert on public.hospital_inventory_batches for insert with check (hospital_id = auth.uid())';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'hospital_inventory_units' and policyname = 'hi_units_hospital_select'
  ) then
    execute 'create policy hi_units_hospital_select on public.hospital_inventory_units for select using (hospital_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'hospital_inventory_units' and policyname = 'hi_units_hospital_insert'
  ) then
    execute 'create policy hi_units_hospital_insert on public.hospital_inventory_units for insert with check (hospital_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'hospital_inventory_units' and policyname = 'hi_units_hospital_update'
  ) then
    execute 'create policy hi_units_hospital_update on public.hospital_inventory_units for update using (hospital_id = auth.uid()) with check (hospital_id = auth.uid())';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'hospital_inventory_units' and policyname = 'hi_units_rider_select'
  ) then
    execute $p$
      create policy hi_units_rider_select
      on public.hospital_inventory_units
      for select
      using (
        exists (
          select 1
          from public.deliveries d
          where d.rider_id = auth.uid()
            and d.hospital_id = hospital_inventory_units.hospital_id
            and d.status in ('assigned','in_transit')
        )
      )
    $p$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'hospital_inventory_units' and policyname = 'hi_units_rider_update'
  ) then
    execute $p$
      create policy hi_units_rider_update
      on public.hospital_inventory_units
      for update
      using (
        exists (
          select 1
          from public.deliveries d
          where d.rider_id = auth.uid()
            and d.hospital_id = hospital_inventory_units.hospital_id
            and d.status in ('assigned','in_transit')
        )
      )
      with check (
        exists (
          select 1
          from public.deliveries d
          where d.rider_id = auth.uid()
            and d.hospital_id = hospital_inventory_units.hospital_id
            and d.status in ('assigned','in_transit')
        )
      )
    $p$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'inventory_movements' and policyname = 'inv_mov_hospital_select'
  ) then
    execute $p$
      create policy inv_mov_hospital_select
      on public.inventory_movements
      for select
      using (
        exists (
          select 1
          from public.hospital_inventory_units u
          where u.id = inventory_movements.inventory_unit_id
            and u.hospital_id = auth.uid()
        )
      )
    $p$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'inventory_movements' and policyname = 'inv_mov_hospital_insert'
  ) then
    execute $p$
      create policy inv_mov_hospital_insert
      on public.inventory_movements
      for insert
      with check (
        exists (
          select 1
          from public.hospital_inventory_units u
          where u.id = inventory_movements.inventory_unit_id
            and u.hospital_id = auth.uid()
        )
      )
    $p$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'inventory_movements' and policyname = 'inv_mov_rider_insert'
  ) then
    execute $p$
      create policy inv_mov_rider_insert
      on public.inventory_movements
      for insert
      with check (
        performed_by = auth.uid()
        and exists (
          select 1
          from public.hospital_inventory_units u
          join public.deliveries d on d.hospital_id = u.hospital_id
          where u.id = inventory_movements.inventory_unit_id
            and d.rider_id = auth.uid()
            and d.status in ('assigned','in_transit')
        )
      )
    $p$;
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'inventory_movements' and policyname = 'inv_mov_rider_select'
  ) then
    execute $p$
      create policy inv_mov_rider_select
      on public.inventory_movements
      for select
      using (
        exists (
          select 1
          from public.hospital_inventory_units u
          join public.deliveries d on d.hospital_id = u.hospital_id
          where u.id = inventory_movements.inventory_unit_id
            and d.rider_id = auth.uid()
            and d.status in ('assigned','in_transit')
        )
      )
    $p$;
  end if;
end $$;

create or replace function public.add_inventory_unit_from_qr(
  p_qr_hash text,
  p_payload jsonb,
  p_batch_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  unit_id uuid;
  inserted boolean := false;
  blood_group text;
  component_type text;
  collection_date date;
  expiry_date date;
  storage_condition text;
  donor_name text;
  patient_name text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  blood_group := nullif(trim(both from (p_payload->>'blood_group')), '');
  component_type := nullif(trim(both from (p_payload->>'component_type')), '');
  collection_date := nullif(p_payload->>'collection_date','')::date;
  expiry_date := nullif(p_payload->>'expiry_date','')::date;
  storage_condition := nullif(trim(both from (p_payload->>'storage')), '');
  donor_name := nullif(trim(both from (p_payload->>'donor_name')), '');
  patient_name := nullif(trim(both from (p_payload->>'patient_name')), '');

  if blood_group is null or component_type is null or collection_date is null or expiry_date is null then
    raise exception 'invalid_qr_payload';
  end if;

  insert into public.hospital_inventory_units (
    hospital_id,
    blood_group,
    component_type,
    collection_date,
    expiry_date,
    storage_condition,
    donor_name,
    patient_name,
    batch_id,
    status,
    qr_hash,
    qr_payload
  )
  values (
    uid,
    blood_group,
    component_type,
    collection_date,
    expiry_date,
    storage_condition,
    donor_name,
    patient_name,
    p_batch_id,
    'available',
    p_qr_hash,
    p_payload
  )
  on conflict (qr_hash) do nothing
  returning id into unit_id;

  if unit_id is not null then
    inserted := true;
    insert into public.inventory_movements (inventory_unit_id, action, performed_by, performed_role)
    values (unit_id, 'added', uid, 'hospital');
    return json_build_object('id', unit_id, 'inserted', true);
  end if;

  select u.id into unit_id
  from public.hospital_inventory_units u
  where u.qr_hash = p_qr_hash;

  return json_build_object('id', unit_id, 'inserted', false);
end;
$$;

grant execute on function public.add_inventory_unit_from_qr(text, jsonb, uuid) to authenticated;

create or replace function public.pickup_inventory_unit(
  p_unit_id uuid,
  p_rider_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  u record;
  delivery_row record;
  blood_request_row record;
begin
  if uid is null or uid <> p_rider_id then
    raise exception 'not_authorized';
  end if;

  select * into u
  from public.hospital_inventory_units
  where id = p_unit_id
  for update;

  if not found then
    raise exception 'unit_not_found';
  end if;

  if u.status not in ('available','reserved') then
    raise exception 'unit_not_available';
  end if;

  if not exists (
    select 1
    from public.deliveries dv
    where dv.rider_id = uid
      and dv.hospital_id = u.hospital_id
      and dv.status in ('assigned','in_transit')
  ) then
    raise exception 'no_active_assignment';
  end if;

  update public.hospital_inventory_units
  set status = 'picked_up'
  where id = p_unit_id;

  insert into public.inventory_movements (inventory_unit_id, action, performed_by, performed_role)
  values (p_unit_id, 'picked_up', uid, 'rider');

  select * into delivery_row
  from public.deliveries dv
  where dv.rider_id = uid
    and dv.hospital_id = u.hospital_id
    and dv.status in ('assigned','in_transit')
  order by dv.created_at desc
  limit 1;

  if found then
    select * into blood_request_row
    from public.blood_requests brq
    where brq.id = delivery_row.request_id;
    if found then
      if blood_request_row.patient_id is not null then
        perform public.emit_notification(
          blood_request_row.patient_id,
          'patient',
          '📦 Blood Picked Up',
          'The rider has picked up the blood and is on the way.',
          'pickup_verified',
          blood_request_row.id
        );
      end if;
      if u.hospital_id is not null then
        perform public.emit_notification(
          u.hospital_id,
          'hospital',
          '📦 Blood Picked Up',
          'The rider has verified pickup of the blood unit.',
          'pickup_verified',
          blood_request_row.id
        );
      end if;
    end if;
  end if;

  return json_build_object('picked_up', true, 'unit_id', p_unit_id);
end;
$$;

grant execute on function public.pickup_inventory_unit(uuid, uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'hospital_inventory_units'
  ) then
    execute 'alter publication supabase_realtime add table public.hospital_inventory_units';
  end if;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inventory_movements'
  ) then
    execute 'alter publication supabase_realtime add table public.inventory_movements';
  end if;
end $$;
