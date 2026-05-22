import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-service";
import { createSupabaseServer } from "@/lib/supabase-server";

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, status: 401, error: "No autenticado" };
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("role").eq("email", user.email).maybeSingle();
  if (profile?.role !== "admin") return { ok: false, status: 403, error: "No autorizado" };
  return { ok: true };
}

// POST { registration_ids: string[] } → vincula alumnos al caso
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const body = await request.json();
  if (!Array.isArray(body.registration_ids) || body.registration_ids.length === 0) {
    return NextResponse.json({ error: "registration_ids[] requerido" }, { status: 400 });
  }
  const rows = body.registration_ids.map((rid: string) => ({
    billing_case_id: id,
    registration_id: rid,
  }));
  const { error } = await supabaseAdmin
    .from("billing_case_registrations")
    .upsert(rows, { onConflict: "billing_case_id,registration_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, added: rows.length });
}

// DELETE ?registration_id=... → quita alumno del caso
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const regId = new URL(request.url).searchParams.get("registration_id");
  if (!regId) return NextResponse.json({ error: "registration_id requerido" }, { status: 400 });
  const { error } = await supabaseAdmin
    .from("billing_case_registrations").delete()
    .eq("billing_case_id", id).eq("registration_id", regId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// GET → candidatos (registrations del curso/sesión del caso, no vinculados aún)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;

  const { data: cs } = await supabaseAdmin
    .from("billing_cases").select("course_id, session_id").eq("id", id).maybeSingle();
  if (!cs) return NextResponse.json({ error: "Caso no encontrado" }, { status: 404 });

  // Ya vinculados
  const { data: linked } = await supabaseAdmin
    .from("billing_case_registrations").select("registration_id").eq("billing_case_id", id);
  const linkedIds = new Set((linked || []).map((l: any) => l.registration_id));

  // Candidatos: del mismo curso (y misma sesión si tiene), confirmed/completed
  let q = supabaseAdmin
    .from("registrations")
    .select("id, first_name, last_name, email, organization, status, course_id, session_id")
    .in("status", ["confirmed", "completed"]);
  if (cs.course_id) q = q.eq("course_id", cs.course_id);
  // Si el caso tiene session_id, filtramos por esa sesión. Si no, mostramos todos del curso.
  if (cs.session_id) q = q.eq("session_id", cs.session_id);
  const { data: regs } = await q;

  const candidates = (regs || []).filter((r: any) => !linkedIds.has(r.id));

  // Si no hay candidatos del mismo curso, ofrecemos también buscar entre todos los alumnos
  return NextResponse.json({
    candidates,
    course_id: cs.course_id,
    session_id: cs.session_id,
  });
}
