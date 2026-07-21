import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from("instructor_fees")
    .select(
      "*, instructor_assignments(kind, scheduled_date, registration_id), registrations(first_name, last_name, courses(title, code))"
    )
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fees: data || [] });
}

// Admin propone honorario al instructor (status='proposed')
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.instructor_email || !body.amount) {
    return NextResponse.json({ error: "instructor_email y amount requeridos" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("instructor_fees")
    .insert({
      assignment_id: body.assignment_id || null,
      instructor_email: body.instructor_email,
      registration_id: body.registration_id || null,
      amount: Number(body.amount),
      proposed_by: "admin",
      status: "proposed",
      notes: body.notes || null,
    }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notifica al instructor con los datos de los alumnos incluidos
  try {
    const assignmentIds: string[] = Array.isArray(body.assignment_ids) && body.assignment_ids.length > 0
      ? body.assignment_ids
      : (body.assignment_id ? [body.assignment_id] : []);

    const students: { name: string; email: string | null; phone: string | null; course?: string | null; date?: string | null }[] = [];
    if (assignmentIds.length > 0) {
      const { data: asgs } = await supabaseAdmin
        .from("instructor_assignments")
        .select("id, scheduled_date, registrations(first_name, last_name, email, courses(title))")
        .in("id", assignmentIds);
      const emails = (asgs || []).map((a: any) => a.registrations?.email).filter(Boolean);
      const phoneByEmail: Record<string, string | null> = {};
      if (emails.length > 0) {
        const { data: profs } = await supabaseAdmin.from("profiles").select("email, phone").in("email", emails);
        for (const p of profs || []) if (p.email) phoneByEmail[p.email.toLowerCase()] = p.phone;
      }
      for (const a of (asgs || []) as any[]) {
        const r = a.registrations;
        if (!r) continue;
        students.push({
          name: `${r.last_name || ""}, ${r.first_name || ""}`.replace(/^, /, "").trim(),
          email: r.email || null,
          phone: phoneByEmail[(r.email || "").toLowerCase()] || null,
          course: r.courses?.title || null,
          date: a.scheduled_date || null,
        });
      }
    }

    const { sendInstructorFeeProposedNotification } = await import("@/lib/email");
    await sendInstructorFeeProposedNotification({
      instructorEmail: body.instructor_email,
      amount: Number(body.amount),
      students,
      notes: body.notes || null,
    });
  } catch (e) { console.error(e); }

  return NextResponse.json({ fee: data });
}

// PATCH → admin actualiza datos de pago
//   body: { id, payment_date, payment_amount, payment_bank, payment_reference }
//   o    { id, status: 'paid' }
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const updates: Record<string, any> = {};
  for (const k of ["amount","payment_date","payment_amount","payment_bank","payment_reference","notes","status"]) {
    if (k in body) updates[k] = body[k];
  }
  // Si vienen datos de pago y no status, asume "paid"
  if ((updates.payment_date || updates.payment_amount) && !("status" in body)) {
    updates.status = "paid";
  }

  const { data, error } = await supabaseAdmin
    .from("instructor_fees").update(updates).eq("id", body.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fee: data });
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const { error } = await supabaseAdmin.from("instructor_fees").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
