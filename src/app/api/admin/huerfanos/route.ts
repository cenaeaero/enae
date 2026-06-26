import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// ============================================================================
// Inscripciones huérfanas: filas en `registrations` con profile_id = NULL.
// No aparecen en el listado de alumnos (que se arma desde `profiles`), pero el
// chequeo de "ya inscrito" sí las ve, así que bloquean reinscripciones.
// Suelen quedar de borrados antiguos de perfil (ON DELETE SET NULL dejaba la
// inscripción colgando). Esta vista las hace visibles y borrables sin SQL.
// La eliminación es DESTRUCTIVA (cascade), por eso el POST recalcula la huella
// académica en el servidor y rechaza borrar lo que tenga datos.
// ============================================================================

async function selectIds(table: string, col: string, filter?: (q: any) => any) {
  // Paginado: Supabase limita a 1000 filas. Sin paginar, las tablas grandes
  // truncan y la huella académica sub-reporta.
  const s = new Set<string>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabaseAdmin.from(table).select(col).range(from, from + PAGE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) {
      console.error(`huerfanos: error leyendo ${table}.${col}:`, error.message);
      break;
    }
    const rows = data || [];
    for (const row of rows) {
      const v = (row as any)[col];
      if (v) s.add(v);
    }
    if (rows.length < PAGE) break;
  }
  return s;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [{ data: regs }, { data: courses }] = await Promise.all([
    supabaseAdmin
      .from("registrations")
      .select(
        "id, course_id, first_name, last_name, email, organization, status, folio_enae, final_score, grade_status, created_at",
      )
      .is("profile_id", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("courses").select("id, title, code"),
  ]);

  const courseById: Record<string, { title: string; code: string | null }> = {};
  for (const c of courses || []) courseById[c.id] = { title: c.title, code: c.code };

  // ---------- huella académica por inscripción ----------
  const [grades, exams, progress, diplomas, dgac, payApproved] = await Promise.all([
    selectIds("student_grades", "registration_id"),
    selectIds("exam_attempts", "registration_id"),
    selectIds("activity_progress", "registration_id", (q) => q.in("status", ["in_progress", "completed"])),
    selectIds("diplomas", "registration_id"),
    selectIds("dgac_procedures", "registration_id"),
    selectIds("payments", "registration_id", (q) => q.eq("status", "approved")),
  ]);

  function footprint(r: any) {
    const blockers: string[] = [];
    if (exams.has(r.id)) blockers.push("examen rendido");
    if (grades.has(r.id)) blockers.push("notas");
    if (progress.has(r.id)) blockers.push("avance en curso");
    if (diplomas.has(r.id)) blockers.push("diploma");
    if (dgac.has(r.id)) blockers.push("certificado DGAC");
    if (payApproved.has(r.id)) blockers.push("pago aprobado");
    if (r.folio_enae) blockers.push("folio ENAE");
    if (r.final_score != null) blockers.push("nota final");
    // 'pending' es el estado por defecto (= sin calificar) y NO debe bloquear
    if (r.grade_status === "approved" || r.grade_status === "failed") blockers.push(`estado: ${r.grade_status}`);
    return { blockers, safeToDelete: blockers.length === 0 };
  }

  const registrations = (regs || []).map((r) => ({
    id: r.id,
    name: `${r.last_name || ""}, ${r.first_name || ""}`,
    email: r.email,
    organization: r.organization,
    course: courseById[r.course_id] || { title: "(curso desconocido)", code: null },
    status: r.status,
    created_at: r.created_at,
    ...footprint(r),
  }));

  const safe = registrations.filter((r) => r.safeToDelete).length;
  return NextResponse.json({
    registrations,
    summary: { total: registrations.length, safe, blocked: registrations.length - safe },
  });
}

// ============================================================================
// POST — { action: "delete", id }  (con candado de datos académicos)
// ============================================================================
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  if (body?.action !== "delete") return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });

  const id = body.id;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const { data: reg, error } = await supabaseAdmin
    .from("registrations")
    .select("id, profile_id, folio_enae, final_score, grade_status")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!reg) return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });
  // Seguridad: esta vista solo opera sobre huérfanas
  if (reg.profile_id) {
    return NextResponse.json({ error: "Esta inscripción ya tiene perfil; gestiónala desde Perfiles/Duplicados" }, { status: 400 });
  }

  // recalcular huella en el servidor (no confiar en el cliente)
  const checks = await Promise.all([
    supabaseAdmin.from("exam_attempts").select("id", { count: "exact", head: true }).eq("registration_id", id),
    supabaseAdmin.from("student_grades").select("id", { count: "exact", head: true }).eq("registration_id", id),
    supabaseAdmin.from("activity_progress").select("id", { count: "exact", head: true }).eq("registration_id", id).in("status", ["in_progress", "completed"]),
    supabaseAdmin.from("diplomas").select("id", { count: "exact", head: true }).eq("registration_id", id),
    supabaseAdmin.from("dgac_procedures").select("id", { count: "exact", head: true }).eq("registration_id", id),
    supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).eq("registration_id", id).eq("status", "approved"),
  ]);
  const labels = ["examen rendido", "notas", "avance en curso", "diploma", "certificado DGAC", "pago aprobado"];
  const blockers: string[] = [];
  checks.forEach((c, i) => { if ((c.count || 0) > 0) blockers.push(labels[i]); });
  if (reg.folio_enae) blockers.push("folio ENAE");
  if (reg.final_score != null) blockers.push("nota final");
  if (reg.grade_status === "approved" || reg.grade_status === "failed") blockers.push(`estado: ${reg.grade_status}`);

  if (blockers.length) {
    return NextResponse.json(
      { error: "No se puede eliminar: la inscripción tiene datos académicos", blockers },
      { status: 409 },
    );
  }

  const { error: delErr } = await supabaseAdmin.from("registrations").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
