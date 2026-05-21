import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireSupervisor } from "@/lib/auth-supervisor";

// Devuelve resumen del supervisor:
//   - empresas a su cargo
//   - alumnos (un registration por curso) con su % de avance y nota
export async function GET() {
  const auth = await requireSupervisor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: companies } = await supabaseAdmin
    .from("companies").select("id, name, rut, legal_name")
    .in("id", auth.companyIds);

  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, course_id, status, delivery_mode, organization, company_id, folio_enae, final_score, grade_status, created_at, completed_at, courses(title, code, area, modality, duration), sessions(dates, location), first_name, last_name, email"
    )
    .in("company_id", auth.companyIds)
    .order("created_at", { ascending: false });

  // Última fecha de acceso por registration
  const regIds = (regs || []).map((r: any) => r.id);
  const accessByReg: Record<string, string> = {};
  if (regIds.length > 0) {
    const { data: logs } = await supabaseAdmin
      .from("course_access_log")
      .select("registration_id, accessed_at")
      .in("registration_id", regIds)
      .order("accessed_at", { ascending: false });
    for (const l of logs || []) {
      if (!accessByReg[(l as any).registration_id]) accessByReg[(l as any).registration_id] = (l as any).accessed_at;
    }
  }

  return NextResponse.json({
    companies: companies || [],
    registrations: (regs || []).map((r: any) => ({ ...r, last_access: accessByReg[r.id] || null })),
  });
}
