import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

async function getUser() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// POST: Start exam attempt or finalize exam
export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await request.json();
    const { action } = body;

    // START EXAM — return questions without correct answers
    if (action === "start") {
      const { exam_id, registration_id } = body;

      // Find exam by id or by activity_id
      let { data: exam } = await supabaseAdmin.from("exams").select("*").eq("id", exam_id).maybeSingle();
      if (!exam) {
        const { data: byActivity } = await supabaseAdmin.from("exams").select("*").eq("activity_id", exam_id).maybeSingle();
        exam = byActivity;
      }
      if (!exam) return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });

      const realExamId = exam.id;

      // Count existing attempts
      const { count } = await supabaseAdmin
        .from("exam_attempts")
        .select("id", { count: "exact", head: true })
        .eq("exam_id", realExamId)
        .eq("registration_id", registration_id)
        .eq("status", "completed");

      if ((count || 0) >= exam.max_attempts) {
        return NextResponse.json({ error: "Intentos maximos alcanzados" }, { status: 400 });
      }

      // Create attempt
      const { data: attempt, error: attemptErr } = await supabaseAdmin
        .from("exam_attempts")
        .insert({ exam_id: realExamId, registration_id, attempt_number: (count || 0) + 1 })
        .select()
        .single();

      if (attemptErr) return NextResponse.json({ error: attemptErr.message }, { status: 500 });

      // Load questions (strip correct answers)
      let { data: questions } = await supabaseAdmin
        .from("exam_questions")
        .select("id, sort_order, question_type, question_text, options, points")
        .eq("exam_id", realExamId)
        .order("sort_order");

      if (exam.shuffle_questions && questions) {
        questions = questions.sort(() => Math.random() - 0.5);
      }

      return NextResponse.json({
        attempt_id: attempt.id,
        time_limit_minutes: exam.time_limit_minutes,
        questions: questions || [],
      });
    }

    // FINALIZE EXAM — grade and save
    if (action === "finalize") {
      const { attempt_id, answers } = body;
      // answers: [{question_id, selected_answer}]

      const { data: attempt } = await supabaseAdmin
        .from("exam_attempts")
        .select("*, exams(*)")
        .eq("id", attempt_id)
        .single();

      if (!attempt) return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 });
      if (attempt.status === "completed") return NextResponse.json({ error: "Examen ya finalizado" }, { status: 400 });

      // Load correct answers
      const { data: questions } = await supabaseAdmin
        .from("exam_questions")
        .select("id, correct_answer, points")
        .eq("exam_id", attempt.exam_id);

      const questionMap = new Map((questions || []).map((q: any) => [q.id, q]));

      let totalPoints = 0;
      let earnedPoints = 0;
      const answerRows: any[] = [];

      for (const ans of answers || []) {
        const q = questionMap.get(ans.question_id);
        if (!q) continue;
        const isCorrect = ans.selected_answer === q.correct_answer;
        totalPoints += q.points;
        if (isCorrect) earnedPoints += q.points;
        answerRows.push({
          attempt_id,
          question_id: ans.question_id,
          selected_answer: ans.selected_answer,
          is_correct: isCorrect,
        });
      }

      // Also count unanswered questions
      for (const q of questions || []) {
        if (!answers?.find((a: any) => a.question_id === q.id)) {
          totalPoints += q.points;
          answerRows.push({
            attempt_id,
            question_id: q.id,
            selected_answer: null,
            is_correct: false,
          });
        }
      }

      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

      // Save answers
      if (answerRows.length > 0) {
        await supabaseAdmin.from("exam_answers").upsert(answerRows, { onConflict: "attempt_id,question_id" });
      }

      // Update attempt
      await supabaseAdmin
        .from("exam_attempts")
        .update({ score, total_points: totalPoints, earned_points: earnedPoints, completed_at: new Date().toISOString(), status: "completed" })
        .eq("id", attempt_id);

      // Auto-grade: save to student_grades
      const exam = attempt.exams;
      let gradeItemId = exam?.grade_item_id;

      // If no grade_item_id on exam, auto-find by matching module → grade_item
      if (!gradeItemId && exam?.activity_id) {
        const { data: activity } = await supabaseAdmin
          .from("module_activities")
          .select("module_id, course_modules(sort_order, course_id)")
          .eq("id", exam.activity_id)
          .single();

        if (activity?.course_modules) {
          const mod = activity.course_modules as any;
          // Find grade_item matching this module's sort_order
          const { data: gradeItems } = await supabaseAdmin
            .from("grade_items")
            .select("id")
            .eq("course_id", mod.course_id)
            .order("sort_order");

          if (gradeItems && gradeItems[mod.sort_order]) {
            gradeItemId = gradeItems[mod.sort_order].id;
            // Auto-link the exam for future attempts
            await supabaseAdmin.from("exams").update({ grade_item_id: gradeItemId }).eq("id", exam.id);
          }
        }
      }

      if (gradeItemId) {
        await supabaseAdmin.from("student_grades").upsert({
          registration_id: attempt.registration_id,
          grade_item_id: gradeItemId,
          score,
          graded_at: new Date().toISOString(),
          comments: `Auto-calificado (Intento ${attempt.attempt_number})`,
        }, { onConflict: "registration_id,grade_item_id" });
      }

      // Build review data with correct answers
      const { data: fullQuestions } = await supabaseAdmin
        .from("exam_questions")
        .select("id, question_text, question_type, options, correct_answer, points")
        .eq("exam_id", attempt.exam_id)
        .order("sort_order");

      const review = (fullQuestions || []).map((q: any) => {
        const studentAns = (answers || []).find((a: any) => a.question_id === q.id);
        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          selected_answer: studentAns?.selected_answer || null,
          is_correct: studentAns?.selected_answer === q.correct_answer,
        };
      });

      return NextResponse.json({
        score,
        total_points: totalPoints,
        earned_points: earnedPoints,
        passed: score >= (exam?.passing_score || 80),
        review,
      });
    }

    return NextResponse.json({ error: "action invalida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno" }, { status: 500 });
  }
}

// GET: Get exam results
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("exam_id");
    const registrationId = searchParams.get("registration_id");

    if (!examId || !registrationId) {
      return NextResponse.json({ error: "exam_id y registration_id requeridos" }, { status: 400 });
    }

    const { data: attempts } = await supabaseAdmin
      .from("exam_attempts")
      .select("*")
      .eq("exam_id", examId)
      .eq("registration_id", registrationId)
      .order("attempt_number", { ascending: false });

    // Load answers for the latest completed attempt
    let answers: any[] = [];
    const latestCompleted = attempts?.find((a: any) => a.status === "completed");
    if (latestCompleted) {
      const { data } = await supabaseAdmin
        .from("exam_answers")
        .select("*, exam_questions(question_text, correct_answer, options)")
        .eq("attempt_id", latestCompleted.id);
      answers = data || [];
    }

    return NextResponse.json({ attempts: attempts || [], answers });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
