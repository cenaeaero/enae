import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";
import { getDgacProcedureCourses } from "@/lib/dgac-courses";

// GET -> Tablero de trámites DGAC: una tarjeta por inscripción en cursos que
// requieren trámite de credencial DGAC (hoy: Operador RPAS N1), confirmadas o completadas. ?egresados=1 incluye egresados.
// Usa los mismos datos del checklist de la ficha (dgac_procedures); no los modifica.
const STEPS = [
  { key: "registro_sipa", label: "Registro SIPA" },
  { key: "solicitud_credencial", label: "Solicitud de credencial" },
  { key: "apendice_c", label: "Apéndice C y certificado" },
  { key: "cedula_identidad", label: "Cédula de identidad" },
  { key: "pago_tasa", label: "Pago tasa aeronáutica" },
  { key: "examen_practico", label: "Examen práctico" },
  { key: "coordinacion_examen", label: "Coordinación examen DGAC" },
] as const;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const includeAlumni = new URL(request.url).searchParams.get("egresados") === "1";

  const courses = await getDgacProcedureCourses();
  const courseIds = (courses || []).map((c) => c.id);
  if (courseIds.length === 0) return NextResponse.json({ cards: [], courses: [] });

  let q = supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, course_id, status, is_alumni, created_at, completed_at, instruction_city")
    .in("course_id", courseIds)
    .in("status", ["confirmed", "completed"]);
  if (!includeAlumni) q = q.or("is_alumni.is.null,is_alumni.eq.false");
  const { data: regs, error: rErr } = await q;
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const ids = (regs || []).map((r) => r.id);
  const procs: any[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabaseAdmin.from("dgac_procedures").select("*").in("registration_id", ids.slice(i, i + 200));
    procs.push(...(data || []));
  }
  const procByReg: Record<string, any> = {};
  for (const p of procs) {
    const prev = procByReg[p.registration_id];
    if (!prev || (p.updated_at || p.created_at) > (prev.updated_at || prev.created_at)) procByReg[p.registration_id] = p;
  }

  const now = Date.now();
  const cards = (regs || []).map((r) => {
    const p = procByReg[r.id] || null;
    const done = STEPS.map((s) => !!p && p[s.key] === true);
    const firstMissing = done.indexOf(false);
    let stage: string;
    if (r.is_alumni) stage = "egresado";
    else if (!p) stage = "sin_tramite";
    else if (firstMissing === -1) stage = p.exam_datetime && new Date(p.exam_datetime).getTime() > now ? "examen_agendado" : "listo_egreso";
    else stage = STEPS[firstMissing].key;
    const ref = (p?.updated_at || p?.created_at || r.created_at) as string;
    const course = (courses || []).find((c) => c.id === r.course_id);
    return {
      registration_id: r.id,
      name: `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email,
      email: r.email,
      course_id: r.course_id,
      course: course?.code || course?.title || "Curso",
      status: r.status,
      theory_done: r.status === "completed",
      procedure_type: p?.procedure_type || null,
      done,
      steps_done: done.filter(Boolean).length,
      stage,
      exam_datetime: p?.exam_datetime || null,
      exam_unit_city: p?.exam_unit_city || null,
      city: r.instruction_city || p?.exam_unit_city || null,
      days_idle: ref ? Math.floor((now - new Date(ref).getTime()) / 86400000) : null,
    };
  });

  return NextResponse.json({ cards, courses: courses || [], steps: STEPS });
}
