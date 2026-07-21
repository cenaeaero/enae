import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";

// Evaluación práctica en línea (formato ENAE-CHL-N1), una por asignación.
// El instructor dueño (o un admin) puede leerla y editarla.

async function checkOwnership(assignmentId: string, auth: { isAdmin?: boolean; email: string | null }) {
  const { data: a } = await supabaseAdmin
    .from("instructor_assignments")
    .select("id, instructor_email, city, scheduled_date, registrations(first_name, last_name, email)")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!a) return { ok: false as const, status: 404, error: "Asignación no encontrada" };
  if (!auth.isAdmin && a.instructor_email !== auth.email) {
    return { ok: false as const, status: 403, error: "No autorizado" };
  }
  return { ok: true as const, assignment: a as any };
}

// GET ?assignment_id=... → { evaluation | null, defaults }
export async function GET(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const assignmentId = new URL(request.url).searchParams.get("assignment_id");
  if (!assignmentId) return NextResponse.json({ error: "assignment_id requerido" }, { status: 400 });

  const own = await checkOwnership(assignmentId, auth);
  if (!own.ok) return NextResponse.json({ error: own.error }, { status: own.status });

  const { data: evaluation } = await supabaseAdmin
    .from("practical_evaluations")
    .select("*")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  // Datos por defecto desde la asignación y el perfil del alumno
  const reg = own.assignment.registrations;
  let rut: string | null = null;
  if (reg?.email) {
    const { data: prof } = await supabaseAdmin.from("profiles").select("rut").ilike("email", reg.email).limit(1).maybeSingle();
    rut = prof?.rut || null;
  }
  const defaults = {
    student_name: reg ? `${reg.first_name || ""} ${reg.last_name || ""}`.trim() : "",
    student_document: rut || "",
    city: own.assignment.city || "",
    eval_date: own.assignment.scheduled_date || null,
  };

  return NextResponse.json({ evaluation: evaluation || null, defaults });
}

// PUT { assignment_id, student_name, student_document, city, eval_date,
//       items, pre_solo_result, observations, complete? } → upsert
export async function PUT(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const assignmentId = body.assignment_id;
  if (!assignmentId) return NextResponse.json({ error: "assignment_id requerido" }, { status: 400 });

  const own = await checkOwnership(assignmentId, auth);
  if (!own.ok) return NextResponse.json({ error: own.error }, { status: own.status });

  const now = new Date().toISOString();
  const record: Record<string, any> = {
    assignment_id: assignmentId,
    instructor_email: own.assignment.instructor_email,
    student_name: body.student_name || null,
    student_document: body.student_document || null,
    city: body.city || null,
    eval_date: body.eval_date || null,
    items: body.items && typeof body.items === "object" ? body.items : {},
    pre_solo_result: body.pre_solo_result === "aprobado" || body.pre_solo_result === "reprobado" ? body.pre_solo_result : null,
    observations: body.observations || null,
    updated_at: now,
  };
  if (body.complete === true) {
    record.status = "completed";
    record.completed_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from("practical_evaluations")
    .upsert(record, { onConflict: "assignment_id" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ evaluation: data });
}
