import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireSupervisor } from "@/lib/auth-supervisor";

// Lista los billing_cases de la(s) empresa(s) del supervisor.
// Admin con ?as_company=X filtra a esa empresa.
export async function GET(request: Request) {
  const auth = await requireSupervisor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const asCompany = new URL(request.url).searchParams.get("as_company");
  const effective = asCompany && auth.isAdmin ? [asCompany] : auth.companyIds;

  const { data: cases } = await supabaseAdmin
    .from("billing_cases")
    .select(
      "id, company, company_id, course_id, session_id, quotation_number, quotation_date, quotation_amount, oc_number, oc_received_at, hes_number, hes_received_at, invoice_number, invoice_date, invoice_amount, payment_due_date, payment_received_at, payment_amount, payment_reference, status, notes, created_at, courses(title, code), sessions(dates, location), billing_case_registrations(registration_id, registrations(first_name, last_name, email))"
    )
    .in("company_id", effective)
    .order("created_at", { ascending: false });

  return NextResponse.json({ cases: cases || [] });
}
