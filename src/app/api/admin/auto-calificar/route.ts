import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";

// Auto-grading endpoint:
// 1. Links exams to grade_items if not linked
// 2. Copies exam attempt scores into student_grades
// 3. Computes final_score and grade_status
// Can be called for a specific registration or for a whole course
export async function POST(request: Request) {
  try {
    const { registration_id, course_id } = await request.json();

    if (!registration_id && !course_id) {
      return NextResponse.json({ error: "registration_id o course_id requerido" }, { status: 400 });
    }

    // Get target registrations
    let regQuery = supabaseAdmin
      .from("registrations")
      .select("id, course_id, final_score, grade_status");

    if (registration_id) {
      regQuery = regQuery.eq("id", registration_id);
    } else {
      regQuery = regQuery.eq("course_id", course_id);
    }

    const { data: regs } = await regQuery;
    if (!regs || regs.length === 0) {
      return NextResponse.json({ error: "No hay registros" }, { status: 404 });
    }

    // Group by course_id
    const courseIds = Array.from(new Set(regs.map((r: any) => r.course_id).filter(Boolean))) as string[];

    // STEP 1: Link exams to grade_items for all involved courses
    for (const cid of courseIds) {
      await linkExamsToGradeItems(cid);
    }

    const results: any[] = [];

    // STEP 2+3: Copy exam scores and compute final_score per registration
    for (const reg of regs) {
      const result = await autoGradeRegistration((reg as any).id, (reg as any).course_id);
      results.push({ registration_id: (reg as any).id, ...result });
    }

    return NextResponse.json({
      processed: regs.length,
      results,
    });
  } catch (err: any) {
    console.error("[auto-calificar] Error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}

async function linkExamsToGradeItems(courseId: string) {
  // Get grade_items
  const { data: items } = await supabaseAdmin
    .from("grade_items")
    .select("id, name")
    .eq("course_id", courseId);
  if (!items || items.length === 0) return;

  // Get modules
  const { data: modules } = await supabaseAdmin
    .from("course_modules")
    .select("id, title, sort_order")
    .eq("course_id", courseId)
    .order("sort_order");
  if (!modules || modules.length === 0) return;

  // Get exam activities
  const { data: activities } = await supabaseAdmin
    .from("module_activities")
    .select("id, module_id, type")
    .in("module_id", modules.map((m: any) => m.id))
    .eq("type", "exam");
  if (!activities || activities.length === 0) return;

  // Get exams
  const { data: exams } = await supabaseAdmin
    .from("exams")
    .select("id, activity_id, grade_item_id")
    .in("activity_id", activities.map((a: any) => a.id));
  if (!exams || exams.length === 0) return;

  // Link each exam to matching grade_item
  for (const exam of exams) {
    if (exam.grade_item_id) continue; // already linked

    const activity = activities.find((a: any) => a.id === exam.activity_id);
    if (!activity) continue;
    const mod = modules.find((m: any) => m.id === activity.module_id);
    if (!mod) continue;

    const modIdx = modules.findIndex((m: any) => m.id === mod.id);
    const modNumStr = `modulo ${modIdx + 1}`;

    const matching = items.find((gi: any) => {
      const n = gi.name.toLowerCase();
      const t = mod.title.toLowerCase();
      return n.includes(t) || n.includes(modNumStr);
    });

    if (matching) {
      await supabaseAdmin.from("exams").update({ grade_item_id: matching.id }).eq("id", exam.id);
    }
  }
}

async function autoGradeRegistration(registrationId: string, courseId: string) {
  // Get grade_items
  const { data: items } = await supabaseAdmin
    .from("grade_items")
    .select("id, name, weight")
    .eq("course_id", courseId)
    .order("sort_order");

  if (!items || items.length === 0) {
    return { graded: 0, message: "Sin grade_items" };
  }

  // Get all completed exam attempts of this registration with linked grade_item_id
  const { data: exams } = await supabaseAdmin
    .from("exams")
    .select("id, grade_item_id");
  const examIds = (exams || []).map((e: any) => e.id);

  let gradesAdded = 0;
  if (examIds.length > 0) {
    const { data: attempts } = await supabaseAdmin
      .from("exam_attempts")
      .select("exam_id, score, attempt_number, completed_at, exams(grade_item_id)")
      .eq("registration_id", registrationId)
      .eq("status", "completed")
      .in("exam_id", examIds)
      .order("completed_at", { ascending: false });

    // Use the best score per grade_item_id
    const bestByGradeItem: Record<string, number> = {};
    for (const a of attempts || []) {
      const gid = (a as any).exams?.grade_item_id;
      if (!gid) continue;
      const curr = bestByGradeItem[gid];
      if (curr == null || (a as any).score > curr) {
        bestByGradeItem[gid] = (a as any).score;
      }
    }

    // Upsert into student_grades
    const rows = Object.entries(bestByGradeItem).map(([gid, score]) => ({
      registration_id: registrationId,
      grade_item_id: gid,
      score,
      graded_at: new Date().toISOString(),
      comments: "Auto-calificado desde examen",
    }));

    if (rows.length > 0) {
      await supabaseAdmin
        .from("student_grades")
        .upsert(rows, { onConflict: "registration_id,grade_item_id" });
      gradesAdded = rows.length;
    }
  }

  // Compute final_score based on all student_grades
  const { data: grades } = await supabaseAdmin
    .from("student_grades")
    .select("grade_item_id, score")
    .eq("registration_id", registrationId);

  if (!grades || grades.length === 0) {
    return { graded: gradesAdded, message: "Sin notas todavia" };
  }

  let wSum = 0;
  let totalW = 0;
  for (const item of items) {
    const g = grades.find((gg: any) => gg.grade_item_id === item.id);
    if (g && g.score != null) {
      wSum += g.score * item.weight;
      totalW += item.weight;
    }
  }

  // Check if all grade_items have scores (complete)
  const allGraded = items.every((item: any) =>
    grades.some((g: any) => g.grade_item_id === item.id && g.score != null)
  );

  if (totalW === 0) {
    return { graded: gradesAdded, message: "No se pudo calcular final_score" };
  }

  const finalScore = Math.round((wSum / totalW) * 100) / 100;
  const gradeStatus = allGraded ? (finalScore >= 80 ? "approved" : "failed") : "pending";

  await supabaseAdmin
    .from("registrations")
    .update({ final_score: finalScore, grade_status: gradeStatus })
    .eq("id", registrationId);

  return {
    graded: gradesAdded,
    final_score: finalScore,
    grade_status: gradeStatus,
    all_graded: allGraded,
  };
}
