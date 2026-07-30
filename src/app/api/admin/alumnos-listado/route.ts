import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Profiles + conteo de cursos por email + cursos disponibles para filtrar
  const [{ data: profiles }, { data: regs }, { data: courseRows }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, rut, folio_enae, organization, phone, role, created_at")
      .order("last_name", { ascending: true }),
    supabaseAdmin.from("registrations").select("email, status, course_id"),
    supabaseAdmin.from("courses").select("id, title"),
  ]);

  const courseTitles: Record<string, string> = {};
  for (const c of courseRows || []) courseTitles[c.id] = c.title;

  const byEmail: Record<string, { total: number; completed: number; in_progress: number; course_ids: Set<string> }> = {};
  for (const r of regs || []) {
    const e = (r.email || "").toLowerCase();
    if (!e) continue;
    byEmail[e] ||= { total: 0, completed: 0, in_progress: 0, course_ids: new Set() };
    byEmail[e].total++;
    if (r.course_id) byEmail[e].course_ids.add(r.course_id);
    if (r.status === "completed") byEmail[e].completed++;
    else if (r.status === "confirmed") byEmail[e].in_progress++;
  }

  const alumnos = (profiles || []).map((p: any) => {
    const stats = byEmail[(p.email || "").toLowerCase()] || { total: 0, completed: 0, in_progress: 0, course_ids: new Set<string>() };
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
