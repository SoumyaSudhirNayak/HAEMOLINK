# Haemolink Prototype - Web Codebase

## Overview
Haemolink is a comprehensive blood management system connecting Donors, Hospitals, Patients, and Riders. This repository contains the frontend prototype built with React, Vite, and Tailwind CSS, integrated with Supabase for backend services (Auth, Database, Storage, Real-time).

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **Supabase Account** (for backend services)

### Installation
1.  **Clone the repository** (if applicable) or navigate to the project directory:
    ```bash
    cd FIGMA_UI
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    Create a `.env` file in the `FIGMA_UI` directory with your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_COMPLIANCE_BUCKET=compliance  # Optional, defaults to 'compliance'
    ```

### Running the Application
- **Development Server**:
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:5173`.

- **Build for Production**:
    ```bash
    npm run build
    ```

- **Preview Production Build**:
    ```bash
    npm run preview
    ```

## 📂 Project Structure

The codebase is organized into the following key directories within `FIGMA_UI`:

### `components/`
Contains all React components, organized by feature.

-   **`auth/`**: Authentication forms for different user roles (Donor, Hospital, Patient, Rider).
    -   `AuthFlowDemo.tsx`: Main entry point for the auth demonstration.
    -   `*Auth.tsx`: Role-specific login/signup forms.

-   **`dashboard/`**: The core application logic, separated by user role.
    -   **`donor/`**: Donor-specific views (History, Schedule Donation, Rewards, etc.).
    -   **`hospital/`**: Hospital management views.
        -   `HospitalOverviewView.tsx`: Main dashboard with inventory metrics.
        -   `StockDashboardView.tsx`: Real-time stock levels and expiry alerts.
        -   `ComplianceView.tsx`: Document upload and verification.
        -   `InventoryView.tsx`: Detailed inventory management.
    -   **`rider/`**: Logistics and delivery management.
        -   `RiderOverviewView.tsx`: Dashboard with tasks and heatmap.
        -   `RiderComplianceView.tsx`: Rider document verification.
    -   **`views/`**: Shared views accessible by multiple roles (e.g., Profile, Settings).

-   **`ui/`**: Reusable UI components (Buttons, Inputs, Cards, etc.) built with Radix UI and Tailwind (shadcn/ui).

### `services/`
-   `auth.ts`: Authentication service wrappers.
-   `patientRequests.ts`: Functions for handling blood requests.

### `supabase/`
-   `client.ts`: Supabase client initialization and configuration.
-   `migrations/` (in root): SQL files for setting up the database schema and RLS policies.

### `utils/`
-   `geo.ts`: Geolocation helper functions.

## 🛠️ Key Features & Modules

### 1. Authentication
-   Role-based access control (Donor, Hospital, Patient, Rider).
-   Supabase Auth integration.

### 2. Hospital Management
-   **Inventory Tracking**: Real-time updates of blood stock.
-   **Compliance**: Document upload system for verification.
-   **Emergency Mode**: Quick access to critical protocols.

### 3. Rider Logistics
-   **Heatmaps**: Visualization of high-demand areas and active pickups.
-   **Route Optimization**: Integration with mapping tools (Leaflet).
-   **Cold Chain Compliance**: Verification of transport conditions.

### 4. Donor Engagement
-   **Scheduling**: Appointment booking for blood donation.
-   **Rewards**: Gamification and tracking of donation history.

## 📦 Tech Stack

-   **Frontend**: React, TypeScript, Vite
-   **Styling**: Tailwind CSS
-   **UI Library**: shadcn/ui (Radix UI)
-   **Icons**: Lucide React
-   **Maps**: Leaflet, React Leaflet
-   **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
-   **State/Data**: React Hooks, Supabase Client

## 🔧 Recent Updates
-   **Compliance Uploads**: Fixed bucket access issues in Hospital and Rider compliance views.
-   **Inventory Sync**: Enabled real-time updates for hospital stock dashboards.
-   **Rider Maps**: Integrated geolocation heatmaps for better task visualization.
 -   **Admin compliance review**: Admin can preview and approve/reject rider/hospital documents.
 -   **Admin API (Deno/Hono)**: Admin dashboard reads protected data via an admin-only backend API.

## ✅ New Features Implemented (Dec 2025)
-   **Global auto-refresh (all pages)**: One-time `AutoRefreshProvider` triggers silent re-fetch every ~8 seconds across all dashboards.
-   **Rider pickup/OTP stability**: Fixed `pickup_inventory_unit` 500 errors caused by PL/pgSQL record/alias collisions.
-   **Rider assignment notifications**: Riders receive real-time notifications when new delivery assignments are broadcast.
-   **Landing page real stats**: Landing stats are now fetched from the database (anon-safe) instead of demo numbers.
-   **Branding update**: Landing page contact section updated to `team Kryptos`.
 -   **Admin document review**: Review real files from Supabase Storage and approve/reject compliance.

## 🔄 Complete Workflow (End-to-End)
### 1) Auth + Role Onboarding
-   User signs up/logs in using Supabase Auth.
-   A `users` row and a role profile row (`patient_profiles`, `donor_profiles`, `hospital_profiles`, `rider_profiles`) represent the account and role metadata.
-   The UI routes to the role-specific dashboard.

### 2) Patient Creates a Blood Request
-   Patient submits a request into `blood_requests` (blood group, urgency, units, location).
-   The system broadcasts the request to nearby compatible donors/hospitals via server-side SQL functions.

### 3) Donor/Hospital Accepts
-   A donor or hospital accepts a broadcasted request.
-   Request acceptance updates `blood_requests` and triggers notifications to the patient.

### 4) Rider Delivery Assignment + Pickup
-   Delivery assignment is broadcast to riders; riders get a real-time notification.
-   Rider performs pickup verification and inventory pickup flows (hospital inventory units + movements).

### 5) Delivery Completion (OTP)
-   Rider completes delivery and verifies OTP (server-side validation).
-   Request/delivery status transitions to delivered/completed and notifications are emitted to relevant users.

## 🗄️ Supabase Setup (Backend)
### Apply Database Migrations
The backend schema, RLS policies, and RPC functions live under:
-   `supabase/migrations/`

Apply them using either:
-   **Supabase Dashboard** → SQL Editor: run the migration SQL files in order (phase order).
-   **Supabase CLI** (recommended for teams): link your project and push migrations.

## 🧑‍💻 Run Locally (Frontend)
From the project root:

```bash
cd FIGMA_UI
npm install
```

Create `FIGMA_UI/.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_COMPLIANCE_BUCKET=compliance
```

Start the dev server:

```bash
npm run dev
```

## 🧑‍💻 Run Locally (Admin API Server)
Admin pages use an Admin API server (Deno + Hono) to safely bypass RLS using the Supabase service role key.

### Server Environment Variables
Set these before starting the server (or in `FIGMA_UI/.env.local`, the server can auto-load it):

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_API_KEY=your_admin_api_key
COMPLIANCE_BUCKET=compliance
```

### Start Server
From `FIGMA_UI/`:

```bash
deno run --allow-net --allow-env --allow-read ./server/index.tsx
```

The server listens on `http://localhost:8000/`.

### Frontend Admin Config
The admin frontend needs:
- `VITE_ADMIN_API_BASE_URL` (example: `http://localhost:8000`)
- the matching `ADMIN_API_KEY` (entered in the admin UI settings)

Build production assets:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## ☁️ Deploy to Vercel (Frontend)
This is a Vite app; Vercel serves the `dist/` output.

### Vercel Project Settings
-   **Root Directory**: `FIGMA_UI`
-   **Install Command**: `npm install`
-   **Build Command**: `npm run build`
-   **Output Directory**: `dist`

### Environment Variables (Vercel → Project → Settings → Environment Variables)
-   `VITE_SUPABASE_URL`
-   `VITE_SUPABASE_ANON_KEY`
-   `VITE_COMPLIANCE_BUCKET` (optional; defaults to `compliance` in the app)
 -   `VITE_ADMIN_API_BASE_URL` (URL where the Admin API server is deployed)

### Deploy Steps
1. Import the repo into Vercel.
2. Set Root Directory to `FIGMA_UI`.
3. Add the environment variables.
4. Deploy.

## 🚀 Deploy Backend Changes (Supabase)
When new SQL functions/tables are added (for example, landing page stats RPC or rider workflow fixes):
-   Re-run/apply the latest migration SQL in Supabase (SQL Editor or CLI), then redeploy the frontend if needed.

## ☁️ Deploy Admin API Server (Deno)
Vercel deploys the frontend (static assets). The Admin API is a separate long-running server process, so deploy it separately (e.g., on Deno Deploy / VPS / any Node/Deno-capable host) and point `VITE_ADMIN_API_BASE_URL` to that public URL.
