import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, status: 401, error: "No autenticado" };
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("email", user.email).maybeSingle();
  if (profile?.role !== "admin") return { ok: false, status: 403, error: "No autorizado" };
  return { ok: true };
}

// Dossier consolidado del alumno (profile.id)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  // 1) Profile + empresa
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*, companies!profiles_company_id_fkey(id, name, rut, legal_name)")
    .eq("id", id)
    .maybeSingle();

  if (!profile) return NextResponse.json({ error: "Alumno no encontrado" }, { status: 404 });

  // 2) Todas las inscripciones del alumno (por email para incluir legacy sin profile_id link)
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, course_id, session_id, status, delivery_mode, organization, company, company_id, folio_enae, final_score, grade_status, is_alumni, theoretical_start, practical_end, instruction_city, created_at, completed_at, courses(title, code, area, area_slug, modality, duration), sessions(dates, location, modality, fee)"
    )
    .eq("email", profile.email)
    .order("created_at", { ascending: false });

  const regIds = (regs || []).map((r: any) => r.id);

  // 3) Notas por inscripción (grade_items por curso y student_grades del alumno)
  let gradesByReg: Record<string, any[]> = {};
  if (regIds.length > 0) {
    const { data: grades } = await supabaseAdmin
      .from("student_grades")
      .select("registration_id, grade_item_id, score, comments, graded_at, grade_items(name, weight, is_practical)")
      .in("registration_id", regIds);
    for (const g of grades || []) {
      (gradesByReg[(g as any).registration_id] ||= []).push(g);
    }
  }

  // 4) Diplomas emitidos
  const { data: diplomas } = await supabaseAdmin
    .from("diplomas")
    .select("id, registration_id, verification_code, final_score, status, issued_date, course_title, course_code")
    .in("registration_id", regIds.length > 0 ? regIds : ["00000000-0000-0000-0000-000000000000"]);

  // 5) Billing cases vinculados (cotizaciones + facturas)
  let billingCases: any[] = [];
  if (regIds.length > 0) {
    const { data: links } = await supabaseAdmin
      .from("billing_case_registrations")
      .select("registration_id, billing_cases(id, company, company_id, quotation_number, quotation_amount, quotation_date, invoice_number, invoice_date, invoice_amount, payment_received_at, payment_amount, status, hes_number, oc_number)")
      .in("registration_id", regIds);
    billingCases = (links || []).map((l: any) => ({ registration_id: l.registration_id, ...(l.billing_cases || {}) }));
  }

  // 6) Pagos individuales (Webpay)
  let payments: any[] = [];
  if (regIds.length > 0) {
    const { data: pays } = await supabaseAdmin
      .from("payments")
      .select("id, registration_id, amount, currency, status, refund_amount, refunded_at, created_at")
      .in("registration_id", regIds)
      .order("created_at", { ascending: false });
    payments = pays || [];
  }

  // 7) Anotaciones internas
  const { data: notes } = await supabaseAdmin
    .from("student_notes")
    .select("*")
    .eq("profile_id", id)
    .order("created_at", { ascending: false });

  // 8) Encuestas respondidas
  let surveys: any[] = [];
  if (regIds.length > 0) {
    const { data: s } = await supabaseAdmin
      .from("survey_responses")
      .select("id, registration_id, questionnaire_type, module_name, created_at")
      .in("registration_id", regIds);
    surveys = s || [];
  }

  // 9) Resumen de accesos (último + count)
  let accessSummary = { lastAccess: null as string | null, totalAccess: 0 };
  if (regIds.length > 0) {
    const { data: lastLog } = await supabaseAdmin
      .from("course_access_log")
      .select("accessed_at")
      .in("registration_id", regIds)
      .order("accessed_at", { ascending: false })
      .limit(1);
    accessSummary.lastAccess = lastLog?.[0]?.accessed_at || null;
    const { count } = await supabaseAdmin
      .from("course_access_log")
      .select("id", { count: "exact", head: true })
      .in("registration_id", regIds);
    accessSummary.totalAccess = count || 0;
  }

  // 10) Histórico de empresas (derivado de registrations por orden de fecha)
  const companyHistory: Array<{ company: string; from: string; to: string | null }> = [];
  {
    const sorted = [...(regs || [])].sort((a: any, b: any) => (a.created_at || "").localeCompare(b.created_at || ""));
    let current: { company: string; from: string; to: string | null } | null = null;
    for (const r of sorted) {
      const co = r.organization || r.company;
      if (!co) continue;
      if (!current || current.company !== co) {
        if (current) current.to = r.created_at;
        current = { company: co, from: r.created_at, to: null };
        companyHistory.push(current);
      }
    }
  }

  return NextResponse.json({
    profile,
    registrations: regs || [],
    gradesByReg,
    diplomas: diplomas || [],
    billingCases,
    payments,
    notes: notes || [],
    surveys,
    accessSummary,
    companyHistory,
  });
}
