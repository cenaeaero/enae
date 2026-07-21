import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";
import { computePracticalScore } from "@/lib/practical-eval-format";

// Evaluación práctica en línea (formato ENAE-CHL-N1), una por asignación.
// El instructor dueño (o un admin) puede leerla y editarla.

async function checkOwnership(assignmentId: string, auth: { isAdmin?: boolean; email: string | null }) {
  const { data: a } = await supabaseAdmin
    .from("instructor_assignments")
    .select("id, instructor_email, registration_id, city, scheduled_date, start_time, location_name, location_url, registrations(first_name, last_name, email, folio_enae, course_id)")
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
  let phone: string | null = null;
  if (reg?.email) {
    const { data: prof } = await supabaseAdmin.from("profiles").select("rut, phone").ilike("email", reg.email).limit(1).maybeSingle();
    rut = prof?.rut || null;
    phone = prof?.phone || null;
  }
  const defaults = {
    student_name: reg ? `${reg.first_name || ""} ${reg.last_name || ""}`.trim() : "",
    student_document: rut || "",
    student_folio: reg?.folio_enae || "",
    student_phone: phone || "",
    city: own.assignment.city || "",
    eval_date: own.assignment.scheduled_date || null,
    start_time: own.assignment.start_time || "",
    location_name: own.assignment.location_name || "",
    location_url: own.assignment.location_url || "",
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

  // Nota práctica automática a partir de los ejercicios (excluye "No Aplica")
  const score = computePracticalScore(record.items || {});

  const { data, error } = await supabaseAdmin
    .from("practical_evaluations")
    .upsert(record, { onConflict: "assignment_id" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Al COMPLETAR, vuelca la nota práctica automáticamente a la asignación y al
  // libro de notas del alumno (sección de evaluaciones / calificaciones).
  if (body.complete === true && score != null) {
    const regId = own.assignment.registration_id;
    const courseId = own.assignment.registrations?.course_id;

    await supabaseAdmin
      .from("instructor_assignments")
      .update({ grade_practical: score })
      .eq("id", assignmentId);

    if (regId && courseId) {
      const { data: gitems } = await supabaseAdmin
        .from("grade_items")
        .select("id, name, is_practical")
        .eq("course_id", courseId);
      const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const pracItem = (gitems || []).find((i: any) => i.is_practical || /practic|vuelo/.test(norm(i.name)));
      if (pracItem) {
        await supabaseAdmin.from("student_grades").upsert({
          registration_id: regId,
          grade_item_id: pracItem.id,
          score,
          comments: `Nota práctica automática (formato N1) — instructor ${own.assignment.instructor_email}`,
          graded_at: now,
        }, { onConflict: "registration_id,grade_item_id" });
      }
    }
  }

  return NextResponse.json({ evaluation: data, score });
}
