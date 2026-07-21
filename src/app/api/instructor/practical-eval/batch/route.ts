import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";

// Datos prellenados para imprimir el formulario de evaluación (formato N1)
// de varios alumnos: el instructor los descarga y los lleva a la clase.
// GET ?ids=a,b,c
export async function GET(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const ids = (new URL(request.url).searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ error: "ids requerido" }, { status: 400 });

  const { data: asgs } = await supabaseAdmin
    .from("instructor_assignments")
    .select("id, instructor_email, city, scheduled_date, start_time, location_name, registration_id, registrations(first_name, last_name, email, folio_enae, courses(title, code))")
    .in("id", ids);

  // Datos de contacto del alumno (RUT/teléfono) y nombre del instructor
  const emails = (asgs || []).map((a: any) => a.registrations?.email).filter(Boolean);
  const rutByEmail: Record<string, string | null> = {};
  if (emails.length > 0) {
    const { data: profs } = await supabaseAdmin.from("profiles").select("email, rut").in("email", emails);
    for (const p of profs || []) if (p.email) rutByEmail[p.email.toLowerCase()] = p.rut;
  }

  const forms = (asgs || [])
    .filter((a: any) => auth.isAdmin || a.instructor_email === auth.email)
    .map((a: any) => {
      const r = a.registrations;
      return {
        assignment_id: a.id,
        student_name: r ? `${r.first_name || ""} ${r.last_name || ""}`.trim() : "",
        student_document: (r?.email ? rutByEmail[r.email.toLowerCase()] : null) || "",
        folio: r?.folio_enae || "",
        course: r?.courses?.title || "",
        course_code: r?.courses?.code || "",
        city: a.city || "",
        date: a.scheduled_date || "",
        time: a.start_time || "",
        location: a.location_name || "",
      };
    });

  return NextResponse.json({ forms });
}
