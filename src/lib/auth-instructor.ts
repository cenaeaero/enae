import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function requireInstructor() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, status: 401, error: "No autenticado", email: null };
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("id, role").eq("email", user.email).maybeSingle();
  if (!profile || (profile.role !== "instructor" && profile.role !== "admin")) {
    return { ok: false as const, status: 403, error: "No autorizado", email: null };
  }
  return { ok: true as const, email: user.email, profileId: profile.id, isAdmin: profile.role === "admin" };
}

export async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, status: 401, error: "No autenticado", email: null };
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("email", user.email).maybeSingle();
  if (profile?.role !== "admin") return { ok: false as const, status: 403, error: "No autorizado", email: null };
  return { ok: true as const, email: user.email };
}
