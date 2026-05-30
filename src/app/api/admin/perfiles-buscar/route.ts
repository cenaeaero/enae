import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// GET /api/admin/perfiles-buscar
//   ?email=foo@bar.com         → busca por email exacto (legacy)
//   ?q=carlos&company=elecnor  → búsqueda fuzzy por nombre/email/RUT y/o empresa
//
// Usa service_role para ignorar RLS — el buscador del frontend admin no debe
// depender de la configuración RLS ni de qué admin esté logueado.
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  const q = url.searchParams.get("q")?.trim() || "";
  const company = url.searchParams.get("company")?.trim() || "";

  // Modo legacy: por email exacto → devuelve { profile } o { profile: null }
  if (email) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, role")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    if (!data) return NextResponse.json({ profile: null });
    return NextResponse.json({ profile: data });
  }

  // Modo fuzzy: necesita q o company con 2+ chars
  if (q.length < 2 && company.length < 2) {
    return NextResponse.json({ profiles: [] });
  }

  let query = supabaseAdmin
    .from("profiles")
    .select(
      "id, first_name, last_name, email, rut, organization, organization_type, job_title, phone, secondary_phone, address, city, state, postal_code, country, supervisor_name, supervisor_email, role",
    );

  if (q.length >= 2) {
    const escaped = q.replace(/[%,]/g, " ");
    const pattern = `%${escaped}%`;
    query = query.or(
      `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},rut.ilike.${pattern}`,
    );
  }
  if (company.length >= 2) {
    const escapedCo = company.replace(/[%,]/g, " ");
    query = query.ilike("organization", `%${escapedCo}%`);
  }

  const { data, error } = await query.order("last_name").limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: data || [] });
}
