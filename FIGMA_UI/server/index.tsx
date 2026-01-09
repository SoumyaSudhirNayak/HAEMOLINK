import { Hono } from "npm:hono@4.11.3";
import { cors } from "npm:hono@4.11.3/cors";
import { logger } from "npm:hono@4.11.3/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const parseEnvFile = (text: string) => {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    if (!key) continue;
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (!value) continue;
    out[key] = value;
  }
  return out;
};

const loadEnvIfMissing = async () => {
  const isDeploy =
    (Deno.env.get("DENO_DEPLOYMENT_ID") || "").trim().length > 0 ||
    (Deno.env.get("DENO_REGION") || "").trim().length > 0;
  if (isDeploy) return;

  const candidates = [
    new URL("../.env.local", import.meta.url),
    new URL("../.env", import.meta.url),
    new URL("./.env.local", import.meta.url),
    new URL("./.env", import.meta.url),
  ];

  for (const url of candidates) {
    let text: string;
    try {
      text = await Deno.readTextFile(url);
    } catch {
      continue;
    }
    const parsed = parseEnvFile(text);
    for (const [k, v] of Object.entries(parsed)) {
      const existing = (Deno.env.get(k) || "").trim();
      if (!existing) {
        try {
          Deno.env.set(k, v);
        } catch {}
      }
    }
  }
};

await loadEnvIfMissing();
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-5910385d/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/geo/reverse", async (c) => {
  const lat = Number(c.req.query("lat") || "");
  const lon = Number(c.req.query("lon") || "");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return c.json({ error: "INVALID_COORDS" }, 400);
  }
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "haemolink-app/1.0 (+contact@haemolink)" },
    });
    if (!resp.ok) {
      const status = resp.status;
      if (status >= 400 && status <= 599) {
        return c.json({ error: "REVERSE_FAILED" }, status as any);
      }
      return c.json({ error: "REVERSE_FAILED" }, 502);
    }
    const data = await resp.json();
    const address = data?.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      "";
    const state = address.state || address.state_district || "";
    const postcode = address.postcode || "";
    return c.json({ city, state, postcode });
  } catch {
    return c.json({ error: "REVERSE_ERROR" }, 500);
  }
});

const serviceClient = () => {
  const url = (Deno.env.get("SUPABASE_URL") || "").trim();
  const key = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!url) {
    throw new Error("SUPABASE_URL is not set");
  }
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  if (key.split(".").length !== 3) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is invalid");
  }
  return createClient(url, key);
};

const requireAdmin = (c: any) => {
  const expected = (Deno.env.get("ADMIN_API_KEY") || "").trim();
  const provided = (c?.req?.header("x-admin-key") || "").trim();
  if (!expected) {
    return c.json({ ok: false, error: "SERVER_NOT_CONFIGURED:ADMIN_API_KEY" }, 500);
  }
  if (!expected || !provided || provided !== expected) {
    return c.json({ ok: false, error: "UNAUTHORIZED" }, 401);
  }
  return null;
};

const requireService = (c: any) => {
  try {
    return { supabase: serviceClient(), response: null as any };
  } catch (e: any) {
    const message = typeof e?.message === "string" && e.message.trim().length > 0 ? e.message.trim() : "SUPABASE";
    return { supabase: null as any, response: c.json({ ok: false, error: `SERVER_NOT_CONFIGURED:${message}` }, 500) };
  }
};

app.get("/admin/health", (c) => {
  const unauthorized = requireAdmin(c);
  if (unauthorized) return unauthorized;
  const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").trim();
  const supabaseKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  const missingEnv: string[] = [];
  if (!supabaseUrl) missingEnv.push("SUPABASE_URL");
  if (!supabaseKey) missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
  const invalidEnv: string[] = [];
  if (supabaseKey && supabaseKey.split(".").length !== 3) invalidEnv.push("SUPABASE_SERVICE_ROLE_KEY");
  return c.json({
    ok: true,
    supabase_ok: missingEnv.length === 0 && invalidEnv.length === 0,
    missing_env: missingEnv,
    invalid_env: invalidEnv,
  });
});

app.get("/admin/dashboard-overview", async (c) => {
  const unauthorized = requireAdmin(c);
  if (unauthorized) return unauthorized;
  const svc = requireService(c);
  if (svc.response) return svc.response;
  const supabase = svc.supabase;

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const bucketStarts = [0, 4, 8, 12, 16, 20];
  const buckets = bucketStarts.map((h) => ({ time: `${String(h).padStart(2, "0")}:00`, requests: 0 }));
  const severityFromRank = (rank: number, total: number) => {
    if (total <= 1) return "critical";
    const ratio = total > 1 ? rank / (total - 1) : 0;
    if (ratio <= 0.2) return "critical";
    if (ratio <= 0.5) return "high";
    if (ratio <= 0.8) return "medium";
    return "low";
  };

  const [
    requests24hRes,
    requestsTodayRes,
    criticalRes,
    patientsCountRes,
    donorsCountRes,
    ridersCountRes,
    hospitalsCountRes,
    transfusionsRes,
    requests30dRes,
    requests7dCriticalRes,
  ] = await Promise.all([
    supabase.from("blood_requests").select("created_at").gte("created_at", last24h.toISOString()).limit(2000),
    supabase.from("blood_requests").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
    supabase
      .from("blood_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today.toISOString())
      .in("urgency", ["critical", "Critical", "CRITICAL"]),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "patient"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "donor"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "rider"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "hospital"),
    supabase.from("patient_transfusions").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    supabase.from("blood_requests").select("patient_id").gte("created_at", last30d.toISOString()).limit(5000),
    supabase
      .from("blood_requests")
      .select("patient_id")
      .gte("created_at", last7d.toISOString())
      .in("urgency", ["critical", "Critical", "CRITICAL", "high", "High", "HIGH"])
      .limit(5000),
  ]);

  const firstError =
    requests24hRes.error ||
    requestsTodayRes.error ||
    criticalRes.error ||
    patientsCountRes.error ||
    donorsCountRes.error ||
    ridersCountRes.error ||
    hospitalsCountRes.error ||
    transfusionsRes.error ||
    requests30dRes.error ||
    requests7dCriticalRes.error;

  if (firstError) {
    return c.json({ ok: false, error: firstError.message }, 500);
  }

  for (const row of (requests24hRes.data || []) as any[]) {
    const createdAt = row?.created_at;
    if (typeof createdAt !== "string") continue;
    const d = new Date(createdAt);
    const h = d.getHours();
    const idx = Math.max(0, Math.min(5, Math.floor(h / 4)));
    buckets[idx].requests += 1;
  }

  const request30dRows = (requests30dRes.data || []) as any[];
  const patientIds30d = Array.from(
    new Set(request30dRows.map((r) => r?.patient_id).filter((v) => typeof v === "string" && v.length > 0)),
  );
  let regionData: Array<{ region: string; requests: number }> = [];
  if (patientIds30d.length > 0) {
    const profilesRes = await supabase
      .from("patient_profiles")
      .select("user_id, location")
      .in("user_id", patientIds30d.slice(0, 500));
    if (!profilesRes.error) {
      const locByUser = new Map<string, string>();
      for (const row of (profilesRes.data || []) as any[]) {
        const uid = row?.user_id;
        const loc = row?.location;
        if (typeof uid !== "string") continue;
        locByUser.set(uid, typeof loc === "string" && loc.trim().length > 0 ? loc.trim() : "Unknown");
      }
      const counts = new Map<string, number>();
      for (const r of request30dRows) {
        const pid = r?.patient_id;
        if (typeof pid !== "string") continue;
        const key = locByUser.get(pid) ?? "Unknown";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      regionData = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([region, requests]) => ({ region, requests }));
    }
  }

  const req7dRows = (requests7dCriticalRes.data || []) as any[];
  const patientIds7d = Array.from(new Set(req7dRows.map((r) => r?.patient_id).filter((v) => typeof v === "string" && v.length > 0)));
  let heatZones: Array<{ region: string; severity: "critical" | "high" | "medium" | "low"; requests: number }> = [];
  if (patientIds7d.length > 0) {
    const profilesRes = await supabase
      .from("patient_profiles")
      .select("user_id, location")
      .in("user_id", patientIds7d.slice(0, 500));
    if (!profilesRes.error) {
      const locByUser = new Map<string, string>();
      for (const row of (profilesRes.data || []) as any[]) {
        const uid = row?.user_id;
        const loc = row?.location;
        if (typeof uid !== "string") continue;
        locByUser.set(uid, typeof loc === "string" && loc.trim().length > 0 ? loc.trim() : "Unknown");
      }
      const counts = new Map<string, number>();
      for (const r of req7dRows) {
        const pid = r?.patient_id;
        if (typeof pid !== "string") continue;
        const key = locByUser.get(pid) ?? "Unknown";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      heatZones = sorted.map(([region, requests], idx) => ({
        region,
        requests,
        severity: severityFromRank(idx, sorted.length),
      })) as any;
    }
  }

  return c.json({
    ok: true,
    lastUpdatedAt: now.toISOString(),
    criticalRequests: typeof criticalRes.count === "number" ? criticalRes.count : 0,
    requestsToday: typeof requestsTodayRes.count === "number" ? requestsTodayRes.count : 0,
    patientsCount: typeof patientsCountRes.count === "number" ? patientsCountRes.count : 0,
    donorsCount: typeof donorsCountRes.count === "number" ? donorsCountRes.count : 0,
    ridersCount: typeof ridersCountRes.count === "number" ? ridersCountRes.count : 0,
    hospitalsCount: typeof hospitalsCountRes.count === "number" ? hospitalsCountRes.count : 0,
    livesSavedThisMonth: typeof transfusionsRes.count === "number" ? transfusionsRes.count : 0,
    emergencyTrendData: buckets,
    regionalData: regionData.length > 0 ? regionData : [{ region: "Unknown", requests: 0 }],
    heatZones: heatZones.length > 0 ? heatZones : [{ region: "Unknown", severity: "low", requests: 0 }],
  });
});

app.get("/admin/request-management", async (c) => {
  const unauthorized = requireAdmin(c);
  if (unauthorized) return unauthorized;
  const svc = requireService(c);
  if (svc.response) return svc.response;
  const supabase = svc.supabase;

  const { data: requests, error: requestsError } = await supabase
    .from("blood_requests")
    .select("id, patient_id, blood_group, component, urgency, status, request_type, created_at, accepted_by_type, accepted_by_id")
    .order("created_at", { ascending: false })
    .limit(100);

  if (requestsError) return c.json({ ok: false, error: requestsError.message }, 500);
  const requestRows = Array.isArray(requests) ? (requests as any[]) : [];
  const requestIds = requestRows.map((r) => r?.id).filter((v) => typeof v === "string");
  const patientIds = Array.from(new Set(requestRows.map((r) => r?.patient_id).filter((v) => typeof v === "string")));
  const acceptedHospitalIds = Array.from(
    new Set(
      requestRows
        .filter((r) => (r?.accepted_by_type ?? "") === "hospital")
        .map((r) => r?.accepted_by_id)
        .filter((v) => typeof v === "string"),
    ),
  );
  const acceptedDonorIds = Array.from(
    new Set(
      requestRows
        .filter((r) => (r?.accepted_by_type ?? "") === "donor")
        .map((r) => r?.accepted_by_id)
        .filter((v) => typeof v === "string"),
    ),
  );

  const [patientsRes, hospitalsRes, donorsRes, deliveriesRes] = await Promise.all([
    patientIds.length > 0
      ? supabase.from("patient_profiles").select("user_id, full_name, location").in("user_id", patientIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    acceptedHospitalIds.length > 0
      ? supabase.from("hospital_profiles").select("user_id, organization_name, address").in("user_id", acceptedHospitalIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    acceptedDonorIds.length > 0
      ? supabase.from("donor_profiles").select("user_id, full_name, location").in("user_id", acceptedDonorIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    requestIds.length > 0
      ? supabase.from("deliveries").select("request_id, rider_id, status, delivered_at, created_at").in("request_id", requestIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const firstError = patientsRes.error || hospitalsRes.error || donorsRes.error || deliveriesRes.error;
  if (firstError) return c.json({ ok: false, error: firstError.message }, 500);

  const deliveryRows = Array.isArray(deliveriesRes.data) ? (deliveriesRes.data as any[]) : [];
  const riderIds = Array.from(new Set(deliveryRows.map((d) => d?.rider_id).filter((v) => typeof v === "string")));
  const ridersRes =
    riderIds.length > 0
      ? await supabase.from("rider_profiles").select("user_id, full_name").in("user_id", riderIds.slice(0, 500))
      : ({ data: [], error: null } as any);
  if (ridersRes.error) return c.json({ ok: false, error: ridersRes.error.message }, 500);

  return c.json({
    ok: true,
    requests: requestRows,
    patients: Array.isArray(patientsRes.data) ? patientsRes.data : [],
    hospitals: Array.isArray(hospitalsRes.data) ? hospitalsRes.data : [],
    donors: Array.isArray(donorsRes.data) ? donorsRes.data : [],
    deliveries: deliveryRows,
    riders: Array.isArray(ridersRes.data) ? ridersRes.data : [],
  });
});

app.get("/admin/camps-ngos", async (c) => {
  const unauthorized = requireAdmin(c);
  if (unauthorized) return unauthorized;
  const svc = requireService(c);
  if (svc.response) return svc.response;
  const supabase = svc.supabase;

  const { data: camps, error: campsError } = await supabase
    .from("camps")
    .select("id, organizer_id, title, address, start_date, end_date, start_time, end_time, slot_minutes, capacity_per_slot, is_published, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (campsError) return c.json({ ok: false, error: campsError.message }, 500);

  const campRows = Array.isArray(camps) ? (camps as any[]) : [];
  const organizerIds = Array.from(new Set(campRows.map((c) => c?.organizer_id).filter((v) => typeof v === "string")));
  const campIds = campRows.map((c) => c?.id).filter((v) => typeof v === "string");

  const [hospitalsRes, bookingsRes] = await Promise.all([
    organizerIds.length > 0
      ? supabase.from("hospital_profiles").select("user_id, organization_name, address, verification_status").in("user_id", organizerIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    campIds.length > 0
      ? supabase.from("camp_bookings").select("id, camp_id, donor_id, status, updated_at, created_at").in("camp_id", campIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
  ]);
  const firstError = hospitalsRes.error || bookingsRes.error;
  if (firstError) return c.json({ ok: false, error: firstError.message }, 500);

  const bookings = Array.isArray(bookingsRes.data) ? (bookingsRes.data as any[]) : [];
  const donorIds = Array.from(new Set(bookings.map((b) => b?.donor_id).filter((v) => typeof v === "string")));
  const donorsRes =
    donorIds.length > 0
      ? await supabase.from("donor_profiles").select("user_id, full_name").in("user_id", donorIds.slice(0, 500))
      : ({ data: [], error: null } as any);
  if (donorsRes.error) return c.json({ ok: false, error: donorsRes.error.message }, 500);

  const rewardsRes = await supabase.from("donor_rewards").select("metadata, reward_type").eq("reward_type", "certificate_camp").limit(500);
  if (rewardsRes.error) {
    return c.json({ ok: false, error: rewardsRes.error.message }, 500);
  }

  return c.json({
    ok: true,
    camps: campRows,
    hospitals: Array.isArray(hospitalsRes.data) ? hospitalsRes.data : [],
    bookings,
    donors: Array.isArray(donorsRes.data) ? donorsRes.data : [],
    rewards: Array.isArray(rewardsRes.data) ? rewardsRes.data : [],
  });
});

app.get("/admin/user-management", async (c) => {
  const unauthorized = requireAdmin(c);
  if (unauthorized) return unauthorized;
  const svc = requireService(c);
  if (svc.response) return svc.response;
  const supabase = svc.supabase;

  const [patientsUsersRes, donorsUsersRes, ridersUsersRes, hospitalsUsersRes] = await Promise.all([
    supabase.from("users").select("id, email").eq("role", "patient").order("created_at", { ascending: false }).limit(200),
    supabase.from("users").select("id, email").eq("role", "donor").order("created_at", { ascending: false }).limit(200),
    supabase.from("users").select("id, email").eq("role", "rider").order("created_at", { ascending: false }).limit(200),
    supabase.from("users").select("id, email").eq("role", "hospital").order("created_at", { ascending: false }).limit(200),
  ]);
  const userError = patientsUsersRes.error || donorsUsersRes.error || ridersUsersRes.error || hospitalsUsersRes.error;
  if (userError) return c.json({ ok: false, error: userError.message }, 500);

  const patientUsers = Array.isArray(patientsUsersRes.data) ? patientsUsersRes.data : [];
  const donorUsers = Array.isArray(donorsUsersRes.data) ? donorsUsersRes.data : [];
  const riderUsers = Array.isArray(ridersUsersRes.data) ? ridersUsersRes.data : [];
  const hospitalUsers = Array.isArray(hospitalsUsersRes.data) ? hospitalsUsersRes.data : [];

  const patientIds = patientUsers.map((u: any) => u?.id).filter((v: any) => typeof v === "string");
  const donorIds = donorUsers.map((u: any) => u?.id).filter((v: any) => typeof v === "string");
  const riderIds = riderUsers.map((u: any) => u?.id).filter((v: any) => typeof v === "string");
  const hospitalIds = hospitalUsers.map((u: any) => u?.id).filter((v: any) => typeof v === "string");

  const [
    patientProfilesRes,
    donorProfilesRes,
    riderProfilesRes,
    hospitalProfilesRes,
    bloodRequestsRes,
    transfusionsRes,
    donorDonationsRes,
    deliveriesRes,
  ] = await Promise.all([
    patientIds.length > 0
      ? supabase.from("patient_profiles").select("user_id, full_name, blood_group, location").in("user_id", patientIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    donorIds.length > 0
      ? supabase
          .from("donor_profiles")
          .select("user_id, full_name, blood_group, eligibility_status, last_donation_date, location")
          .in("user_id", donorIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    riderIds.length > 0
      ? supabase.from("rider_profiles").select("user_id, full_name, verification_status, availability_status").in("user_id", riderIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    hospitalIds.length > 0
      ? supabase
          .from("hospital_profiles")
          .select("user_id, organization_name, license_number, verification_status")
          .in("user_id", hospitalIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    patientIds.length > 0
      ? supabase.from("blood_requests").select("patient_id").in("patient_id", patientIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    patientIds.length > 0
      ? supabase.from("patient_transfusions").select("patient_id, transfusion_date").in("patient_id", patientIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    donorIds.length > 0
      ? supabase.from("donor_donations").select("donor_id, donation_date").in("donor_id", donorIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
    riderIds.length > 0
      ? supabase.from("deliveries").select("rider_id").in("rider_id", riderIds.slice(0, 500))
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const firstError =
    patientProfilesRes.error ||
    donorProfilesRes.error ||
    riderProfilesRes.error ||
    hospitalProfilesRes.error ||
    bloodRequestsRes.error ||
    transfusionsRes.error ||
    donorDonationsRes.error ||
    deliveriesRes.error;
  if (firstError) return c.json({ ok: false, error: firstError.message }, 500);

  return c.json({
    ok: true,
    patientUsers,
    donorUsers,
    riderUsers,
    hospitalUsers,
    patientProfiles: Array.isArray(patientProfilesRes.data) ? patientProfilesRes.data : [],
    donorProfiles: Array.isArray(donorProfilesRes.data) ? donorProfilesRes.data : [],
    riderProfiles: Array.isArray(riderProfilesRes.data) ? riderProfilesRes.data : [],
    hospitalProfiles: Array.isArray(hospitalProfilesRes.data) ? hospitalProfilesRes.data : [],
    bloodRequests: Array.isArray(bloodRequestsRes.data) ? bloodRequestsRes.data : [],
    transfusions: Array.isArray(transfusionsRes.data) ? transfusionsRes.data : [],
    donorDonations: Array.isArray(donorDonationsRes.data) ? donorDonationsRes.data : [],
    deliveries: Array.isArray(deliveriesRes.data) ? deliveriesRes.data : [],
  });
});

app.get("/admin/compliance-documents", async (c) => {
  const unauthorized = requireAdmin(c);
  if (unauthorized) return unauthorized;
  const svc = requireService(c);
  if (svc.response) return svc.response;
  const supabase = svc.supabase;

  const ownerId = (c.req.query("ownerId") || "").trim();
  const ownerRole = (c.req.query("ownerRole") || "").trim();
  if (!ownerId) return c.json({ ok: false, error: "Missing ownerId" }, 400);
  if (ownerRole !== "rider" && ownerRole !== "hospital") {
    return c.json({ ok: false, error: "Invalid ownerRole" }, 400);
  }

  const bucket =
    (Deno.env.get("COMPLIANCE_BUCKET") || Deno.env.get("VITE_COMPLIANCE_BUCKET") || "compliance").trim() || "compliance";

  const docsRes = await supabase
    .from("compliance_documents")
    .select("id, owner_id, owner_role, doc_type, file_name, storage_path, mime_type, size_bytes, status, created_at")
    .eq("owner_id", ownerId)
    .eq("owner_role", ownerRole)
    .order("created_at", { ascending: false })
    .limit(100);

  if (docsRes.error) return c.json({ ok: false, error: docsRes.error.message }, 500);

  const rows = Array.isArray(docsRes.data) ? (docsRes.data as any[]) : [];
  const paths = rows.map((r) => r?.storage_path).filter((p) => typeof p === "string" && p.length > 0);

  const signedUrlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const signedRes = await supabase.storage.from(bucket).createSignedUrls(paths.slice(0, 100), 600);
    if (!signedRes.error && Array.isArray(signedRes.data)) {
      for (const item of signedRes.data as any[]) {
        const path = item?.path;
        const url = item?.signedUrl;
        if (typeof path === "string" && typeof url === "string" && url.length > 0) {
          signedUrlByPath.set(path, url);
        }
      }
    }
  }

  const documents = rows.map((r) => ({
    ...r,
    signedUrl:
      typeof r?.storage_path === "string" && signedUrlByPath.has(r.storage_path)
        ? signedUrlByPath.get(r.storage_path)
        : null,
  }));

  return c.json({ ok: true, documents, bucket });
});

app.post("/admin/compliance-review", async (c) => {
  const unauthorized = requireAdmin(c);
  if (unauthorized) return unauthorized;
  const svc = requireService(c);
  if (svc.response) return svc.response;
  const supabase = svc.supabase;

  const payload = await c.req.json().catch(() => ({} as any));
  const ownerId = typeof payload?.ownerId === "string" ? payload.ownerId.trim() : "";
  const ownerRole = typeof payload?.ownerRole === "string" ? payload.ownerRole.trim() : "";
  const decision = typeof payload?.decision === "string" ? payload.decision.trim().toLowerCase() : "";
  if (!ownerId) return c.json({ ok: false, error: "Missing ownerId" }, 400);
  if (ownerRole !== "rider" && ownerRole !== "hospital") {
    return c.json({ ok: false, error: "Invalid ownerRole" }, 400);
  }
  if (decision !== "approve" && decision !== "reject") {
    return c.json({ ok: false, error: "Invalid decision" }, 400);
  }

  const nextStatus = decision === "approve" ? "approved" : "rejected";
  const docsUpdateRes = await supabase
    .from("compliance_documents")
    .update({ status: nextStatus })
    .eq("owner_id", ownerId)
    .eq("owner_role", ownerRole)
    .select("id, status");

  if (docsUpdateRes.error) return c.json({ ok: false, error: docsUpdateRes.error.message }, 500);

  if (ownerRole === "rider") {
    const profileRes = await supabase.from("rider_profiles").update({ verification_status: nextStatus }).eq("user_id", ownerId);
    if (profileRes.error) return c.json({ ok: false, error: profileRes.error.message }, 500);
  } else {
    const profileRes = await supabase
      .from("hospital_profiles")
      .update({ verification_status: nextStatus })
      .eq("user_id", ownerId);
    if (profileRes.error) return c.json({ ok: false, error: profileRes.error.message }, 500);
  }

  return c.json({
    ok: true,
    ownerId,
    ownerRole,
    decision,
    status: nextStatus,
    updatedDocuments: Array.isArray(docsUpdateRes.data) ? docsUpdateRes.data : [],
  });
});

app.get("/admin/inventory-blood-flow", async (c) => {
  const unauthorized = requireAdmin(c);
  if (unauthorized) return unauthorized;
  const svc = requireService(c);
  if (svc.response) return svc.response;
  const supabase = svc.supabase;

  const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const;
  const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const today = startOfToday();
  const in7days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: units, error: unitsError } = await supabase
    .from("hospital_inventory_units")
    .select("hospital_id, blood_group, status, expiry_date")
    .not("hospital_id", "is", null)
    .limit(20000);
  if (unitsError) return c.json({ ok: false, error: unitsError.message }, 500);

  const unitRows = Array.isArray(units) ? (units as any[]) : [];
  const hospitalIds = Array.from(new Set(unitRows.map((u) => u?.hospital_id).filter((v) => typeof v === "string")));
  const hospitalProfilesRes =
    hospitalIds.length > 0
      ? await supabase.from("hospital_profiles").select("user_id, organization_name").in("user_id", hospitalIds.slice(0, 500))
      : ({ data: [], error: null } as any);
  if (hospitalProfilesRes.error) return c.json({ ok: false, error: hospitalProfilesRes.error.message }, 500);

  const hospitalNameById = new Map<string, string>();
  for (const row of Array.isArray(hospitalProfilesRes.data) ? (hospitalProfilesRes.data as any[]) : []) {
    const uid = row?.user_id;
    if (typeof uid !== "string") continue;
    const name =
      typeof row?.organization_name === "string" && row.organization_name.trim().length > 0
        ? row.organization_name.trim()
        : `Hospital ${uid.slice(0, 6)}…`;
    hospitalNameById.set(uid, name);
  }

  const countsByHospital: Map<string, Record<string, number>> = new Map();
  const totalsByHospital: Map<string, number> = new Map();
  const globalCounts: Record<string, number> = {};
  for (const bg of BLOOD_GROUPS) globalCounts[bg] = 0;

  const nearExpiryAgg: Map<string, { hospitalId: string; hospital: string; bloodGroup: string; units: number; earliest: Date | null }> =
    new Map();

  for (const u of unitRows) {
    const hid = typeof u?.hospital_id === "string" ? u.hospital_id : null;
    const bg = typeof u?.blood_group === "string" ? u.blood_group : null;
    const status = typeof u?.status === "string" ? u.status : "";
    const expiryStr = typeof u?.expiry_date === "string" ? u.expiry_date : null;
    if (!hid || !bg) continue;
    if (!BLOOD_GROUPS.includes(bg as any)) continue;
    if (status !== "available") continue;

    const cur = countsByHospital.get(hid) ?? Object.fromEntries(BLOOD_GROUPS.map((g) => [g, 0]));
    cur[bg] = (cur[bg] ?? 0) + 1;
    countsByHospital.set(hid, cur);
    totalsByHospital.set(hid, (totalsByHospital.get(hid) ?? 0) + 1);
    globalCounts[bg] = (globalCounts[bg] ?? 0) + 1;

    if (expiryStr) {
      const expiry = new Date(expiryStr);
      if (!Number.isNaN(expiry.getTime()) && expiry >= today && expiry <= in7days) {
        const key = `${hid}:${bg}`;
        const prev = nearExpiryAgg.get(key);
        const hospitalName = hospitalNameById.get(hid) ?? `Hospital ${hid.slice(0, 6)}…`;
        const next = prev ?? { hospitalId: hid, hospital: hospitalName, bloodGroup: bg, units: 0, earliest: null };
        next.units += 1;
        next.earliest = !next.earliest || expiry < next.earliest ? expiry : next.earliest;
        nearExpiryAgg.set(key, next);
      }
    }
  }

  const inventory = Array.from(totalsByHospital.entries())
    .map(([hid, total]) => {
      const c = countsByHospital.get(hid) ?? Object.fromEntries(BLOOD_GROUPS.map((g) => [g, 0]));
      const status = total < 50 ? "Critical" : total < 120 ? "Low" : "Good";
      return {
        hospital: hospitalNameById.get(hid) ?? `Hospital ${hid.slice(0, 6)}…`,
        "A+": c["A+"] ?? 0,
        "A-": c["A-"] ?? 0,
        "B+": c["B+"] ?? 0,
        "B-": c["B-"] ?? 0,
        "O+": c["O+"] ?? 0,
        "O-": c["O-"] ?? 0,
        "AB+": c["AB+"] ?? 0,
        "AB-": c["AB-"] ?? 0,
        total,
        status,
      };
    })
    .sort((a: any, b: any) => b.total - a.total);

  const nearExpiry = Array.from(nearExpiryAgg.values())
    .map((r) => {
      const expiry = r.earliest ?? today;
      const daysLeft = Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)));
      return {
        hospital: r.hospital,
        bloodGroup: r.bloodGroup,
        units: r.units,
        expiryDate: r.earliest ? r.earliest.toISOString().slice(0, 10) : today.toISOString().slice(0, 10),
        daysLeft,
      };
    })
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
    .slice(0, 20);

  const maxCount = Math.max(1, ...Object.values(globalCounts).map((v) => (typeof v === "number" ? v : 0)));
  const heatmap = BLOOD_GROUPS.map((group) => {
    const count = globalCounts[group] ?? 0;
    const percentage = Math.round((count / maxCount) * 100);
    const status = percentage < 25 ? "critical" : percentage < 40 ? "low" : percentage < 60 ? "medium" : "good";
    return { group, percentage, status };
  });

  const suggestions: Array<{ from: string; to: string; bloodGroup: string; units: number; reason: string }> = [];
  if (inventory.length >= 2) {
    const sortedByNeed = [...inventory].sort((a: any, b: any) =>
      a.status === b.status ? a.total - b.total : a.status === "Critical" ? -1 : a.status === "Low" && b.status === "Good" ? -1 : 1,
    );
    const needy = sortedByNeed.filter((h: any) => h.status !== "Good").slice(0, 3);
    const donors = inventory.filter((h: any) => h.status === "Good").slice(0, 5);
    for (const target of needy) {
      for (const bg of BLOOD_GROUPS) {
        const donor = donors.find((d: any) => (d as any)[bg] >= 20 && (target as any)[bg] <= 5);
        if (!donor) continue;
        const unitsToMove = Math.min(10, Math.max(0, ((donor as any)[bg] as number) - 20));
        if (unitsToMove <= 0) continue;
        suggestions.push({
          from: donor.hospital,
          to: target.hospital,
          bloodGroup: bg,
          units: unitsToMove,
          reason: target.status === "Critical" ? "Critical shortage at destination" : "Low stock warning",
        });
        break;
      }
      if (suggestions.length >= 3) break;
    }
  }

  return c.json({ ok: true, inventory, nearExpiry, heatmap, suggestions });
});

app.get("/admin/analytics-reports", async (c) => {
  const unauthorized = requireAdmin(c);
  if (unauthorized) return unauthorized;
  const svc = requireService(c);
  if (svc.response) return svc.response;
  const supabase = svc.supabase;

  const now = new Date();
  const range = (c.req.query("range") || "last-30").trim();
  const start = new Date(now);
  if (range === "last-7") start.setDate(start.getDate() - 7);
  else if (range === "last-90") start.setDate(start.getDate() - 90);
  else if (range === "ytd") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const fulfilledStatuses = new Set(["fulfilled", "completed", "delivered", "closed", "success"]);

  const fmtMonth = (d: Date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[d.getMonth()];
  };

  const [
    requestsRes,
    donorsRes,
    deliveriesRes,
    transfusionsMtdRes,
    donorsMtdRes,
    criticalMtdRes,
  ] = await Promise.all([
    supabase.from("blood_requests").select("created_at, status, blood_group, urgency").gte("created_at", start.toISOString()).limit(20000),
    supabase.from("users").select("id, created_at").eq("role", "donor").gte("created_at", start.toISOString()).limit(20000),
    supabase
      .from("deliveries")
      .select("created_at, delivered_at, rider_id")
      .gte("created_at", start.toISOString())
      .limit(20000),
    supabase.from("patient_transfusions").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "donor").gte("created_at", monthStart.toISOString()),
    supabase
      .from("blood_requests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString())
      .in("urgency", ["critical", "Critical", "CRITICAL"]),
  ]);

  const firstError = requestsRes.error || donorsRes.error || deliveriesRes.error || transfusionsMtdRes.error || donorsMtdRes.error || criticalMtdRes.error;
  if (firstError) return c.json({ ok: false, error: firstError.message }, 500);

  const requestRows = Array.isArray(requestsRes.data) ? (requestsRes.data as any[]) : [];
  const donorRows = Array.isArray(donorsRes.data) ? (donorsRes.data as any[]) : [];
  const deliveryRows = Array.isArray(deliveriesRes.data) ? (deliveriesRes.data as any[]) : [];

  const weekCount = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  const weekly = Array.from({ length: weekCount }, (_, i) => ({
    week: `Week ${i + 1}`,
    requests: 0,
    fulfilled: 0,
    donors: 0,
  }));

  const weekIndex = (dateStr: any) => {
    const d = new Date(typeof dateStr === "string" ? dateStr : "");
    if (Number.isNaN(d.getTime())) return -1;
    const idx = Math.floor((d.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return idx < 0 ? -1 : idx >= weekCount ? weekCount - 1 : idx;
  };

  for (const r of requestRows) {
    const idx = weekIndex(r?.created_at);
    if (idx < 0) continue;
    weekly[idx].requests += 1;
    const status = typeof r?.status === "string" ? r.status.trim().toLowerCase() : "";
    if (status && fulfilledStatuses.has(status)) weekly[idx].fulfilled += 1;
  }

  for (const u of donorRows) {
    const idx = weekIndex(u?.created_at);
    if (idx < 0) continue;
    weekly[idx].donors += 1;
  }

  const totalRequests = requestRows.length;
  const fulfilledRequests = requestRows.reduce((acc, r) => {
    const status = typeof r?.status === "string" ? r.status.trim().toLowerCase() : "";
    return acc + (status && fulfilledStatuses.has(status) ? 1 : 0);
  }, 0);
  const requestFulfillmentPct = totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 1000) / 10 : 0;

  let avgDeliveryMinutes: number | null = null;
  const times: number[] = [];
  for (const d of deliveryRows) {
    const createdAt = new Date(typeof d?.created_at === "string" ? d.created_at : "");
    const deliveredAt = new Date(typeof d?.delivered_at === "string" ? d.delivered_at : "");
    if (Number.isNaN(createdAt.getTime()) || Number.isNaN(deliveredAt.getTime())) continue;
    const mins = Math.round((deliveredAt.getTime() - createdAt.getTime()) / 60000);
    if (mins > 0 && mins < 24 * 60) times.push(mins);
  }
  if (times.length > 0) {
    avgDeliveryMinutes = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  const last6Start = new Date(now);
  last6Start.setMonth(last6Start.getMonth() - 5, 1);
  last6Start.setHours(0, 0, 0, 0);

  const usageRes = await supabase
    .from("blood_requests")
    .select("created_at, blood_group, status")
    .gte("created_at", last6Start.toISOString())
    .limit(50000);
  if (usageRes.error) return c.json({ ok: false, error: usageRes.error.message }, 500);

  const groups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const;
  const monthsByKey = new Map<string, any>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(last6Start);
    d.setMonth(last6Start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthsByKey.set(key, { month: fmtMonth(d), ...Object.fromEntries(groups.map((g) => [g, 0])) });
  }

  const usageRows = Array.isArray(usageRes.data) ? (usageRes.data as any[]) : [];
  for (const r of usageRows) {
    const createdAt = new Date(typeof r?.created_at === "string" ? r.created_at : "");
    if (Number.isNaN(createdAt.getTime())) continue;
    const key = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
    const rec = monthsByKey.get(key);
    if (!rec) continue;
    const bg = typeof r?.blood_group === "string" ? r.blood_group.trim() : "";
    if (!groups.includes(bg as any)) continue;
    const status = typeof r?.status === "string" ? r.status.trim().toLowerCase() : "";
    if (status && fulfilledStatuses.has(status)) rec[bg] += 1;
  }
  const bloodUsageTrends = Array.from(monthsByKey.values());

  const donorsAllRes = await supabase.from("donor_profiles").select("location").limit(5000);
  if (donorsAllRes.error) return c.json({ ok: false, error: donorsAllRes.error.message }, 500);
  const donorLocRows = Array.isArray(donorsAllRes.data) ? (donorsAllRes.data as any[]) : [];
  const donorsByRegion = new Map<string, number>();
  for (const row of donorLocRows) {
    const loc = typeof row?.location === "string" && row.location.trim() ? row.location.trim() : "Unknown";
    donorsByRegion.set(loc, (donorsByRegion.get(loc) ?? 0) + 1);
  }
  const topRegions = Array.from(donorsByRegion.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([region, donors]) => ({ region, donors }));

  const last60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const newDonors60Res = await supabase
    .from("users")
    .select("id, created_at")
    .eq("role", "donor")
    .gte("created_at", last60.toISOString())
    .limit(20000);
  if (newDonors60Res.error) return c.json({ ok: false, error: newDonors60Res.error.message }, 500);
  const newDonorUsers = Array.isArray(newDonors60Res.data) ? (newDonors60Res.data as any[]) : [];
  const newDonorIds = newDonorUsers.map((u) => u?.id).filter((v) => typeof v === "string");
  const donorProfiles60Res =
    newDonorIds.length > 0
      ? await supabase.from("donor_profiles").select("user_id, location").in("user_id", newDonorIds.slice(0, 500))
      : ({ data: [], error: null } as any);
  if (donorProfiles60Res.error) return c.json({ ok: false, error: donorProfiles60Res.error.message }, 500);
  const locByUser = new Map<string, string>();
  for (const row of Array.isArray(donorProfiles60Res.data) ? (donorProfiles60Res.data as any[]) : []) {
    const uid = row?.user_id;
    if (typeof uid !== "string") continue;
    const loc = typeof row?.location === "string" && row.location.trim() ? row.location.trim() : "Unknown";
    locByUser.set(uid, loc);
  }
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last30 = new Map<string, number>();
  const prev30 = new Map<string, number>();
  for (const u of newDonorUsers) {
    const uid = u?.id;
    const createdAt = new Date(typeof u?.created_at === "string" ? u.created_at : "");
    if (typeof uid !== "string" || Number.isNaN(createdAt.getTime())) continue;
    const loc = locByUser.get(uid) ?? "Unknown";
    if (createdAt >= cutoff30) last30.set(loc, (last30.get(loc) ?? 0) + 1);
    else prev30.set(loc, (prev30.get(loc) ?? 0) + 1);
  }
  const donorGrowthData = topRegions.map((r) => {
    const last = last30.get(r.region) ?? 0;
    const prev = prev30.get(r.region) ?? 0;
    const growth = prev > 0 ? Math.round(((last / prev - 1) * 100) * 10) / 10 : last > 0 ? 100 : 0;
    return { region: r.region, donors: r.donors, growth };
  });

  const riderCounts = new Map<string, { deliveries: number; minutes: number[] }>();
  for (const d of deliveryRows) {
    const rid = d?.rider_id;
    if (typeof rid !== "string") continue;
    const createdAt = new Date(typeof d?.created_at === "string" ? d.created_at : "");
    const deliveredAt = new Date(typeof d?.delivered_at === "string" ? d.delivered_at : "");
    const mins =
      !Number.isNaN(createdAt.getTime()) && !Number.isNaN(deliveredAt.getTime())
        ? Math.round((deliveredAt.getTime() - createdAt.getTime()) / 60000)
        : null;
    const cur = riderCounts.get(rid) ?? { deliveries: 0, minutes: [] as number[] };
    cur.deliveries += 1;
    if (mins && mins > 0 && mins < 24 * 60) cur.minutes.push(mins);
    riderCounts.set(rid, cur);
  }
  const topRiders = Array.from(riderCounts.entries())
    .sort((a, b) => b[1].deliveries - a[1].deliveries)
    .slice(0, 4);
  const riderIds = topRiders.map(([id]) => id);
  const riderProfilesRes =
    riderIds.length > 0
      ? await supabase.from("rider_profiles").select("user_id, full_name").in("user_id", riderIds.slice(0, 500))
      : ({ data: [], error: null } as any);
  if (riderProfilesRes.error) return c.json({ ok: false, error: riderProfilesRes.error.message }, 500);
  const riderNameById = new Map<string, string>();
  for (const row of Array.isArray(riderProfilesRes.data) ? (riderProfilesRes.data as any[]) : []) {
    const uid = row?.user_id;
    if (typeof uid !== "string") continue;
    const name = typeof row?.full_name === "string" && row.full_name.trim() ? row.full_name.trim() : `Rider ${uid.slice(0, 6)}…`;
    riderNameById.set(uid, name);
  }
  const riderPerformanceData = topRiders.map(([id, v]) => {
    const avg = v.minutes.length > 0 ? Math.round(v.minutes.reduce((a, b) => a + b, 0) / v.minutes.length) : null;
    return { rider: riderNameById.get(id) ?? `Rider ${id.slice(0, 6)}…`, deliveries: v.deliveries, avgTime: avg ? `${avg} min` : "—", rating: null };
  });

  return c.json({
    ok: true,
    kpis: {
      livesSavedMtd: typeof transfusionsMtdRes.count === "number" ? transfusionsMtdRes.count : 0,
      requestFulfillmentPct,
      newDonorsMtd: typeof donorsMtdRes.count === "number" ? donorsMtdRes.count : 0,
      avgDeliveryMinutes,
    },
    weeklyPerformanceData: weekly,
    bloodUsageTrends,
    donorGrowthData,
    riderPerformanceData,
    emergency: {
      successRatePct: requestFulfillmentPct,
      avgResponseMinutes: avgDeliveryMinutes,
      criticalRequestsMtd: typeof criticalMtdRes.count === "number" ? criticalMtdRes.count : 0,
    },
  });
});

app.post("/notify/process", async (c) => {
  const svc = requireService(c);
  if (svc.response) return svc.response;
  const supabase = svc.supabase;
  const payload = await c.req.json().catch(() => ({} as any));
  const limit = Math.max(1, Math.min(50, Number((payload as any)?.limit ?? 20) || 20));
  const webhookUrl = (Deno.env.get("NOTIFY_WEBHOOK_URL") || "").trim();

  const { data: rows, error } = await supabase
    .from("outbound_messages")
    .select("id, channel, to_phone, body, metadata")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of (rows || []) as any[]) {
    processed += 1;
    const id = row?.id;
    if (typeof id !== "string" || !id) continue;

    if (!webhookUrl) {
      skipped += 1;
      await supabase
        .from("outbound_messages")
        .update({ status: "skipped", error: "NOTIFY_WEBHOOK_URL_NOT_SET" })
        .eq("id", id);
      continue;
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          channel: row?.channel,
          to: row?.to_phone,
          body: row?.body,
          metadata: row?.metadata ?? {},
        }),
      });

      if (res.ok) {
        sent += 1;
        await supabase
          .from("outbound_messages")
          .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
          .eq("id", id);
      } else {
        failed += 1;
        const text = await res.text().catch(() => "");
        await supabase
          .from("outbound_messages")
          .update({ status: "failed", error: `WEBHOOK_${res.status}${text ? `:${text.slice(0, 500)}` : ""}` })
          .eq("id", id);
      }
    } catch (e) {
      failed += 1;
      const message = (e as any)?.message;
      await supabase
        .from("outbound_messages")
        .update({ status: "failed", error: typeof message === "string" ? message.slice(0, 500) : "SEND_FAILED" })
        .eq("id", id);
    }
  }

  return c.json({ ok: true, processed, sent, failed, skipped });
});

app.post("/notify/queue-reminders", async (c) => {
  const svc = requireService(c);
  if (svc.response) return svc.response;
  const supabase = svc.supabase;
  const payload = await c.req.json().catch(() => ({} as any));
  const hours = Math.max(1, Math.min(168, Number((payload as any)?.hours ?? 24) || 24));
  const windowMinutes = Math.max(1, Math.min(720, Number((payload as any)?.windowMinutes ?? 30) || 30));

  const { data, error } = await supabase.rpc("queue_upcoming_transfusion_reminders", {
    p_hours: hours,
    p_window_minutes: windowMinutes,
  } as any);
  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }
  return c.json({ ok: true, queuedSchedules: data ?? 0 });
});

const port = Number((Deno.env.get("PORT") || "").trim() || "8000");
Deno.serve({ port, hostname: "0.0.0.0" }, app.fetch);
