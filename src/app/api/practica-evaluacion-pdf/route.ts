import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { generateCompletedPracticaPdf } from "@/lib/practica-form-pdf";

// PDF del formato N1 completado y firmado (archivo ISO 9001 / DGAC).
// GET ?assignment_id=...
// Acceso: el instructor dueño de la asignación, un admin, o el propio alumno.
export async function GET(request: Request) {
  const assignmentId = new URL(request.url).searchParams.get("assignment_id");
  if (!assignmentId) return NextResponse.json({ error: "assignment_id requerido" }, { status: 400 });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const viewer = user.email.toLowerCase();

  const { data: a } = await supabaseAdmin
    .from("instructor_assignments")
    .select("id, instructor_email, city, scheduled_date, start_time, location_name, registrations(first_name, last_name, email, folio_enae, courses(title, code))")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!a) return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });

  const { data: viewerProfile } = await supabaseAdmin
    .from("profiles").select("role").ilike("email", viewer).limit(1).maybeSingle();
  const isAdmin = viewerProfile?.role === "admin";
  const isInstructor = (a as any).instructor_email?.toLowerCase() === viewer;
  const studentEmail = ((a as any).registrations?.email || "").toLowerCase();
  const isStudent = studentEmail === viewer;
  if (!isAdmin && !isInstructor && !isStudent) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data: ev } = await supabaseAdmin
    .from("practical_evaluations")
    .select("*")
    .eq("assignment_id", assignmentId)
    .maybeSingle();
  if (!ev) return NextResponse.json({ error: "La evaluación aún no ha sido registrada" }, { status: 404 });

  // El alumno solo puede descargarla una vez completada por el instructor
  if (isStudent && !isAdmin && !isInstructor && ev.status !== "completed") {
    return NextResponse.json({ error: "La evaluación aún no está completada" }, { status: 403 });
  }

  const reg = (a as any).registrations;

  // RUT del alumno (vive en profiles) y nombre del instructor
  let rut = ev.student_document || "";
  if (!rut && reg?.email) {
    const { data: sp } = await supabaseAdmin.from("profiles").select("rut").ilike("email", reg.email).limit(1).maybeSingle();
    rut = sp?.rut || "";
  }
  const { data: ip } = await supabaseAdmin
    .from("profiles").select("first_name, last_name").ilike("email", (a as any).instructor_email).limit(1).maybeSingle();

  const pdf = generateCompletedPracticaPdf({
    student_name: ev.student_name || (reg ? `${reg.first_name || ""} ${reg.last_name || ""}`.trim() : ""),
    student_document: rut,
    folio: reg?.folio_enae || "",
    course: reg?.courses?.title || "",
    course_code: reg?.courses?.code || "",
    city: ev.city || (a as any).city || "",
    date: ev.eval_date || (a as any).scheduled_date || "",
    time: (a as any).start_time || "",
    location: (a as any).location_name || "",
    instructor_name: ip ? `${ip.first_name || ""} ${ip.last_name || ""}`.trim() : "",
    instructor_email: (a as any).instructor_email,
    items: ev.items || {},
    pre_solo_result: ev.pre_solo_result,
    observations: ev.observations,
    status: ev.status,
    completed_at: ev.completed_at,
    signature_name: ev.student_signature_name,
    signed_at: ev.student_signed_at,
  });

  const slug = (ev.student_name || reg?.last_name || "alumno").replace(/[^\p{L}\p{N}]+/gu, "-");
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Evaluacion-N1-firmada-${slug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
