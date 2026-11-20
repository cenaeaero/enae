import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";
import { findFinalExam } from "@/lib/examen-directo";
import { normalizeId } from "@/lib/rut";

// Acceso directo al examen final (clase sincrónica):
//   GET  ?course_id=…           → estado del curso, examen y alumnos inscritos
//   POST { action: "preparar" } → da por aprobados (100%) los módulos previos
//   POST { action: "asignar_claves" } → clave de cada alumno = su RUT

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, status: 401, error: "No autenticado" };
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("email", user.email).maybeSingle();
  if (profile?.role !== "admin") return { ok: false as const, status: 403, error: "No autorizado" };
  return { ok: true as const };
}

/** Clave derivada del RUT: sin puntos ni guion, K en mayúscula. Null si no sirve como clave. */
function rutPassword(rut: string | null | undefined): string | null {
  const n = normalizeId(rut).toUpperCase();
  return n.length >= 6 ? n : null;
}

async function loadContext(courseId: string) {
  const { data: course } = await supabaseAdmin
    .from("courses").select("id, title, code").eq("id", courseId).maybeSingle();
  if (!course) return null;

  const exam = await findFinalExam(courseId);

  const { data: modules } = await supabaseAdmin
    .from("course_modules").select("id, title, sort_order").eq("course_id", courseId).order("sort_order");
  const mods = modules || [];

  const { data: activities } = mods.length
    ? await supabaseAdmin.from("module_activities").select("id, type, module_id").in("module_id", mods.map((m: any) => m.id))
    : { data: [] as any[] };

  const { data: gradeItems } = await supabaseAdmin
    .from("grade_items").select("id, name, weight, sort_order").eq("course_id", courseId).order("sort_order");
  const items = gradeItems || [];

  // Ítem de nota del examen: el enlazado o, si no hay, el mismo criterio que usa
  // /api/examenes al finalizar (orden del módulo → título → número → único ítem).
  let examGradeItemId: string | null = exam?.gradeItemId || null;
  if (exam && !examGradeItemId) {
    const mod: any = mods.find((m: any) => m.id === exam.moduleId);
    if (mod) {
      const title = (mod.title || "").toLowerCase();
      const num = (mod.sort_order ?? 0) + 1;
      const match =
        items.find((gi: any) => gi.sort_order === mod.sort_order) ||
        (title ? items.find((gi: any) => gi.name.toLowerCase().includes(title)) : null) ||
        items.find((gi: any) => gi.name.toLowerCase().includes(`modulo ${num}`) || gi.name.toLowerCase().includes(`módulo ${num}`)) ||
        (items.length === 1 ? items[0] : null);
      examGradeItemId = match?.id || null;
    }
  }

  // select("*"): no depender de columnas opcionales (p. ej. `rut`) que podrían no existir.
  const { data: regs, error: regsErr } = await supabaseAdmin
    .from("registrations")
    .select("*")
    .eq("course_id", courseId)
    .in("status", ["confirmed", "completed"])
    .order("last_name");
  if (regsErr) throw new Error("No se pudieron leer las inscripciones: " + regsErr.message);

  return { course, exam, mods, activities: activities || [], items, examGradeItemId, regs: regs || [] };
}

type Ctx = NonNullable<Awaited<ReturnType<typeof loadContext>>>;

async function profilesByEmail(emails: string[]) {
  const map = new Map<string, any>();
  if (emails.length === 0) return map;
  const { data } = await supabaseAdmin
    .from("profiles").select("*").in("email", emails);
  for (const p of data || []) map.set((p.email || "").toLowerCase(), p);
  // Correos guardados con otra capitalización
  for (const e of emails) {
    if (map.has(e.toLowerCase())) continue;
    const { data: one } = await supabaseAdmin
      .from("profiles").select("*").ilike("email", e).limit(1);
    if (one?.[0]) map.set(e.toLowerCase(), one[0]);
  }
  return map;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const courseId = new URL(request.url).searchParams.get("course_id");
  if (!courseId) return NextResponse.json({ error: "course_id requerido" }, { status: 400 });
  let ctx: Awaited<ReturnType<typeof loadContext>>;
  try {
    ctx = await loadContext(courseId);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
  if (!ctx) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

  const regIds = ctx.regs.map((r: any) => r.id);
  const profiles = await profilesByEmail(ctx.regs.map((r: any) => r.email).filter(Boolean));

  const { data: modProg } = regIds.length
    ? await supabaseAdmin.from("module_progress").select("registration_id, module_id, status").in("registration_id", regIds)
    : { data: [] as any[] };
  const { data: grades } = regIds.length
    ? await supabaseAdmin.from("student_grades").select("registration_id, grade_item_id, score").in("registration_id", regIds)
    : { data: [] as any[] };
  const { data: attempts } = regIds.length && ctx.exam
    ? await supabaseAdmin.from("exam_attempts").select("registration_id, status, score, completed_at")
        .eq("exam_id", ctx.exam.examId).in("registration_id", regIds)
    : { data: [] as any[] };

  const prevModuleIds = ctx.mods.filter((m: any) => m.id !== ctx.exam?.moduleId).map((m: any) => m.id);
  const otherItemIds = ctx.items.filter((gi: any) => gi.id !== ctx.examGradeItemId).map((gi: any) => gi.id);

  const students = ctx.regs.map((r: any) => {
    const prof = profiles.get((r.email || "").toLowerCase());
    const rut = r.rut || prof?.rut || null;
    const doneMods = new Set((modProg || []).filter((p: any) => p.registration_id === r.id && p.status === "completed").map((p: any) => p.module_id));
    const scored = new Set((grades || []).filter((g: any) => g.registration_id === r.id && g.score != null).map((g: any) => g.grade_item_id));
    const mine = (attempts || []).filter((a: any) => a.registration_id === r.id);
    const completed = mine.filter((a: any) => a.status === "completed");
    return {
      registration_id: r.id,
      name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
      email: r.email,
      status: r.status,
      has_rut: !!rutPassword(rut),
      has_account: !!prof?.user_id,
      is_staff: !!prof && ["admin", "instructor"].includes(prof.role),
      prepared: prevModuleIds.every((id: string) => doneMods.has(id)) && otherItemIds.every((id: string) => scored.has(id)),
      exam_status: completed.length ? "rendido" : mine.length ? "en curso" : "pendiente",
      exam_score: completed.length ? Math.max(...completed.map((a: any) => Number(a.score) || 0)) : null,
    };
  });

  // Nota mínima del examen para aprobar el curso (80) si los demás ítems valen 100.
  let minExamScore: number | null = null;
  const examItem: any = ctx.items.find((gi: any) => gi.id === ctx.examGradeItemId);
  if (examItem && Number(examItem.weight) > 0) {
    const totalW = ctx.items.reduce((s: number, gi: any) => s + Number(gi.weight || 0), 0);
    const otherW = totalW - Number(examItem.weight);
    minExamScore = Math.max(0, Math.ceil((80 * totalW - 100 * otherW) / Number(examItem.weight)));
  }

  return NextResponse.json({
    course: ctx.course,
    exam: ctx.exam,
    modules: ctx.mods.map((m: any) => ({ id: m.id, title: m.title, is_exam_module: m.id === ctx.exam?.moduleId })),
    grade_items: ctx.items.map((gi: any) => ({ id: gi.id, name: gi.name, weight: gi.weight, is_exam: gi.id === ctx.examGradeItemId })),
    exam_grade_item_found: !!ctx.examGradeItemId,
    min_exam_score: minExamScore,
    students,
  });
}

async function preparar(ctx: Ctx) {
  const regs = ctx.regs.filter((r: any) => r.status === "confirmed");
  if (regs.length === 0) return { alumnos: 0, modulos: 0, notas: 0, aviso: null as string | null };
  const now = new Date().toISOString();
  const regIds = regs.map((r: any) => r.id);

  // 1) Módulos previos (todos menos el del examen) y sus actividades → completados
  const prevModules = ctx.mods.filter((m: any) => m.id !== ctx.exam?.moduleId);
  const prevActivities = ctx.activities.filter((a: any) => a.type !== "exam" && a.id !== ctx.exam?.activityId);

  const actRows = regs.flatMap((r: any) => prevActivities.map((a: any) => ({
    registration_id: r.id, activity_id: a.id, status: "completed", started_at: now, completed_at: now,
  })));
  if (actRows.length) {
    const { error } = await supabaseAdmin.from("activity_progress").upsert(actRows, { onConflict: "registration_id,activity_id" });
    if (error) throw new Error(error.message);
  }
  const modRows = regs.flatMap((r: any) => prevModules.map((m: any) => ({
    registration_id: r.id, module_id: m.id, status: "completed", started_at: now, completed_at: now,
  })));
  if (modRows.length) {
    const { error } = await supabaseAdmin.from("module_progress").upsert(modRows, { onConflict: "registration_id,module_id" });
    if (error) throw new Error(error.message);
  }

  // 2) Ítems de nota distintos al examen → 100 (sin pisar notas ya registradas)
  let notas = 0;
  let aviso: string | null = null;
  const otherItems = ctx.items.filter((gi: any) => gi.id !== ctx.examGradeItemId);
  if (otherItems.length && !ctx.examGradeItemId) {
    aviso = "No se pudo identificar el ítem de nota del examen final; no se registraron notas. Enlázalo en la configuración del examen y vuelve a preparar.";
  } else if (otherItems.length) {
    const { data: existing } = await supabaseAdmin
      .from("student_grades").select("registration_id, grade_item_id, score").in("registration_id", regIds);
    const has = new Set((existing || []).filter((g: any) => g.score != null).map((g: any) => `${g.registration_id}:${g.grade_item_id}`));
    const rows = regs.flatMap((r: any) => otherItems
      .filter((gi: any) => !has.has(`${r.id}:${gi.id}`))
      .map((gi: any) => ({
        registration_id: r.id, grade_item_id: gi.id, score: 100, graded_at: now,
        comments: "Módulo dado por aprobado (clase sincrónica)",
      })));
    if (rows.length) {
      const { error } = await supabaseAdmin.from("student_grades").upsert(rows, { onConflict: "registration_id,grade_item_id" });
      if (error) throw new Error(error.message);
    }
    notas = rows.length;
  }

  return { alumnos: regs.length, modulos: prevModules.length, notas, aviso };
}

async function findAuthUserId(email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const hit = data.users.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

async function asignarClaves(ctx: Ctx) {
  const profiles = await profilesByEmail(ctx.regs.map((r: any) => r.email).filter(Boolean));
  const seen = new Set<string>();
  const results: { name: string; email: string; resultado: "rut" | "generada" | "omitido" | "error"; clave?: string; detalle?: string }[] = [];

  for (const r of ctx.regs as any[]) {
    const email = (r.email || "").trim();
    const key = email.toLowerCase();
    if (!email || seen.has(key)) continue;
    seen.add(key);
    const name = `${r.first_name || ""} ${r.last_name || ""}`.trim();
    const prof = profiles.get(key);

    // Nunca tocar la clave de cuentas del equipo (admin / instructor).
    if (prof && ["admin", "instructor"].includes(prof.role)) {
      results.push({ name, email, resultado: "omitido", detalle: "Cuenta de administrador/instructor: se mantiene su clave" });
      continue;
    }

    const fromRut = rutPassword(r.rut || prof?.rut);
    const password = fromRut || crypto.randomBytes(4).toString("hex");

    let userId: string | null = prof?.user_id || null;
    if (!userId) userId = await findAuthUserId(email);

    let errMsg: string | null = null;
    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (error) errMsg = error.message;
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name: name },
      });
      if (error) errMsg = error.message;
      userId = data?.user?.id || null;
    }
    if (errMsg || !userId) {
      results.push({ name, email, resultado: "error", detalle: errMsg || "No se pudo crear la cuenta" });
      continue;
    }
    if (prof && !prof.user_id) {
      await supabaseAdmin.from("profiles").update({ user_id: userId }).eq("id", prof.id);
    }
    results.push(fromRut
      ? { name, email, resultado: "rut" }
      : { name, email, resultado: "generada", clave: password, detalle: "Sin RUT registrado: entrégale esta clave en privado" });
  }
  return { results };
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { course_id, action } = await request.json();
    if (!course_id) return NextResponse.json({ error: "course_id requerido" }, { status: 400 });
    const ctx = await loadContext(course_id);
    if (!ctx) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    if (action === "preparar") return NextResponse.json(await preparar(ctx));
    if (action === "asignar_claves") return NextResponse.json(await asignarClaves(ctx));
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
