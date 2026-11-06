import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// GET -> Prioridades DGAC para el dashboard del admin.
//
// Universo: inscripciones de cursos que emiten Certificado DGAC
// (courses.has_dgac_certificate), confirmadas o completadas y NO egresadas.
//
// Señales por inscripción:
//   - Práctico realizado: checklist "Examen práctico de vuelo" (dgac_procedures.examen_practico)
//     o asignación práctica del instructor completada, o evaluación práctica completada.
//   - Teórico terminado: inscripción "completed" o 100% de actividades del curso.
//   - Administrativo: ítems del checklist DGAC (SIPA, solicitud, Apéndice C, cédula,
//     tasa, coordinación examen).
//
// Categorías prioritarias:
//   A) teorico_pendiente : práctico hecho, teórico NO terminado  -> seguimiento al alumno.
//   B) tramite_pendiente : práctico + teórico listos, checklist DGAC incompleto -> trabajo nuestro.

const ADMIN_STEPS: { key: string; label: string }[] = [
  { key: "registro_sipa", label: "Registro SIPA" },
  { key: "solicitud_credencial", label: "Solicitud de credencial" },
  { key: "apendice_c", label: "Apéndice C y Certificado" },
  { key: "cedula_identidad", label: "Cédula de identidad" },
  { key: "pago_tasa", label: "Pago tasa aeronáutica" },
  { key: "coordinacion_examen", label: "Coordinación examen DGAC" },
];

function maxDate(...ds: (string | null | undefined)[]): string | null {
  let best: number | null = null;
  for (const d of ds) {
    if (!d) continue;
    const t = new Date(d).getTime();
    if (!Number.isNaN(t) && (best === null || t > best)) best = t;
  }
  return best === null ? null : new Date(best).toISOString();
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: courses, error: cErr } = await supabaseAdmin
    .from("courses")
    .select("id, title, code")
    .eq("has_dgac_certificate", true);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  const courseIds = (courses || []).map((c) => c.id);
  if (courseIds.length === 0) return NextResponse.json({ teorico_pendiente: [], tramite_pendiente: [] });
  const courseById: Record<string, { title: string; code: string | null }> = {};
  for (const c of courses || []) courseById[c.id] = { title: c.title, code: c.code };

  const { data: regs, error: rErr } = await supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, course_id, status, is_alumni, completed_at")
    .in("course_id", courseIds)
    .in("status", ["confirmed", "completed"]);
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
  const active = (regs || []).filter((r) => r.is_alumni !== true);
  if (active.length === 0) return NextResponse.json({ teorico_pendiente: [], tramite_pendiente: [] });
  const regIds = active.map((r) => r.id);

  // Lotes para no exceder el largo de URL de PostgREST
  async function inChunks<T>(fn: (ids: string[]) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
    const out: T[] = [];
    for (let i = 0; i < regIds.length; i += 200) {
      const { data } = await fn(regIds.slice(i, i + 200));
      out.push(...(data || []));
    }
    return out;
  }

  const [procs, assigns] = await Promise.all([
    inChunks<any>((ids) => supabaseAdmin.from("dgac_procedures").select("*").in("registration_id", ids)),
    inChunks<any>((ids) =>
      supabaseAdmin
        .from("instructor_assignments")
        .select("id, registration_id, kind, status, completed_at, scheduled_date")
        .in("registration_id", ids)
        .in("kind", ["practical", "both"])
    ),
  ]);

  const assignIds = assigns.map((a) => a.id);
  const evals: any[] = [];
  for (let i = 0; i < assignIds.length; i += 200) {
    const { data } = await supabaseAdmin
      .from("practical_evaluations")
      .select("assignment_id, status, completed_at, eval_date")
      .in("assignment_id", assignIds.slice(i, i + 200));
    evals.push(...(data || []));
  }
  const evalByAssign: Record<string, any> = {};
  for (const e of evals) evalByAssign[e.assignment_id] = e;

  const procByReg: Record<string, any> = {};
  for (const p of procs) {
    // Si hubiera más de un trámite, quedarse con el más reciente
    const prev = procByReg[p.registration_id];
    if (!prev || (p.updated_at || p.created_at) > (prev.updated_at || prev.created_at)) procByReg[p.registration_id] = p;
  }

  // Práctico realizado + fecha de referencia
  const practical: Record<string, { done: boolean; date: string | null }> = {};
  for (const a of assigns) {
    const ev = evalByAssign[a.id];
    const done = a.status === "completed" || ev?.status === "completed";
    if (!done) continue;
    const cur = practical[a.registration_id] || { done: true, date: null };
    cur.date = maxDate(cur.date, a.completed_at, ev?.completed_at, ev?.eval_date, a.scheduled_date);
    practical[a.registration_id] = cur;
  }
  for (const r of active) {
    const p = procByReg[r.id];
    if (p?.examen_practico === true && !practical[r.id]) practical[r.id] = { done: true, date: null };
  }

  const candidates = active.filter((r) => practical[r.id]?.done);
  if (candidates.length === 0) return NextResponse.json({ teorico_pendiente: [], tramite_pendiente: [] });

  // Avance del teórico (solo para los que no están "completed")
  const needProgress = candidates.filter((r) => r.status !== "completed");
  const progressByReg: Record<string, { done: number; total: number }> = {};
  if (needProgress.length > 0) {
    const cids = Array.from(new Set(needProgress.map((r) => r.course_id)));
    const { data: modules } = await supabaseAdmin.from("course_modules").select("id, course_id").in("course_id", cids);
    const modCourse: Record<string, string> = {};
    for (const m of modules || []) modCourse[m.id] = m.course_id;
    const totalByCourse: Record<string, number> = {};
    const modIds = Object.keys(modCourse);
    if (modIds.length > 0) {
      const { data: acts } = await supabaseAdmin.from("module_activities").select("id, module_id").in("module_id", modIds);
      for (const a of acts || []) {
        const c = modCourse[a.module_id];
        if (c) totalByCourse[c] = (totalByCourse[c] || 0) + 1;
      }
    }
    const { data: prog } = await supabaseAdmin
      .from("activity_progress")
      .select("registration_id")
      .in("registration_id", needProgress.map((r) => r.id))
      .eq("status", "completed");
    const doneByReg: Record<string, number> = {};
    for (const p of prog || []) doneByReg[p.registration_id] = (doneByReg[p.registration_id] || 0) + 1;
    for (const r of needProgress) {
      progressByReg[r.id] = { done: doneByReg[r.id] || 0, total: totalByCourse[r.course_id] || 0 };
    }
  }

  const now = Date.now();
  const teorico_pendiente: any[] = [];
  const tramite_pendiente: any[] = [];

  for (const r of candidates) {
    const course = courseById[r.course_id] || { title: "Curso", code: null };
    const prac = practical[r.id];
    const base = {
      registration_id: r.id,
      name: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
      email: r.email,
      course: course.title,
      course_code: course.code,
      practical_date: prac.date,
      days_since_practical: prac.date ? Math.floor((now - new Date(prac.date).getTime()) / 86400000) : null,
    };

    let theoryDone = r.status === "completed";
    let pct: number | null = null;
    if (!theoryDone) {
      const pr = progressByReg[r.id];
      if (pr && pr.total > 0) {
        pct = Math.min(100, Math.round((pr.done / pr.total) * 100));
        if (pr.done >= pr.total) theoryDone = true;
      }
    }

    if (!theoryDone) {
      teorico_pendiente.push({ ...base, theory_progress: pct });
      continue;
    }

    const proc = procByReg[r.id];
    const missing = proc ? ADMIN_STEPS.filter((s) => proc[s.key] !== true).map((s) => s.label) : ["Trámite DGAC no creado"];
    if (missing.length > 0) {
      tramite_pendiente.push({
        ...base,
        procedure_type: proc?.procedure_type || null,
        missing,
        steps_done: proc ? ADMIN_STEPS.length - missing.length : 0,
        steps_total: ADMIN_STEPS.length,
      });
    }
  }

  // Más antiguos primero (los que llevan más días esperando); sin fecha al final
  const byAge = (a: any, b: any) => (b.days_since_practical ?? -1) - (a.days_since_practical ?? -1);
  teorico_pendiente.sort(byAge);
  tramite_pendiente.sort(byAge);

  return NextResponse.json({ teorico_pendiente, tramite_pendiente });
}
