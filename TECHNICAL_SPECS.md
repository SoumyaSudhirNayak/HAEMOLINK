# Technical Specifications & Requirements

## 💻 Technical Stack

### Core Framework
-   **Language**: TypeScript (v5.6.3)
-   **Runtime**: Node.js (v18+ recommended)
-   **Frontend Library**: React (v18.3.1)
-   **Build Tool**: Vite (v5.4.8)

### Styling & UI
-   **CSS Framework**: Tailwind CSS (v3.4.13)
-   **Component Primitives**: Radix UI (via shadcn/ui)
-   **Icons**: Lucide React
-   **Maps**: Leaflet / React Leaflet
-   **Charts**: Recharts

### Backend & Data
-   **Platform**: Supabase
-   **Database**: PostgreSQL
-   **Authentication**: Supabase Auth
-   **Storage**: Supabase Storage
-   **Real-time**: Supabase Realtime Channels

## 📦 Key Dependencies

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `@supabase/supabase-js` | `^2.49.8` | Supabase client SDK |
| `react-hook-form` | `^7.69.0` | Form handling and validation |
| `leaflet` / `react-leaflet` | `^1.9.4` / `^4.2.1` | Interactive maps |
| `html5-qrcode` | `^2.3.8` | QR code scanning capabilities |
| `dayjs` | `^1.11.13` | Date and time manipulation |
| `sonner` | `^2.0.3` | Toast notifications |
| `recharts` | `^2.15.2` | Data visualization charts |

## ⚙️ System Requirements

### Development Environment
-   **OS**: Windows, macOS, or Linux
-   **Node.js**: Version 18.0.0 or higher
-   **Package Manager**: npm (v9+) or yarn/pnpm

### Browser Compatibility
-   **Chrome/Edge**: Latest 2 versions
-   **Firefox**: Latest 2 versions
-   **Safari**: Latest 2 versions

## 🔌 API & Integration Points

### Supabase Integration
The application relies heavily on Supabase for all backend operations.

1.  **Authentication**:
    -   Email/Password login
    -   Role-based user metadata

2.  **Database Tables**:
    -   `users`: Stores profile information linked to auth.users
    -   `hospital_inventory`: Tracks blood stock
    -   `blood_requests`: Manages patient/hospital requests
    -   `compliance_documents`: Stores metadata for uploaded docs

3.  **Storage Buckets**:
    -   `compliance`: Stores verification documents for hospitals and riders
    -   `avatars`: User profile pictures (optional)

4.  **Real-time Channels**:
    -   `room_inventory`: Listens for stock changes
    -   `room_orders`: Listens for new delivery requests
    -   `notifications` table (via Supabase Realtime publication): Enables in-app notifications for users/roles

### Admin API (Deno + Hono)
Some admin dashboards require cross-user data access that is blocked by RLS when using the anon key. For those pages, the frontend calls an admin-only API server that uses the Supabase service role key.

**Auth Model**
- The server expects `X-Admin-Key` on every `/admin/*` request.
- The server uses `SUPABASE_SERVICE_ROLE_KEY` to read/update protected tables (bypasses RLS).

**Key Endpoints (Selected)**
- `GET /admin/health`
- `GET /admin/user-management`
- `GET /admin/inventory-blood-flow`
- `GET /admin/analytics-reports`
- `GET /admin/compliance-documents?ownerId=<uuid>&ownerRole=rider|hospital`
- `POST /admin/compliance-review` (body: `{ ownerId, ownerRole, decision: "approve"|"reject" }`)

**Frontend Config**
- `VITE_ADMIN_API_BASE_URL` points to the server (local example: `http://localhost:8000`).
- Admin UI stores the Admin API key in session storage and sends it as `X-Admin-Key`.

## 🚀 Setup Checklist

1.  [ ] Install Node.js & npm
2.  [ ] Clone repository
3.  [ ] Run `npm install` in `FIGMA_UI`
4.  [ ] Set up Supabase project
5.  [ ] Run database migrations (SQL files in `supabase/migrations`)
6.  [ ] Configure `.env` with Supabase keys
7.  [ ] Create `compliance` bucket in Supabase Storage
8.  [ ] Start development server with `npm run dev`

## 🔐 Security Model (RLS + RPC)
The database uses Row Level Security (RLS) heavily, especially on profile tables:
-   `donor_profiles`, `hospital_profiles`, `patient_profiles`, `rider_profiles` are typically restricted to `user_id = auth.uid()`.
-   For cross-user workflows (broadcasting, acceptance, delivery flows, notifications), the backend exposes carefully-scoped RPC functions using `security definer`.

## 🔁 Global Auto-Refresh (Frontend)
The frontend implements a single global “soft refresh” tick that triggers data re-fetches without:
-   page reload
-   navigation changes
-   per-page polling timers

Implementation details:
-   `FIGMA_UI/context/AutoRefreshContext.tsx` exposes `refreshTick` and increments it every ~8 seconds via `setInterval` (with cleanup).
-   `FIGMA_UI/App.tsx` wraps the entire application once using `<AutoRefreshProvider>`.
-   Existing data-fetching effects opt into refresh by adding `refreshTick` as a dependency while keeping fetch logic unchanged.

## 🧩 Key RPC Functions (Selected)
### Public / Anonymous Safe
-   `get_landing_impact_stats() -> json`
    -   Returns only aggregate counts for landing page stats (donors, hospitals, total requests, fulfilled).
    -   Designed to be callable by `anon` without exposing row-level data.

### Authenticated Workflows
-   `pickup_inventory_unit(p_unit_id uuid, p_rider_id uuid) -> json`
    -   Hospital inventory pickup flow for riders.
    -   Recent refinement: resolved PL/pgSQL record/alias collision errors that caused 500s.
-   `emit_notification(p_user_id uuid, p_role text, p_title text, p_message text, p_event_type text, p_entity_id uuid) -> void`
    -   Inserts a notification row; `notifications` is added to the realtime publication for push updates.
-   `verify_delivery_otp(p_delivery_id uuid, p_otp text) -> json`
    -   Verifies OTP and transitions delivery/request state.

## ☁️ Deployment Notes (Frontend)
### Vercel (Vite)
-   **Root Directory**: `FIGMA_UI`
-   **Build Command**: `npm run build`
-   **Output**: `dist`
-   **Required Env Vars**:
    -   `VITE_SUPABASE_URL`
    -   `VITE_SUPABASE_ANON_KEY`
    -   `VITE_COMPLIANCE_BUCKET` (optional)
    -   `VITE_ADMIN_API_BASE_URL` (required for admin dashboards that use the Admin API)

## 🗃️ Deployment Notes (Backend)
-   Apply SQL migrations under `supabase/migrations/` to keep schema/RPCs in sync with the frontend.
-   When adding/modifying `security definer` RPCs, ensure the correct `grant execute ... to anon/authenticated` is applied as intended.

### Admin API Server (Deno)
The Admin API is a separate server process and must be deployed separately from Vercel (which deploys the frontend).

**Server Env Vars**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_API_KEY`
- `COMPLIANCE_BUCKET` (optional; defaults to `compliance`)
