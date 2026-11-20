import { supabaseAdmin } from "@/lib/supabase-service";

export type FinalExamInfo = {
  examId: string;
  activityId: string;
  activityTitle: string;
  moduleId: string;
  gradeItemId: string | null;
  isFinalExam: boolean;
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes: number | null;
  questionsPerAttempt: number | null;
  questionCount: number;
};

/**
 * Examen final de un curso: el marcado como `is_final_exam`; si ninguno lo
 * está, el último examen del curso (por orden de módulo y de actividad).
 */
export async function findFinalExam(courseId: string): Promise<FinalExamInfo | null> {
  const { data: modules } = await supabaseAdmin
    .from("course_modules")
    .select("id, sort_order")
    .eq("course_id", courseId)
    .order("sort_order");
  const mods = modules || [];
  if (mods.length === 0) return null;

  const { data: activities } = await supabaseAdmin
    .from("module_activities")
    .select("id, title, module_id, sort_order")
    .in("module_id", mods.map((m: any) => m.id))
    .eq("type", "exam");
  const acts = activities || [];
  if (acts.length === 0) return null;

  const { data: exams } = await supabaseAdmin
    .from("exams")
    .select("id, activity_id, is_final_exam, grade_item_id, passing_score, max_attempts, time_limit_minutes, questions_per_attempt")
    .in("activity_id", acts.map((a: any) => a.id));
  const examList = exams || [];
  if (examList.length === 0) return null;

  const modOrder = new Map(mods.map((m: any, i: number) => [m.id, i]));
  const actById = new Map(acts.map((a: any) => [a.id, a]));
  const ordered = [...examList].sort((a: any, b: any) => {
    const A = actById.get(a.activity_id) as any;
    const B = actById.get(b.activity_id) as any;
    const dm = (modOrder.get(A.module_id) ?? 0) - (modOrder.get(B.module_id) ?? 0);
    return dm !== 0 ? dm : (A.sort_order ?? 0) - (B.sort_order ?? 0);
  });
  const chosen: any = ordered.filter((e: any) => e.is_final_exam).pop() || ordered[ordered.length - 1];
  const act: any = actById.get(chosen.activity_id);

  const { count } = await supabaseAdmin
    .from("exam_questions")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", chosen.id);

  return {
    examId: chosen.id,
    activityId: chosen.activity_id,
    activityTitle: act?.title || "Examen final",
    moduleId: act?.module_id,
    gradeItemId: chosen.grade_item_id || null,
    isFinalExam: !!chosen.is_final_exam,
    passingScore: chosen.passing_score ?? 80,
    maxAttempts: chosen.max_attempts ?? 1,
    timeLimitMinutes: chosen.time_limit_minutes ?? null,
    questionsPerAttempt: chosen.questions_per_attempt ?? null,
    questionCount: count || 0,
  };
}
