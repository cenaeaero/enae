import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";

// GET → lista de honorarios del instructor logueado (o todos si admin)
export async function GET(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const u = new URL(request.url);
  const status = u.searchParams.get("status");
  const asInstructor = u.searchParams.get("as_instructor");

  let q = supabaseAdmin
    .from("instructor_fees")
    .select(
      "*, instructor_assignments(kind, scheduled_date, registration_id), registrations(first_name, last_name, courses(title, code))"
    )
    .order("created_at", { ascending: false });

  if (auth.isAdmin && asInstructor) q = q.eq("instructor_email", asInstructor);
  else if (!auth.isAdmin) q = q.eq("instructor_email", auth.email);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fees: data || [] });
}

// PATCH → instructor aprueba un honorario propuesto por admin
//          body: { id, action: "approve" | "reject" }
export async function PATCH(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.id || !body.action) return NextResponse.json({ error: "id y action requeridos" }, { status: 400 });

  const { data: fee } = await supabaseAdmin.from("instructor_fees").select("*").eq("id", body.id).maybeSingle();
  if (!fee) return NextResponse.json({ error: "Honorario no encontrado" }, { status: 404 });
  if (!auth.isAdmin && fee.instructor_email !== auth.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (fee.status !== "proposed") {
    return NextResponse.json({ error: `No se puede ${body.action} un honorario en estado "${fee.status}"` }, { status: 400 });
  }

  const updates: Record<string, any> =
    body.action === "approve"
      ? { status: "approved", approved_at: new Date().toISOString() }
      : { status: "rejected" };

  const { data, error } = await supabaseAdmin
    .from("instructor_fees").update(updates).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notifica al admin
  try {
    const { sendAdminFeeStatusNotification } = await import("@/lib/email");
    await sendAdminFeeStatusNotification({
      instructorEmail: fee.instructor_email,
      amount: fee.amount,
      action: body.action,
    });
  } catch (e) {
    console.error("Email failed:", e);
  }

  return NextResponse.json({ fee: data });
}
