import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireSupervisor } from "@/lib/auth-supervisor";

// Dossier del alumno para supervisor (sin datos internos sensibles)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSupervisor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, first_name, last_name, email, rut, folio_enae, birth_date, phone, secondary_phone, job_title, organization, city, state, country, address, company_id, avatar_url, corporate_email, personal_email, companies!profiles_company_id_fkey(id, name, legal_name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!auth.isAdmin && !auth.companyIds.includes((profile as any).company_id)) {
    // Permite igualmente si tiene registrations en empresa del supervisor
    const { data: anyReg } = await supabaseAdmin
      .from("registrations").select("company_id")
      .eq("email", profile.email).in("company_id", auth.companyIds).limit(1);
    if (!anyReg || anyReg.length === 0) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  // Inscripciones
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, course_id, session_id, status, delivery_mode, folio_enae, final_score, grade_status, created_at, completed_at, courses(title, code, modality, duration, has_dgac_certificate), sessions(dates, location)"
    )
    .eq("email", profile.email)
    .order("created_at", { ascending: false });
  const regIds = (regs || []).map((r: any) => r.id);

  // Diplomas
  const { data: diplomas } = await supabaseAdmin
    .from("diplomas")
    .select("registration_id, verification_code, final_score, status, issued_date")
    .in("registration_id", regIds.length > 0 ? regIds : ["00000000-0000-0000-0000-000000000000"]);

  // Módulos + progreso por inscripción
  const courseIds = Array.from(new Set((regs || []).map((r: any) => r.course_id)));
  let modulesByCourse: Record<string, any[]> = {};
  let progressByReg: Record<string, any[]> = {};
  if (courseIds.length > 0) {
    const { data: mods } = await supabaseAdmin
      .from("course_modules")
      .select("id, course_id, title, sort_order, duration_hours")
      .in("course_id", courseIds)
      .order("sort_order");
    for (const m of mods || []) (modulesByCourse[(m as any).course_id] ||= []).push(m);

    if (regIds.length > 0) {
      const { data: prog } = await supabaseAdmin
        .from("module_progress")
        .select("registration_id, module_id, status, completed_at")
        .in("registration_id", regIds);
      for (const p of prog || []) (progressByReg[(p as any).registration_id] ||= []).push(p);
    }
  }

  // Calificaciones por inscripción
  let gradesByReg: Record<string, any[]> = {};
  if (regIds.length > 0) {
    const { data: grades } = await supabaseAdmin
      .from("student_grades")
      .select("registration_id, grade_item_id, score, graded_at, grade_items(name, weight, is_practical)")
      .in("registration_id", regIds);
    for (const g of grades || []) (gradesByReg[(g as any).registration_id] ||= []).push(g);
  }

  // Accesos
  let accessByReg: Record<string, { count: number; last: string | null }> = {};
  if (regIds.length > 0) {
    const { data: logs } = await supabaseAdmin
      .from("course_access_log")
      .select("registration_id, accessed_at")
      .in("registration_id", regIds)
      .order("accessed_at", { ascending: false });
    for (const l of logs || []) {
      const rid = (l as any).registration_id;
      accessByReg[rid] ||= { count: 0, last: null };
      accessByReg[rid].count++;
      if (!accessByReg[rid].last) accessByReg[rid].last = (l as any).accessed_at;
    }
  }

  // Facturación: casos B2B donde aparece el alumno
  let billingCases: any[] = [];
  if (regIds.length > 0) {
    const { data: links } = await supabaseAdmin
      .from("billing_case_registrations")
      .select("registration_id, billing_cases(id, quotation_number, quotation_amount, quotation_date, invoice_number, invoice_date, invoice_amount, payment_received_at, payment_amount, status, company)")
      .in("registration_id", regIds);
    billingCases = (links || []).map((l: any) => ({ registration_id: l.registration_id, ...(l.billing_cases || {}) }));
  }

  return NextResponse.json({
    profile,
    registrations: regs || [],
    diplomas: diplomas || [],
    modulesByCourse,
    progressByReg,
    gradesByReg,
    accessByReg,
    billingCases,
  });
}
