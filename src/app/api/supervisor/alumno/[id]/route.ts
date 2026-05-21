import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireSupervisor } from "@/lib/auth-supervisor";

// Devuelve el dossier ACOTADO para supervisor (sin notas internas/anotaciones/montos)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSupervisor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, last_name, email, rut, folio_enae, phone, job_title, organization, company_id, companies!profiles_company_id_fkey(id, name, legal_name)")
    .eq("id", id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!auth.isAdmin && !auth.companyIds.includes((profile as any).company_id)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select(
      "id, course_id, status, delivery_mode, folio_enae, final_score, grade_status, created_at, completed_at, courses(title, code, modality, duration), sessions(dates, location)"
    )
    .eq("email", profile.email)
    .order("created_at", { ascending: false });

  const regIds = (regs || []).map((r: any) => r.id);
  const { data: diplomas } = await supabaseAdmin
    .from("diplomas")
    .select("registration_id, verification_code, final_score, status, issued_date")
    .in("registration_id", regIds.length > 0 ? regIds : ["00000000-0000-0000-0000-000000000000"]);

  return NextResponse.json({ profile, registrations: regs || [], diplomas: diplomas || [] });
}
