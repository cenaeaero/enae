import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { sendAdminExamNotification } from "@/lib/email";

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
    let { action } = body;

    // START EXAM — return questions without correct answers (or resume in-progress attempt)
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

      // Check for existing in-progress attempt (resume)
      const { data: inProgress } = await supabaseAdmin
        .from("exam_attempts")
        .select("*")
        .eq("exam_id", realExamId)
        .eq("registration_id", registration_id)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inProgress) {
        // Check if time has expired server-side
        const elapsed = (Date.now() - new Date(inProgress.started_at).getTime()) / 1000;
        const timeLimitSecs = (exam.time_limit_minutes || 0) * 60;

        if (timeLimitSecs > 0 && elapsed >= timeLimitSecs) {
          // Auto-finalize expired attempt with saved answers
          const { data: savedAnswers } = await supabaseAdmin
            .from("exam_answers")
            .select("question_id, selected_answer")
            .eq("attempt_id", inProgress.id);

          // Finalize with whatever was saved
          const answerList = (savedAnswers || [])
            .filter((a: any) => a.selected_answer)
            .map((a: any) => ({ question_id: a.question_id, selected_answer: a.selected_answer }));

          // Fall through to finalize block below
          action = "finalize";
          body.attempt_id = inProgress.id;
          body.answers = answerList;
        } else {
          // Resume: return remaining time and saved answers
          const remainingTime = timeLimitSecs > 0 ? Math.max(0, Math.floor(timeLimitSecs - elapsed)) : null;

          let { data: questions } = await supabaseAdmin
            .from("exam_questions")
            .select("id, sort_order, question_type, question_text, options, points")
            .eq("exam_id", realExamId)
            .order("sort_order");

          // Load saved answers
          const { data: savedAnswers } = await supabaseAdmin
            .from("exam_answers")
            .select("question_id, selected_answer")
            .eq("attempt_id", inProgress.id);

          const savedMap: Record<string, string> = {};
          for (const sa of savedAnswers || []) {
            if (sa.selected_answer) savedMap[sa.question_id] = sa.selected_answer;
          }

          return NextResponse.json({
            attempt_id: inProgress.id,
            time_limit_minutes: exam.time_limit_minutes,
            remaining_seconds: remainingTime,
            questions: questions || [],
            saved_answers: savedMap,
            resumed: true,
          });
        }
      }

      // Only create new attempt if we're not falling through to finalize
      if (action === "start") {
        // Count existing completed attempts
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
    }

    // SAVE ANSWERS — auto-save partial answers periodically
    if (action === "save_answers") {
      const { attempt_id, answers: partialAnswers } = body;
      // partialAnswers: {question_id: selected_answer}

      const { data: attempt } = await supabaseAdmin
        .from("exam_attempts")
        .select("id, status")
        .eq("id", attempt_id)
        .single();

      if (!attempt) return NextResponse.json({ error: "Intento no encontrado" }, { status: 404 });
      if (attempt.status === "completed") return NextResponse.json({ error: "Examen ya finalizado" }, { status: 400 });

      // Upsert each answer
      const rows = Object.entries(partialAnswers || {}).map(([question_id, selected_answer]) => ({
        attempt_id,
        question_id,
        selected_answer: selected_answer as string,
        is_correct: false, // Will be recalculated on finalize
      }));

      if (rows.length > 0) {
        await supabaseAdmin.from("exam_answers").upsert(rows, { onConflict: "attempt_id,question_id" });
      }

      return NextResponse.json({ saved: true, count: rows.length });
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

        // Auto-complete: check if all grade items have scores and calculate final
        const { data: registration } = await supabaseAdmin
          .from("registrations")
          .select("id, course_id, first_name, last_name, theoretical_start, practical_end")
          .eq("id", attempt.registration_id)
          .single();

        if (registration) {
          const { data: allGradeItems } = await supabaseAdmin
            .from("grade_items")
            .select("id, weight")
            .eq("course_id", registration.course_id);

          const { data: allGrades } = await supabaseAdmin
            .from("student_grades")
            .select("grade_item_id, score")
            .eq("registration_id", registration.id);

          if (allGradeItems && allGrades) {
            const gradeMap = new Map(allGrades.map((g: any) => [g.grade_item_id, g.score]));
            const allHaveScores = allGradeItems.every((gi: any) => gradeMap.has(gi.id) && gradeMap.get(gi.id) !== null);

            if (allHaveScores) {
              let weightedSum = 0, totalWeight = 0;
              for (const gi of allGradeItems) {
                const s = gradeMap.get(gi.id) as number;
                weightedSum += s * gi.weight;
                totalWeight += gi.weight;
              }
              const finalScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
              const passed = finalScore >= 80;

              // Update registration status
              await supabaseAdmin.from("registrations").update({
                status: "completed",
                final_score: finalScore,
                grade_status: passed ? "approved" : "failed",
              }).eq("id", registration.id);

              // Auto-issue diploma if approved
              if (passed) {
                const { data: course } = await supabaseAdmin
                  .from("courses")
                  .select("title, code, area")
                  .eq("id", registration.course_id)
                  .single();

                // Check if diploma already exists
                const { data: existingDiploma } = await supabaseAdmin
                  .from("diplomas")
                  .select("id")
                  .eq("registration_id", registration.id)
                  .maybeSingle();

                if (!existingDiploma && course) {
                  // Generate verification code
                  let prefix = "";
                  if (course.code) {
                    const parts = course.code.split("/");
                    prefix = parts.length >= 3 ? `${parts[1]}-${parts[2]}` : parts.join("-");
                  } else {
                    prefix = (course.area || "ENAE").replace(/[^A-Z]/gi, "").substring(0, 6).toUpperCase();
                  }
                  const number = String(Math.floor(Math.random() * 9000000) + 1000000).padStart(7, "0");
                  const year = new Date().getFullYear();
                  const verificationCode = `${prefix}-${number}-${year}`;

                  await supabaseAdmin.from("diplomas").insert({
                    registration_id: registration.id,
                    verification_code: verificationCode,
                    student_name: `${registration.first_name} ${registration.last_name}`,
                    course_title: course.title,
                    course_code: course.code,
                    final_score: finalScore,
                    status: "approved",
                    issued_date: new Date().toISOString().split("T")[0],
                    theoretical_start: registration.theoretical_start,
                    practical_end: registration.practical_end,
                  });
                }
              }
            }
          }
        }
      }

      // Send email notification to admin
      try {
        const { data: reg } = await supabaseAdmin
          .from("registrations")
          .select("first_name, last_name, email, course_id")
          .eq("id", attempt.registration_id)
          .single();
        if (reg) {
          const { data: courseData } = await supabaseAdmin.from("courses").select("title").eq("id", reg.course_id).single();
          const examTitle = exam?.title || "Examen";
          sendAdminExamNotification(`${reg.first_name} ${reg.last_name}`, reg.email, courseData?.title || "", examTitle, score, score >= (exam?.passing_score || 80)).catch(() => {});
        }
      } catch {}

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
