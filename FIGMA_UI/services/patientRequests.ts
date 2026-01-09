import { supabase } from "../supabase/client";
import { getSessionAndRole, getProfile } from "./auth";
import { getBestDeviceFix } from "../utils/geo";

export type PatientRequestType = "emergency" | "scheduled";

export interface CreatePatientBloodRequestPayload {
  request_type: PatientRequestType;
  component: string;
  units_required: number;
  urgency: "critical" | "high" | "medium" | "low";
  hospital_preference?: string | null;
  notes?: string | null;
}

export async function createPatientBloodRequest(payload: CreatePatientBloodRequestPayload) {
  const { session, role } = await getSessionAndRole();
  if (!session?.user || role !== "patient") {
    throw new Error("UNAUTHORIZED_PATIENT");
  }
  const userId = session.user.id;
  const profile = await getProfile("patient");
  const blood_group: string | null = (profile && (profile as any).blood_group) || null;
  let latitude: number | null = null;
  let longitude: number | null = null;
  let acc: number | null = null;
  if (!blood_group) {
    throw new Error("MISSING_BLOOD_GROUP");
  }
  if (!payload.urgency) {
    throw new Error("Urgency level is required");
  }
  const bestFix = await getBestDeviceFix(20000, 10);
  if (bestFix && bestFix.coords) {
    latitude = typeof bestFix.coords.latitude === 'number' ? bestFix.coords.latitude : null;
    longitude = typeof bestFix.coords.longitude === 'number' ? bestFix.coords.longitude : null;
    acc = typeof bestFix.coords.accuracy === 'number' ? bestFix.coords.accuracy : null;
  }
  if ((latitude === null || longitude === null) && profile) {
    const plat = (profile as any).latitude;
    const plng = (profile as any).longitude;
    latitude = typeof plat === 'number' ? plat : latitude;
    longitude = typeof plng === 'number' ? plng : longitude;
  }
  console.log("Submitting blood request:", {
    request_type: payload.request_type,
    blood_group,
    component: payload.component,
    units_required: payload.units_required,
    urgency: payload.urgency,
  });
  const insertRow = {
    patient_id: userId,
    request_type: payload.request_type,
    blood_group,
    component: payload.component,
    quantity_units: payload.units_required,
    urgency: payload.urgency,
    status: "pending",
    patient_latitude: latitude,
    patient_longitude: longitude,
    notes: payload.notes ?? null,
  };
  const { data, error } = await supabase
    .from("blood_requests")
    .insert(insertRow)
    .select("*")
    .maybeSingle();
  if (error) {
    throw error;
  }
  const normalized =
    data && typeof (data as any).units_required === "undefined"
      ? {
          ...data,
          units_required:
            (data as any).units_required ??
            (data as any).quantity_units ??
            null,
        }
      : data;
  if (!normalized?.id) return normalized as any;
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    await supabase
      .from('request_waypoints')
      .insert({ request_id: normalized.id, actor_type: 'patient', actor_id: userId, latitude, longitude, accuracy: typeof acc === 'number' ? acc : null });
  }
  try {
    await supabase.rpc('emit_notification', {
      p_user_id: userId,
      p_role: 'patient',
      p_title: '🩸 New Blood Request',
      p_message: 'Your blood request has been created.',
      p_event_type: 'patient_request_created',
      p_entity_id: normalized.id,
    } as any);
  } catch {}
  const { error: rpcError } = await supabase.rpc("broadcast_blood_request", {
    p_request_id: normalized.id,
    p_patient_lat: latitude,
    p_patient_lng: longitude,
    p_blood_group: blood_group,
    p_radius_km: 15,
  });
  if (rpcError) {
    console.error("Broadcast RPC failed:", rpcError);
    throw rpcError;
  }
  return normalized as any;
}

export async function listPatientBloodRequests() {
  const { session, role } = await getSessionAndRole();
  if (!session?.user || role !== "patient") {
    throw new Error("UNAUTHORIZED_PATIENT");
  }
  const userId = session.user.id;
  const { data, error } = await supabase
    .from("blood_requests")
    .select("*")
    .eq("patient_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row: any) => {
    const quantity = (row as any).quantity_units;
    if (typeof (row as any).units_required === "undefined") {
      return {
        ...row,
        units_required: typeof quantity === "number" ? quantity : quantity ?? null,
      };
    }
    return row;
  });
}

// Broadcast handled by RPC; legacy function removed
