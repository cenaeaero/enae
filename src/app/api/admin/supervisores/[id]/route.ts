import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// Detalle de un supervisor (profile_id):
//   - perfil
//   - empresas a su cargo
//   - alumnos (registrations) con avance, notas, último acceso, contacto
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: profileId } = await ctx.params;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email, rut, phone, role, organization, job_title")
    .eq("id", profileId)
    .single();
  if (!profile) return NextResponse.json({ error: "Supervisor no encontrado" }, { status: 404 });

  const { data: links } = await supabaseAdmin
    .from("company_supervisors")
    .select("id, slot, company_id, created_at, companies(id, name, rut, legal_name)")
    .eq("profile_id", profileId)
    .order("created_at");

  const companies = (links || []).map((l: any) => ({
    link_id: l.id,
    slot: l.slot,
    id: l.companies?.id,
    name: l.companies?.name,
    rut: l.companies?.rut,
    legal_name: l.companies?.legal_name,
  }));

  const companyIds = companies.map((c) => c.id).filter(Boolean);

  let registrations: any[] = [];
  if (companyIds.length > 0) {
    const { data: regs } = await supabaseAdmin
      .from("registrations")
      .select(
        "id, course_id, status, delivery_mode, organization, company_id, folio_enae, final_score, grade_status, created_at, completed_at, courses(title, code, area, modality, duration), sessions(dates, location), first_name, last_name, email, phone, job_title",
      )
      .in("company_id", companyIds)
      .order("created_at", { ascending: false });

    const regIds = (regs || []).map((r: any) => r.id);
    const accessByReg: Record<string, string> = {};
    if (regIds.length > 0) {
      const { data: logs } = await supabaseAdmin
        .from("course_access_log")
        .select("registration_id, accessed_at")
        .in("registration_id", regIds)
        .order("accessed_at", { ascending: false });
      for (const l of logs || []) {
        const rid = (l as any).registration_id;
        if (!accessByReg[rid]) accessByReg[rid] = (l as any).accessed_at;
      }
    }

    registrations = (regs || []).map((r: any) => ({
      ...r,
      last_access: accessByReg[r.id] || null,
    }));
  }

  return NextResponse.json({ profile, companies, registrations });
}

// POST: { company_id, slot } → asigna una empresa al supervisor (reusa company_supervisors)
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: profileId } = await ctx.params;
  const body = await request.json();
  const { company_id, slot } = body;
  if (!company_id || ![1, 2, 3].includes(Number(slot))) {
    return NextResponse.json({ error: "company_id y slot(1..3) requeridos" }, { status: 400 });
  }

  // Limpia ocupación previa del slot en esa empresa, y dup. del mismo profile
  await supabaseAdmin.from("company_supervisors").delete().eq("company_id", company_id).eq("slot", slot);
  await supabaseAdmin.from("company_supervisors").delete().eq("company_id", company_id).eq("profile_id", profileId);

  const { data, error } = await supabaseAdmin
    .from("company_supervisors")
    .insert({ company_id, profile_id: profileId, slot: Number(slot) })
    .select("id, slot, company_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data });
}
