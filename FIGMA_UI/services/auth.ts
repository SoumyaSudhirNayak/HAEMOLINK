import { supabase } from "../supabase/client";

export type Role = "patient" | "donor" | "rider" | "hospital";

export const ACCOUNT_EXISTS = "ACCOUNT_EXISTS";
export const ROLE_MISMATCH = "ROLE_MISMATCH";

export async function signUpWithEmail(role: Role, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const anyError = error as any;
    const message = (anyError && typeof anyError.message === "string") ? anyError.message : "";
    const status = typeof anyError.status === "number" ? anyError.status : undefined;
    if (status === 422 || message.toLowerCase().includes("already registered")) {
      console.log("Supabase signup error (already registered):", message);
      throw new Error(ACCOUNT_EXISTS);
    }
    console.log("Unexpected Supabase signup error:", message || anyError);
    throw error;
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session?.user) {
    console.log("No active session after signup; cannot insert into users table.");
    throw new Error("SIGNUP_NO_SESSION");
  }
  const userId = session.user.id;
  const { error: upsertError } = await supabase.from("users").upsert({ id: userId, email, role });
  if (upsertError) {
    const upsertMessage = typeof upsertError.message === "string" ? upsertError.message : "";
    console.log("Error inserting into users table after signup:", upsertMessage || upsertError);
    throw upsertError;
  }
  return { user: session.user };
}

export async function signInWithEmail(role: Role, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const signedInUser = data.user;
  let userId = signedInUser?.id;
  if (!userId) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error("LOGIN_NO_USER");
    }
    userId = userData.user.id;
  }
  const { data: userRow, error: userRowError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (userRowError) {
    throw userRowError;
  }
  const dbRole = (userRow?.role ?? null) as Role | null;
  if (!dbRole || dbRole !== role) {
    await supabase.auth.signOut();
    throw new Error(ROLE_MISMATCH);
  }
  return data;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSessionAndRole() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) return { session: null, role: null };
  const { data: userRow } = await supabase.from("users").select("role").eq("id", session.user.id).maybeSingle();
  return { session, role: (userRow?.role ?? null) as Role | null };
}

export async function upsertProfile(role: Role, profile: any) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) throw new Error("No user");
  if (role === "patient") {
    const { error } = await supabase.from("patient_profiles").upsert({ user_id: user.id, ...profile });
    if (error) throw error;
  } else if (role === "donor") {
    const { error } = await supabase.from("donor_profiles").upsert({ user_id: user.id, ...profile });
    if (error) throw error;
  } else if (role === "rider") {
    const { error } = await supabase.from("rider_profiles").upsert({ user_id: user.id, ...profile });
    if (error) throw error;
  } else if (role === "hospital") {
    const { error } = await supabase.from("hospital_profiles").upsert({ user_id: user.id, ...profile });
    if (error) throw error;
  }
}

export async function getProfile(role: Role) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  if (role === "patient") {
    const { data: row } = await supabase.from("patient_profiles").select("*").eq("user_id", user.id).maybeSingle();
    return row;
  } else if (role === "donor") {
    const { data: row } = await supabase.from("donor_profiles").select("*").eq("user_id", user.id).maybeSingle();
    return row;
  } else if (role === "rider") {
    const { data: row } = await supabase.from("rider_profiles").select("*").eq("user_id", user.id).maybeSingle();
    return row;
  } else if (role === "hospital") {
    const { data: row } = await supabase.from("hospital_profiles").select("*").eq("user_id", user.id).maybeSingle();
    return row;
  }
  return null;
}
