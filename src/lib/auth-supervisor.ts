import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

// Verifica que el usuario sea supervisor de al menos una empresa, o admin.
// Devuelve también los company_ids que supervisa.
export async function requireSupervisor() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, status: 401, error: "No autenticado", companyIds: [] as string[] };
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("id, role").eq("email", user.email).maybeSingle();
  if (!profile) return { ok: false as const, status: 403, error: "Sin perfil", companyIds: [] };
  if (profile.role === "admin") {
    // admin ve todas las empresas
    const { data: all } = await supabaseAdmin.from("companies").select("id");
    return {
      ok: true as const, email: user.email, profileId: profile.id, isAdmin: true,
      companyIds: (all || []).map((c: any) => c.id) as string[],
    };
  }
  if (profile.role !== "supervisor") {
    return { ok: false as const, status: 403, error: "No autorizado", companyIds: [] };
  }
  const { data: links } = await supabaseAdmin
    .from("company_supervisors").select("company_id").eq("profile_id", profile.id);
  const companyIds = (links || []).map((l: any) => l.company_id);
  if (companyIds.length === 0) {
    return { ok: false as const, status: 403, error: "Sin empresa asignada", companyIds: [] };
  }
  return {
    ok: true as const, email: user.email, profileId: profile.id, isAdmin: false,
    companyIds,
  };
}
