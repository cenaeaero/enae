import { supabaseAdmin } from "@/lib/supabase-service";

const normalizeName = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Items the DGAC certificate / diploma gate cares about: theoretical exam,
// practical exam, and final exam. Auto-calificados (módulos, asistencia, etc.)
// no bloquean la emisión.
function isExamGradeItem(name: string): boolean {
  const n = normalizeName(name);
  if (n.trim() === "final") return true;
  if (!n.includes("examen") && !n.includes("evaluacion")) return false;
  return (
    n.includes("teorico") ||
    n.includes("practico") ||
    n.includes("final") ||
    n.includes("dgac")
  );
}

/**
 * Returns whether the exam grades required for certificate/diploma issuance
 * have been entered. Only considers theoretical / practical / final exam
 * items. If the course defines no such items, falls back to requiring every
 * grade_item (legacy behavior).
 */
export async function allGradesEntered(registrationId: string, courseId: string): Promise<{
  allGraded: boolean;
  total: number;
  filled: number;
  missing: string[];
}> {
  const { data: gradeItems } = await supabaseAdmin
    .from("grade_items")
    .select("id, name")
    .eq("course_id", courseId);

  const items = gradeItems || [];
  if (items.length === 0) {
    return { allGraded: false, total: 0, filled: 0, missing: [] };
  }

  const examItems = items.filter((gi: any) => isExamGradeItem(gi.name));
  const requiredItems = examItems.length > 0 ? examItems : items;

  const { data: grades } = await supabaseAdmin
    .from("student_grades")
    .select("grade_item_id, score")
    .eq("registration_id", registrationId);

  const filledIds = new Set(
    (grades || [])
      .filter((g: any) => g.score !== null && g.score !== undefined)
      .map((g: any) => g.grade_item_id)
  );

  const missing = requiredItems
    .filter((gi: any) => !filledIds.has(gi.id))
    .map((gi: any) => gi.name);

  return {
    allGraded: missing.length === 0,
    total: requiredItems.length,
    filled: requiredItems.length - missing.length,
    missing,
  };
}
