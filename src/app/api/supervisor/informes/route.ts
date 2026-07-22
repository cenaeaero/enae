import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireSupervisor } from "@/lib/auth-supervisor";

// Datos consolidados para el centro de Informes del supervisor:
// alumnos de sus empresas + avance por módulos + diplomas/certificados + notas.
export async function GET(request: Request) {
  const auth = await requireSupervisor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const asCompany = new URL(request.url).searchParams.get("as_company");
  const companyIds = asCompany && auth.isAdmin ? [asCompany] : auth.companyIds;

  const { data: companies } = await supabaseAdmin
    .from("companies").select("id, name, rut, legal_name").in("id", companyIds);

  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("id, course_id, status, delivery_mode, organization, company_id, folio_enae, final_score, grade_status, created_at, completed_at, first_name, last_name, email, courses(title, code, area, modality, duration, has_dgac_certificate), sessions(dates, location)")
    .in("company_id", companyIds)
    .order("created_at", { ascending: false });

  const rows = regs || [];
  const regIds = rows.map((r: any) => r.id);
  const empty = ["00000000-0000-0000-0000-000000000000"];

  // Folio y RUT viven en profiles (registrations suele traerlos vacíos)
  const emails = Array.from(new Set(rows.map((r: any) => r.email).filter(Boolean)));
  const profByEmail: Record<string, { rut: string | null; folio: string | null }> = {};
  if (emails.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("email, rut, folio_enae").in("email", emails);
    for (const p of profs || []) {
      if (p.email) profByEmail[p.email.toLowerCase()] = { rut: p.rut, folio: p.folio_enae };
    }
  }

  // Diplomas / certificados emitidos
  const { data: diplomas } = await supabaseAdmin
    .from("diplomas")
    .select("registration_id, verification_code, final_score, status, issued_date")
    .in("registration_id", regIds.length ? regIds : empty);

  // Avance por módulos (para el estado de avance)
  const courseIds = Array.from(new Set(rows.map((r: any) => r.course_id).filter(Boolean)));
  const modulesPerCourse: Record<string, number> = {};
  if (courseIds.length > 0) {
    const { data: mods } = await supabaseAdmin
      .from("course_modules").select("id, course_id").in("course_id", courseIds);
    for (const m of mods || []) modulesPerCourse[(m as any).course_id] = (modulesPerCourse[(m as any).course_id] || 0) + 1;
  }
  const doneByReg: Record<string, number> = {};
  if (regIds.length > 0) {
    const { data: prog } = await supabaseAdmin
      .from("module_progress")
      .select("registration_id, status")
      .in("registration_id", regIds);
    for (const p of prog || []) {
      if ((p as any).status === "completed") doneByReg[(p as any).registration_id] = (doneByReg[(p as any).registration_id] || 0) + 1;
    }
  }

  // Último acceso
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

  const dipByReg: Record<string, any> = {};
  for (const d of diplomas || []) dipByReg[(d as any).registration_id] = d;

  const students = rows.map((r: any) => {
    const total = modulesPerCourse[r.course_id] || 0;
    const done = doneByReg[r.id] || 0;
    const p = profByEmail[(r.email || "").toLowerCase()];
    return {
      id: r.id,
      name: `${r.last_name || ""}, ${r.first_name || ""}`.replace(/^, /, "").trim() || r.email,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      rut: p?.rut || null,
      folio: p?.folio || r.folio_enae || null,
      organization: r.organization || null,
      company_id: r.company_id,
      course: r.courses?.title || null,
      course_code: r.courses?.code || null,
      course_area: r.courses?.area || null,
      modality: r.courses?.modality || r.delivery_mode || null,
      duration: r.courses?.duration || null,
      session: r.sessions?.dates || null,
      location: r.sessions?.location || null,
      status: r.status,
      final_score: r.final_score,
      grade_status: r.grade_status,
      created_at: r.created_at,
      completed_at: r.completed_at,
      last_access: accessByReg[r.id] || null,
      modules_total: total,
      modules_done: done,
      progress: total > 0 ? Math.round((done / total) * 100) : (r.status === "completed" ? 100 : 0),
      diploma: dipByReg[r.id] || null,
      has_dgac_certificate: r.courses?.has_dgac_certificate === true,
    };
  });

  return NextResponse.json({ companies: companies || [], students });
}
