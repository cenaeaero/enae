import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// ============================================================================
// Detección de duplicados de alumnos (inscripciones y perfiles) + limpieza
// guardada. La eliminación de una inscripción es DESTRUCTIVA (cascade borra
// exámenes, notas, diplomas, certificados, pagos…), por eso el endpoint POST
// recalcula la huella académica en el servidor y rechaza borrar cualquier
// inscripción que tenga datos académicos.
// ============================================================================

// ---------- normalizadores ----------
function normEmail(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase();
}
function normRut(s: string | null | undefined): string {
  return (s || "").replace(/[.\-\s]/g, "").toLowerCase();
}
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function normName(last: string | null | undefined, first: string | null | undefined): string {
  return stripAccents(`${last || ""} ${first || ""}`.trim().toLowerCase()).replace(/\s+/g, " ");
}

// ---------- union-find ----------
class UnionFind {
  parent: Record<string, string> = {};
  find(x: string): string {
    if (this.parent[x] === undefined) this.parent[x] = x;
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }
  union(a: string, b: string) {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

async function selectIds(table: string, col: string, filter?: (q: any) => any) {
  let q = supabaseAdmin.from(table).select(col);
  if (filter) q = filter(q);
  const { data, error } = await q;
  if (error) {
    // tabla puede no existir en algún entorno; no romper la detección entera
    console.error(`duplicados: error leyendo ${table}.${col}:`, error.message);
    return new Set<string>();
  }
  const s = new Set<string>();
  for (const row of data || []) {
    const v = (row as any)[col];
    if (v) s.add(v);
  }
  return s;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [{ data: regs }, { data: profiles }, { data: courses }] = await Promise.all([
    supabaseAdmin
      .from("registrations")
      .select(
        "id, course_id, profile_id, first_name, last_name, email, organization, status, folio_enae, final_score, grade_status, created_at",
      )
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, rut, organization, role, created_at")
      .order("created_at", { ascending: true }),
    supabaseAdmin.from("courses").select("id, title, code"),
  ]);

  const courseById: Record<string, { title: string; code: string | null }> = {};
  for (const c of courses || []) courseById[c.id] = { title: c.title, code: c.code };

  // RUT por inscripción: las registrations no guardan rut, lo traemos del perfil
  const rutByProfileId: Record<string, string> = {};
  const rutByEmail: Record<string, string> = {};
  for (const p of profiles || []) {
    const r = normRut(p.rut);
    if (r) {
      rutByProfileId[p.id] = r;
      const e = normEmail(p.email);
      if (e) rutByEmail[e] = r;
    }
  }

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
    if (r.grade_status) blockers.push(`estado: ${r.grade_status}`);
    return { blockers, safeToDelete: blockers.length === 0 };
  }

  // ===========================================================
  // 1) Inscripciones duplicadas (misma persona, MISMO curso)
  // ===========================================================
  const regGroups: any[] = [];
  const regsByCourse: Record<string, any[]> = {};
  for (const r of regs || []) {
    if (!r.course_id) continue;
    (regsByCourse[r.course_id] ||= []).push(r);
  }

  for (const [courseId, list] of Object.entries(regsByCourse)) {
    if (list.length < 2) continue;
    const uf = new UnionFind();
    list.forEach((r) => uf.find(r.id));
    // indexar por cada señal
    const byEmail: Record<string, string> = {};
    const byRut: Record<string, string> = {};
    const byName: Record<string, string> = {};
    for (const r of list) {
      const e = normEmail(r.email);
      const rut = (r.profile_id && rutByProfileId[r.profile_id]) || rutByEmail[normEmail(r.email)] || "";
      const n = normName(r.last_name, r.first_name);
      if (e) { if (byEmail[e]) uf.union(byEmail[e], r.id); else byEmail[e] = r.id; }
      if (rut) { if (byRut[rut]) uf.union(byRut[rut], r.id); else byRut[rut] = r.id; }
      if (n) { if (byName[n]) uf.union(byName[n], r.id); else byName[n] = r.id; }
    }
    // agrupar por raíz
    const clusters: Record<string, any[]> = {};
    for (const r of list) (clusters[uf.find(r.id)] ||= []).push(r);

    for (const members of Object.values(clusters)) {
      if (members.length < 2) continue;
      // razones de match dentro del grupo
      const emails = new Set(members.map((m) => normEmail(m.email)).filter(Boolean));
      const ruts = new Set(members.map((m) => (m.profile_id && rutByProfileId[m.profile_id]) || rutByEmail[normEmail(m.email)] || "").filter(Boolean));
      const reasons: string[] = [];
      if (emails.size === 1 && [...emails][0]) reasons.push("email");
      if (ruts.size === 1 && [...ruts][0]) reasons.push("rut");
      if (!reasons.includes("email")) reasons.push("nombre"); // se unió por nombre (posible)
      const exactMatch = reasons.includes("email") || reasons.includes("rut");

      regGroups.push({
        course: courseById[courseId] || { title: "(curso desconocido)", code: null },
        course_id: courseId,
        matchedBy: reasons,
        confidence: exactMatch ? "alta" : "posible",
        members: members
          .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
          .map((r) => ({
            id: r.id,
            profile_id: r.profile_id,
            name: `${r.last_name || ""}, ${r.first_name || ""}`,
            email: r.email,
            rut: (r.profile_id && rutByProfileId[r.profile_id]) || rutByEmail[normEmail(r.email)] || null,
            organization: r.organization,
            status: r.status,
            created_at: r.created_at,
            ...footprint(r),
          })),
      });
    }
  }

  // ===========================================================
  // 2) Perfiles duplicados (misma persona, varios perfiles)
  // ===========================================================
  // huella por perfil = nº de inscripciones vinculadas (por profile_id o email)
  const regCountByProfile: Record<string, number> = {};
  const regAcademicByProfile: Record<string, number> = {};
  const regsByEmail: Record<string, any[]> = {};
  for (const r of regs || []) {
    const e = normEmail(r.email);
    if (e) (regsByEmail[e] ||= []).push(r);
  }
  function profileRegInfo(p: any) {
    const linked = new Map<string, any>();
    for (const r of regs || []) {
      if (r.profile_id === p.id) linked.set(r.id, r);
    }
    for (const r of regsByEmail[normEmail(p.email)] || []) linked.set(r.id, r);
    let academic = 0;
    for (const r of linked.values()) if (footprint(r).blockers.length) academic++;
    regCountByProfile[p.id] = linked.size;
    regAcademicByProfile[p.id] = academic;
    return { count: linked.size, academic };
  }

  const profGroups: any[] = [];
  {
    const plist = profiles || [];
    const uf = new UnionFind();
    plist.forEach((p) => uf.find(p.id));
    const byEmail: Record<string, string> = {};
    const byRut: Record<string, string> = {};
    const byName: Record<string, string> = {};
    for (const p of plist) {
      const e = normEmail(p.email);
      const rut = normRut(p.rut);
      const n = normName(p.last_name, p.first_name);
      if (e) { if (byEmail[e]) uf.union(byEmail[e], p.id); else byEmail[e] = p.id; }
      if (rut) { if (byRut[rut]) uf.union(byRut[rut], p.id); else byRut[rut] = p.id; }
      if (n) { if (byName[n]) uf.union(byName[n], p.id); else byName[n] = p.id; }
    }
    const clusters: Record<string, any[]> = {};
    for (const p of plist) (clusters[uf.find(p.id)] ||= []).push(p);

    for (const members of Object.values(clusters)) {
      if (members.length < 2) continue;
      const emails = new Set(members.map((m) => normEmail(m.email)).filter(Boolean));
      const ruts = new Set(members.map((m) => normRut(m.rut)).filter(Boolean));
      const reasons: string[] = [];
      if (emails.size === 1 && [...emails][0]) reasons.push("email");
      if (ruts.size === 1 && [...ruts][0]) reasons.push("rut");
      if (!reasons.length) reasons.push("nombre");
      const exactMatch = reasons.includes("email") || reasons.includes("rut");

      profGroups.push({
        matchedBy: reasons,
        confidence: exactMatch ? "alta" : "posible",
        members: members
          .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
          .map((p) => {
            const info = profileRegInfo(p);
            return {
              id: p.id,
              name: `${p.last_name || ""}, ${p.first_name || ""}`,
              email: p.email,
              rut: p.rut,
              organization: p.organization,
              role: p.role,
              created_at: p.created_at,
              registrations: info.count,
              academic_registrations: info.academic,
            };
          }),
      });
    }
  }

  // ordenar: confianza alta primero
  const order = (g: any) => (g.confidence === "alta" ? 0 : 1);
  regGroups.sort((a, b) => order(a) - order(b) || a.course.title.localeCompare(b.course.title));
  profGroups.sort((a, b) => order(a) - order(b));

  return NextResponse.json({
    registration_groups: regGroups,
    profile_groups: profGroups,
    summary: {
      registration_dupes: regGroups.length,
      profile_dupes: profGroups.length,
      total_registrations: (regs || []).length,
      total_profiles: (profiles || []).length,
    },
  });
}

// ============================================================================
// POST — acciones de limpieza (todas guardadas)
//   { action: "delete-registration", id }
//   { action: "merge-profiles", sourceId, targetId }  → reasigna inscripciones y borra el source
//   { action: "delete-profile", id }                  → solo si no tiene inscripciones
// ============================================================================
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  if (!body?.action) return NextResponse.json({ error: "Falta action" }, { status: 400 });

  // ---- borrar inscripción duplicada (con candado) ----
  if (body.action === "delete-registration") {
    const id = body.id;
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const { data: reg, error } = await supabaseAdmin
      .from("registrations")
      .select("id, folio_enae, final_score, grade_status")
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!reg) return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 });

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
    if (reg.grade_status) blockers.push(`estado: ${reg.grade_status}`);

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

  // ---- fusionar perfiles: reasigna inscripciones del source al target, luego borra source ----
  if (body.action === "merge-profiles") {
    const { sourceId, targetId } = body;
    if (!sourceId || !targetId || sourceId === targetId)
      return NextResponse.json({ error: "sourceId/targetId inválidos" }, { status: 400 });

    const { data: tgt } = await supabaseAdmin.from("profiles").select("id").eq("id", targetId).maybeSingle();
    if (!tgt) return NextResponse.json({ error: "Perfil destino no existe" }, { status: 404 });

    // reasignar inscripciones vinculadas por profile_id
    const { error: upErr } = await supabaseAdmin
      .from("registrations")
      .update({ profile_id: targetId })
      .eq("profile_id", sourceId);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // borrar el perfil source (sus inscripciones ya fueron reasignadas; no se pierde nada académico)
    const { error: delErr } = await supabaseAdmin.from("profiles").delete().eq("id", sourceId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ---- borrar perfil vacío (sin inscripciones por profile_id ni por email) ----
  if (body.action === "delete-profile") {
    const id = body.id;
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    const { data: prof } = await supabaseAdmin.from("profiles").select("id, email").eq("id", id).maybeSingle();
    if (!prof) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

    const byId = await supabaseAdmin.from("registrations").select("id", { count: "exact", head: true }).eq("profile_id", id);
    const byEmail = await supabaseAdmin.from("registrations").select("id", { count: "exact", head: true }).ilike("email", prof.email || "___nunca___");
    if ((byId.count || 0) > 0 || (byEmail.count || 0) > 0) {
      return NextResponse.json(
        { error: "El perfil tiene inscripciones. Usa 'Fusionar' para conservarlas antes de borrar." },
        { status: 409 },
      );
    }
    const { error: delErr } = await supabaseAdmin.from("profiles").delete().eq("id", id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });
}
