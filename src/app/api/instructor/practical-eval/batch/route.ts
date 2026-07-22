import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireInstructor } from "@/lib/auth-instructor";
import { generatePracticaFormsPdf } from "@/lib/practica-form-pdf";

// Formulario de evaluación (formato N1) prellenado con los datos del alumno,
// para que el instructor lo lleve a la clase.
//   GET ?ids=a,b,c             → JSON con los datos
//   GET ?ids=a,b,c&format=pdf  → descarga directa del PDF (una página por alumno)
export async function GET(request: Request) {
  const auth = await requireInstructor();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const format = url.searchParams.get("format");
  if (ids.length === 0) return NextResponse.json({ error: "ids requerido" }, { status: 400 });

  const { data: asgs } = await supabaseAdmin
    .from("instructor_assignments")
    .select("id, instructor_email, city, scheduled_date, start_time, location_name, registration_id, registrations(first_name, last_name, email, folio_enae, courses(title, code))")
    .in("id", ids);

  // RUT y folio ENAE viven en profiles (la tarjeta "Certificaciones del Curso"
  // los guarda ahí; en registrations suelen venir vacíos).
  const emails = (asgs || []).map((a: any) => a.registrations?.email).filter(Boolean);
  const rutByEmail: Record<string, string | null> = {};
  const folioByEmail: Record<string, string | null> = {};
  if (emails.length > 0) {
    const { data: profs } = await supabaseAdmin.from("profiles").select("email, rut, folio_enae").in("email", emails);
    for (const p of profs || []) {
      if (!p.email) continue;
      rutByEmail[p.email.toLowerCase()] = p.rut;
      folioByEmail[p.email.toLowerCase()] = p.folio_enae;
    }
  }

  const forms = (asgs || [])
    .filter((a: any) => auth.isAdmin || a.instructor_email === auth.email)
    .map((a: any) => {
      const r = a.registrations;
      return {
        assignment_id: a.id,
        student_name: r ? `${r.first_name || ""} ${r.last_name || ""}`.trim() : "",
        student_document: (r?.email ? rutByEmail[r.email.toLowerCase()] : null) || "",
        folio: (r?.email ? folioByEmail[r.email.toLowerCase()] : null) || r?.folio_enae || "",
        course: r?.courses?.title || "",
        course_code: r?.courses?.code || "",
        city: a.city || "",
        date: a.scheduled_date || "",
        time: a.start_time || "",
        location: a.location_name || "",
      };
    });

  if (format === "pdf") {
    if (forms.length === 0) return NextResponse.json({ error: "Sin formularios para generar" }, { status: 404 });
    const pdf = generatePracticaFormsPdf(forms);
    const fecha = new Date().toISOString().slice(0, 10);
    const nombre = forms.length === 1
      ? `Evaluacion-N1-${(forms[0].student_name || "alumno").replace(/[^\p{L}\p{N}]+/gu, "-")}.pdf`
      : `Evaluaciones-N1-${forms.length}-alumnos-${fecha}.pdf`;
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombre}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ forms });
}
