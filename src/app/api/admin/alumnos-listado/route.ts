import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Profiles + conteo de cursos por email + cursos disponibles para filtrar
  const [{ data: profiles }, { data: regs }, { data: courseRows }, { data: procs }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, rut, folio_enae, organization, phone, role, created_at")
      .order("last_name", { ascending: true }),
    supabaseAdmin.from("registrations").select("id, email, status, course_id, is_alumni"),
    supabaseAdmin.from("courses").select("id, title"),
    supabaseAdmin.from("dgac_procedures").select("registration_id, solicitud_teoricos_at, exam_datetime, coordinacion_examen"),
  ]);

  const courseTitles: Record<string, string> = {};
  for (const c of courseRows || []) courseTitles[c.id] = c.title;

  // registration_id -> email (para cruzar la coordinación DGAC por alumno)
  const regEmailById: Record<string, string> = {};
  for (const r of regs || []) {
    if (r.id && r.email) regEmailById[r.id] = (r.email || "").toLowerCase();
  }

  // Coordinación DGAC agregada por email: ¿se solicitó examen a teóricos?
  // dgac_ref: fecha de referencia más reciente (examen o solicitud a teóricos)
  // para medir cuánto llevan esperando el egreso.
  const dgacByEmail: Record<string, { coordinado: boolean; ref: number | null }> = {};
  for (const pr of procs || []) {
    const e = regEmailById[pr.registration_id];
    if (!e) continue;
    dgacByEmail[e] ||= { coordinado: false, ref: null };
    const coordinado = !!pr.solicitud_teoricos_at || !!pr.coordinacion_examen || !!pr.exam_datetime;
    if (coordinado) dgacByEmail[e].coordinado = true;
    // Referencia: fecha del examen si existe, si no la solicitud a teóricos.
    const refStr = pr.exam_datetime || pr.solicitud_teoricos_at;
    if (refStr) {
      const t = new Date(refStr).getTime();
      if (!Number.isNaN(t) && (dgacByEmail[e].ref === null || t > (dgacByEmail[e].ref as number))) {
        dgacByEmail[e].ref = t;
      }
    }
  }

  const byEmail: Record<string, { total: number; completed: number; in_progress: number; blocking: number; alumni: number; course_ids: Set<string> }> = {};
  for (const r of regs || []) {
    const e = (r.email || "").toLowerCase();
    if (!e) continue;
    byEmail[e] ||= { total: 0, completed: 0, in_progress: 0, blocking: 0, alumni: 0, course_ids: new Set() };
    byEmail[e].total++;
    if (r.course_id) byEmail[e].course_ids.add(r.course_id);
    if (r.status === "completed") byEmail[e].completed++;
    else if (r.status === "confirmed") byEmail[e].in_progress++;
    // "Pendiente" que bloquea el egreso: inscripción sin pagar o aún en curso.
    if (r.status === "pending" || r.status === "confirmed") byEmail[e].blocking++;
    if (r.is_alumni === true) byEmail[e].alumni++;
  }

  const alumnos = (profiles || []).map((p: any) => {
    const emailKey = (p.email || "").toLowerCase();
    const stats = byEmail[emailKey] || { total: 0, completed: 0, in_progress: 0, blocking: 0, alumni: 0, course_ids: new Set<string>() };
    const dgac = dgacByEmail[emailKey] || { coordinado: false, ref: null };
    // Egresado (ocultable): terminó todo, sin pendientes, y sus cursos completados ya están marcados alumni.
    const is_egresado = stats.total > 0 && stats.blocking === 0 && stats.completed > 0 && stats.alumni >= stats.completed;
    return {
      id: p.id,
      first_name: p.first_name || "",
      last_name: p.last_name || "",
      email: p.email,
      rut: p.rut,
      folio_enae: p.folio_enae,
      organization: p.organization,
      phone: p.phone,
      role: p.role || "student",
      created_at: p.created_at,
      total_courses: stats.total,
      completed_courses: stats.completed,
      in_progress_courses: stats.in_progress,
      pending_courses: stats.blocking,
      alumni_courses: stats.alumni,
      is_egresado,
      dgac_coordinado: dgac.coordinado,
      dgac_ref_date: dgac.ref ? new Date(dgac.ref).toISOString() : null,
      course_ids: Array.from(stats.course_ids),
    };
  });

  // Solo cursos que tienen al menos una inscripción, ordenados por título.
  const usedCourseIds = new Set<string>();
  for (const r of regs || []) if (r.course_id) usedCourseIds.add(r.course_id);
  const courses = Array.from(usedCourseIds)
    .map((id) => ({ id, title: courseTitles[id] || "Curso" }))
    .sort((a, b) => a.title.localeCompare(b.title));

  return NextResponse.json({ alumnos, courses });
}
