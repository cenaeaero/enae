import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { requireAdmin } from "@/lib/auth-instructor";

// POST { registration_ids: string[] }  -> egreso POR CURSO (ficha del alumno):
//   marca is_alumni=true solo en esas inscripciones si están "completed",
//   aunque el alumno tenga otros cursos en curso. Sin notificaciones.
// POST { emails: string[] }
// Pasa a Egresado (is_alumni=true) a los alumnos indicados, SOLO si no tienen
// inscripciones pendientes (sin pagar o en curso). Marca todas sus inscripciones
// completadas. Devuelve el detalle: egresados, saltados por pendientes, sin cursos.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));

  // --- Modo por inscripción (egreso inmediato de un curso concreto) ---
  if (Array.isArray(body.registration_ids)) {
    const ids: string[] = body.registration_ids.filter((x: any) => typeof x === "string" && x.trim());
    if (ids.length === 0) return NextResponse.json({ error: "registration_ids requerido" }, { status: 400 });

    const { data: regs, error: selErr } = await supabaseAdmin
      .from("registrations")
      .select("id, status, is_alumni")
      .in("id", ids);
    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

    const rows = regs || [];
    const eligibles = rows.filter((r) => r.status === "completed" && r.is_alumni !== true).map((r) => r.id);
    const notCompleted = rows.filter((r) => r.status !== "completed").map((r) => r.id);
    const already = rows.filter((r) => r.is_alumni === true).map((r) => r.id);

    if (eligibles.length > 0) {
      const { error } = await supabaseAdmin
        .from("registrations")
        .update({ is_alumni: true, alumni_at: new Date().toISOString() })
        .in("id", eligibles)
        .eq("status", "completed");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      graduated_registrations: eligibles,
      skipped_not_completed: notCompleted,
      already_alumni: already,
    });
  }
  const emails: string[] = Array.isArray(body.emails)
    ? body.emails.filter((e: any) => typeof e === "string" && e.trim())
    : [];

  if (emails.length === 0) {
    return NextResponse.json({ error: "emails requerido" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const graduated: string[] = [];
  const skippedPending: string[] = [];
  const skippedNone: string[] = [];

  for (const email of emails) {
    const { data: regs } = await supabaseAdmin
      .from("registrations")
      .select("id, status, is_alumni")
      .eq("email", email);

    const rows = regs || [];
    const hasPending = rows.some((r) => r.status === "pending" || r.status === "confirmed");
    if (hasPending) {
      skippedPending.push(email);
      continue;
    }

    const toGraduate = rows.filter((r) => r.status === "completed" && r.is_alumni !== true);
    if (toGraduate.length === 0) {
      skippedNone.push(email);
      continue;
    }

    const { error } = await supabaseAdmin
      .from("registrations")
      .update({ is_alumni: true, alumni_at: now })
      .eq("email", email)
      .eq("status", "completed");

    if (error) {
      skippedNone.push(email);
    } else {
      graduated.push(email);
    }
  }

  return NextResponse.json({
    ok: true,
    graduated,
    skipped_pending: skippedPending,
    skipped_none: skippedNone,
  });
}
