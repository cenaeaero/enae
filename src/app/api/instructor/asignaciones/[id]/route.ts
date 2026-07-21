import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";

async function fetchAssignment(id: string) {
  // OJO: rut NO existe en registrations (vive en profiles) — se adjunta abajo.
  const { data } = await supabaseAdmin
    .from("instructor_assignments")
    .select(
      "*, registrations(id, first_name, last_name, email, folio_enae, organization, company, course_id, status, final_score, grade_status, courses(title, code, duration, modality, has_dgac_certificate), sessions(dates, location, modality))"
    )
    .eq("id", id)
    .maybeSingle();
  if (data?.registrations?.email) {
    const { data: prof } = await supabaseAdmin
      .from("profiles").select("rut, phone").ilike("email", data.registrations.email).limit(1).maybeSingle();
    (data.registrations as any).rut = prof?.rut || null;
    (data.registrations as any).phone = prof?.phone || null;
  }
  return data;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  const a = await fetchAssignment(id);
  if (!a) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!auth.isAdmin && a.instructor_email !== auth.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data: documents } = await supabaseAdmin
    .from("instructor_assignment_documents")
    .select("id, file_path, file_name, uploaded_at")
    .eq("assignment_id", id)
    .order("uploaded_at", { ascending: false });

  return NextResponse.json({ assignment: a, documents: documents || [] });
}

// Instructor ingresa/edita notas + observaciones + marca completado
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  const a = await fetchAssignment(id);
  if (!a) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (!auth.isAdmin && a.instructor_email !== auth.email) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, any> = {};
  if ("grade_theoretical" in body) updates.grade_theoretical = body.grade_theoretical;
  if ("grade_practical"   in body) updates.grade_practical   = body.grade_practical;
  if ("observations"      in body) updates.observations      = body.observations;
  if ("kind"              in body) updates.kind              = body.kind;
  if ("city"              in body) updates.city              = body.city;
  if ("scheduled_date"    in body) updates.scheduled_date    = body.scheduled_date || null;
  if ("start_time"        in body) updates.start_time        = body.start_time || null;
  if ("location_name"     in body) updates.location_name     = body.location_name || null;
  if ("location_url"      in body) updates.location_url      = body.location_url || null;

  const markCompleted = body.markCompleted === true;
  if (markCompleted) {
    updates.status = "completed";
    updates.completed_at = new Date().toISOString();
  } else if (body.status) {
    updates.status = body.status;
  }

  const { data, error } = await supabaseAdmin
    .from("instructor_assignments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si se ingresaron notas, también vuelca a student_grades + posiblemente actualiza la registration
  if (a.registration_id && (updates.grade_theoretical != null || updates.grade_practical != null)) {
    // Tomar grade_items del curso para mapear "teorico"/"practico" → grade_item_id
    const courseId = a.registrations?.course_id;
    if (courseId) {
      const { data: items } = await supabaseAdmin
        .from("grade_items")
        .select("id, name, is_practical")
        .eq("course_id", courseId);
      const norm = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const teoItem = (items || []).find((i: any) => /teoric|examen final|final/.test(norm(i.name)) && !i.is_practical);
      const pracItem = (items || []).find((i: any) => i.is_practical || /practic/.test(norm(i.name)));

      const upserts: any[] = [];
      if (updates.grade_theoretical != null && teoItem) {
        upserts.push({
          registration_id: a.registration_id,
          grade_item_id: teoItem.id,
          score: updates.grade_theoretical,
          comments: `Ingresada por instructor ${auth.email}`,
          graded_at: new Date().toISOString(),
        });
      }
      if (updates.grade_practical != null && pracItem) {
        upserts.push({
          registration_id: a.registration_id,
          grade_item_id: pracItem.id,
          score: updates.grade_practical,
          comments: `Ingresada por instructor ${auth.email}`,
          graded_at: new Date().toISOString(),
        });
      }
      if (upserts.length > 0) {
        await supabaseAdmin
          .from("student_grades")
          .upsert(upserts, { onConflict: "registration_id,grade_item_id" });
      }
    }

    // Y como observación, lo dejamos también en student_notes
    if (updates.observations) {
      await supabaseAdmin.from("student_notes").insert({
        profile_id: null,
        registration_id: a.registration_id,
        author_email: auth.email,
        body: `[Instructor] ${updates.observations}`,
      } as any);
    }
  }

  // Notifica al admin via email + bell
  try {
    const { sendAdminInstructorGradeNotification } = await import("@/lib/email");
    await sendAdminInstructorGradeNotification({
      instructorEmail: auth.email,
      studentName: `${a.registrations?.first_name || ""} ${a.registrations?.last_name || ""}`.trim(),
      courseTitle: a.registrations?.courses?.title || "Curso",
      gradeTheoretical: updates.grade_theoretical ?? a.grade_theoretical,
      gradePractical: updates.grade_practical ?? a.grade_practical,
      markCompleted,
    });
  } catch (e) {
    console.error("Email notify failed:", e);
  }

  return NextResponse.json({ assignment: data });
}
