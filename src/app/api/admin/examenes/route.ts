import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { sendStudentExamReset } from "@/lib/email";

async function verifyAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.id) return null;
  // Try by user_id first, fallback to email (user_id may be null for older profiles)
  let { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile && user.email) {
    const { data: byEmail } = await supabaseAdmin
      .from("profiles")
      .select("role, id")
      .eq("email", user.email)
      .limit(1);
    if (byEmail?.[0]) {
      profile = byEmail[0];
      // Link user_id for future lookups
      await supabaseAdmin
        .from("profiles")
        .update({ user_id: user.id })
        .eq("id", byEmail[0].id);
    }
  }
  return profile?.role === "admin" ? user : null;
}

// GET: Load exam + questions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("exam_id");
    const activityId = searchParams.get("activity_id");

    let exam: any = null;
    if (examId) {
      const { data } = await supabaseAdmin.from("exams").select("*").eq("id", examId).single();
      exam = data;
    } else if (activityId) {
      const { data } = await supabaseAdmin.from("exams").select("*").eq("activity_id", activityId).single();
      exam = data;
    }

    if (!exam) return NextResponse.json({ exam: null, questions: [] });

    const { data: questions } = await supabaseAdmin
      .from("exam_questions")
      .select("*")
      .eq("exam_id", exam.id)
      .order("sort_order");

    return NextResponse.json({ exam, questions: questions || [] });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST: Create exam for an activity
export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const { activity_id, time_limit_minutes, passing_score, max_attempts, shuffle_questions, is_final_exam, is_dgac_simulator, grade_item_id } = body;

    const { data, error } = await supabaseAdmin
      .from("exams")
      .insert({
        activity_id,
        time_limit_minutes: time_limit_minutes || null,
        passing_score: passing_score || 80,
        max_attempts: max_attempts || 1,
        shuffle_questions: shuffle_questions !== false,
        is_final_exam: is_final_exam || false,
        is_dgac_simulator: is_dgac_simulator || false,
        grade_item_id: grade_item_id || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ exam: data });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT: Update exam settings
export async function PUT(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const { error } = await supabaseAdmin.from("exams").update(fields).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST to /importar-csv handled in separate route
// POST questions
export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();
    const { action } = body;

    if (action === "add_question") {
      const { exam_id, question_type, question_text, options, correct_answer, points, sort_order } = body;
      const { data, error } = await supabaseAdmin
        .from("exam_questions")
        .insert({ exam_id, question_type, question_text, options: options || [], correct_answer, points: points || 1, sort_order: sort_order || 0 })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ question: data });
    }

    if (action === "update_question") {
      const { id, ...fields } = body;
      delete fields.action;
      const { error } = await supabaseAdmin.from("exam_questions").update(fields).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_question") {
      const { id } = body;
      const { error } = await supabaseAdmin.from("exam_questions").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (action === "import_csv") {
      const { exam_id, questions } = body;
      if (!exam_id || !questions?.length) return NextResponse.json({ error: "exam_id y questions requeridos" }, { status: 400 });

      const rows = questions.map((q: any, i: number) => ({
        exam_id,
        sort_order: i,
        question_type: q.type === "true_false" ? "true_false" : "multiple_choice",
        question_text: q.text,
        options: q.options || [],
        correct_answer: q.correct,
        points: 1,
      }));

      const { data, error } = await supabaseAdmin.from("exam_questions").insert(rows).select();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ imported: data?.length || 0 });
    }

    return NextResponse.json({ error: "action invalida" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE: Reset exam attempts for a student
export async function DELETE(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { registration_id, exam_id, activity_id } = await request.json();
    if (!registration_id) return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });

    // Find exam
    let realExamId = exam_id;
    if (!realExamId && activity_id) {
      const { data: exam } = await supabaseAdmin.from("exams").select("id").eq("activity_id", activity_id).maybeSingle();
      if (exam) realExamId = exam.id;
    }

    if (!realExamId) return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });

    // Get all attempts for this student+exam
    const { data: attempts } = await supabaseAdmin
      .from("exam_attempts")
      .select("id")
      .eq("exam_id", realExamId)
      .eq("registration_id", registration_id);

    const attemptIds = (attempts || []).map((a: any) => a.id);

    if (attemptIds.length > 0) {
      // Delete answers first (FK constraint)
      await supabaseAdmin.from("exam_answers").delete().in("attempt_id", attemptIds);
      // Delete attempts
      await supabaseAdmin.from("exam_attempts").delete().in("id", attemptIds);
    }

    // Also clear the student_grade for this exam if it exists
    const { data: exam } = await supabaseAdmin.from("exams").select("grade_item_id").eq("id", realExamId).maybeSingle();
    if (exam?.grade_item_id) {
      await supabaseAdmin.from("student_grades").delete()
        .eq("registration_id", registration_id)
        .eq("grade_item_id", exam.grade_item_id);
    }

    // Send email to student notifying exam reset
    try {
      const { data: reg } = await supabaseAdmin
        .from("registrations")
        .select("first_name, last_name, email, course_id")
        .eq("id", registration_id)
        .single();
      if (reg) {
        const { data: courseData } = await supabaseAdmin.from("courses").select("title").eq("id", reg.course_id).single();
        const { data: examData } = await supabaseAdmin.from("exams").select("title").eq("id", realExamId).single();
        sendStudentExamReset(reg.email, `${reg.first_name} ${reg.last_name}`, courseData?.title || "", examData?.title || "Examen").catch(() => {});
      }
    } catch {}

    return NextResponse.json({ reset: true, attempts_deleted: attemptIds.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}
