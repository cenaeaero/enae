import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// Reporte de asistencia de un curso: % de asistencia por alumno a través de
// todas las clases sincrónicas del curso, y si cumple el mínimo exigido.
//   asistió = present + late ; excused resta del total (no perjudica al alumno)
// GET ?course_id=...
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const courseId = new URL(request.url).searchParams.get("course_id");
  if (!courseId) return NextResponse.json({ error: "course_id requerido" }, { status: 400 });

  const { data: course } = await supabaseAdmin
    .from("courses").select("id, title, code, min_attendance_pct").eq("id", courseId).maybeSingle();
  const minPct = (course as any)?.min_attendance_pct ?? 90;

  // Clases sincrónicas del curso (no canceladas)
  const { data: classes } = await supabaseAdmin
    .from("synchronous_classes")
    .select("id, title, scheduled_at, status")
    .eq("course_id", courseId)
    .neq("status", "cancelled")
    .order("scheduled_at");
  const classIds = (classes || []).map((c: any) => c.id);
  const totalClasses = classIds.length;

  // Alumnos del curso
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, organization, status")
    .eq("course_id", courseId)
    .in("status", ["confirmed", "completed"]);

  // Asistencias
  const attByReg: Record<string, { present: number; late: number; excused: number; absent: number }> = {};
  if (classIds.length > 0) {
    const { data: att } = await supabaseAdmin
      .from("class_attendance")
      .select("registration_id, status")
      .in("synchronous_class_id", classIds);
    for (const a of att || []) {
      const rid = (a as any).registration_id;
      attByReg[rid] ||= { present: 0, late: 0, excused: 0, absent: 0 };
      const s = (a as any).status as string;
      if (s in attByReg[rid]) (attByReg[rid] as any)[s]++;
    }
  }

  const students = (regs || []).map((r: any) => {
    const a = attByReg[r.id] || { present: 0, late: 0, excused: 0, absent: 0 };
    const asistio = a.present + a.late;
    const base = Math.max(0, totalClasses - a.excused);   // excused no cuenta en el total
    const pct = base > 0 ? Math.round((asistio / base) * 100) : 0;
    return {
      registration_id: r.id,
      name: `${r.last_name || ""}, ${r.first_name || ""}`.replace(/^, /, "").trim() || r.email,
      email: r.email,
      organization: r.organization || null,
      present: a.present,
      late: a.late,
      excused: a.excused,
      absent: Math.max(0, base - asistio),
      attended: asistio,
      total: totalClasses,
      pct,
      meets_min: pct >= minPct,
    };
  }).sort((a, b) => a.pct - b.pct);

  return NextResponse.json({
    course: course ? { id: course.id, title: (course as any).title, code: (course as any).code } : null,
    min_attendance_pct: minPct,
    total_classes: totalClasses,
    classes: classes || [],
    students,
  });
}
