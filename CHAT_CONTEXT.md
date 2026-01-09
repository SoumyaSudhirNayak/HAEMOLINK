# Project History & Codebase Context: Haemolink

## 1. Project Identity
**Haemolink** is a centralized blood management ecosystem designed to bridge the gap between **Donors**, **Hospitals**, **Patients**, and **Riders** (logistics). The system aims to optimize blood availability, streamline delivery via cold-chain logistics, and ensure compliance and safety in real-time.

## 2. Development Timeline & Roadmap

This document reconstructs the entire development history of the project, from initial scaffolding to the most recent critical fixes.

### Phase 1: Foundation & Authentication (Initial Setup)
**Goal:** Establish the secure entry points for the four distinct user roles.
-   **Tech Stack Setup:** Initialized React (Vite) + Tailwind CSS + Supabase.
-   **Authentication Architecture (`auth_step1.sql`):**
    -   Implemented Supabase Auth for handling sign-ups/logins.
    -   Created a unified `users` table linked to `auth.users` to store profile metadata.
    -   **Role-Based Routing:** Developed logic to route users to specific dashboards (`/donor`, `/hospital`, `/rider`, `/patient`) based on their role.
    -   **UI Components:** Built login/signup forms in `components/auth/` (`DonorAuth`, `HospitalAuth`, etc.).

### Phase 2: Core Data Modules (POV Implementation)
**Goal:** Build the primary interfaces and data structures for each user type.
-   **Patient POV (`patient_pov_phase1.sql`):**
    -   Created `BloodRequestView` for patients to raise emergency blood requests.
    -   Implemented request tracking and status updates.
-   **Hospital POV (`hospital_pov_phase1.sql` & `hospital_inventory_phase1.sql`):**
    -   **Inventory System:** Designed the `hospital_inventory` table to track blood units, groups, and expiry.
    -   **Dashboard:** Built `HospitalOverviewView` to display critical stock levels.
    -   **Batch Operations:** Added CSV/JSON parsing for bulk inventory uploads.
-   **Donor POV (`donor_pov_phase1.sql`):**
    -   **Eligibility:** Created questionnaires to screen donors.
    -   **Camps (`camps_drives_phase1.sql`):** Added functionality to view and register for donation drives.

### Phase 3: Connective Tissue (Broadcasting & Matching)
**Goal:** Connect the demand (Patients/Hospitals) with supply (Donors/Inventory).
-   **Broadcast System (`blood_requests_broadcast_phase1.sql`, `broadcast_phase2.sql`):**
    -   Implemented logic to "broadcast" a blood request to nearby compatible donors and hospitals.
    -   **Real-time:** Leveraged Supabase Realtime to push notifications to active users.
-   **Search & Matching (`search_matching_phase3.sql`):**
    -   Developed algorithms to find the nearest matching blood units based on geo-coordinates and blood group compatibility.

### Phase 4: Logistics & Compliance
**Goal:** Ensure safe transport and regulatory adherence.
-   **Rider Logistics (`rider_pov_phase1.sql`):**
    -   **Job Assignment:** System to assign delivery tasks to riders.
    -   **Cold Chain (`cold_chain_emergency_compliance_phase1.sql`):** Created forms and validation for temperature maintenance during transport.
-   **Compliance & Safety:**
    -   **Document Uploads:** Interfaces for Hospitals and Riders to upload licenses/certifications.
    -   **Emergency Mode:** Protocols for high-priority overrides.

### Phase 5: Advanced Features (Cohorts & Rewards)
**Goal:** Improve retention and user experience.
-   **Cohort System (`cohort_transfusion_phase4.sql`):** Grouping mechanisms for analyzing donor/patient demographics.
-   **Gamification (`cohort_transfusion_phase5_...sql`):**
    -   Added rewards and badges for frequent donors.
    -   Implemented email notification triggers for cohort updates.

### Phase 6: Recent Critical Refinements (Current Session)
**Goal:** Fix architectural bugs and wire up advanced visualizations.
-   **Storage Architecture Fix ("Bucket not found"):**
    -   **Issue:** Frontend was attempting to create storage buckets dynamically, which failed due to permission issues with anonymous keys.
    -   **Fix:** Centralized bucket configuration in `client.ts` (`COMPLIANCE_BUCKET`). Removed frontend creation logic in favor of backend RLS policies and pre-existing buckets.
-   **Hospital Dashboard Wiring:**
    -   **Real-time Inventory:** Connected `StockDashboardView` and `HospitalOverviewView` to live Supabase channels (`room_inventory`).
    -   **Expiry Alerts:** Implemented logic to calculate and flag near-expiry blood units in the UI.
-   **Rider Geolocation:**
    -   **Heatmaps:** Integrated `react-leaflet` in `RiderOverviewView` to visualize active deliveries as heat points.
    -   **Live Tracking:** Wired `activeDeliveries` state to map markers for real-time location context.

## 3. Architecture Overview

### Frontend
-   **Framework:** React 18 (Vite)
-   **State Management:** React Hooks (`useState`, `useEffect`, `useContext`) + Supabase Realtime subscriptions.
-   **UI Library:** shadcn/ui (Radix UI) + Tailwind CSS.
-   **Maps:** Leaflet for geospatial visualization.

### Backend (Supabase)
-   **Database:** PostgreSQL with PostGIS extensions (for geo-queries).
-   **Auth:** Native Supabase Auth handling JWTs and Row Level Security (RLS).
-   **Storage:** Managed buckets (`compliance`, `avatars`) with RLS policies restricting access to owners.
-   **Logic:** Heavily reliant on SQL functions (RPCs) for complex matching and broadcasting logic to keep the frontend lightweight.

## 4. Current Status
The application is a functional prototype with:
-   ✅ Full authentication flows.
-   ✅ Real-time dashboards for all 4 roles.
-   ✅ Operational inventory management with live updates.
-   ✅ Logistics tracking with mapping integration.
-   ✅ Secure document upload pipelines.

The codebase is currently stable, with recent fixes resolving blocking errors in the document upload and data visualization modules.

## 5. Chat Session Log (Dec 2025)
This section is an appended log of the chat and changes from this session (kept separate so the above history remains intact).

### 5.0 GLOBAL AUTO-REFRESH (ALL PAGES)
-   **Goal:** Implement a single reusable soft-refresh mechanism across the entire app (no reload, no route reset, no per-page polling timers).
-   **Implementation:**
    -   Added `FIGMA_UI/context/AutoRefreshContext.tsx` with a `refreshTick` counter that increments every 8 seconds via `setInterval`, with cleanup on unmount.
    -   Wrapped the full app once with `<AutoRefreshProvider>` in `FIGMA_UI/App.tsx`.
    -   Updated existing data-fetching effects across Patient/Donor/Hospital/Rider dashboards to depend on `refreshTick` so they silently re-fetch without changing business logic.
-   **Result:** All authenticated pages refresh their data automatically while the user stays on the same view (no flicker-inducing navigation or full reload).

### 5.1 Rider Pickup / OTP 500 Fixes
-   **Issue:** Rider pickup RPC was failing with `record "d" is not assigned yet` and later `record "br" is not assigned yet`, causing `500 (Internal Server Error)` on `rpc/pickup_inventory_unit`.
-   **Fix:** Updated the PL/pgSQL function in `supabase/migrations/hospital_inventory_phase1.sql` by removing record-vs-alias collisions (renamed variables and aliases).
-   **Outcome:** `pickup_inventory_unit(...)` no longer crashes due to unassigned record variables.

### 5.2 Rider New Assignment Notifications and other browser notifications
-   **Request:** Add rider banner/notification when a new pending assignment is available.
-   **Fix:** Added notification emission via `emit_notification(...)` inside rider broadcast flows in `supabase/migrations/broadcast_phase2.sql`.
-   **Outcome:** Riders receive real-time notifications for newly broadcast delivery assignments.

### 5.3 Landing Page: Real Stats + Remove Demo Content
-   **Request:** Replace demo stats with real database counts and update contact text branding to `team Kryptos`.
-   **Fix:** Landing page stat cards were wired to Supabase-backed counts; contact demo values were replaced.
-   **Outcome:** Landing page uses real stats and shows `team Kryptos` in the contact section.

### 5.4 Landing Page Stats Showing 0 (RLS)
-   **Issue:** Landing stats showed `0` even though donors/hospitals existed.
-   **Root Cause:** Row Level Security (RLS) policies allow profile selects only for the logged-in user (`user_id = auth.uid()`), so anonymous landing-page queries return no rows.
-   **Fix:** Introduced a public (anon-safe) aggregated RPC `get_landing_impact_stats()` (security definer) and switched landing pages to use it.
-   **Outcome:** Anonymous landing page can show real aggregate counts without exposing rows.

### 5.5 Documentation Updates
-   Updated `CHAT_CONTEXT.md` by appending this session log while preserving the existing project history.
-   Updated `README.md` with newly implemented features and local + Vercel deployment workflow.
-   Updated `TECHNICAL_SPECS.md` with the current RLS/RPC model and key RPC references.

### 5.6 Admin UI: Supabase Integration + RLS-Safe Admin API
-   **Issue:** Several admin dashboard pages showed `0` rows even when data existed (RLS blocked anon access).
-   **Fix:** Introduced an Admin API layer (Deno + Hono) that uses the Supabase service role key to bypass RLS safely for admin-only data aggregation.
-   **Frontend Integration:** Admin pages call the Admin API using `adminApi(...)` with `VITE_ADMIN_API_BASE_URL` + an `ADMIN_API_KEY` header.

### 5.7 Compliance Review (Admin ↔ Storage ↔ Portals)
-   **Goal:** Make the admin “Review” button show real uploaded documents and allow approve/reject.
-   **Implementation:**
    -   Hospitals and riders upload documents into the `compliance` bucket and insert metadata into `compliance_documents`.
    -   Admin UI loads those documents via Admin API signed URLs and shows previews.
    -   Admin approve/reject updates `compliance_documents.status` and updates the role profile status (`rider_profiles.verification_status` / `hospital_profiles.verification_status`).
-   **Outcome:** Hospital and rider compliance tabs reflect decisions automatically because they read `compliance_documents.status`.
