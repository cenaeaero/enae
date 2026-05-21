import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { normalizeOrganization } from "@/lib/organization";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, status: 401, error: "No autenticado" };
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();
  if (profile?.role !== "admin") return { ok: false, status: 403, error: "No autorizado" };
  return { ok: true };
}

// Re-evalúa el status derivado a partir de los timestamps que ya cargó el admin.
// (El trigger también lo hace en BD, pero acá lo dejamos consistente con la UI.)
function deriveStatus(c: any): string {
  if (c.payment_received_at) return "paid";
  if (c.invoice_date) {
    const due = c.payment_due_date
      ? new Date(c.payment_due_date)
      : new Date(new Date(c.invoice_date).getTime() + 30 * 86400000);
    if (due.getTime() < Date.now()) return "overdue";
    return "invoiced";
  }
  if (c.hes_received_at) return "to_invoice";
  if (c.oc_received_at) return "hes_pending";
  if (c.quotation_sent_at || c.quotation_number) return "oc_pending";
  return "draft";
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const view = url.searchParams.get("view") || "cases";

  if (view === "summary") {
    const { data, error } = await supabaseAdmin
      .from("billing_company_summary")
      .select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ summary: data || [] });
  }

  // view=cases: lista completa con joins ligeros
  const { data, error } = await supabaseAdmin
    .from("billing_cases")
    .select(
      "*, courses(title, code), sessions(dates, location), billing_case_registrations(registration_id, registrations(id, first_name, last_name, email, status, grade_status, final_score))"
    )
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ cases: data || [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const payload: Record<string, any> = {
    company: normalizeOrganization(body.company) || body.company,
    company_id: body.company_id || null,
    course_id: body.course_id || null,
    session_id: body.session_id || null,
    contact_name: body.contact_name || null,
    contact_email: body.contact_email || null,
    contact_phone: body.contact_phone || null,
    quotation_number: body.quotation_number || null,
    quotation_date: body.quotation_date || null,
    quotation_amount: body.quotation_amount ?? 0,
    notes: body.notes || null,
    status: "quoted",
  };

  if (!payload.company && !payload.company_id) {
    return NextResponse.json({ error: "company es requerido" }, { status: 400 });
  }
  // Si vino company_id pero no name, lo resolvemos
  if (payload.company_id && !payload.company) {
    const { data: c } = await supabaseAdmin.from("companies").select("name").eq("id", payload.company_id).maybeSingle();
    if (c?.name) payload.company = c.name;
  }

  const { data, error } = await supabaseAdmin
    .from("billing_cases")
    .insert(payload)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Vincular alumnos si vinieron registration_ids
  if (Array.isArray(body.registration_ids) && body.registration_ids.length > 0) {
    await supabaseAdmin.from("billing_case_registrations").insert(
      body.registration_ids.map((rid: string) => ({
        billing_case_id: data.id,
        registration_id: rid,
      }))
    );
  }

  return NextResponse.json({ case: data });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  if (updates.company) {
    updates.company = normalizeOrganization(updates.company) || updates.company;
  }
  // Si vino company_id, resolver name
  if (updates.company_id) {
    const { data: c } = await supabaseAdmin.from("companies").select("name").eq("id", updates.company_id).maybeSingle();
    if (c?.name) updates.company = c.name;
  }
  // No dejamos al cliente forzar status si pasa por aquí — lo derivamos
  if ("status" in updates) delete updates.status;
  updates.status = deriveStatus({ ...updates });

  const { data, error } = await supabaseAdmin
    .from("billing_cases")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ case: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const { error } = await supabaseAdmin.from("billing_cases").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
