import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

// API del ALUMNO para su clase práctica:
//   GET               → lista sus asignaciones (instructor, fecha, hora, lugar, estado evaluación)
//   GET ?assignment_id → detalle con la evaluación completa (solo lectura)
//   POST { assignment_id, signature_name } → firma electrónica de la evaluación

async function requireStudent() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, status: 401, error: "No autenticado", email: "" };
  return { ok: true as const, email: user.email.toLowerCase() };
}

async function loadOwnedAssignment(assignmentId: string, studentEmail: string) {
  const { data: a } = await supabaseAdmin
    .from("instructor_assignments")
    .select("id, instructor_email, registration_id, kind, city, scheduled_date, start_time, location_name, location_url, status, registrations(id, email, first_name, last_name, courses(title, code))")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!a) return null;
  const regEmail = ((a as any).registrations?.email || "").toLowerCase();
  if (regEmail !== studentEmail) return null;
  return a as any;
}

async function instructorInfo(email: string) {
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("first_name, last_name, phone, email")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  return {
    name: prof ? `${prof.first_name || ""} ${prof.last_name || ""}`.trim() : email,
    email: prof?.email || email,
    phone: prof?.phone || null,
  };
}

export async function GET(request: Request) {
  const auth = await requireStudent();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const assignmentId = new URL(request.url).searchParams.get("assignment_id");

  // Detalle de una asignación + evaluación
  if (assignmentId) {
    const a = await loadOwnedAssignment(assignmentId, auth.email);
    if (!a) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const { data: evaluation } = await supabaseAdmin
      .from("practical_evaluations")
      .select("*")
      .eq("assignment_id", assignmentId)
      .maybeSingle();

    return NextResponse.json({
      assignment: {
        id: a.id,
        kind: a.kind,
        city: a.city,
        scheduled_date: a.scheduled_date,
        start_time: a.start_time,
        location_name: a.location_name,
        location_url: a.location_url,
        status: a.status,
        course: a.registrations?.courses?.title || null,
      },
      instructor: await instructorInfo(a.instructor_email),
      evaluation: evaluation || null,
    });
  }

  // Listado de todas sus prácticas
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("id")
    .ilike("email", auth.email);
  const regIds = (regs || []).map((r) => r.id);
  if (regIds.length === 0) return NextResponse.json({ practicas: [] });

  const { data: asgs } = await supabaseAdmin
    .from("instructor_assignments")
    .select("id, instructor_email, kind, city, scheduled_date, start_time, location_name, location_url, status, registrations(courses(title, code)), practical_evaluations(id, status, completed_at, student_signed_at)")
    .in("registration_id", regIds)
    .order("scheduled_date", { ascending: true });

  const practicas = [] as any[];
  for (const a of (asgs || []) as any[]) {
    const pe = Array.isArray(a.practical_evaluations) ? a.practical_evaluations[0] : a.practical_evaluations;
    practicas.push({
      id: a.id,
      kind: a.kind,
      city: a.city,
      scheduled_date: a.scheduled_date,
      start_time: a.start_time,
      location_name: a.location_name,
      location_url: a.location_url,
      status: a.status,
      course: a.registrations?.courses?.title || null,
      instructor: await instructorInfo(a.instructor_email),
      evaluation: pe ? { id: pe.id, status: pe.status, completed_at: pe.completed_at, student_signed_at: pe.student_signed_at } : null,
    });
  }

  return NextResponse.json({ practicas });
}

export async function POST(request: Request) {
  const auth = await requireStudent();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const assignmentId = body.assignment_id;
  const signatureName = (body.signature_name || "").trim();
  if (!assignmentId || !signatureName) {
    return NextResponse.json({ error: "assignment_id y signature_name requeridos" }, { status: 400 });
  }
  if (signatureName.length < 5) {
    return NextResponse.json({ error: "Escribe tu nombre completo para firmar" }, { status: 400 });
  }

  const a = await loadOwnedAssignment(assignmentId, auth.email);
  if (!a) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const { data: evaluation } = await supabaseAdmin
    .from("practical_evaluations")
    .select("id, status, student_signed_at")
    .eq("assignment_id", assignmentId)
    .maybeSingle();
  if (!evaluation) return NextResponse.json({ error: "La evaluación aún no ha sido registrada por el instructor" }, { status: 400 });
  if (evaluation.status !== "completed") return NextResponse.json({ error: "La evaluación aún no está completada por el instructor" }, { status: 400 });
  if (evaluation.student_signed_at) return NextResponse.json({ error: "La evaluación ya fue firmada" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("practical_evaluations")
    .update({
      student_signature_name: signatureName,
      student_signed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", evaluation.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
