import { supabaseAdmin } from "@/lib/supabase-service";

/**
 * Returns true only if EVERY grade_item of the given course has a numeric score
 * in student_grades for the given registration. This is the strict check used
 * to gate certificate and diploma issuance: a student is not considered
 * "complete" until the practical evaluation (entered manually by admin or
 * instructor) is in.
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

  const { data: grades } = await supabaseAdmin
    .from("student_grades")
    .select("grade_item_id, score")
    .eq("registration_id", registrationId);

  const filledIds = new Set(
    (grades || [])
      .filter((g: any) => g.score !== null && g.score !== undefined)
      .map((g: any) => g.grade_item_id)
  );

  const missing = items
    .filter((gi: any) => !filledIds.has(gi.id))
    .map((gi: any) => gi.name);

  return {
    allGraded: missing.length === 0,
    total: items.length,
    filled: items.length - missing.length,
    missing,
  };
}
