import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { sendGradeNotificationToStudent } from "@/lib/email";

async function authorizeInstructor(courseId: string) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, status: 401, error: "No autenticado" };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", user.email)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  const isInstructor = profile?.role === "instructor";
  if (!isAdmin && !isInstructor) {
    return { ok: false, status: 403, error: "No autorizado" };
  }

  // Admins can access any course; instructors only their assigned ones
  if (!isAdmin) {
    const { data: assignment } = await supabaseAdmin
      .from("course_instructors")
      .select("id")
      .eq("instructor_email", user.email)
      .eq("course_id", courseId)
      .maybeSingle();
    if (!assignment) return { ok: false, status: 403, error: "No asignado a este curso" };
  }

  return { ok: true, email: user.email, isAdmin };
}

// GET: load course info, grade_items, students with grades
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("course_id");
  if (!courseId) return NextResponse.json({ error: "course_id requerido" }, { status: 400 });

  const auth = await authorizeInstructor(courseId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id, title, code")
    .eq("id", courseId)
    .single();

  const { data: gradeItems } = await supabaseAdmin
    .from("grade_items")
    .select("id, name, weight, sort_order, is_practical")
    .eq("course_id", courseId)
    .order("sort_order");

  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, organization, status")
    .eq("course_id", courseId)
    .in("status", ["confirmed", "completed"])
    .order("last_name");

  const regIds = (regs || []).map((r: any) => r.id);
  const { data: grades } = regIds.length
    ? await supabaseAdmin
        .from("student_grades")
        .select("registration_id, grade_item_id, score")
        .in("registration_id", regIds)
    : { data: [] };

  const gradeMap: Record<string, Record<string, number | null>> = {};
  (grades || []).forEach((g: any) => {
    if (!gradeMap[g.registration_id]) gradeMap[g.registration_id] = {};
    gradeMap[g.registration_id][g.grade_item_id] = g.score;
  });

  const students = (regs || []).map((r: any) => ({
    registrationId: r.id,
    name: `${r.first_name} ${r.last_name}`,
    email: r.email,
    organization: r.organization || null,
    grades: gradeMap[r.id] || {},
  }));

  return NextResponse.json({
    course,
    grade_items: gradeItems || [],
    students,
  });
}

// POST: save grades for practical items and notify students
export async function POST(request: Request) {
  const { course_id, grades } = await request.json();
  if (!course_id || !Array.isArray(grades)) {
    return NextResponse.json({ error: "course_id y grades[] requeridos" }, { status: 400 });
  }

  const auth = await authorizeInstructor(course_id);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Only allow saving grades for grade_items that are is_practical=true AND belong to this course
  const { data: practicalItems } = await supabaseAdmin
    .from("grade_items")
    .select("id, name")
    .eq("course_id", course_id)
    .eq("is_practical", true);

  const allowedIds = new Set((practicalItems || []).map((g: any) => g.id));
  const validGrades = grades.filter((g: any) => allowedIds.has(g.grade_item_id));
  if (validGrades.length === 0) {
    return NextResponse.json({ error: "No hay notas válidas para guardar (solo se permiten grade_items prácticos)." }, { status: 400 });
  }

  // Upsert
  const rows = validGrades.map((g: any) => ({
    registration_id: g.registration_id,
    grade_item_id: g.grade_item_id,
    score: g.score,
    graded_at: new Date().toISOString(),
    comments: `Calificado por instructor (${auth.email})`,
  }));

  const { error: upsertErr } = await supabaseAdmin
    .from("student_grades")
    .upsert(rows, { onConflict: "registration_id,grade_item_id" });
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });

  // Fetch student info + course + item for notification
  const regIds = Array.from(new Set(validGrades.map((g: any) => g.registration_id))) as string[];
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, course_id")
    .in("id", regIds);

  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("title")
    .eq("id", course_id)
    .single();

  const itemNameById = new Map((practicalItems || []).map((g: any) => [g.id, g.name]));

  let notified = 0;
  for (const g of validGrades) {
    const reg = regs?.find((r: any) => r.id === g.registration_id);
    if (!reg?.email) continue;
    const itemName = itemNameById.get(g.grade_item_id) || "Evaluación práctica";
    sendGradeNotificationToStudent(
      `${reg.first_name} ${reg.last_name}`,
      reg.email,
      course?.title || "",
      itemName,
      g.score,
    ).catch(() => {});
    notified++;
  }

  return NextResponse.json({ ok: true, saved: validGrades.length, notified });
}
