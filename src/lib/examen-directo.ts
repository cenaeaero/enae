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

/**
 * Garantiza que el examen final tenga un ítem de nota. Sin él, rendir el examen
 * no registra nota ni emite diploma. Si el curso no tiene ningún ítem de nota,
 * crea "Examen Final" con toda la ponderación. Devuelve el id o null.
 */
export async function ensureFinalExamGradeItem(courseId: string, examId: string): Promise<string | null> {
  const { data: exam } = await supabaseAdmin
    .from("exams").select("id, grade_item_id").eq("id", examId).maybeSingle();
  if (!exam) return null;
  if (exam.grade_item_id) return exam.grade_item_id;

  const { data: items } = await supabaseAdmin
    .from("grade_items").select("id, name").eq("course_id", courseId).order("sort_order");
  const list = items || [];
  const norm = (t: string) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  let itemId: string | null =
    list.find((gi: any) => norm(gi.name).includes("examen final"))?.id ||
    (list.length === 1 ? list[0].id : null);

  if (!itemId && list.length === 0) {
    const { data: created, error } = await supabaseAdmin
      .from("grade_items")
      .insert({ course_id: courseId, name: "Examen Final", weight: 100, sort_order: 0 })
      .select("id")
      .single();
    if (error) throw new Error("No se pudo crear el ítem de nota del examen: " + error.message);
    itemId = created.id;
  }
  if (!itemId) return null;

  await supabaseAdmin.from("exams").update({ grade_item_id: itemId }).eq("id", examId);
  return itemId;
}
