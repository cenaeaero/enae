import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";
import { sendPracticaDataToInstructor, sendPracticaDataToStudent, type PracticaScheduleInfo } from "@/lib/email";

// POST { assignment_ids: string[], to_instructor?: boolean, to_students?: boolean }
// Envía por correo la coordinación de la clase práctica:
//   - al instructor: tabla con los datos de contacto de sus alumnos (+ fecha/lugar)
//   - a cada alumno: datos del instructor (teléfono/email) + fecha, hora y lugar con mapa
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const ids: string[] = Array.isArray(body.assignment_ids) ? body.assignment_ids : [];
  const toInstructor = body.to_instructor !== false;
  const toStudents = body.to_students !== false;
  if (ids.length === 0) return NextResponse.json({ error: "assignment_ids requerido" }, { status: 400 });
  if (!toInstructor && !toStudents) return NextResponse.json({ error: "Selecciona al menos un destinatario" }, { status: 400 });

  const { data: asgs, error } = await supabaseAdmin
    .from("instructor_assignments")
    .select("id, instructor_email, city, scheduled_date, start_time, location_name, location_url, registrations(first_name, last_name, email, courses(title))")
    .in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!asgs || asgs.length === 0) return NextResponse.json({ error: "Asignaciones no encontradas" }, { status: 404 });

  const instructorEmails = Array.from(new Set(asgs.map((a: any) => a.instructor_email)));
  if (instructorEmails.length > 1) {
    return NextResponse.json({ error: "Las asignaciones seleccionadas pertenecen a más de un instructor; notifica un instructor a la vez." }, { status: 400 });
  }

  // Perfiles: teléfono/RUT de alumnos + datos del instructor
  const studentEmails = asgs.map((a: any) => a.registrations?.email).filter(Boolean);
  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("email, first_name, last_name, phone, rut")
    .in("email", Array.from(new Set([...studentEmails, ...studentEmails.map((e: string) => e.toLowerCase()), instructorEmails[0]])));
  const profByEmail: Record<string, any> = {};
  for (const p of profs || []) if (p.email) profByEmail[p.email.toLowerCase()] = p;

  const instProf = profByEmail[instructorEmails[0].toLowerCase()];
  const instructor = {
    name: instProf ? `${instProf.first_name || ""} ${instProf.last_name || ""}`.trim() : instructorEmails[0],
    email: instructorEmails[0],
    phone: instProf?.phone || null,
  };

  const scheduleOf = (a: any): PracticaScheduleInfo => ({
    date: a.scheduled_date || null,
    time: a.start_time || null,
    city: a.city || null,
    locationName: a.location_name || null,
    locationUrl: a.location_url || null,
    course: a.registrations?.courses?.title || null,
  });

  let sentStudents = 0;
  const failures: string[] = [];

  if (toStudents) {
    for (const a of asgs as any[]) {
      const r = a.registrations;
      if (!r?.email) { failures.push(`Asignación ${a.id}: alumno sin email`); continue; }
      try {
        await sendPracticaDataToStudent({
          studentEmail: r.email,
          studentName: `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email,
          instructor,
          schedule: scheduleOf(a),
        });
        sentStudents++;
      } catch (e: any) {
        failures.push(`${r.email}: ${e?.message || "error de envío"}`);
      }
    }
  }

  let sentInstructor = false;
  if (toInstructor) {
    try {
      await sendPracticaDataToInstructor({
        instructorEmail: instructor.email,
        instructorName: instructor.name,
        students: (asgs as any[]).map((a) => {
          const r = a.registrations;
          const sp = r?.email ? profByEmail[r.email.toLowerCase()] : null;
          return {
            name: r ? `${r.last_name || ""}, ${r.first_name || ""}`.replace(/^, /, "").trim() : "—",
            email: r?.email || null,
            phone: sp?.phone || null,
            rut: sp?.rut || null,
            schedule: scheduleOf(a),
          };
        }),
      });
      sentInstructor = true;
    } catch (e: any) {
      failures.push(`Instructor ${instructor.email}: ${e?.message || "error de envío"}`);
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    sent_instructor: sentInstructor,
    sent_students: sentStudents,
    failures,
  });
}
