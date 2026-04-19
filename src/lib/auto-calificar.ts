import { supabaseAdmin } from "@/lib/supabase-service";

// Shared helpers used by the admin auto-calificar endpoint and the instructor
// grading endpoint. Extracted so server-side flows can call the logic directly
// without making an internal HTTP round-trip (and without auth headaches).

export async function linkExamsToGradeItems(courseId: string) {
  const { data: items } = await supabaseAdmin
    .from("grade_items")
    .select("id, name")
    .eq("course_id", courseId);
  if (!items || items.length === 0) return;

  const { data: modules } = await supabaseAdmin
    .from("course_modules")
    .select("id, title, sort_order")
    .eq("course_id", courseId)
    .order("sort_order");
  if (!modules || modules.length === 0) return;

  const { data: activities } = await supabaseAdmin
    .from("module_activities")
    .select("id, module_id, type")
    .in("module_id", modules.map((m: any) => m.id))
    .eq("type", "exam");
  if (!activities || activities.length === 0) return;

  const { data: exams } = await supabaseAdmin
    .from("exams")
    .select("id, activity_id, grade_item_id")
    .in("activity_id", activities.map((a: any) => a.id));
  if (!exams || exams.length === 0) return;

  for (const exam of exams) {
    if (exam.grade_item_id) continue;

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

export async function autoGradeRegistration(registrationId: string, courseId: string) {
  const { data: items } = await supabaseAdmin
    .from("grade_items")
    .select("id, name, weight")
    .eq("course_id", courseId)
    .order("sort_order");

  if (!items || items.length === 0) {
    return { graded: 0, message: "Sin grade_items" };
  }

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

    const bestByGradeItem: Record<string, number> = {};
    for (const a of attempts || []) {
      const gid = (a as any).exams?.grade_item_id;
      if (!gid) continue;
      const curr = bestByGradeItem[gid];
      if (curr == null || (a as any).score > curr) {
        bestByGradeItem[gid] = (a as any).score;
      }
    }

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

  const allGraded = items.every((item: any) =>
    grades.some((g: any) => g.grade_item_id === item.id && g.score != null)
  );

  if (totalW === 0) {
    return { graded: gradesAdded, message: "No se pudo calcular final_score" };
  }

  const finalScore = Math.round((wSum / totalW) * 100) / 100;
  const gradeStatus = allGraded ? (finalScore >= 80 ? "approved" : "failed") : "pending";

  const updatePayload: any = { final_score: finalScore, grade_status: gradeStatus };
  if (allGraded) updatePayload.status = "completed";

  await supabaseAdmin
    .from("registrations")
    .update(updatePayload)
    .eq("id", registrationId);

  // Auto-issue diploma if approved and none exists yet
  if (allGraded && gradeStatus === "approved") {
    const { data: existingDiploma } = await supabaseAdmin
      .from("diplomas")
      .select("id")
      .eq("registration_id", registrationId)
      .maybeSingle();

    if (!existingDiploma) {
      const { data: regFull } = await supabaseAdmin
        .from("registrations")
        .select("first_name, last_name, theoretical_start, practical_end, course_id")
        .eq("id", registrationId)
        .single();

      if (regFull) {
        const { data: course } = await supabaseAdmin
          .from("courses")
          .select("title, code, area")
          .eq("id", regFull.course_id)
          .single();

        if (course) {
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
            registration_id: registrationId,
            verification_code: verificationCode,
            student_name: `${regFull.first_name} ${regFull.last_name}`,
            course_title: course.title,
            course_code: course.code,
            final_score: finalScore,
            status: "approved",
            issued_date: new Date().toISOString().split("T")[0],
            theoretical_start: regFull.theoretical_start,
            practical_end: regFull.practical_end,
          });
        }
      }
    }
  }

  return {
    graded: gradesAdded,
    final_score: finalScore,
    grade_status: gradeStatus,
    all_graded: allGraded,
    status_updated: allGraded,
  };
}

// Orchestrator: runs both steps for a registration or whole course
export async function runAutoCalificar({
  registration_id,
  course_id,
}: {
  registration_id?: string;
  course_id?: string;
}) {
  let regQuery = supabaseAdmin
    .from("registrations")
    .select("id, course_id");

  if (registration_id) regQuery = regQuery.eq("id", registration_id);
  else if (course_id) regQuery = regQuery.eq("course_id", course_id);
  else throw new Error("registration_id o course_id requerido");

  const { data: regs } = await regQuery;
  if (!regs || regs.length === 0) return { processed: 0, results: [] };

  const courseIds = Array.from(new Set(regs.map((r: any) => r.course_id).filter(Boolean))) as string[];
  for (const cid of courseIds) {
    await linkExamsToGradeItems(cid);
  }

  const results: any[] = [];
  for (const reg of regs) {
    const result = await autoGradeRegistration((reg as any).id, (reg as any).course_id);
    results.push({ registration_id: (reg as any).id, ...result });
  }

  return { processed: regs.length, results };
}
