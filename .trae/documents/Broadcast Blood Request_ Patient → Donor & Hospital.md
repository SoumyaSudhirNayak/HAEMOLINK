## Overview

Implement a backend-first broadcast and acceptance flow with geo + blood-group matching. No UI changes. Use inbox tables and realtime to surface to donor/hospital dashboards. Make acceptance atomic and race-safe.

## Data Model (Safe Additions)

* `blood_requests` (existing): add if missing

  * `accepted_by_type text` ('donor' | 'hospital')

  * `accepted_by_id uuid`

  * `accepted_at timestamptz`

  * Status values: `open` → `accepted` (keep existing values compatible, also accept `pending` during migration window)

* `donor_request_inbox` (existing): ensure RLS

  * Policies: donor can `select`/`update` where `donor_id = auth.uid()`

* `hospital_request_inbox` (new): `id uuid pk`, `request_id uuid`, `hospital_id uuid`, `status text`, `created_at timestamptz`

  * RLS: hospital can `select`/`update` where `hospital_id = auth.uid()`

* Location fields (confirm/add safely):

  * `donor_profiles(latitude numeric, longitude numeric)` if missing

  * `hospital_profiles(latitude numeric, longitude numeric)` if missing

* Donor availability: use existing `donor_availability.available = true` and `donor_availability.radius_km` (fallback default radius if absent)

## Geo Utilities (SQL)

* Create a SQL function `haversine_km(lat1, lon1, lat2, lon2)` returning distance in km.

* Centralize default radii:

  * Donor match: use `donor_availability.radius_km` if present else default 10–20 km (config constant 15 km).

  * Hospital match: default 20 km.

## Broadcast Matching (Backend)

* Create `broadcast_blood_request(p_request_id uuid)` as `SECURITY DEFINER` RPC:

  * Validate the caller owns the request: `select patient_id = auth.uid()`.

  * Read request `blood_group, latitude, longitude`.

  * Donor match query (ALL conditions):

    * `donor_profiles.blood_group = request.blood_group`

    * `donor_availability.available = true`

    * Distance within radius: `haversine_km(request.lat, request.lon, donor.lat, donor.lon) <= donor_radius`

  * Insert one row per matched donor into `donor_request_inbox` with `status = 'pending'`.

  * Hospital match query (ALL conditions):

    * `hospital_profiles.is_active = true`

    * Distance within radius (use hospital default radius)

  * Insert one row per matched hospital into `hospital_request_inbox` with `status = 'pending'`.

  * Return counts: `{ donors_broadcasted, hospitals_broadcasted }`.

* Call this RPC immediately after the patient request insert (existing creation flow), replacing any client-side inbox inserts; server-side function bypasses RLS safely and keeps logic centralized.

## Acceptance (Atomic & Race-Safe)

* Create `accept_blood_request(p_request_id uuid, p_actor_type text)` as `SECURITY DEFINER` RPC:

  * `p_actor_type in ('donor','hospital')`; `p_actor_id := auth.uid()`.

  * Begin transaction:

    1. `select * from blood_requests where id = p_request_id for update`.
    2. If `status != 'open'` (or not in allowed set) → return `{accepted:false, reason:'already accepted'}`.
    3. Update `blood_requests` → `status='accepted', accepted_by_type=p_actor_type, accepted_by_id=p_actor_id, accepted_at=now()`.
    4. Update accepted inbox:

       * If donor: `update donor_request_inbox set status='accepted' where request_id=p_request_id and donor_id=p_actor_id`.

       * If hospital: `update hospital_request_inbox set status='accepted' where request_id=p_request_id and hospital_id=p_actor_id`.
    5. Expire all other inbox rows:

       * `update donor_request_inbox set status='expired' where request_id=p_request_id and donor_id != p_actor_id and status='pending'`.

       * `update hospital_request_inbox set status='expired' where request_id=p_request_id and hospital_id != p_actor_id and status='pending'`.

  * Commit and return `{accepted:true}`.

* Rejection:

  * `reject_inbox_entry(p_inbox_id uuid)` RPC that validates ownership (donor/hospital via `auth.uid()`), updates inbox `status='rejected'`. Request remains `open` unless someone accepts.

## Realtime Wiring (No UI Changes)

* Donor dashboard: already uses `donor_request_inbox` subscription; ensure it filters `status='pending'` and joins `blood_requests`.

* Hospital dashboard: subscribe to `hospital_request_inbox` similarly; filter `status='pending'` and join `blood_requests`.

* Also subscribe to `blood_requests` updates:

  * When status becomes `accepted`, remove from donor/hospital lists immediately.

## RLS Policies (Mandatory)

* `donor_request_inbox`: donors can `select`/`update` rows where `donor_id = auth.uid()`; `insert` restricted to RPC function only.

* `hospital_request_inbox`: hospitals can `select`/`update` rows where `hospital_id = auth.uid()`; `insert` restricted to RPC function only.

* `blood_requests`:

  * Patients: existing self policies for CRUD on their own requests.

  * Donor/Hospital: no direct update; acceptance via RPC only.

## Integration Points (Backend-Only)

* Patient creation service (`createPatientBloodRequest`):

  * After insert, call `rpc('broadcast_blood_request', { p_request_id: newRequest.id })`.

* Donor accept/reject UI actions: switch to RPC calls:

  * Accept: `rpc('accept_blood_request', { p_request_id, p_actor_type:'donor' })`.

  * Reject: `rpc('reject_inbox_entry', { p_inbox_id })`.

* Hospital accept/reject actions: same RPC with `p_actor_type:'hospital'`.

## Defensive Checks

* Null/invalid lat/lon: skip geo filtering for that entity and do not broadcast to it.

* Blood group missing on patient: abort with error.

* Duplicate inbox protection: `insert ... on conflict do nothing` on `(request_id, donor_id)` and `(request_id, hospital_id)`.

* Optional throttling: limit max recipients per request to prevent accidental fan-out.

## Testing Plan

* Seed two donors and one hospital near the patient; one donor far away.

* Create a request with patient location and blood group.

* Verify RPC broadcast returns correct counts; donor/hospital inbox rows created only for matched entities.

* Accept as donor → verify request `accepted`, other inbox rows expired; realtime removes cards elsewhere.

* Try race: accept the same request from hospital after donor accepted → RPC returns `accepted:false`; no state corruption.

* Reject from one donor → entry marked `rejected`; request remains visible to others.

## Rollout Steps

1. Apply migrations (columns + `hospital_request_inbox` + RLS + distance function).
2. Deploy RPC functions with `SECURITY DEFINER` and restricted `search_path`.
3. Update patient creation service to call broadcast RPC.
4. Update donor/hospital accept/reject actions to call RPC.
5. Validate realtime flows in dev; then enable in prod.

## Success Criteria

* Patient never selects hospital.

* Donors see requests only when blood group and distance match.

* Hospitals receive nearby requests.

* First acceptance wins and expires all others.

* No demo data; no UI changes.

